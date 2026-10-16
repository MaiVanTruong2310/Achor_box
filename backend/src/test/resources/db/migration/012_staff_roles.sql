BEGIN;
-- Retired staff roles require explicit administrator review before being unlocked.
UPDATE public.profiles SET role='product_manager',is_locked=true,updated_at=now()
 WHERE role IN('support_agent','accountant');
ALTER TABLE public.profiles ADD CONSTRAINT ck_active_profile_role
 CHECK(role::text IN('super_admin','product_manager','technician','customer'));
COMMIT;
