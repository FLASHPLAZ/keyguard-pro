
-- Slice 1: RLS lockdown + per-user webhook isolation

-- APPLICATIONS
DROP POLICY IF EXISTS "Managers can view applications" ON public.applications;
DROP POLICY IF EXISTS "Managers can update applications" ON public.applications;
DROP POLICY IF EXISTS "Managers can delete applications" ON public.applications;
DROP POLICY IF EXISTS "Managers can create applications" ON public.applications;

CREATE POLICY "Managers can view tenant applications" ON public.applications
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can update tenant applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid() AND can_edit_apps = true
  ));

CREATE POLICY "Managers can delete tenant applications" ON public.applications
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid() AND can_delete_apps = true
  ));

CREATE POLICY "Managers can create tenant applications" ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid() AND can_create_apps = true
  ));

-- LICENSES
DROP POLICY IF EXISTS "Managers can view all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can create licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can delete licenses" ON public.licenses;

CREATE POLICY "Managers can view tenant licenses" ON public.licenses
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid() AND can_view_licenses = true
  ));

CREATE POLICY "Managers can update tenant licenses" ON public.licenses
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid() AND can_ban_licenses = true
  ));

CREATE POLICY "Managers can create tenant licenses" ON public.licenses
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid() AND can_create_licenses = true
  ));

-- ACTIVITY LOGS
DROP POLICY IF EXISTS "Managers can view all logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Managers can insert logs" ON public.activity_logs;

CREATE POLICY "Managers can view tenant logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'manager'::app_role) AND tenant_id IN (
    SELECT tenant_id FROM public.manager_permissions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can insert tenant logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'manager'::app_role) AND user_id = auth.uid());

-- SETTINGS: strictly per-user
DROP POLICY IF EXISTS "Seller can view tenant settings" ON public.settings;
DROP POLICY IF EXISTS "Seller can create tenant settings" ON public.settings;
DROP POLICY IF EXISTS "Seller can update tenant settings" ON public.settings;
DROP POLICY IF EXISTS "Users manage own settings select" ON public.settings;
DROP POLICY IF EXISTS "Users manage own settings insert" ON public.settings;
DROP POLICY IF EXISTS "Users manage own settings update" ON public.settings;
DROP POLICY IF EXISTS "Users manage own settings delete" ON public.settings;

CREATE POLICY "Users manage own settings select" ON public.settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own settings insert" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own settings update" ON public.settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own settings delete" ON public.settings
  FOR DELETE TO authenticated USING (user_id = auth.uid());
