-- SMART DELIVERY BOX - LIVE SUPABASE PUBLIC SCHEMA SNAPSHOT
-- Generated from the linked Supabase project on 2026-09-22.
-- Sources: live PostgREST OpenAPI metadata, live table statistics, applied migration history,
--          and the project's SQL migrations. No application rows or secrets are included.
-- This file is a reviewable schema reference. Use migrations for production changes.

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('customer', 'super_admin', 'product_manager', 'support_agent', 'technician', 'accountant');

create type public.device_status as enum ('online', 'offline', 'maintenance', 'error');

create type public.access_level as enum ('view_only', 'full_control');

create type public.pin_type as enum ('permanent', 'temporary', 'one_time');

create type public.order_status as enum ('pending', 'processing', 'shipping', 'completed', 'cancelled', 'refunded');

create type public.warranty_status as enum ('active', 'expired', 'void');

create type public.claim_status as enum ('new', 'in_progress', 'resolved', 'rejected');

-- Live estimated row count: 4
create table public.audit_logs (
  id uuid not null default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  meta jsonb,
  created_at timestamp with time zone not null default now(),
  constraint audit_logs_pkey primary key (id)
);

-- Live estimated row count: 3
create table public.cms_articles (
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

-- Live estimated row count: 3
create table public.cms_banners (
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

-- Live estimated row count: 5
create table public.cms_faqs (
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

-- Live estimated row count: 4
create table public.cms_reviews (
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

-- Live estimated row count: 0
create table public.device_access (
  device_id uuid not null,
  user_id uuid not null,
  level public.access_level not null default 'view_only',
  invited_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint device_access_pkey primary key (device_id, user_id)
);

-- Live estimated row count: 1
create table public.device_access_settings (
  device_id uuid not null,
  pin_salt text not null,
  pin_hash text not null,
  updated_at timestamp with time zone not null default now(),
  constraint device_access_settings_pkey primary key (device_id)
);

-- Live estimated row count: 13
create table public.device_commands (
  id uuid not null default gen_random_uuid(),
  device_id text not null,
  command text not null,
  requested_by uuid,
  executed boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint device_commands_pkey primary key (id)
);

-- Live estimated row count: 1
create table public.device_credentials (
  device_id uuid not null,
  token_hash text not null,
  created_at timestamp with time zone not null default now(),
  rotated_at timestamp with time zone,
  constraint device_credentials_pkey primary key (device_id)
);

-- Live estimated row count: 98
create table public.device_events (
  id uuid not null default gen_random_uuid(),
  device_id uuid,
  event_type text not null,
  payload jsonb,
  created_at timestamp with time zone not null default now(),
  description text,
  constraint device_events_pkey primary key (id)
);

-- Live estimated row count: 0
create table public.device_one_time_pins (
  id uuid not null default gen_random_uuid(),
  device_id uuid not null,
  created_by uuid not null,
  pin_salt text not null,
  pin_hash text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint device_one_time_pins_pkey primary key (id)
);

-- Live estimated row count: 0
create table public.device_ota_updates (
  id uuid not null default gen_random_uuid(),
  device_id uuid,
  firmware_version text not null,
  status text not null default 'pending',
  triggered_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint device_ota_updates_pkey primary key (id)
);

-- Live estimated row count: 1
create table public.device_pairing_challenges (
  id uuid not null default gen_random_uuid(),
  device_id uuid not null,
  requested_by uuid not null,
  otp_code text not null,
  attempts smallint not null default 0,
  expires_at timestamp with time zone not null default (now() + '00:05:00'::interval),
  verified_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint device_pairing_challenges_pkey primary key (id)
);

-- Live estimated row count: 1
create table public.device_pins (
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

-- Live estimated row count: 2
create table public.devices (
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

-- Live estimated row count: 7
create table public.message_templates (
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

-- Live estimated row count: 1
create table public.notification_preferences (
  user_id uuid not null,
  event_type text not null,
  enabled boolean not null default true,
  constraint notification_preferences_pkey primary key (user_id, event_type)
);

-- Live estimated row count: 67
create table public.notifications (
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

-- Live estimated row count: 2
create table public.order_items (
  id uuid not null default gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity integer not null default 1,
  unit_price numeric not null,
  constraint order_items_pkey primary key (id)
);

-- Live estimated row count: 3
create table public.orders (
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

-- Live estimated row count: 3
create table public.payment_methods (
  id uuid not null default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  constraint payment_methods_pkey primary key (id)
);

-- Live estimated row count: 0
create table public.payments (
  id uuid not null default gen_random_uuid(),
  order_id uuid,
  amount numeric not null,
  status text not null default 'pending',
  provider text,
  transaction_ref text,
  paid_at timestamp with time zone,
  constraint payments_pkey primary key (id)
);

-- Live estimated row count: 2
create table public.product_categories (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  constraint product_categories_pkey primary key (id),
  constraint product_categories_slug_key unique (slug)
);

-- Live estimated row count: 0
create table public.product_reviews (
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

-- Live estimated row count: 0
create table public.product_variants (
  id uuid not null default gen_random_uuid(),
  product_id uuid,
  variant_name text not null,
  sku text not null,
  price_delta numeric not null default 0,
  stock_quantity integer not null default 0,
  constraint product_variants_pkey primary key (id),
  constraint product_variants_sku_key unique (sku)
);

-- Live estimated row count: 6
create table public.products (
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

-- Live estimated row count: 2
create table public.profiles (
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

-- Live estimated row count: 4
create table public.promotions (
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

-- Live estimated row count: 2
create table public.shipping_methods (
  id uuid not null default gen_random_uuid(),
  name text not null,
  fee numeric not null default 0,
  is_active boolean not null default true,
  constraint shipping_methods_pkey primary key (id)
);

-- Live estimated row count: 0
create table public.warranties (
  id uuid not null default gen_random_uuid(),
  order_item_id uuid,
  device_id uuid,
  start_date date not null,
  end_date date not null,
  status public.warranty_status not null default 'active',
  constraint warranties_pkey primary key (id)
);

-- Live estimated row count: 0
create table public.warranty_claims (
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

-- Live estimated row count: 0
create table public.warranty_policies (
  id uuid not null default gen_random_uuid(),
  category_id uuid,
  duration_months integer not null default 12,
  constraint warranty_policies_pkey primary key (id)
);

-- Foreign keys

alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
alter table public.audit_logs add constraint audit_logs_actor_id_fkey foreign key (actor_id) references public.profiles(id);
alter table public.devices add constraint devices_product_id_fkey foreign key (product_id) references public.products(id);
alter table public.devices add constraint devices_owner_id_fkey foreign key (owner_id) references public.profiles(id);
alter table public.device_access add constraint device_access_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_access add constraint device_access_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.device_access add constraint device_access_invited_by_fkey foreign key (invited_by) references public.profiles(id);
alter table public.device_access_settings add constraint device_access_settings_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_credentials add constraint device_credentials_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_events add constraint device_events_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_one_time_pins add constraint device_one_time_pins_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_one_time_pins add constraint device_one_time_pins_created_by_fkey foreign key (created_by) references auth.users(id) on delete cascade;
alter table public.device_pairing_challenges add constraint device_pairing_challenges_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_pairing_challenges add constraint device_pairing_challenges_requested_by_fkey foreign key (requested_by) references auth.users(id) on delete cascade;
alter table public.device_pins add constraint device_pins_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_pins add constraint device_pins_created_by_fkey foreign key (created_by) references public.profiles(id);
alter table public.device_ota_updates add constraint device_ota_updates_device_id_fkey foreign key (device_id) references public.devices(id) on delete cascade;
alter table public.device_ota_updates add constraint device_ota_updates_triggered_by_fkey foreign key (triggered_by) references public.profiles(id);
alter table public.notification_preferences add constraint notification_preferences_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.notifications add constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.notifications add constraint notifications_device_id_fkey foreign key (device_id) references public.devices(id);
alter table public.products add constraint products_category_id_fkey foreign key (category_id) references public.product_categories(id);
alter table public.product_variants add constraint product_variants_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;
alter table public.orders add constraint orders_user_id_fkey foreign key (user_id) references public.profiles(id);
alter table public.orders add constraint orders_promotion_id_fkey foreign key (promotion_id) references public.promotions(id);
alter table public.order_items add constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
alter table public.order_items add constraint order_items_product_id_fkey foreign key (product_id) references public.products(id);
alter table public.order_items add constraint order_items_variant_id_fkey foreign key (variant_id) references public.product_variants(id);
alter table public.payments add constraint payments_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
alter table public.warranty_policies add constraint warranty_policies_category_id_fkey foreign key (category_id) references public.product_categories(id);
alter table public.warranties add constraint warranties_order_item_id_fkey foreign key (order_item_id) references public.order_items(id);
alter table public.warranties add constraint warranties_device_id_fkey foreign key (device_id) references public.devices(id);
alter table public.warranty_claims add constraint warranty_claims_warranty_id_fkey foreign key (warranty_id) references public.warranties(id) on delete cascade;
alter table public.warranty_claims add constraint warranty_claims_assigned_to_fkey foreign key (assigned_to) references public.profiles(id);
alter table public.product_reviews add constraint product_reviews_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;
alter table public.cms_reviews add constraint cms_reviews_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;

-- Confirmed live drift: device_commands predates the UUID command-queue migration.
-- The live table currently exposes device_id text, requested_by uuid nullable,
-- executed boolean default false, and has no claimed_at column.

-- Frequently used indexes confirmed by applied migrations/base schema.
create index idx_devices_owner on public.devices(owner_id);
create index device_events_device_created_idx on public.device_events(device_id, created_at desc);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications(user_id, is_read) where is_read = false;
create index device_one_time_pins_active_idx on public.device_one_time_pins(device_id, expires_at) where used_at is null;
create index idx_orders_user on public.orders(user_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_warranty_claims_status on public.warranty_claims(status);

-- RLS-enabled application tables confirmed by applied security migrations.
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.device_credentials enable row level security;
alter table public.device_pairing_challenges enable row level security;
alter table public.device_events enable row level security;
alter table public.device_access_settings enable row level security;
alter table public.device_one_time_pins enable row level security;
alter table public.device_commands enable row level security;

-- RPC signatures exposed by the live PostgREST schema.
-- claim_device_by_serial(p_serial_number)
-- confirm_device_pairing(p_challenge_id, p_otp_code)
-- create_device_one_time_pin(p_device_id, p_expires_minutes)
-- get_device_owner_id(p_device_token, p_serial_number)
-- get_pending_device_command(p_device_token, p_serial_number)
-- get_pending_device_pairing(p_device_token, p_serial_number)
-- report_device_event(p_description, p_device_token, p_event_type, p_payload, p_serial_number)
-- report_device_telemetry(p_device_state, p_device_token, p_door_status, p_lock_status, p_package_detected, p_scale_ready, p_serial_number, p_weight_kg)
-- reset_password_by_email(p_email, p_new_password)
-- set_device_access_pin(p_device_id, p_pin)
-- start_device_pairing(p_serial_number)
-- unbind_device_by_owner(p_device_id)
-- verify_device_access_pin(p_device_token, p_pin, p_serial_number)
-- verify_device_pin(p_device_token, p_passcode, p_pin, p_serial_number)
-- verify_passcode(p_device_token, p_passcode, p_serial_number)

-- Storage object policies and full SECURITY DEFINER function bodies are maintained
-- in supabase/migrations. They are intentionally not duplicated here, so migration
-- history remains the single executable source for security-sensitive behavior.
