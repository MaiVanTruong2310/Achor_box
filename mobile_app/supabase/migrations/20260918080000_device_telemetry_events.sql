alter table public.devices add column if not exists door_status text not null default 'closed';
alter table public.devices add column if not exists lock_status text not null default 'locked';
alter table public.devices add column if not exists weight_kg double precision not null default 0;
alter table public.devices add column if not exists package_detected boolean not null default false;
alter table public.devices add column if not exists scale_ready boolean not null default false;
alter table public.devices add column if not exists device_state text not null default 'starting';
alter table public.devices add column if not exists last_seen_at timestamptz;
alter table public.devices add column if not exists mqtt_topic_id text;

update public.devices
set mqtt_topic_id = '001'
where serial_number = 'DBX-98C377AD9D60' and mqtt_topic_id is null;

create table if not exists public.device_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  event_type text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.device_events add column if not exists description text;
alter table public.device_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.device_events add column if not exists created_at timestamptz not null default now();
alter table public.device_events enable row level security;

drop policy if exists "Owners can read device events" on public.device_events;
create policy "Owners can read device events"
on public.device_events for select to authenticated
using (
  exists (
    select 1 from public.devices d
    where d.id = device_events.device_id and d.owner_id = (select auth.uid())
  )
);

grant select on public.device_events to authenticated;
create index if not exists device_events_device_created_idx
on public.device_events(device_id, created_at desc);

create or replace function public.report_device_telemetry(
  p_serial_number text,
  p_device_token text,
  p_door_status text,
  p_lock_status text,
  p_weight_kg double precision,
  p_package_detected boolean,
  p_scale_ready boolean,
  p_device_state text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device_id uuid;
begin
  select d.id into v_device_id
  from public.devices d
  join public.device_credentials c on c.device_id = d.id
  where d.serial_number = upper(trim(p_serial_number))
    and c.token_hash = encode(extensions.digest(p_device_token, 'sha256'), 'hex')
  limit 1;

  if v_device_id is null then return false; end if;

  update public.devices
  set status = 'online',
      door_status = case when lower(p_door_status) = 'open' then 'open' else 'closed' end,
      lock_status = case when lower(p_lock_status) = 'unlocked' then 'unlocked' else 'locked' end,
      weight_kg = greatest(0, coalesce(p_weight_kg, 0)),
      package_detected = coalesce(p_package_detected, false),
      scale_ready = coalesce(p_scale_ready, false),
      device_state = coalesce(nullif(trim(p_device_state), ''), 'unknown'),
      last_seen_at = now()
  where id = v_device_id;

  return true;
end;
$$;

create or replace function public.report_device_event(
  p_serial_number text,
  p_device_token text,
  p_event_type text,
  p_description text,
  p_payload jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
  v_notification_type text;
  v_title text;
  v_body text;
begin
  select d.* into v_device
  from public.devices d
  join public.device_credentials c on c.device_id = d.id
  where d.serial_number = upper(trim(p_serial_number))
    and c.token_hash = encode(extensions.digest(p_device_token, 'sha256'), 'hex')
  limit 1;

  if v_device.id is null then return false; end if;

  update public.devices set status = 'online', last_seen_at = now()
  where id = v_device.id;

  if not exists (
    select 1 from public.device_events
    where device_id = v_device.id
      and event_type = upper(trim(p_event_type))
      and created_at > now() - interval '2 seconds'
  ) then
    insert into public.device_events(device_id, event_type, description, payload)
    values (v_device.id, upper(trim(p_event_type)), p_description, coalesce(p_payload, '{}'::jsonb));
  end if;

  case upper(trim(p_event_type))
    when 'DOOR_OPENED' then
      v_notification_type := 'door_opened'; v_title := 'Nắp hộp đã mở';
      v_body := coalesce(v_device.name, v_device.serial_number) || ' vừa được mở.';
    when 'DOOR_CLOSED' then
      v_notification_type := 'door_closed'; v_title := 'Nắp hộp đã đóng';
      v_body := coalesce(v_device.name, v_device.serial_number) || ' đã được đóng lại.';
    when 'UNAUTHORIZED_OPEN' then
      v_notification_type := 'security_alert'; v_title := 'Cảnh báo mở hộp trái phép';
      v_body := coalesce(v_device.name, v_device.serial_number) || ' bị mở khi đang khóa.';
    when 'PACKAGE_DETECTED' then
      v_notification_type := 'parcel_detected'; v_title := 'Đã phát hiện kiện hàng';
      v_body := 'Cân điện tử phát hiện hàng trong ' || coalesce(v_device.name, v_device.serial_number) || '.';
    when 'PACKAGE_DELIVERED' then
      v_notification_type := 'parcel_delivered'; v_title := 'Kiện hàng đã được khóa an toàn';
      v_body := coalesce(v_device.name, v_device.serial_number) || ' đã đóng và khóa sau khi nhận hàng.';
    when 'UNLOCKED' then
      v_notification_type := 'box_unlocked'; v_title := 'Hộp đã được mở khóa';
      v_body := coalesce(v_device.name, v_device.serial_number) || ' vừa nhận lệnh mở khóa.';
    when 'KEYPAD_LOCKED' then
      v_notification_type := 'security_alert'; v_title := 'Bàn phím tạm khóa';
      v_body := 'Có quá nhiều lần nhập mã sai trên ' || coalesce(v_device.name, v_device.serial_number) || '.';
    when 'ONLINE' then
      v_notification_type := 'device_online'; v_title := 'Thiết bị đã kết nối';
      v_body := coalesce(v_device.name, v_device.serial_number) || ' đang trực tuyến.';
    else
      v_notification_type := null;
  end case;

  if v_device.owner_id is not null and v_notification_type is not null
     and not exists (
       select 1 from public.notification_preferences np
       where np.user_id = v_device.owner_id
         and np.event_type = v_notification_type
         and np.enabled = false
     )
     and not exists (
       select 1 from public.notifications n
       where n.user_id = v_device.owner_id
         and n.device_id = v_device.id
         and n.type = v_notification_type
         and n.created_at > now() - case when v_notification_type = 'device_online'
           then interval '5 minutes' else interval '3 seconds' end
     ) then
    insert into public.notifications(user_id, device_id, type, title, body)
    values (v_device.owner_id, v_device.id, v_notification_type, v_title, v_body);
  end if;

  return true;
end;
$$;

revoke all on function public.report_device_telemetry(text, text, text, text, double precision, boolean, boolean, text) from public;
revoke all on function public.report_device_event(text, text, text, text, jsonb) from public;
grant execute on function public.report_device_telemetry(text, text, text, text, double precision, boolean, boolean, text) to anon, authenticated;
grant execute on function public.report_device_event(text, text, text, text, jsonb) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then alter publication supabase_realtime add table public.devices; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'device_events'
  ) then alter publication supabase_realtime add table public.device_events; end if;
end $$;
