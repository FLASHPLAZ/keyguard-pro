DROP POLICY IF EXISTS "Public can read platform maintenance settings" ON public.settings;

CREATE POLICY "Public can read platform maintenance settings" ON public.settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('maintenance_mode', 'maintenance_message'));
