create or replace function public.start_device_pairing(p_serial_number text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices;
  v_challenge_id uuid;
  v_otp text;
  v_serial_key text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  v_serial_key := regexp_replace(upper(trim(p_serial_number)), '[^A-Z0-9]', '', 'g');
  if v_serial_key ~ '^[0-9A-F]{12}$' then
    v_serial_key := 'DBX' || v_serial_key;
  end if;

  select * into v_device
  from public.devices
  where regexp_replace(upper(serial_number), '[^A-Z0-9]', '', 'g') = v_serial_key
  limit 1;

  if v_device.id is null then raise exception 'Device not found'; end if;
  if v_device.owner_id is not null and v_device.owner_id <> auth.uid() then
    raise exception 'Device already belongs to another account';
  end if;

  update public.device_pairing_challenges
  set expires_at = now()
  where device_id = v_device.id and verified_at is null and expires_at > now();

  v_otp := lpad(floor(random() * 1000000)::int::text, 6, '0');
  insert into public.device_pairing_challenges(device_id, requested_by, otp_code)
  values (v_device.id, auth.uid(), v_otp)
  returning id into v_challenge_id;

  return v_challenge_id;
end;
$$;

revoke all on function public.start_device_pairing(text) from public;
grant execute on function public.start_device_pairing(text) to authenticated;
