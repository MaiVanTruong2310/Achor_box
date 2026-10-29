BEGIN;
CREATE TABLE public.delivery_installations (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
 assigned_to uuid NOT NULL REFERENCES public.profiles(id),
 status text NOT NULL CHECK(status IN('ASSIGNED','IN_PROGRESS','DELIVERED','INSTALLED','WAITING_PO_CONFIRMATION','COMPLETED','FAILED')),
 scheduled_at timestamptz NOT NULL,
 estimated_end_time timestamptz,
 started_at timestamptz, delivered_at timestamptz, installed_at timestamptz, completed_at timestamptz,
 installation_note text, failure_reason text, rework_notes text, completion_note text, completion_photos jsonb,
 customer_accepted boolean NOT NULL DEFAULT false,
 acceptance_evidence text,
 attempt integer NOT NULL DEFAULT 1 CHECK(attempt>0),
 version bigint NOT NULL DEFAULT 0 CHECK(version>=0),
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX idx_installation_assignee ON public.delivery_installations(assigned_to,scheduled_at,id);
CREATE INDEX idx_installation_status ON public.delivery_installations(status,scheduled_at,id);
CREATE TABLE public.delivery_installation_history (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES public.delivery_installations(id),
 actor_id uuid NOT NULL REFERENCES public.profiles(id),
 action text NOT NULL, from_status text, to_status text NOT NULL,
 reason text, attempt integer NOT NULL, version bigint NOT NULL, created_at timestamptz NOT NULL
);
CREATE TABLE public.delivery_installation_devices (
 job_id uuid NOT NULL REFERENCES public.delivery_installations(id),
 device_id uuid NOT NULL REFERENCES public.devices(id),
 order_item_id uuid NOT NULL REFERENCES public.order_items(id),
 has_weight_sensor boolean NOT NULL,
 linked_at timestamptz NOT NULL,
 PRIMARY KEY(job_id,device_id)
);
CREATE TABLE public.delivery_installation_commands (
 job_id uuid NOT NULL REFERENCES public.delivery_installations(id),
 device_id uuid NOT NULL REFERENCES public.devices(id),
 command_id uuid PRIMARY KEY REFERENCES public.device_commands(id),
 attempt integer NOT NULL, created_at timestamptz NOT NULL, version bigint NOT NULL
);
CREATE INDEX idx_installation_command_attempt ON public.delivery_installation_commands(job_id,attempt,device_id);
CREATE TABLE public.delivery_installation_requests (
 actor_id uuid NOT NULL REFERENCES public.profiles(id), request_key uuid NOT NULL,
 job_id uuid NOT NULL REFERENCES public.delivery_installations(id),
 fingerprint text NOT NULL, response text NOT NULL, created_at timestamptz NOT NULL,
 PRIMARY KEY(actor_id,request_key)
);
-- These tables are server-owned. Supabase browser clients must use the role/assignment-checked REST API.
ALTER TABLE public.delivery_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_installation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_installation_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_installation_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_installation_requests ENABLE ROW LEVEL SECURITY;
COMMIT;
