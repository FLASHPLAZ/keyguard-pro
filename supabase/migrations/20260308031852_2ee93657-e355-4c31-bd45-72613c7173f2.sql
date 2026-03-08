
CREATE POLICY "Resellers can update own licenses"
ON public.licenses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'reseller'::app_role) 
  AND created_by_reseller IN (
    SELECT id FROM resellers WHERE user_id = auth.uid()
  )
);
