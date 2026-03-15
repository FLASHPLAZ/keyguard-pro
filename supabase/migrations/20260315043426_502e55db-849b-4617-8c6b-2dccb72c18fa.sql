
CREATE TABLE public.manager_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  can_create_apps boolean NOT NULL DEFAULT true,
  can_edit_apps boolean NOT NULL DEFAULT true,
  can_delete_apps boolean NOT NULL DEFAULT true,
  can_view_licenses boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage manager permissions" ON public.manager_permissions
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view own permissions" ON public.manager_permissions
FOR SELECT TO authenticated USING (auth.uid() = user_id);
