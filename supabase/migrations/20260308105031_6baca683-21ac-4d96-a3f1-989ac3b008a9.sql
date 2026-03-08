
-- Add signing_secret and signature_required columns to applications
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS signing_secret text DEFAULT encode(gen_random_bytes(32), 'hex'),
  ADD COLUMN IF NOT EXISTS signature_required boolean NOT NULL DEFAULT false;
