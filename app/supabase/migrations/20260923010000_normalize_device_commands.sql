-- Normalize the legacy text/executed command queue to the authenticated UUID
-- queue used by the app and device RPC. Preserve the old table for audit.
do $$
declare
  v_device_id_type text;
begin
  select data_type into v_device_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'device_commands'
    and column_name = 'device_id';

  if v_device_id_type = 'text' then
    alter table public.device_commands
      rename to device_commands_legacy_20260923;
  end if;
end $$;

create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  command text not null check (command in ('UNLOCK', 'LOCK', 'TARE')),
  requested_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

alter table public.device_commands enable row level security;

drop policy if exists "owners can create device commands"
on public.device_commands;
create policy "owners can create device commands"
on public.device_commands for insert to authenticated
with check (
  requested_by = auth.uid()
  and exists (
    select 1 from public.devices d
    where d.id = device_id and d.owner_id = auth.uid()
  )
);

drop policy if exists "owners can read device commands"
on public.device_commands;
create policy "owners can read device commands"
on public.device_commands for select to authenticated
using (
  exists (
    select 1 from public.devices d
    where d.id = device_id and d.owner_id = auth.uid()
  )
);

create index if not exists device_commands_pending_uuid_idx
on public.device_commands(device_id, created_at)
where claimed_at is null;

create or replace function public.get_pending_device_command(
  p_serial_number text,
  p_device_token text
)
returns table(command_id uuid, command text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device_id uuid;
  v_command_id uuid;
  v_command text;
begin
  select d.id into v_device_id
  from public.devices d
  join public.device_credentials c on c.device_id = d.id
  where d.serial_number = upper(trim(p_serial_number))
    and c.token_hash = encode(extensions.digest(p_device_token, 'sha256'), 'hex')
  limit 1;

  if v_device_id is null then return; end if;

  select dc.id, dc.command into v_command_id, v_command
  from public.device_commands dc
  where dc.device_id = v_device_id
    and dc.claimed_at is null
    and dc.created_at > now() - interval '2 minutes'
  order by dc.created_at
  limit 1
  for update skip locked;

  if v_command_id is null then return; end if;

  update public.device_commands set claimed_at = now()
  where id = v_command_id;

  return query select v_command_id, v_command;
end;
$$;

revoke all on function public.get_pending_device_command(text, text)
from public;
grant execute on function public.get_pending_device_command(text, text)
to anon, authenticated;
