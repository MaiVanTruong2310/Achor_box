create extension if not exists pgcrypto with schema extensions;

create table if not exists public.device_credentials (
  device_id uuid primary key references public.devices(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

alter table public.device_credentials enable row level security;
revoke all on table public.device_credentials from anon, authenticated;

-- Device credentials are provisioned outside migrations. Never place a raw
-- per-device token in version-controlled SQL.

create or replace function public.get_device_owner_id(
  p_serial_number text,
  p_device_token text
)
returns uuid
language sql
security definer
set search_path = public, extensions
as $$
  select d.owner_id
  from public.devices d
  join public.device_credentials c on c.device_id = d.id
  where d.serial_number = upper(trim(p_serial_number))
    and c.token_hash = encode(extensions.digest(p_device_token, 'sha256'), 'hex')
  limit 1;
$$;

revoke all on function public.get_device_owner_id(text, text) from public;
grant execute on function public.get_device_owner_id(text, text) to anon, authenticated;
