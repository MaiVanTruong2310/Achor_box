-- Register the physical ESP32-S3 box and allow its owner to claim it by the
-- public serial shown on the LCD. The function never accepts an owner id from
-- the client; ownership always comes from the authenticated auth.uid().

insert into public.devices (
  serial_number,
  name,
  location_label,
  firmware_version
)
values (
  'DBX-98C377AD9D60',
  'DropSafe Smart Delivery Box',
  'Chưa thiết lập',
  '2.1.0'
)
on conflict (serial_number) do update
set
  name = excluded.name,
  firmware_version = excluded.firmware_version;

create or replace function public.claim_device_by_serial(p_serial_number text)
returns setof public.devices
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  update public.devices
  set owner_id = auth.uid()
  where serial_number = upper(trim(p_serial_number))
    and (owner_id is null or owner_id = auth.uid())
  returning *;
end;
$$;

revoke all on function public.claim_device_by_serial(text) from public;
grant execute on function public.claim_device_by_serial(text) to authenticated;
