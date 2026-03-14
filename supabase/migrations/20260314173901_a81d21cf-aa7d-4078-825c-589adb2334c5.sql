
-- RLS: Managers can CRUD applications
CREATE POLICY "Managers can view applications"
ON public.applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can create applications"
ON public.applications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager') AND auth.uid() = user_id);

CREATE POLICY "Managers can update applications"
ON public.applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete applications"
ON public.applications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- RLS: Managers can view activity_logs (read-only)
CREATE POLICY "Managers can view all logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- RLS: Managers can insert activity_logs
CREATE POLICY "Managers can insert logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- RLS: Managers can view licenses (read-only)
CREATE POLICY "Managers can view all licenses"
ON public.licenses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- RLS: Admins can view all profiles (needed for managers page)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can manage user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
