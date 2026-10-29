BEGIN;
-- Preserve historical completed orders. Guard only a NEW transition into completed.
CREATE FUNCTION public.require_installation_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status::text='completed' AND OLD.status::text IS DISTINCT FROM 'completed' THEN
  IF OLD.status::text<>'confirmed' OR NOT EXISTS (
   SELECT 1 FROM public.delivery_installations j
   WHERE j.order_id=NEW.id AND j.status='COMPLETED' AND j.customer_accepted=true AND j.completed_at IS NOT NULL
  ) THEN
   RAISE EXCEPTION 'INSTALLATION_ACCEPTANCE_REQUIRED' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER trg_order_installation_acceptance BEFORE UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.require_installation_acceptance();
COMMIT;
