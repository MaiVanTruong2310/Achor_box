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

revoke all on function public.get_pending_device_command(text, text) from public;
grant execute on function public.get_pending_device_command(text, text) to anon, authenticated;

