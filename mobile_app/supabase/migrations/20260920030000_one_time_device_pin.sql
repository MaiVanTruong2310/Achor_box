create table if not exists public.device_one_time_pins (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  pin_salt text not null,
  pin_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.device_one_time_pins enable row level security;
revoke all on table public.device_one_time_pins from anon, authenticated;
create index if not exists device_one_time_pins_active_idx
on public.device_one_time_pins(device_id, expires_at)
where used_at is null;

create or replace function public.create_device_one_time_pin(
  p_device_id uuid,
  p_expires_minutes integer default 30
)
returns table(pin_id uuid, pin_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pin text;
  v_salt text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.devices
    where id = p_device_id and owner_id = auth.uid()
  ) then raise exception 'Device not found or not owned by user'; end if;

  p_expires_minutes := greatest(5, least(coalesce(p_expires_minutes, 30), 1440));
  v_pin := lpad(floor(random() * 10000)::integer::text, 4, '0');
  v_salt := encode(extensions.gen_random_bytes(16), 'hex');

  insert into public.device_one_time_pins(
    device_id, created_by, pin_salt, pin_hash, expires_at
  ) values (
    p_device_id,
    auth.uid(),
    v_salt,
    encode(extensions.digest(v_salt || v_pin, 'sha256'), 'hex'),
    now() + make_interval(mins => p_expires_minutes)
  ) returning id, device_one_time_pins.expires_at
    into pin_id, expires_at;

  pin_code := v_pin;
  return next;
end;
$$;

create or replace function public.verify_device_access_pin(
  p_serial_number text,
  p_device_token text,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.devices;
  v_one_time_id uuid;
begin
  select d.* into v_device
  from public.devices d
  join public.device_credentials dc on dc.device_id = d.id
  where d.serial_number = upper(trim(p_serial_number))
    and dc.token_hash = encode(extensions.digest(p_device_token, 'sha256'), 'hex')
  limit 1;
  if v_device.id is null then return false; end if;

  if exists (
    select 1 from public.device_access_settings das
    where das.device_id = v_device.id
      and das.pin_hash = encode(
        extensions.digest(das.pin_salt || trim(p_pin), 'sha256'), 'hex'
      )
  ) then return true; end if;

  select otp.id into v_one_time_id
  from public.device_one_time_pins otp
  where otp.device_id = v_device.id
    and otp.used_at is null
    and otp.expires_at > now()
    and otp.pin_hash = encode(
      extensions.digest(otp.pin_salt || trim(p_pin), 'sha256'), 'hex'
    )
  order by otp.created_at
  limit 1
  for update skip locked;

  if v_one_time_id is null then return false; end if;
  update public.device_one_time_pins set used_at = now()
  where id = v_one_time_id;

  insert into public.device_events(device_id, event_type, description, payload)
  values (
    v_device.id,
    'ONE_TIME_PIN_USED',
    'One-time device PIN used',
    jsonb_build_object('pin_id', v_one_time_id)
  );

  if v_device.owner_id is not null then
    insert into public.notifications(user_id, device_id, type, title, body)
    values (
      v_device.owner_id,
      v_device.id,
      'pin_used',
      'Mã PIN một lần đã được sử dụng',
      coalesce(v_device.name, v_device.serial_number) || ' vừa được mở bằng PIN một lần.'
    );
  end if;
  return true;
end;
$$;

revoke all on function public.create_device_one_time_pin(uuid, integer) from public;
grant execute on function public.create_device_one_time_pin(uuid, integer) to authenticated;
revoke all on function public.verify_device_access_pin(text, text, text) from public;
grant execute on function public.verify_device_access_pin(text, text, text) to anon, authenticated;
