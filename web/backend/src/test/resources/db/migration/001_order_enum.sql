-- Run separately and COMMIT before 002. PostgreSQL cannot use new enum values
-- in the transaction that added them. Existing labels/rows are retained.
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'customer_decision_pending';
