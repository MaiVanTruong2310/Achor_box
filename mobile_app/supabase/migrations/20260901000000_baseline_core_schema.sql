-- Baseline schema reconstructed on 2026-10-17 from supabase_schema.sql (the
-- 2026-09-22 snapshot of the original project). It recreates the objects that
-- were created from the dashboard before migration history began, so a fresh
-- project can be rebuilt by applying every migration in order. Tables that
-- later migrations create themselves are intentionally left out.

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.user_role as enum ('customer', 'super_admin', 'product_manager', 'support_agent', 'technician', 'accountant');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.device_status as enum ('online', 'offline', 'maintenance', 'error');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.access_level as enum ('view_only', 'full_control');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pin_type as enum ('permanent', 'temporary', 'one_time');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'processing', 'shipping', 'completed', 'cancelled', 'refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.warranty_status as enum ('active', 'expired', 'void');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.claim_status as enum ('new', 'in_progress', 'resolved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.audit_logs (
  id uuid not null default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  meta jsonb,
  created_at timestamp with time zone not null default now(),
  constraint audit_logs_pkey primary key (id)
);

create table if not exists public.cms_articles (
  id uuid not null default gen_random_uuid(),
  title character varying not null,
  slug character varying not null,
  category character varying not null default 'guide',
  summary text,
  content text,
  cover_image text,
  author_name character varying default 'Ban Biên Tập SmartBox',
  status character varying not null default 'published',
  view_count integer not null default 0,
  tags text,
  published_at timestamp with time zone default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint cms_articles_pkey primary key (id),
  constraint cms_articles_slug_key unique (slug)
);

create table if not exists public.cms_banners (
  id uuid not null default gen_random_uuid(),
  title character varying not null,
  image_url text not null,
  target_url text,
  position character varying not null default 'hero_home',
  display_order integer not null default 1,
  is_active boolean not null default true,
  click_count integer not null default 0,
  start_date timestamp with time zone default now(),
  end_date timestamp with time zone default (now() + '6 mons'::interval),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint cms_banners_pkey primary key (id)
);

create table if not exists public.cms_faqs (
  id uuid not null default gen_random_uuid(),
  question text not null,
  answer text not null,
  category character varying not null default 'general',
  display_order integer not null default 1,
  is_published boolean not null default true,
  helpful_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint cms_faqs_pkey primary key (id)
);

create table if not exists public.cms_reviews (
  id uuid not null default gen_random_uuid(),
  product_id uuid,
  product_name character varying not null,
  customer_name character varying not null,
  customer_email character varying,
  customer_phone character varying,
  rating integer not null default 5,
  title character varying,
  comment text,
  images text,
  status character varying not null default 'pending',
  reject_reason text,
  admin_reply text,
  admin_replied_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint cms_reviews_pkey primary key (id)
);

create table if not exists public.device_access (
  device_id uuid not null,
  user_id uuid not null,
  level public.access_level not null default 'view_only',
  invited_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint device_access_pkey primary key (device_id, user_id)
);

create table if not exists public.device_events (
  id uuid not null default gen_random_uuid(),
  device_id uuid,
  event_type text not null,
  payload jsonb,
  created_at timestamp with time zone not null default now(),
  description text,
  constraint device_events_pkey primary key (id)
);

create table if not exists public.device_ota_updates (
  id uuid not null default gen_random_uuid(),
  device_id uuid,
  firmware_version text not null,
  status text not null default 'pending',
  triggered_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint device_ota_updates_pkey primary key (id)
);

create table if not exists public.device_pins (
  id uuid not null default gen_random_uuid(),
  device_id uuid,
  code_hash text not null,
  type public.pin_type not null default 'permanent',
  created_by uuid,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint device_pins_pkey primary key (id)
);

create table if not exists public.devices (
  id uuid not null default gen_random_uuid(),
  product_id uuid,
  owner_id uuid,
  serial_number text not null,
  name text,
  location_label text,
  status public.device_status not null default 'offline',
  battery_level integer,
  firmware_version text,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  door_status text not null default 'closed',
  lock_status text not null default 'locked',
  weight_kg double precision not null default 0,
  package_detected boolean not null default false,
  scale_ready boolean not null default false,
  device_state text not null default 'starting',
  mqtt_topic_id text,
  constraint devices_pkey primary key (id),
  constraint devices_serial_number_key unique (serial_number)
);

create table if not exists public.message_templates (
  id uuid not null default gen_random_uuid(),
  code text not null,
  channel text not null,
  subject text,
  body text not null,
  name character varying,
  description text,
  variables text,
  is_active boolean default true,
  updated_at timestamp with time zone default now(),
  constraint message_templates_pkey primary key (id),
  constraint message_templates_code_key unique (code)
);

create table if not exists public.notification_preferences (
  user_id uuid not null,
  event_type text not null,
  enabled boolean not null default true,
  constraint notification_preferences_pkey primary key (user_id, event_type)
);

create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  device_id uuid,
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint notifications_pkey primary key (id)
);

create table if not exists public.order_items (
  id uuid not null default gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity integer not null default 1,
  unit_price numeric not null,
  constraint order_items_pkey primary key (id)
);

create table if not exists public.orders (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  status public.order_status not null default 'pending',
  shipping_address text,
  tracking_number text,
  promotion_id uuid,
  total numeric not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint orders_pkey primary key (id)
);

create table if not exists public.payment_methods (
  id uuid not null default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  constraint payment_methods_pkey primary key (id)
);

create table if not exists public.payments (
  id uuid not null default gen_random_uuid(),
  order_id uuid,
  amount numeric not null,
  status text not null default 'pending',
  provider text,
  transaction_ref text,
  paid_at timestamp with time zone,
  constraint payments_pkey primary key (id)
);

create table if not exists public.product_categories (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  constraint product_categories_pkey primary key (id),
  constraint product_categories_slug_key unique (slug)
);

create table if not exists public.product_reviews (
  id uuid not null default gen_random_uuid(),
  product_id uuid,
  product_name character varying,
  customer_name character varying not null,
  customer_email character varying,
  customer_phone character varying,
  rating integer not null default 5,
  title character varying,
  comment text,
  images text,
  status character varying not null default 'approved',
  reject_reason text,
  admin_reply text,
  admin_replied_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint product_reviews_pkey primary key (id)
);

create table if not exists public.product_variants (
  id uuid not null default gen_random_uuid(),
  product_id uuid,
  variant_name text not null,
  sku text not null,
  price_delta numeric not null default 0,
  stock_quantity integer not null default 0,
  constraint product_variants_pkey primary key (id),
  constraint product_variants_sku_key unique (sku)
);

create table if not exists public.products (
  id uuid not null default gen_random_uuid(),
  category_id uuid,
  sku text not null,
  name text not null,
  description text,
  price numeric not null,
  images jsonb,
  stock_quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint products_pkey primary key (id),
  constraint products_sku_key unique (sku)
);

create table if not exists public.profiles (
  id uuid not null,
  full_name text,
  phone text,
  avatar_url text,
  default_address text,
  role public.user_role not null default 'customer',
  is_locked boolean not null default false,
  is_2fa_enabled boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  email character varying,
  constraint profiles_pkey primary key (id)
);

create table if not exists public.promotions (
  id uuid not null default gen_random_uuid(),
  code text not null,
  discount_type text not null,
  discount_value numeric not null,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  usage_limit integer,
  used_count integer not null default 0,
  description text,
  min_order_value numeric default 0,
  max_discount numeric,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint promotions_pkey primary key (id),
  constraint promotions_code_key unique (code)
);

create table if not exists public.shipping_methods (
  id uuid not null default gen_random_uuid(),
  name text not null,
  fee numeric not null default 0,
  is_active boolean not null default true,
  constraint shipping_methods_pkey primary key (id)
);

create table if not exists public.warranties (
  id uuid not null default gen_random_uuid(),
  order_item_id uuid,
  device_id uuid,
  start_date date not null,
  end_date date not null,
  status public.warranty_status not null default 'active',
  constraint warranties_pkey primary key (id)
);

create table if not exists public.warranty_claims (
  id uuid not null default gen_random_uuid(),
  warranty_id uuid,
  description text not null,
  images jsonb,
  status public.claim_status not null default 'new',
  assigned_to uuid,
  internal_notes text,
  created_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone,
  constraint warranty_claims_pkey primary key (id)
);

create table if not exists public.warranty_policies (
  id uuid not null default gen_random_uuid(),
  category_id uuid,
  duration_months integer not null default 12,
  constraint warranty_policies_pkey primary key (id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey') then
    alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_logs_actor_id_fkey') then
    alter table public.audit_logs add constraint audit_logs_actor_id_fkey foreign key (actor_id) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'devices_product_id_fkey') then
    alter table public.devices add constraint devices_product_id_fkey foreign key (product_id) references public.products(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'devices_owner_id_fkey') then
    alter table public.devices add constraint devices_owner_id_fkey foreign key (owner_id) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_access_device_id_fkey') then
    alter table public.device_access add constraint device_access_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_access_user_id_fkey') then
    alter table public.device_access add constraint device_access_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_access_invited_by_fkey') then
    alter table public.device_access add constraint device_access_invited_by_fkey foreign key (invited_by) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_events_device_id_fkey') then
    alter table public.device_events add constraint device_events_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_pins_device_id_fkey') then
    alter table public.device_pins add constraint device_pins_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_pins_created_by_fkey') then
    alter table public.device_pins add constraint device_pins_created_by_fkey foreign key (created_by) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_ota_updates_device_id_fkey') then
    alter table public.device_ota_updates add constraint device_ota_updates_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'device_ota_updates_triggered_by_fkey') then
    alter table public.device_ota_updates add constraint device_ota_updates_triggered_by_fkey foreign key (triggered_by) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notification_preferences_user_id_fkey') then
    alter table public.notification_preferences add constraint notification_preferences_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notifications_user_id_fkey') then
    alter table public.notifications add constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notifications_device_id_fkey') then
    alter table public.notifications add constraint notifications_device_id_fkey foreign key (device_id) references public.devices(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_category_id_fkey') then
    alter table public.products add constraint products_category_id_fkey foreign key (category_id) references public.product_categories(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_variants_product_id_fkey') then
    alter table public.product_variants add constraint product_variants_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_user_id_fkey') then
    alter table public.orders add constraint orders_user_id_fkey foreign key (user_id) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_promotion_id_fkey') then
    alter table public.orders add constraint orders_promotion_id_fkey foreign key (promotion_id) references public.promotions(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_order_id_fkey') then
    alter table public.order_items add constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_product_id_fkey') then
    alter table public.order_items add constraint order_items_product_id_fkey foreign key (product_id) references public.products(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_variant_id_fkey') then
    alter table public.order_items add constraint order_items_variant_id_fkey foreign key (variant_id) references public.product_variants(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_order_id_fkey') then
    alter table public.payments add constraint payments_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'warranty_policies_category_id_fkey') then
    alter table public.warranty_policies add constraint warranty_policies_category_id_fkey foreign key (category_id) references public.product_categories(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'warranties_order_item_id_fkey') then
    alter table public.warranties add constraint warranties_order_item_id_fkey foreign key (order_item_id) references public.order_items(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'warranties_device_id_fkey') then
    alter table public.warranties add constraint warranties_device_id_fkey foreign key (device_id) references public.devices(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'warranty_claims_warranty_id_fkey') then
    alter table public.warranty_claims add constraint warranty_claims_warranty_id_fkey foreign key (warranty_id) references public.warranties(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'warranty_claims_assigned_to_fkey') then
    alter table public.warranty_claims add constraint warranty_claims_assigned_to_fkey foreign key (assigned_to) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_reviews_product_id_fkey') then
    alter table public.product_reviews add constraint product_reviews_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cms_reviews_product_id_fkey') then
    alter table public.cms_reviews add constraint cms_reviews_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_devices_owner on public.devices(owner_id);

create index if not exists device_events_device_created_idx on public.device_events(device_id, created_at desc);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx on public.notifications(user_id, is_read) where is_read = false;

create index if not exists idx_orders_user on public.orders(user_id);

create index if not exists idx_order_items_order on public.order_items(order_id);

create index if not exists idx_warranty_claims_status on public.warranty_claims(status);

-- Create a profile row for every new auth user (notifications, devices and
-- device_access reference public.profiles).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, avatar_url)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Row Level Security. Every public table is locked by default; only the
-- policies below open access, always scoped to auth.uid().
do $$
declare
  t text;
begin
  foreach t in array array[
    'audit_logs', 'cms_articles', 'cms_banners', 'cms_faqs', 'cms_reviews',
    'device_access', 'device_events', 'device_ota_updates', 'device_pins',
    'devices', 'message_templates', 'notification_preferences', 'notifications',
    'order_items', 'orders', 'payment_methods', 'payments', 'product_categories',
    'product_reviews', 'product_variants', 'products', 'profiles', 'promotions',
    'shipping_methods', 'warranties', 'warranty_claims', 'warranty_policies'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles: users read their own row and may edit only personal fields.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, default_address, updated_at)
on public.profiles to authenticated;

-- devices: owners can read; ownership changes only go through SECURITY
-- DEFINER RPCs (pairing / unbind). Not joined to device_access here because
-- that policy already references devices (mutual references recurse).
drop policy if exists "Owners can read devices" on public.devices;
create policy "Owners can read devices"
on public.devices for select to authenticated
using (owner_id = (select auth.uid()));

revoke insert, update, delete on public.devices from anon, authenticated;
grant select on public.devices to authenticated;

-- device_access: members see their own grants, owners see all grants on
-- their devices.
drop policy if exists "Members and owners can read device access" on public.device_access;
create policy "Members and owners can read device access"
on public.device_access for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.devices d
    where d.id = device_access.device_id and d.owner_id = (select auth.uid())
  )
);

-- device_events: the app logs remote-unlock events for devices it owns.
drop policy if exists "Owners can insert device events" on public.device_events;
create policy "Owners can insert device events"
on public.device_events for insert to authenticated
with check (
  exists (
    select 1 from public.devices d
    where d.id = device_events.device_id and d.owner_id = (select auth.uid())
  )
);

grant insert on public.device_events to authenticated;
