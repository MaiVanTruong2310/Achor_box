BEGIN;
ALTER TABLE public.payments ADD COLUMN provider_environment text;
ALTER TABLE public.payments ADD COLUMN provider_terminal text;
ALTER TABLE public.payments ADD COLUMN gateway_reference text;
ALTER TABLE public.payments ADD COLUMN gateway_paid_at timestamptz;
ALTER TABLE public.payments ADD COLUMN gateway_response_code text;
ALTER TABLE public.payments ADD COLUMN gateway_transaction_status text;
UPDATE public.payments SET provider_environment='mock' WHERE provider='mock';
CREATE UNIQUE INDEX uk_gateway_reference ON public.payments(provider,provider_environment,provider_terminal,gateway_reference) WHERE gateway_reference IS NOT NULL;
CREATE UNIQUE INDEX uk_vnpay_transaction ON public.payments(provider,provider_environment,provider_terminal,transaction_ref) WHERE provider='vnpay' AND provider_environment='sandbox' AND transaction_ref IS NOT NULL;
CREATE TABLE public.payment_provider_notifications (
 id uuid PRIMARY KEY,
 payment_id uuid NOT NULL REFERENCES public.payments(id),
 fingerprint text NOT NULL,
 response_code text NOT NULL,
 transaction_status text NOT NULL,
 created_at timestamptz NOT NULL,
 UNIQUE(payment_id,fingerprint)
);
ALTER TABLE public.payment_provider_notifications ENABLE ROW LEVEL SECURITY;
COMMIT;
