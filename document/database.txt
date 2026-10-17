-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE auth.users (
  instance_id uuid,
  id uuid NOT NULL,
  aud character varying,
  role character varying,
  email character varying,
  encrypted_password character varying,
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token character varying,
  confirmation_sent_at timestamp with time zone,
  recovery_token character varying,
  recovery_sent_at timestamp with time zone,
  email_change_token_new character varying,
  email_change character varying,
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone text DEFAULT NULL::character varying UNIQUE,
  phone_confirmed_at timestamp with time zone,
  phone_change text DEFAULT ''::character varying,
  phone_change_token character varying DEFAULT ''::character varying,
  phone_change_sent_at timestamp with time zone,
  confirmed_at timestamp with time zone DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
  email_change_token_current character varying DEFAULT ''::character varying,
  email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
  banned_until timestamp with time zone,
  reauthentication_token character varying DEFAULT ''::character varying,
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  is_anonymous boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.refresh_tokens (
  instance_id uuid,
  id bigint NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
  token character varying UNIQUE,
  user_id character varying,
  revoked boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  parent character varying,
  session_id uuid,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.instances (
  id uuid NOT NULL,
  uuid uuid,
  raw_base_config text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT instances_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.audit_log_entries (
  instance_id uuid,
  id uuid NOT NULL,
  payload json,
  created_at timestamp with time zone,
  ip_address character varying NOT NULL DEFAULT ''::character varying,
  CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.schema_migrations (
  version character varying NOT NULL,
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE auth.identities (
  provider_id text NOT NULL,
  user_id uuid NOT NULL,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text DEFAULT lower((identity_data ->> 'email'::text)),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT identities_pkey PRIMARY KEY (id),
  CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.sessions (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  factor_id uuid,
  aal USER-DEFINED,
  not_after timestamp with time zone,
  refreshed_at timestamp without time zone,
  user_agent text,
  ip inet,
  tag text,
  oauth_client_id uuid,
  refresh_token_hmac_key text,
  refresh_token_counter bigint,
  scopes text CHECK (char_length(scopes) <= 4096),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id)
);
CREATE TABLE auth.mfa_factors (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  friendly_name text,
  factor_type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  secret text,
  phone text,
  last_challenged_at timestamp with time zone UNIQUE,
  web_authn_credential jsonb,
  web_authn_aaguid uuid,
  last_webauthn_challenge_data jsonb,
  CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.mfa_challenges (
  id uuid NOT NULL,
  factor_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  ip_address inet NOT NULL,
  otp_code text,
  web_authn_session_data jsonb,
  CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id)
);
CREATE TABLE auth.mfa_amr_claims (
  session_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  authentication_method text NOT NULL,
  id uuid NOT NULL,
  CONSTRAINT mfa_amr_claims_pkey PRIMARY KEY (id),
  CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.sso_providers (
  id uuid NOT NULL,
  resource_id text CHECK (resource_id = NULL::text OR char_length(resource_id) > 0),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  disabled boolean,
  CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.sso_domains (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  domain text NOT NULL CHECK (char_length(domain) > 0),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
  CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_providers (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  entity_id text NOT NULL UNIQUE CHECK (char_length(entity_id) > 0),
  metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0),
  metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0),
  attribute_mapping jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  name_id_format text,
  CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
  CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_relay_states (
  id uuid NOT NULL,
  sso_provider_id uuid NOT NULL,
  request_id text NOT NULL CHECK (char_length(request_id) > 0),
  for_email text,
  redirect_to text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  flow_state_id uuid,
  CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
  CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id),
  CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id)
);
CREATE TABLE auth.flow_state (
  id uuid NOT NULL,
  user_id uuid,
  auth_code text,
  code_challenge_method USER-DEFINED,
  code_challenge text,
  provider_type text NOT NULL,
  provider_access_token text,
  provider_refresh_token text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  authentication_method text NOT NULL,
  auth_code_issued_at timestamp with time zone,
  invite_token text,
  referrer text,
  oauth_client_state_id uuid,
  linking_target_id uuid,
  email_optional boolean NOT NULL DEFAULT false,
  CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.one_time_tokens (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_type USER-DEFINED NOT NULL,
  token_hash text NOT NULL CHECK (char_length(token_hash) > 0),
  relates_to text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.oauth_clients (
  id uuid NOT NULL,
  client_secret_hash text,
  registration_type USER-DEFINED NOT NULL,
  redirect_uris text NOT NULL,
  grant_types text NOT NULL,
  client_name text CHECK (char_length(client_name) <= 1024),
  client_uri text CHECK (char_length(client_uri) <= 2048),
  logo_uri text CHECK (char_length(logo_uri) <= 2048),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  client_type USER-DEFINED NOT NULL DEFAULT 'confidential'::auth.oauth_client_type,
  token_endpoint_auth_method text NOT NULL CHECK (token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])),
  CONSTRAINT oauth_clients_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.oauth_authorizations (
  id uuid NOT NULL,
  authorization_id text NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  user_id uuid,
  redirect_uri text NOT NULL CHECK (char_length(redirect_uri) <= 2048),
  scope text NOT NULL CHECK (char_length(scope) <= 4096),
  state text CHECK (char_length(state) <= 4096),
  resource text CHECK (char_length(resource) <= 2048),
  code_challenge text CHECK (char_length(code_challenge) <= 128),
  code_challenge_method USER-DEFINED,
  response_type USER-DEFINED NOT NULL DEFAULT 'code'::auth.oauth_response_type,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::auth.oauth_authorization_status,
  authorization_code text UNIQUE CHECK (char_length(authorization_code) <= 255),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:03:00'::interval),
  approved_at timestamp with time zone,
  nonce text CHECK (char_length(nonce) <= 255),
  CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id),
  CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.oauth_consents (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  scopes text NOT NULL CHECK (char_length(scopes) <= 2048),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  CONSTRAINT oauth_consents_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id)
);
CREATE TABLE auth.oauth_client_states (
  id uuid NOT NULL,
  provider_type text NOT NULL,
  code_verifier text,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.custom_oauth_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_type text NOT NULL CHECK (provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text])),
  identifier text NOT NULL UNIQUE CHECK (identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text),
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  client_id text NOT NULL CHECK (char_length(client_id) >= 1 AND char_length(client_id) <= 512),
  client_secret text NOT NULL,
  acceptable_client_ids ARRAY NOT NULL DEFAULT '{}'::text[],
  scopes ARRAY NOT NULL DEFAULT '{}'::text[],
  pkce_enabled boolean NOT NULL DEFAULT true,
  attribute_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  authorization_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  email_optional boolean NOT NULL DEFAULT false,
  issuer text CHECK (issuer IS NULL OR char_length(issuer) >= 1 AND char_length(issuer) <= 2048),
  discovery_url text CHECK (discovery_url IS NULL OR char_length(discovery_url) <= 2048),
  skip_nonce_check boolean NOT NULL DEFAULT false,
  cached_discovery jsonb,
  discovery_cached_at timestamp with time zone,
  authorization_url text CHECK (authorization_url IS NULL OR authorization_url ~~ 'https://%'::text),
  token_url text CHECK (token_url IS NULL OR token_url ~~ 'https://%'::text),
  userinfo_url text CHECK (userinfo_url IS NULL OR userinfo_url ~~ 'https://%'::text),
  jwks_uri text CHECK (jwks_uri IS NULL OR jwks_uri ~~ 'https://%'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  custom_claims_allowlist ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.webauthn_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id bytea NOT NULL,
  public_key bytea NOT NULL,
  attestation_type text NOT NULL DEFAULT ''::text,
  aaguid uuid,
  sign_count bigint NOT NULL DEFAULT 0,
  transports jsonb NOT NULL DEFAULT '[]'::jsonb,
  backup_eligible boolean NOT NULL DEFAULT false,
  backed_up boolean NOT NULL DEFAULT false,
  friendly_name text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.webauthn_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  challenge_type text NOT NULL CHECK (challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])),
  session_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);



-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  default_address text,
  role USER-DEFINED NOT NULL DEFAULT 'customer'::user_role,
  is_locked boolean NOT NULL DEFAULT false,
  is_2fa_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  meta jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  owner_id uuid,
  serial_number text NOT NULL UNIQUE,
  name text,
  location_label text,
  status USER-DEFINED NOT NULL DEFAULT 'offline'::device_status,
  battery_level integer,
  firmware_version text,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (id),
  CONSTRAINT devices_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT fk_devices_product FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.device_access (
  device_id uuid NOT NULL,
  user_id uuid NOT NULL,
  level USER-DEFINED NOT NULL DEFAULT 'view_only'::access_level,
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_access_pkey PRIMARY KEY (device_id, user_id),
  CONSTRAINT device_access_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id),
  CONSTRAINT device_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT device_access_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.device_pins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  code_hash text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'permanent'::pin_type,
  created_by uuid,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_pins_pkey PRIMARY KEY (id),
  CONSTRAINT device_pins_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id),
  CONSTRAINT device_pins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.device_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_events_pkey PRIMARY KEY (id),
  CONSTRAINT device_events_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id)
);
CREATE TABLE public.device_ota_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  firmware_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  triggered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_ota_updates_pkey PRIMARY KEY (id),
  CONSTRAINT device_ota_updates_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id),
  CONSTRAINT device_ota_updates_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id)
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
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id)
);
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id, event_type),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id)
);
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  variant_name text NOT NULL,
  sku text NOT NULL UNIQUE,
  price_delta numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
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
  CONSTRAINT promotions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::order_status,
  shipping_address text,
  tracking_number text,
  promotion_id uuid,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT orders_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  provider text,
  transaction_ref text,
  paid_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.warranty_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  duration_months integer NOT NULL DEFAULT 12,
  CONSTRAINT warranty_policies_pkey PRIMARY KEY (id),
  CONSTRAINT warranty_policies_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id)
);
CREATE TABLE public.warranties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_item_id uuid,
  device_id uuid,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'active'::warranty_status,
  CONSTRAINT warranties_pkey PRIMARY KEY (id),
  CONSTRAINT warranties_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id),
  CONSTRAINT warranties_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id)
);
CREATE TABLE public.warranty_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  warranty_id uuid,
  description text NOT NULL,
  images jsonb,
  status USER-DEFINED NOT NULL DEFAULT 'new'::claim_status,
  assigned_to uuid,
  internal_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT warranty_claims_pkey PRIMARY KEY (id),
  CONSTRAINT warranty_claims_warranty_id_fkey FOREIGN KEY (warranty_id) REFERENCES public.warranties(id),
  CONSTRAINT warranty_claims_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  user_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::review_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text,
  cover_image text,
  status text NOT NULL DEFAULT 'draft'::text,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id),
  CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  position text,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  CONSTRAINT banners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  order_index integer NOT NULL DEFAULT 0,
  CONSTRAINT faqs_pkey PRIMARY KEY (id)
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
  CONSTRAINT message_templates_pkey PRIMARY KEY (id)
);