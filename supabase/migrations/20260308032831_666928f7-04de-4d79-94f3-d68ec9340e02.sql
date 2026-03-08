
CREATE POLICY "Resellers can delete own licenses"
ON public.licenses
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'reseller'::app_role) 
  AND created_by_reseller IN (
    SELECT id FROM resellers WHERE user_id = auth.uid()
  )
);
