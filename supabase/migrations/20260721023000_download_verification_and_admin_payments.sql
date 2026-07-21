-- Require customer download verification before software validation.
-- Also allow platform admins to see/manage the payment ledger from the browser admin panel.

ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS download_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS download_verified_email text;

CREATE INDEX IF NOT EXISTS idx_licenses_download_verified
  ON public.licenses(download_verified_at)
  WHERE download_verified_at IS NOT NULL;

DROP POLICY IF EXISTS "Platform admin can view all payment transactions" ON public.payment_transactions;
CREATE POLICY "Platform admin can view all payment transactions"
  ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Platform admin can update all payment transactions" ON public.payment_transactions;
CREATE POLICY "Platform admin can update all payment transactions"
  ON public.payment_transactions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
