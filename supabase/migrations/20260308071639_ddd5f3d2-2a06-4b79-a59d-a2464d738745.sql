
CREATE TABLE public.license_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  ip text NOT NULL,
  first_seen timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (license_id, ip)
);

CREATE INDEX idx_license_ips_license ON public.license_ips (license_id);

ALTER TABLE public.license_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on license_ips" ON public.license_ips
  FOR ALL TO service_role USING (true) WITH CHECK (true);
