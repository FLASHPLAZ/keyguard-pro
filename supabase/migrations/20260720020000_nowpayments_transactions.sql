-- NOWPayments invoices and payment status tracking.
-- Additive only: does not delete or rewrite existing data.

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  plan text NOT NULL CHECK (plan IN ('monthly', 'lifetime')),
  provider text NOT NULL DEFAULT 'nowpayments',
  status text NOT NULL DEFAULT 'created',
  order_id text NOT NULL UNIQUE,
  invoice_id text,
  payment_id text,
  payment_url text,
  pay_address text,
  pay_amount numeric,
  price_amount numeric(10, 2) NOT NULL,
  price_currency text NOT NULL DEFAULT 'usd',
  pay_currency text NOT NULL DEFAULT 'ltc',
  actually_paid numeric,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS pay_address text,
  ADD COLUMN IF NOT EXISTS pay_amount numeric;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_created
  ON public.payment_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id
  ON public.payment_transactions(invoice_id);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own payment transactions"
  ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages payment transactions" ON public.payment_transactions;
CREATE POLICY "Service role manages payment transactions"
  ON public.payment_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_payment_transactions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_transactions_updated_at();
