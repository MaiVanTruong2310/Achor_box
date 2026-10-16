-- Isolated integration-test schema derived from the supplied schema; no seed data.
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TYPE public.user_role AS ENUM ('super_admin','product_manager','technician','support_agent','accountant','customer');
CREATE TYPE public.device_status AS ENUM ('online','offline','maintenance','error');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','processing','shipping','delivered','completed','cancelled','refunded','awaiting_payment','paid','customer_decision_pending');
CREATE TYPE public.warranty_status AS ENUM ('active','expired','void');
CREATE TYPE public.claim_status AS ENUM ('new','in_progress','resolved','rejected');
CREATE DOMAIN public.access_level AS text;
CREATE DOMAIN public.pin_type AS text;
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  default_address text,
  role public.user_role NOT NULL DEFAULT 'customer'::user_role,
  is_locked boolean NOT NULL DEFAULT false,
  is_2fa_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  email character varying,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  meta jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  owner_id uuid,
  serial_number text NOT NULL UNIQUE,
  name text,
  location_label text,
  status public.device_status NOT NULL DEFAULT 'offline'::device_status,
  battery_level integer,
  firmware_version text,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  door_status text NOT NULL DEFAULT 'closed'::text,
  lock_status text NOT NULL DEFAULT 'locked'::text,
  weight_kg double precision NOT NULL DEFAULT 0,
  package_detected boolean NOT NULL DEFAULT false,
  scale_ready boolean NOT NULL DEFAULT false,
  device_state text NOT NULL DEFAULT 'starting'::text,
  mqtt_topic_id text,
  CONSTRAINT devices_pkey PRIMARY KEY (id)
);
CREATE TABLE public.device_access (
  device_id uuid NOT NULL,
  user_id uuid NOT NULL,
  level public.access_level NOT NULL DEFAULT 'view_only'::access_level,
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_access_pkey PRIMARY KEY (device_id, user_id)
);
CREATE TABLE public.device_pins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  code_hash text NOT NULL,
  type public.pin_type NOT NULL DEFAULT 'permanent'::pin_type,
  created_by uuid,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_pins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.device_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  CONSTRAINT device_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.device_ota_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  firmware_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  triggered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_ota_updates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  device_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id, event_type)
);
CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  CONSTRAINT product_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  images jsonb,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  manager_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  variant_name text NOT NULL,
  sku text NOT NULL UNIQUE,
  price_delta numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  CONSTRAINT product_variants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  description text,
  min_order_value numeric DEFAULT 0,
  max_discount numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  status public.order_status NOT NULL DEFAULT 'pending'::order_status,
  shipping_address text,
  tracking_number text,
  promotion_id uuid,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  provider text,
  transaction_ref text,
  paid_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.warranty_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  duration_months integer NOT NULL DEFAULT 12,
  CONSTRAINT warranty_policies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.warranties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_item_id uuid,
  device_id uuid,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.warranty_status NOT NULL DEFAULT 'active'::warranty_status,
  CONSTRAINT warranties_pkey PRIMARY KEY (id)
);
CREATE TABLE public.warranty_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  warranty_id uuid,
  description text NOT NULL,
  images jsonb,
  status public.claim_status NOT NULL DEFAULT 'new'::claim_status,
  assigned_to uuid,
  internal_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT warranty_claims_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shipping_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT shipping_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  channel text NOT NULL,
  subject text,
  body text NOT NULL,
  name character varying,
  description text,
  variables text,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cms_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  category character varying NOT NULL DEFAULT 'guide'::character varying,
  summary text,
  content text,
  cover_image text,
  author_name character varying DEFAULT 'Ban Biên Tập SmartBox'::character varying,
  status character varying NOT NULL DEFAULT 'published'::character varying,
  view_count integer NOT NULL DEFAULT 0,
  tags text,
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cms_articles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cms_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  image_url text NOT NULL,
  target_url text,
  position character varying NOT NULL DEFAULT 'hero_home'::character varying,
  display_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone DEFAULT (now() + '6 mons'::interval),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cms_banners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cms_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  product_name character varying NOT NULL,
  customer_name character varying NOT NULL,
  customer_email character varying,
  customer_phone character varying,
  rating integer NOT NULL DEFAULT 5,
  title character varying,
  comment text,
  images text,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  reject_reason text,
  admin_reply text,
  admin_replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cms_reviews_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cms_faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category character varying NOT NULL DEFAULT 'general'::character varying,
  display_order integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT true,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cms_faqs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.device_credentials (
  device_id uuid NOT NULL,
  token_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rotated_at timestamp with time zone,
  CONSTRAINT device_credentials_pkey PRIMARY KEY (device_id)
);
CREATE TABLE public.device_pairing_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  otp_code text NOT NULL CHECK (otp_code ~ '^[0-9]{6}$'::text),
  attempts smallint NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:05:00'::interval),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_pairing_challenges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.device_access_settings (
  device_id uuid NOT NULL,
  pin_salt text NOT NULL,
  pin_hash text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_access_settings_pkey PRIMARY KEY (device_id)
);
CREATE TABLE public.device_one_time_pins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  created_by uuid NOT NULL,
  pin_salt text NOT NULL,
  pin_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_one_time_pins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  product_name character varying,
  customer_name character varying NOT NULL,
  customer_email character varying,
  customer_phone character varying,
  rating integer NOT NULL DEFAULT 5,
  title character varying,
  comment text,
  images text,
  status character varying NOT NULL DEFAULT 'approved'::character varying,
  reject_reason text,
  admin_reply text,
  admin_replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_pkey PRIMARY KEY (id)
);
CREATE TABLE public.device_commands_legacy_20260923 (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  command text NOT NULL,
  requested_by uuid,
  executed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_commands_legacy_20260923_pkey PRIMARY KEY (id)
);
CREATE TABLE public.device_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  command text NOT NULL CHECK (command = ANY (ARRAY['UNLOCK'::text, 'LOCK'::text, 'TARE'::text])),
  requested_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed_at timestamp with time zone,
  CONSTRAINT device_commands_pkey PRIMARY KEY (id)
);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id);
ALTER TABLE public.devices ADD CONSTRAINT devices_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id);
ALTER TABLE public.devices ADD CONSTRAINT fk_devices_product FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.device_access ADD CONSTRAINT device_access_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_access ADD CONSTRAINT device_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.device_access ADD CONSTRAINT device_access_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
ALTER TABLE public.device_pins ADD CONSTRAINT device_pins_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_pins ADD CONSTRAINT device_pins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.device_events ADD CONSTRAINT device_events_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_ota_updates ADD CONSTRAINT device_ota_updates_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_ota_updates ADD CONSTRAINT device_ota_updates_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id);
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.warranty_policies ADD CONSTRAINT warranty_policies_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id);
ALTER TABLE public.warranties ADD CONSTRAINT warranties_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id);
ALTER TABLE public.warranties ADD CONSTRAINT warranties_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.warranty_claims ADD CONSTRAINT warranty_claims_warranty_id_fkey FOREIGN KEY (warranty_id) REFERENCES public.warranties(id);
ALTER TABLE public.warranty_claims ADD CONSTRAINT warranty_claims_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);
ALTER TABLE public.device_credentials ADD CONSTRAINT device_credentials_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_pairing_challenges ADD CONSTRAINT device_pairing_challenges_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_pairing_challenges ADD CONSTRAINT device_pairing_challenges_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);
ALTER TABLE public.device_access_settings ADD CONSTRAINT device_access_settings_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_one_time_pins ADD CONSTRAINT device_one_time_pins_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_one_time_pins ADD CONSTRAINT device_one_time_pins_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.device_commands ADD CONSTRAINT device_commands_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);
ALTER TABLE public.device_commands ADD CONSTRAINT device_commands_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);