BEGIN;
CREATE TABLE public.sales_invoices (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
 invoice_number text NOT NULL UNIQUE,
 snapshot text NOT NULL,
 issued_at timestamptz NOT NULL,
 issued_by uuid NOT NULL REFERENCES public.profiles(id)
);
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
-- Backend-only writes. A snapshot cannot be rewritten on subsequent print/download.
CREATE FUNCTION public.guard_sales_invoice_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Sales invoice snapshots are immutable';
END $$;
CREATE TRIGGER trg_sales_invoice_immutable BEFORE UPDATE OR DELETE ON public.sales_invoices
 FOR EACH ROW EXECUTE FUNCTION public.guard_sales_invoice_snapshot();
COMMIT;
