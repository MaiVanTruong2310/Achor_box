BEGIN;
CREATE TABLE public.customer_addresses (
 id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES public.profiles(id),
 label varchar(100) NOT NULL, recipient_name varchar(200) NOT NULL,
 phone varchar(30) NOT NULL, address_line varchar(2000) NOT NULL,
 installation_note varchar(2000), is_default boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_addresses ON public.customer_addresses(customer_id,created_at,id);
CREATE UNIQUE INDEX uk_customer_default_address ON public.customer_addresses(customer_id) WHERE is_default;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ADD COLUMN shipping_address_snapshot text;
-- Deliberately no address FK: deleting an address cannot erase a historical order snapshot.
ALTER TABLE public.orders ADD COLUMN source_address_id uuid;
CREATE FUNCTION public.guard_order_address_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status::text<>'pending' AND (
  NEW.shipping_address IS DISTINCT FROM OLD.shipping_address OR
  NEW.shipping_address_snapshot IS DISTINCT FROM OLD.shipping_address_snapshot OR
  NEW.source_address_id IS DISTINCT FROM OLD.source_address_id
 ) THEN
  RAISE EXCEPTION 'ORDER_ADDRESS_FROZEN' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER trg_order_address_snapshot BEFORE UPDATE ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.guard_order_address_snapshot();
COMMIT;
