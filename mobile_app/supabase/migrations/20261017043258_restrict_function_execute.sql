-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- directly, so the earlier "revoke ... from public" did not remove them.
-- User-facing RPCs require a signed-in user; device RPCs stay callable by anon
-- because the ESP32 authenticates with its own device token.

revoke execute on function public.claim_device_by_serial(text) from anon;
revoke execute on function public.start_device_pairing(text) from anon;
revoke execute on function public.confirm_device_pairing(uuid, text) from anon;
revoke execute on function public.set_device_access_pin(uuid, text) from anon;
revoke execute on function public.create_device_one_time_pin(uuid, integer) from anon;
revoke execute on function public.unbind_owned_device(uuid) from anon;

-- Trigger function: never meant to be called through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
