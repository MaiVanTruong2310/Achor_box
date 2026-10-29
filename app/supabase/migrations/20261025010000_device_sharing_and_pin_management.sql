-- Device sharing (owner invites members by email), PIN management RPCs for
-- the app's PIN tab, and server-side logging of remote commands.
-- Access levels: 'owner' (devices.owner_id), 'full_control' and 'view_only'
-- (device_access). Members never manage PINs, members or ownership.

-- ---------------------------------------------------------------------------
-- Access helpers. SECURITY DEFINER so policies on devices/device_access can
-- call them without the two tables' policies recursing into each other.
-- ---------------------------------------------------------------------------
create or replace function public.device_access_level(p_device_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when exists (
      select 1 from public.devices
      where id = p_device_id and owner_id = auth.uid()
    ) then 'owner'
    else (
      select level::text from public.device_access
      where device_id = p_device_id and user_id = auth.uid()
    )
  end;
$$;

revoke all on function public.device_access_level(uuid) from public, anon;
grant execute on function public.device_access_level(uuid) to authenticated;

-- Internal: insert a notification unless the user disabled that event type.
create or replace function public.notify_user(
  p_user_id uuid,
  p_device_id uuid,
  p_type text,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  if exists (
    select 1 from public.notification_preferences
    where user_id = p_user_id and event_type = p_type and enabled = false
  ) then return; end if;
  insert into public.notifications(user_id, device_id, type, title, body)
  values (p_user_id, p_device_id, p_type, p_title, p_body);
end;
$$;

revoke all on function public.notify_user(uuid, uuid, text, text, text)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: members can read shared devices and their history; full_control
-- members can queue commands.
-- ---------------------------------------------------------------------------
drop policy if exists "Owners can read devices" on public.devices;
drop policy if exists "Owners and members can read devices" on public.devices;
create policy "Owners and members can read devices"
on public.devices for select to authenticated
using (public.device_access_level(id) is not null);

drop policy if exists "Members and owners can read device access" on public.device_access;
create policy "Members and owners can read device access"
on public.device_access for select to authenticated
using (
  user_id = (select auth.uid())
  or public.device_access_level(device_id) = 'owner'
);

drop policy if exists "Owners can read device events" on public.device_events;
drop policy if exists "Owners and members can read device events" on public.device_events;
create policy "Owners and members can read device events"
on public.device_events for select to authenticated
using (public.device_access_level(device_id) is not null);

drop policy if exists "owners can create device commands" on public.device_commands;
drop policy if exists "controllers can create device commands" on public.device_commands;
create policy "controllers can create device commands"
on public.device_commands for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and public.device_access_level(device_id) in ('owner', 'full_control')
);

drop policy if exists "owners can read device commands" on public.device_commands;
drop policy if exists "members can read device commands" on public.device_commands;
create policy "members can read device commands"
on public.device_commands for select to authenticated
using (public.device_access_level(device_id) is not null);

-- ---------------------------------------------------------------------------
-- Sharing RPCs
-- ---------------------------------------------------------------------------
create or replace function public.list_device_members(p_device_id uuid)
returns table(
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  access_level text,
  is_owner boolean,
  granted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_level text := public.device_access_level(p_device_id);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_level is null then raise exception 'Device not found'; end if;

  -- Owners see every member; members see the owner and themselves only.
  return query
  select p.id, p.full_name, p.email::text, p.avatar_url, 'owner'::text, true, d.created_at
  from public.devices d
  join public.profiles p on p.id = d.owner_id
  where d.id = p_device_id
  union all
  select p.id, p.full_name, p.email::text, p.avatar_url, da.level::text, false, da.created_at
  from public.device_access da
  join public.profiles p on p.id = da.user_id
  where da.device_id = p_device_id
    and (v_level = 'owner' or da.user_id = auth.uid())
  order by 6 desc, 7;
end;
$$;

create or replace function public.invite_device_member(
  p_device_id uuid,
  p_email text,
  p_access_level text default 'view_only'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices;
  v_user_id uuid;
  v_existing boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_access_level not in ('view_only', 'full_control') then
    raise exception 'Invalid access level';
  end if;

  select * into v_device from public.devices
  where id = p_device_id and owner_id = auth.uid();
  if v_device.id is null then raise exception 'Device not found or not owned by user'; end if;

  select id into v_user_id from public.profiles
  where lower(email) = lower(trim(p_email))
  limit 1;
  if v_user_id is null then raise exception 'User not found'; end if;
  if v_user_id = auth.uid() then raise exception 'Cannot invite yourself'; end if;

  select exists (
    select 1 from public.device_access
    where device_id = p_device_id and user_id = v_user_id
  ) into v_existing;

  insert into public.device_access(device_id, user_id, level, invited_by)
  values (p_device_id, v_user_id, p_access_level::public.access_level, auth.uid())
  on conflict (device_id, user_id) do update set level = excluded.level;

  if not v_existing then
    perform public.notify_user(
      v_user_id,
      p_device_id,
      'access_invited',
      'Bạn được chia sẻ quyền truy cập',
      coalesce(v_device.name, v_device.serial_number) || ' vừa được chia sẻ với bạn ('
        || case when p_access_level = 'full_control' then 'toàn quyền' else 'chỉ xem' end || ').'
    );
  end if;
  return v_user_id;
end;
$$;

create or replace function public.revoke_device_member(
  p_device_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_device from public.devices
  where id = p_device_id and owner_id = auth.uid();
  if v_device.id is null then raise exception 'Device not found or not owned by user'; end if;

  delete from public.device_access
  where device_id = p_device_id and user_id = p_user_id;
  if not found then return false; end if;

  perform public.notify_user(
    p_user_id,
    null,
    'access_revoked',
    'Quyền truy cập đã bị thu hồi',
    'Bạn không còn quyền truy cập ' || coalesce(v_device.name, v_device.serial_number) || '.'
  );
  return true;
end;
$$;

revoke all on function public.list_device_members(uuid) from public, anon;
revoke all on function public.invite_device_member(uuid, text, text) from public, anon;
revoke all on function public.revoke_device_member(uuid, uuid) from public, anon;
grant execute on function public.list_device_members(uuid) to authenticated;
grant execute on function public.invite_device_member(uuid, text, text) to authenticated;
grant execute on function public.revoke_device_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- PIN management RPCs (owner only). PIN codes are stored as salted hashes,
-- so the app can show a code only at the moment it is created.
-- ---------------------------------------------------------------------------
create or replace function public.get_device_pin_overview(p_device_id uuid)
returns table(permanent_pin_set boolean, permanent_pin_updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.device_access_level(p_device_id) is distinct from 'owner' then
    raise exception 'Device not found or not owned by user';
  end if;
  return query
  select das.device_id is not null, das.updated_at
  from (select 1) one
  left join public.device_access_settings das on das.device_id = p_device_id;
end;
$$;

create or replace function public.list_device_one_time_pins(p_device_id uuid)
returns table(
  pin_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.device_access_level(p_device_id) is distinct from 'owner' then
    raise exception 'Device not found or not owned by user';
  end if;
  return query
  select otp.id, otp.created_at, otp.expires_at, otp.used_at
  from public.device_one_time_pins otp
  where otp.device_id = p_device_id
    and otp.created_at > now() - interval '30 days'
  order by otp.created_at desc
  limit 50;
end;
$$;

create or replace function public.revoke_device_one_time_pin(p_pin_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device_id uuid;
begin
  select device_id into v_device_id
  from public.device_one_time_pins where id = p_pin_id;
  if v_device_id is null
     or public.device_access_level(v_device_id) is distinct from 'owner' then
    raise exception 'PIN not found';
  end if;

  update public.device_one_time_pins
  set expires_at = now()
  where id = p_pin_id and used_at is null and expires_at > now();
  return found;
end;
$$;

revoke all on function public.get_device_pin_overview(uuid) from public, anon;
revoke all on function public.list_device_one_time_pins(uuid) from public, anon;
revoke all on function public.revoke_device_one_time_pin(uuid) from public, anon;
grant execute on function public.get_device_pin_overview(uuid) to authenticated;
grant execute on function public.list_device_one_time_pins(uuid) to authenticated;
grant execute on function public.revoke_device_one_time_pin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Remote command log: every queued command is recorded in device_events and
-- remote unlocks notify the owner (replaces client-side notifications).
-- ---------------------------------------------------------------------------
create or replace function public.log_device_command()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices;
  v_actor text;
begin
  select * into v_device from public.devices where id = new.device_id;
  select coalesce(nullif(full_name, ''), email::text, 'Ứng dụng') into v_actor
  from public.profiles where id = new.requested_by;

  insert into public.device_events(device_id, event_type, description, payload)
  values (
    new.device_id,
    'REMOTE_' || new.command,
    'Lệnh ' || new.command || ' từ ứng dụng',
    jsonb_build_object('command_id', new.id, 'requested_by', new.requested_by)
  );

  if new.command = 'UNLOCK' then
    perform public.notify_user(
      v_device.owner_id,
      new.device_id,
      'remote_unlock',
      'Mở khóa từ xa',
      coalesce(v_device.name, v_device.serial_number) || ' vừa nhận lệnh mở khóa từ '
        || coalesce(v_actor, 'ứng dụng') || '.'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.log_device_command() from public, anon, authenticated;

drop trigger if exists device_commands_log on public.device_commands;
create trigger device_commands_log
after insert on public.device_commands
for each row execute function public.log_device_command();

-- Shared devices appear in the app through Realtime; device_access changes
-- must reach members too.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'device_access'
  ) then
    alter publication supabase_realtime add table public.device_access;
  end if;
end $$;
