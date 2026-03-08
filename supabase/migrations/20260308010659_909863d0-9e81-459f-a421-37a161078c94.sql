
-- Fix the permissive INSERT policy on activity_logs
DROP POLICY "Anyone can insert logs" ON public.activity_logs;

-- Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs 
  FOR INSERT TO authenticated
  WITH CHECK (true);
