create table if not exists public.device_pairing_challenges (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  otp_code text not null check (otp_code ~ '^[0-9]{6}$'),
  attempts smallint not null default 0,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.device_pairing_challenges enable row level security;
revoke all on table public.device_pairing_challenges from anon, authenticated;

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
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_device
  from public.devices
  where serial_number = upper(trim(p_serial_number));

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

create or replace function public.get_pending_device_pairing(
  p_serial_number text,
  p_device_token text
)
returns table(challenge_id uuid, otp_code text, expires_in_seconds integer)
language sql
security definer
set search_path = public, extensions
as $$
  select c.id, c.otp_code,
         greatest(0, floor(extract(epoch from (c.expires_at - now())))::int)
  from public.devices d
  join public.device_credentials dc on dc.device_id = d.id
  join public.device_pairing_challenges c on c.device_id = d.id
  where d.serial_number = upper(trim(p_serial_number))
    and dc.token_hash = encode(extensions.digest(p_device_token, 'sha256'), 'hex')
    and c.verified_at is null
    and c.expires_at > now()
  order by c.created_at desc
  limit 1;
$$;

create or replace function public.confirm_device_pairing(
  p_challenge_id uuid,
  p_otp_code text
)
returns setof public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.device_pairing_challenges;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_challenge
  from public.device_pairing_challenges
  where id = p_challenge_id
  for update;

  if v_challenge.id is null or v_challenge.requested_by <> auth.uid() then
    raise exception 'Pairing request not found';
  end if;
  if v_challenge.verified_at is not null then raise exception 'OTP already used'; end if;
  if v_challenge.expires_at <= now() then raise exception 'OTP expired'; end if;
  if v_challenge.attempts >= 5 then raise exception 'Too many attempts'; end if;

  if v_challenge.otp_code <> trim(p_otp_code) then
    update public.device_pairing_challenges set attempts = attempts + 1 where id = p_challenge_id;
    raise exception 'Invalid OTP';
  end if;

  update public.device_pairing_challenges set verified_at = now() where id = p_challenge_id;

  return query
  update public.devices
  set owner_id = auth.uid()
  where id = v_challenge.device_id
    and (owner_id is null or owner_id = auth.uid())
  returning *;
end;
$$;

revoke all on function public.start_device_pairing(text) from public;
revoke all on function public.get_pending_device_pairing(text, text) from public;
revoke all on function public.confirm_device_pairing(uuid, text) from public;
grant execute on function public.start_device_pairing(text) to authenticated;
grant execute on function public.get_pending_device_pairing(text, text) to anon, authenticated;
grant execute on function public.confirm_device_pairing(uuid, text) to authenticated;
