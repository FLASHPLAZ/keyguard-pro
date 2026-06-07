ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS last_seen timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_ip text,
  ADD COLUMN IF NOT EXISTS last_seen_country text,
  ADD COLUMN IF NOT EXISTS last_seen_hwid text;

CREATE INDEX IF NOT EXISTS idx_licenses_last_seen ON public.licenses(last_seen DESC);