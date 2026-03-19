-- Admin can view ALL licenses (currently only sees own via user_id = auth.uid())
CREATE POLICY "Admins can view all licenses"
  ON public.licenses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update ALL licenses
CREATE POLICY "Admins can update all licenses"
  ON public.licenses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete ALL licenses
CREATE POLICY "Admins can delete all licenses"
  ON public.licenses FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));