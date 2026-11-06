-- profiles -> customers sync trigger (created by web/backend Liquibase 011) ran with the
-- caller's rights. When the mobile app (role authenticated) updated its own profile, the
-- trigger's upsert into RLS-protected public.customers was denied and the whole UPDATE
-- rolled back, so name/phone edits from the app never reached public.profiles.
-- Run the sync as the function owner, with a pinned search_path.
create or replace function public.sync_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'customer' then
    insert into public.customers(id, profile_id, full_name, email, phone, address, created_at, updated_at)
    values (new.id, new.id, coalesce(new.full_name, ''), new.email, new.phone, new.default_address, new.created_at, new.updated_at)
    on conflict (profile_id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          phone = excluded.phone,
          address = excluded.address,
          updated_at = excluded.updated_at;
  else
    delete from public.customers where profile_id = new.id;
  end if;
  return new;
end
$$;

revoke all on function public.sync_customer_profile() from public, anon, authenticated;
