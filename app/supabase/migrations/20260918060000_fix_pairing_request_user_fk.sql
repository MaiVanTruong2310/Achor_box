alter table public.device_pairing_challenges
  drop constraint if exists device_pairing_challenges_requested_by_fkey;

alter table public.device_pairing_challenges
  add constraint device_pairing_challenges_requested_by_fkey
  foreign key (requested_by) references auth.users(id) on delete cascade;
