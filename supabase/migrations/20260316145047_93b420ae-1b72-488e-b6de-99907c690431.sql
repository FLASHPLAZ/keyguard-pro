-- Admin can view ALL applications (not just own)
CREATE POLICY "Admins can view all applications"
ON public.applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update ALL applications
CREATE POLICY "Admins can update all applications"
ON public.applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete ALL applications
CREATE POLICY "Admins can delete all applications"
ON public.applications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));