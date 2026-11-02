-- Màu hộp là một chiều của biến thể (tồn kho tách theo màu).
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS color_name text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS color_hex text;
DO $$ BEGIN
  ALTER TABLE public.product_variants ADD CONSTRAINT ck_variant_color_hex CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Gói bảo hành mua thêm, cộng vào thời hạn bảo hành của từng dòng đơn hàng.
CREATE TABLE IF NOT EXISTS public.warranty_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  extra_months integer NOT NULL CHECK (extra_months BETWEEN 1 AND 60),
  price numeric NOT NULL CHECK (price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warranty_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS warranty_plan_id uuid REFERENCES public.warranty_plans(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS warranty_plan_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS warranty_extra_months integer NOT NULL DEFAULT 0;
