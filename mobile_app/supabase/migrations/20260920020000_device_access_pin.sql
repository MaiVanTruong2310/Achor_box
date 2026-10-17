create table if not exists public.device_access_settings (
  device_id uuid primary key references public.devices(id) on delete cascade,
  pin_salt text not null,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.device_access_settings enable row level security;
revoke all on table public.device_access_settings from anon, authenticated;

create or replace function public.set_device_access_pin(
  p_device_id uuid,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_salt text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN must contain 4 digits'; end if;
  if not exists (
    select 1 from public.devices
    where id = p_device_id and owner_id = auth.uid()
  ) then raise exception 'Device not found or not owned by user'; end if;

  v_salt := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.device_access_settings(device_id, pin_salt, pin_hash, updated_at)
  values (
    p_device_id,
    v_salt,
    encode(extensions.digest(v_salt || p_pin, 'sha256'), 'hex'),
    now()
  )
  on conflict (device_id) do update
  set pin_salt = excluded.pin_salt,
      pin_hash = excluded.pin_hash,
      updated_at = now();
  return true;
end;
$$;

create or replace function public.verify_device_access_pin(
  p_serial_number text,
  p_device_token text,
  p_pin text
)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.devices d
    join public.device_credentials dc on dc.device_id = d.id
    join public.device_access_settings das on das.device_id = d.id
    where d.serial_number = upper(trim(p_serial_number))
      and dc.token_hash = encode(extensions.digest(p_device_token, 'sha256'), 'hex')
      and das.pin_hash = encode(extensions.digest(das.pin_salt || trim(p_pin), 'sha256'), 'hex')
  );
$$;

revoke all on function public.set_device_access_pin(uuid, text) from public;
revoke all on function public.verify_device_access_pin(text, text, text) from public;
grant execute on function public.set_device_access_pin(uuid, text) to authenticated;
grant execute on function public.verify_device_access_pin(text, text, text) to anon, authenticated;
