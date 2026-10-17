-- Unbind only a device owned by the authenticated caller. Returning false
-- means no ownership changed, so the app must not report success.
create or replace function public.unbind_owned_device(p_device_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.devices
  set owner_id = null
  where id = p_device_id and owner_id = auth.uid();

  if not found then
    return false;
  end if;

  delete from public.device_access where device_id = p_device_id;
  return true;
end;
$$;

revoke all on function public.unbind_owned_device(uuid) from public;
grant execute on function public.unbind_owned_device(uuid) to authenticated;
