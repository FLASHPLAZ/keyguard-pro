ALTER TABLE public.manager_permissions
  ADD COLUMN IF NOT EXISTS can_create_licenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_ban_licenses boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_reset_hwid boolean NOT NULL DEFAULT false;

-- Allow managers to create licenses
CREATE POLICY "Managers can create licenses"
  ON public.licenses FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to update licenses (for ban/unban/reset hwid)
CREATE POLICY "Managers can update licenses"
  ON public.licenses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));