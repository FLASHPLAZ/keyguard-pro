-- API replay protection and security event storage.
-- Additive only: this migration does not delete application, license, tenant, or user data.

CREATE TABLE IF NOT EXISTS public.api_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  signature_hash text,
  license_key_hash text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(application_id, nonce)
);

CREATE INDEX IF NOT EXISTS idx_api_nonces_application_created
  ON public.api_nonces(application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_nonces_expires_at
  ON public.api_nonces(expires_at);

ALTER TABLE public.api_nonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages api nonces" ON public.api_nonces;
CREATE POLICY "Service role manages api nonces"
  ON public.api_nonces
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip text,
  hwid text,
  license_key_hash text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created
  ON public.security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_application_created
  ON public.security_events(application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_type_created
  ON public.security_events(event_type, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role writes security events" ON public.security_events;
CREATE POLICY "Service role writes security events"
  ON public.security_events
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read security events" ON public.security_events;
CREATE POLICY "Admins read security events"
  ON public.security_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.blacklist
  DROP CONSTRAINT IF EXISTS blacklist_type_check;

ALTER TABLE public.blacklist
  ADD CONSTRAINT blacklist_type_check CHECK (type IN ('ip', 'hwid', 'license_key'));
