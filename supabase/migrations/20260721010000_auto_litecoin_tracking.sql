-- Automatic shared-address Litecoin invoice tracking.
-- Additive only: keeps existing manual/NOWPayments records intact.

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS detected_tx_hash text,
  ADD COLUMN IF NOT EXISTS confirmations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ltc_usd_rate numeric,
  ADD COLUMN IF NOT EXISTS amount_offset_litoshi bigint;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_status
  ON public.payment_transactions(provider, status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_detected_tx
  ON public.payment_transactions(detected_tx_hash)
  WHERE detected_tx_hash IS NOT NULL;
