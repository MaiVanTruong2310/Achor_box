BEGIN;
ALTER TABLE public.profiles ADD COLUMN username varchar(32);
ALTER TABLE public.profiles ADD CONSTRAINT ck_profile_username CHECK(username IS NULL OR username ~ '^[a-z0-9][a-z0-9_.-]{2,31}$');
CREATE UNIQUE INDEX uk_profile_username ON public.profiles(username) WHERE username IS NOT NULL;
CREATE TABLE public.customers (
 id uuid PRIMARY KEY,
 profile_id uuid UNIQUE REFERENCES public.profiles(id),
 full_name varchar(200) NOT NULL,
 email varchar(254),phone varchar(30),address varchar(2000),notes varchar(2000),
 archived boolean NOT NULL DEFAULT false,
 creation_key uuid UNIQUE,
 request_hash text,
 created_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
INSERT INTO public.customers(id,profile_id,full_name,email,phone,address,created_at,updated_at)
 SELECT id,id,COALESCE(full_name,''),email,phone,default_address,created_at,updated_at FROM public.profiles WHERE role='customer';
CREATE FUNCTION public.sync_customer_profile() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.role='customer' OR EXISTS(SELECT 1 FROM public.customers WHERE profile_id=NEW.id) THEN
  INSERT INTO public.customers(id,profile_id,full_name,email,phone,address,created_at,updated_at)
   VALUES(NEW.id,NEW.id,COALESCE(NEW.full_name,''),NEW.email,NEW.phone,NEW.default_address,NEW.created_at,NEW.updated_at)
   ON CONFLICT(profile_id) DO UPDATE SET full_name=EXCLUDED.full_name,email=EXCLUDED.email,phone=EXCLUDED.phone,address=EXCLUDED.address,updated_at=EXCLUDED.updated_at;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_customer_profile_sync AFTER INSERT OR UPDATE OF full_name,email,phone,default_address,role ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.sync_customer_profile();
COMMIT;
