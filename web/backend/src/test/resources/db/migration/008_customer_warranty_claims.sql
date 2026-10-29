BEGIN;
ALTER TABLE public.warranty_claims ADD COLUMN customer_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.warranty_claims ADD COLUMN request_key uuid;
ALTER TABLE public.warranty_claims ADD COLUMN request_hash text;
ALTER TABLE public.warranty_claims ADD COLUMN scheduled_at timestamptz;
ALTER TABLE public.warranty_claims ADD COLUMN estimated_end_time timestamptz;
CREATE UNIQUE INDEX uk_customer_claim_request ON public.warranty_claims(customer_id,request_key);
CREATE TABLE public.warranty_claim_images (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES public.profiles(id),
 warranty_id uuid NOT NULL REFERENCES public.warranties(id),
 claim_id uuid REFERENCES public.warranty_claims(id),
 public_id text NOT NULL UNIQUE,
 secure_url text NOT NULL,
 created_at timestamptz NOT NULL
);
CREATE INDEX idx_claim_images_owner ON public.warranty_claim_images(owner_id,warranty_id,created_at);
ALTER TABLE public.warranty_claim_images ENABLE ROW LEVEL SECURITY;
COMMIT;
