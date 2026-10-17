alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can create own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users can read own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create own notifications"
on public.notifications for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own notifications"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own notifications"
on public.notifications for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
drop policy if exists "Users can create own notification preferences" on public.notification_preferences;
drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
drop policy if exists "Users can delete own notification preferences" on public.notification_preferences;

create policy "Users can read own notification preferences"
on public.notification_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create own notification preferences"
on public.notification_preferences for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own notification preferences"
on public.notification_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own notification preferences"
on public.notification_preferences for delete to authenticated
using (user_id = (select auth.uid()));

create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
on public.notifications (user_id, created_at desc)
where is_read = false;

grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
