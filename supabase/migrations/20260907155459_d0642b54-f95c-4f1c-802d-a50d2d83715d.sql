CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  application_name text,
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  license_key text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  action_taken text NOT NULL DEFAULT 'none',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  country text,
  hwid text,
  device_name text,
  evidence_path text,
  evidence_scope text,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members read security events" ON public.security_events;
CREATE POLICY "Tenant members read security events"
ON public.security_events FOR SELECT TO authenticated
USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Tenant members review security events" ON public.security_events;
CREATE POLICY "Tenant members review security events"
ON public.security_events FOR UPDATE TO authenticated
USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS security_events_tenant_created_idx ON public.security_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_license_idx ON public.security_events (license_key);

DROP POLICY IF EXISTS "Tenant members read tamper evidence" ON storage.objects;
CREATE POLICY "Tenant members read tamper evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tamper-evidence'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);