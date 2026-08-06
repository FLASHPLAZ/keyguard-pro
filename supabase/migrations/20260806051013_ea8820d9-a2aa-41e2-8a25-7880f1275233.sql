-- Trigger-only functions: nobody should call these directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.set_tenant_id_from_auth() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_license_creation_limits() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- Helper functions used by RLS policies / app bootstrap: signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.is_tenant_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_tenant_id(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_bootstrap() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated, service_role;