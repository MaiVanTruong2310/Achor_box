-- The firmware calls verify_device_pin (and falls back to verify_passcode).
-- Their original bodies were created from the dashboard and never saved, so
-- they are restored here as thin wrappers over verify_device_access_pin, which
-- checks the device token and both the permanent and one-time PINs.

create or replace function public.verify_device_pin(
  p_serial_number text,
  p_device_token text,
  p_pin text default null,
  p_passcode text default null
)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select public.verify_device_access_pin(
    p_serial_number,
    p_device_token,
    coalesce(nullif(trim(p_pin), ''), trim(p_passcode))
  );
$$;

create or replace function public.verify_passcode(
  p_serial_number text,
  p_device_token text,
  p_passcode text
)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select public.verify_device_access_pin(p_serial_number, p_device_token, p_passcode);
$$;

revoke all on function public.verify_device_pin(text, text, text, text) from public;
revoke all on function public.verify_passcode(text, text, text) from public;
grant execute on function public.verify_device_pin(text, text, text, text) to anon, authenticated;
grant execute on function public.verify_passcode(text, text, text) to anon, authenticated;
