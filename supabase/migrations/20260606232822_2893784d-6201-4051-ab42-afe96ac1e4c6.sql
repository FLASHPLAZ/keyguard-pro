
CREATE OR REPLACE FUNCTION public.enforce_license_creation_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_plan TEXT;
  t_suspended BOOLEAN;
  t_expires TIMESTAMPTZ;
  app_tenant UUID;
  r_credits INT;
  rac_id UUID;
BEGIN
  -- Resolve tenant for this license (prefer NEW.tenant_id, else from application)
  IF NEW.tenant_id IS NOT NULL THEN
    SELECT plan, suspended, plan_expires_at INTO t_plan, t_suspended, t_expires
    FROM public.tenants WHERE id = NEW.tenant_id;
  ELSE
    SELECT tenant_id INTO app_tenant FROM public.applications WHERE id = NEW.application_id;
    IF app_tenant IS NOT NULL THEN
      SELECT plan, suspended, plan_expires_at INTO t_plan, t_suspended, t_expires
      FROM public.tenants WHERE id = app_tenant;
    END IF;
  END IF;

  IF t_suspended THEN
    RAISE EXCEPTION 'Account suspended — cannot create license keys' USING ERRCODE = 'check_violation';
  END IF;

  IF t_expires IS NOT NULL AND t_expires < now() AND t_plan NOT IN ('free','platform') THEN
    RAISE EXCEPTION 'Subscription expired — please renew to create new license keys' USING ERRCODE = 'check_violation';
  END IF;

  -- Reseller credit enforcement (atomic)
  IF NEW.created_by_reseller IS NOT NULL THEN
    SELECT id, credits INTO rac_id, r_credits
    FROM public.reseller_app_credits
    WHERE reseller_id = NEW.created_by_reseller
      AND application_id = NEW.application_id
    FOR UPDATE;

    IF rac_id IS NULL OR r_credits IS NULL OR r_credits < 1 THEN
      RAISE EXCEPTION 'Insufficient reseller credits for this application' USING ERRCODE = 'check_violation';
    END IF;

    UPDATE public.reseller_app_credits
    SET credits = credits - 1,
        total_generated = total_generated + 1,
        updated_at = now()
    WHERE id = rac_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_license_creation_limits ON public.licenses;
CREATE TRIGGER trg_enforce_license_creation_limits
BEFORE INSERT ON public.licenses
FOR EACH ROW EXECUTE FUNCTION public.enforce_license_creation_limits();
