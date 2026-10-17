-- Remove dependent demo records first. These rows belong only to devices that
-- are being removed; the provisioned physical box and its history are kept.
delete from public.warranties
where device_id in (
  select id from public.devices
  where serial_number is distinct from 'DBX-98C377AD9D60'
);

-- The project currently has one provisioned physical box. Remove legacy/demo
-- device rows so they cannot reappear through the realtime device stream.
delete from public.devices
where serial_number is distinct from 'DBX-98C377AD9D60';
