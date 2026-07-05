ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS owner_email TEXT;
CREATE INDEX IF NOT EXISTS idx_licenses_owner_email ON public.licenses (owner_email);