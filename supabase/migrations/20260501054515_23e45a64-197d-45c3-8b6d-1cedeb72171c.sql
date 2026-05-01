
-- Auto-fill tenant_id on inserts based on auth.uid()'s workspace
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  derived_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try owner's tenant first
  SELECT id INTO derived_tenant FROM public.tenants WHERE owner_user_id = auth.uid() LIMIT 1;

  -- If user is a reseller, use their tenant
  IF derived_tenant IS NULL THEN
    SELECT tenant_id INTO derived_tenant FROM public.resellers WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  -- If user is a manager, use their tenant
  IF derived_tenant IS NULL THEN
    SELECT tenant_id INTO derived_tenant FROM public.manager_permissions WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  NEW.tenant_id := derived_tenant;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_tenant_id_from_auth() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS auto_tenant_id_applications ON public.applications;
CREATE TRIGGER auto_tenant_id_applications
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

DROP TRIGGER IF EXISTS auto_tenant_id_licenses ON public.licenses;
CREATE TRIGGER auto_tenant_id_licenses
  BEFORE INSERT ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

DROP TRIGGER IF EXISTS auto_tenant_id_activity_logs ON public.activity_logs;
CREATE TRIGGER auto_tenant_id_activity_logs
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

DROP TRIGGER IF EXISTS auto_tenant_id_blacklist ON public.blacklist;
CREATE TRIGGER auto_tenant_id_blacklist
  BEFORE INSERT ON public.blacklist
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

DROP TRIGGER IF EXISTS auto_tenant_id_settings ON public.settings;
CREATE TRIGGER auto_tenant_id_settings
  BEFORE INSERT ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

DROP TRIGGER IF EXISTS auto_tenant_id_resellers ON public.resellers;
CREATE TRIGGER auto_tenant_id_resellers
  BEFORE INSERT ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

DROP TRIGGER IF EXISTS auto_tenant_id_manager_permissions ON public.manager_permissions;
CREATE TRIGGER auto_tenant_id_manager_permissions
  BEFORE INSERT ON public.manager_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

-- Tighten security definer functions: only authenticated may execute, never anon
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(UUID, UUID) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(UUID, UUID) TO authenticated;
