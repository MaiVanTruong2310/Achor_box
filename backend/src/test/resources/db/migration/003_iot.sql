BEGIN;
ALTER TABLE public.products ADD COLUMN has_weight_sensor boolean NOT NULL DEFAULT false;
ALTER TABLE public.devices ADD COLUMN product_variant_id uuid REFERENCES public.product_variants(id);
CREATE UNIQUE INDEX uk_device_mqtt_topic ON public.devices(mqtt_topic_id) WHERE mqtt_topic_id IS NOT NULL;
ALTER TABLE public.device_commands ADD COLUMN status text NOT NULL DEFAULT 'LEGACY';
ALTER TABLE public.device_commands ADD COLUMN request_key uuid;
ALTER TABLE public.device_commands ADD COLUMN expires_at timestamptz;
ALTER TABLE public.device_commands ADD COLUMN next_attempt_at timestamptz;
ALTER TABLE public.device_commands ADD COLUMN attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.device_commands ADD COLUMN last_error text;
ALTER TABLE public.device_commands ADD COLUMN ack_at timestamptz;
ALTER TABLE public.device_commands ADD CONSTRAINT uk_command_request UNIQUE(device_id,requested_by,request_key);
CREATE INDEX idx_commands_due ON public.device_commands(status,next_attempt_at);
CREATE TABLE public.sensor_readings (
 id uuid PRIMARY KEY, device_id uuid NOT NULL REFERENCES public.devices(id),
 weight_kg double precision, distance_cm double precision, door_status text,
 payload jsonb NOT NULL, received_at timestamptz NOT NULL
);
CREATE INDEX idx_sensor_device_time ON public.sensor_readings(device_id,received_at);
CREATE TABLE public.delivery_packages (
 id uuid PRIMARY KEY, device_id uuid NOT NULL REFERENCES public.devices(id),
 weight_kg double precision, detected_at timestamptz NOT NULL, collected_at timestamptz,
 status text NOT NULL CHECK(status IN('DELIVERED','COLLECTED'))
);
CREATE TABLE public.push_tokens (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),token text NOT NULL UNIQUE,created_at timestamptz NOT NULL
);
CREATE TABLE public.push_outbox (
 id uuid PRIMARY KEY,notification_id uuid NOT NULL UNIQUE REFERENCES public.notifications(id),
 status text NOT NULL DEFAULT 'PENDING',attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL,last_error text,claim_token uuid,claimed_until timestamptz
);
CREATE INDEX idx_push_due ON public.push_outbox(status,next_attempt_at);
CREATE TABLE public.push_deliveries (
 notification_id uuid NOT NULL REFERENCES public.notifications(id),token_id uuid NOT NULL REFERENCES public.push_tokens(id) ON DELETE CASCADE,
 sent_at timestamptz NOT NULL,PRIMARY KEY(notification_id,token_id)
);
COMMIT;
