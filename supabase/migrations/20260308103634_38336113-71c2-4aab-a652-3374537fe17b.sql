
-- Blacklist table for IPs and HWIDs
CREATE TABLE public.blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ip', 'hwid')),
  value text NOT NULL,
  license_key text,
  reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, value)
);

ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blacklist"
  ON public.blacklist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add banned_by_admin flag to licenses so resellers can't unban admin-banned keys
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS banned_by_admin boolean NOT NULL DEFAULT false;
