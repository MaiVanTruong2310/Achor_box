BEGIN;
-- Abort rather than silently rewriting legacy paid items or invalid inventory.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.order_items WHERE variant_id IS NOT NULL GROUP BY order_id,variant_id HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Duplicate order variant items: review before migration'; END IF;
 IF EXISTS (SELECT 1 FROM public.product_variants WHERE stock_quantity<0)
 THEN RAISE EXCEPTION 'Negative variant inventory: review before migration'; END IF;
END $$;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS size text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS capacity_liter integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_variant_stock') THEN
    ALTER TABLE public.product_variants ADD CONSTRAINT ck_variant_stock CHECK (stock_quantity>=0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_variant_capacity') THEN
    ALTER TABLE public.product_variants ADD CONSTRAINT ck_variant_capacity CHECK (capacity_liter IS NULL OR capacity_liter>0);
  END IF;
END $$;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_released boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS workflow_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voucher_code text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS capacity_liter_snapshot integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uk_order_item_variant') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT uk_order_item_variant UNIQUE (order_id,variant_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_order_item_quantity') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT ck_order_item_quantity CHECK(quantity BETWEEN 1 AND 99) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_order_item_price') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT ck_order_item_price CHECK(unit_price>=0) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS uk_payment_workflow_order ON public.payments(order_id) WHERE expires_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.checkout_keys (
 key text PRIMARY KEY CHECK(length(key)<=128), order_id uuid NOT NULL REFERENCES public.orders(id),
 payment_id uuid REFERENCES public.payments(id), created_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL, response text
);
CREATE TABLE IF NOT EXISTS public.order_status_history (
 id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.orders(id),
 from_status text, to_status text NOT NULL, changed_by text NOT NULL,
 reason text NOT NULL, created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_history ON public.order_status_history(order_id,created_at);
CREATE TABLE IF NOT EXISTS public.inventory_movements (
 id uuid PRIMARY KEY, variant_id uuid NOT NULL REFERENCES public.product_variants(id),
 order_id uuid REFERENCES public.orders(id), delta integer NOT NULL,
 reason text NOT NULL, actor_id uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.approval_tickets (
 id uuid PRIMARY KEY, order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
 status text NOT NULL CHECK(status IN ('PENDING','RETURNED','APPROVED','REJECTED','PARTIALLY_REJECTED','CANCELLED')),
 review_round integer NOT NULL DEFAULT 1, reason text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ticket_history (
 id uuid PRIMARY KEY, ticket_id uuid NOT NULL REFERENCES public.approval_tickets(id),
 action text NOT NULL, actor_id uuid REFERENCES public.profiles(id), reason text,
 created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ticket_history ON public.ticket_history(ticket_id,created_at);
CREATE TABLE IF NOT EXISTS public.order_item_approvals (
 id uuid PRIMARY KEY, ticket_id uuid NOT NULL REFERENCES public.approval_tickets(id) ON DELETE CASCADE,
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.products(id),
 manager_id uuid REFERENCES public.profiles(id),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 reviewed_by uuid REFERENCES public.profiles(id), reason text, reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_approvals_ticket ON public.order_item_approvals(ticket_id);
CREATE INDEX IF NOT EXISTS idx_item_approvals_manager ON public.order_item_approvals(manager_id);
CREATE TABLE IF NOT EXISTS public.refunds (
 id uuid PRIMARY KEY, payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id),
 order_id uuid NOT NULL REFERENCES public.orders(id), amount numeric NOT NULL CHECK(amount>=0),
 status text NOT NULL CHECK(status IN ('PENDING','COMPLETED')), reason text NOT NULL,
 provider_ref text UNIQUE, created_at timestamptz NOT NULL, completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.email_outbox (
 id uuid PRIMARY KEY, template text NOT NULL, reference_id uuid NOT NULL,
 event_key text NOT NULL UNIQUE, recipient text NOT NULL, payload text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENT','FAILED')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL,
 last_error varchar(1000), created_at timestamptz NOT NULL, sent_at timestamptz,
 claim_token uuid, claimed_until timestamptz,
 CONSTRAINT uk_outbox_template_event UNIQUE(template,reference_id,event_key)
);
CREATE INDEX IF NOT EXISTS idx_outbox_due ON public.email_outbox(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_order_expiry ON public.orders(status,expires_at) WHERE workflow_version=2;
CREATE INDEX IF NOT EXISTS idx_orders_paid ON public.orders(paid_at,user_id);
CREATE TABLE IF NOT EXISTS public.shipments (
 id uuid PRIMARY KEY, order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
 carrier text, tracking_number text, status text NOT NULL CHECK(status IN ('PREPARING','SHIPPED','DELIVERED')),
 created_at timestamptz NOT NULL, delivered_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.shipment_history (
 id uuid PRIMARY KEY, shipment_id uuid NOT NULL REFERENCES public.shipments(id),
 status text NOT NULL, actor_id uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL
);
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS sold_order_item_id uuid REFERENCES public.order_items(id);
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS activated_at timestamptz;
CREATE TABLE IF NOT EXISTS public.report_definitions(code text PRIMARY KEY, name text NOT NULL, query_sql text NOT NULL);
CREATE TABLE IF NOT EXISTS public.report_params (
 report_code text NOT NULL REFERENCES public.report_definitions(code), name text NOT NULL,
 data_type text NOT NULL, required boolean NOT NULL, max_days integer,
 PRIMARY KEY(report_code,name)
);
INSERT INTO public.report_definitions VALUES ('RPT_REVENUE_DAILY','Báo cáo doanh thu theo ngày',
 'SELECT CAST(o.paid_at AT TIME ZONE ''Asia/Ho_Chi_Minh'' AS date) AS day, count(*) AS orders, sum(o.total) AS revenue FROM public.orders o WHERE o.paid_at>=:rangeStart AND o.paid_at<:rangeEnd AND o.status IN (''paid'',''confirmed'',''completed'') AND (CAST(:customerId AS uuid) IS NULL OR o.user_id=CAST(:customerId AS uuid)) AND (:minAmount IS NULL OR o.total>=:minAmount) GROUP BY day ORDER BY day')
 ON CONFLICT (code) DO NOTHING;
INSERT INTO public.report_params VALUES
 ('RPT_REVENUE_DAILY','fromDate','DATE',true,NULL),
 ('RPT_REVENUE_DAILY','toDate','DATE',true,92),
 ('RPT_REVENUE_DAILY','customerId','UUID',false,NULL),
 ('RPT_REVENUE_DAILY','minAmount','DECIMAL',false,NULL)
 ON CONFLICT (report_code, name) DO NOTHING;
COMMIT;
