CREATE DOMAIN public.order_status AS varchar;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,email text,full_name text,phone text,avatar_url text,default_address text,username text,role text DEFAULT 'customer',is_locked boolean DEFAULT false,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE public.product_categories(id uuid PRIMARY KEY,name text NOT NULL,slug text UNIQUE NOT NULL,description text,manager_id uuid);
CREATE TABLE public.products(id uuid PRIMARY KEY,name text NOT NULL,price numeric NOT NULL,category_id uuid REFERENCES public.product_categories(id),is_active boolean NOT NULL,manager_id uuid);
CREATE TABLE public.product_variants(id uuid PRIMARY KEY,product_id uuid REFERENCES public.products(id),variant_name text NOT NULL,sku text UNIQUE NOT NULL,price_delta numeric NOT NULL,stock_quantity integer NOT NULL,is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.orders(id uuid PRIMARY KEY,user_id uuid REFERENCES public.profiles(id),status public.order_status NOT NULL,shipping_address text,total numeric NOT NULL,tracking_number text,subtotal numeric,discount_amount numeric DEFAULT 0,voucher_code text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE public.order_items(id uuid PRIMARY KEY,order_id uuid REFERENCES public.orders(id),product_id uuid REFERENCES public.products(id),variant_id uuid REFERENCES public.product_variants(id),quantity integer NOT NULL,unit_price numeric NOT NULL);
CREATE TABLE public.payments(id uuid PRIMARY KEY,order_id uuid REFERENCES public.orders(id),amount numeric NOT NULL,status text NOT NULL,provider text,transaction_ref text,paid_at timestamptz);
CREATE DOMAIN public.device_status AS varchar;
CREATE TABLE public.devices(id uuid PRIMARY KEY,product_id uuid,owner_id uuid,name text,serial_number text,mqtt_topic_id text,status public.device_status DEFAULT 'offline',door_status text DEFAULT 'closed',lock_status text DEFAULT 'locked',weight_kg double precision DEFAULT 0,package_detected boolean DEFAULT false,last_seen_at timestamptz,created_at timestamptz DEFAULT now());
CREATE TABLE public.audit_logs(id uuid PRIMARY KEY,actor_id uuid,action text,target_table text,target_id uuid,meta jsonb,created_at timestamptz);
CREATE TABLE public.device_commands(id uuid PRIMARY KEY,device_id uuid,command text,requested_by uuid,created_at timestamptz DEFAULT now(),claimed_at timestamptz);
CREATE TABLE public.device_events(id uuid PRIMARY KEY,device_id uuid,event_type text,payload jsonb,created_at timestamptz);
CREATE TABLE public.notifications(id uuid PRIMARY KEY,user_id uuid,device_id uuid,type text,title text,body text,is_read boolean DEFAULT false,created_at timestamptz DEFAULT now());
CREATE TABLE public.notification_preferences(user_id uuid,event_type text,enabled boolean DEFAULT true,PRIMARY KEY(user_id,event_type));


CREATE TABLE public.warranty_policies(id uuid PRIMARY KEY,category_id uuid,duration_months integer NOT NULL DEFAULT 12);
CREATE DOMAIN public.warranty_status AS varchar;
CREATE TABLE public.warranties(id uuid PRIMARY KEY,order_item_id uuid REFERENCES public.order_items(id),device_id uuid REFERENCES public.devices(id),start_date date NOT NULL,end_date date NOT NULL,status public.warranty_status DEFAULT 'active');
CREATE TABLE public.warranty_claims(id uuid PRIMARY KEY,warranty_id uuid REFERENCES public.warranties(id),customer_id uuid,assigned_to uuid,status varchar(50) DEFAULT 'new',scheduled_at timestamptz,estimated_end_time timestamptz);
