
-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Backfill: ensure every existing user has a tenant
INSERT INTO public.tenants (owner_user_id, name, plan)
SELECT user_id, COALESCE(username, 'Admin Workspace'), 'platform'
FROM public.profiles
WHERE email = 'gamingraj7069@gmail.com'
ON CONFLICT (owner_user_id) DO NOTHING;

INSERT INTO public.tenants (owner_user_id, name, plan)
SELECT p.user_id, COALESCE(p.username, 'Workspace'), 'free'
FROM public.profiles p
LEFT JOIN public.tenants t ON t.owner_user_id = p.user_id
WHERE t.id IS NULL;

-- Add tenant_id columns
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.manager_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.blacklist ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill applications
UPDATE public.applications a
SET tenant_id = t.id
FROM public.tenants t
WHERE a.tenant_id IS NULL AND t.owner_user_id = a.user_id;

UPDATE public.applications
SET tenant_id = (SELECT t.id FROM public.tenants t JOIN public.profiles p ON p.user_id = t.owner_user_id WHERE p.email = 'gamingraj7069@gmail.com' LIMIT 1)
WHERE tenant_id IS NULL;

-- Licenses
UPDATE public.licenses l
SET tenant_id = a.tenant_id
FROM public.applications a
WHERE l.tenant_id IS NULL AND l.application_id = a.id;

UPDATE public.licenses
SET tenant_id = (SELECT t.id FROM public.tenants t JOIN public.profiles p ON p.user_id = t.owner_user_id WHERE p.email = 'gamingraj7069@gmail.com' LIMIT 1)
WHERE tenant_id IS NULL;

-- Resellers
UPDATE public.resellers r
SET tenant_id = t.id
FROM public.tenants t
WHERE r.tenant_id IS NULL AND t.owner_user_id = r.admin_id;

UPDATE public.resellers
SET tenant_id = (SELECT t.id FROM public.tenants t JOIN public.profiles p ON p.user_id = t.owner_user_id WHERE p.email = 'gamingraj7069@gmail.com' LIMIT 1)
WHERE tenant_id IS NULL;

-- Manager permissions
UPDATE public.manager_permissions
SET tenant_id = (SELECT t.id FROM public.tenants t JOIN public.profiles p ON p.user_id = t.owner_user_id WHERE p.email = 'gamingraj7069@gmail.com' LIMIT 1)
WHERE tenant_id IS NULL;

-- Activity logs
UPDATE public.activity_logs al
SET tenant_id = a.tenant_id
FROM public.applications a
WHERE al.tenant_id IS NULL AND al.application_id = a.id;

UPDATE public.activity_logs
SET tenant_id = (SELECT t.id FROM public.tenants t JOIN public.profiles p ON p.user_id = t.owner_user_id WHERE p.email = 'gamingraj7069@gmail.com' LIMIT 1)
WHERE tenant_id IS NULL;

-- Blacklist
UPDATE public.blacklist b
SET tenant_id = t.id
FROM public.tenants t
WHERE b.tenant_id IS NULL AND t.owner_user_id = b.created_by;

UPDATE public.blacklist
SET tenant_id = (SELECT t.id FROM public.tenants t JOIN public.profiles p ON p.user_id = t.owner_user_id WHERE p.email = 'gamingraj7069@gmail.com' LIMIT 1)
WHERE tenant_id IS NULL;

-- Settings
UPDATE public.settings s
SET tenant_id = t.id
FROM public.tenants t
WHERE s.tenant_id IS NULL AND t.owner_user_id = s.user_id;

UPDATE public.settings
SET tenant_id = (SELECT t.id FROM public.tenants t JOIN public.profiles p ON p.user_id = t.owner_user_id WHERE p.email = 'gamingraj7069@gmail.com' LIMIT 1)
WHERE tenant_id IS NULL;

-- Set NOT NULL
ALTER TABLE public.applications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.licenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.resellers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.manager_permissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.activity_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.blacklist ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.settings ALTER COLUMN tenant_id SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_tenant ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON public.licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resellers_tenant ON public.resellers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_permissions_tenant ON public.manager_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON public.activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_tenant ON public.blacklist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON public.settings(tenant_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE owner_user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants WHERE id = _tenant_id AND owner_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.resellers WHERE tenant_id = _tenant_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.manager_permissions WHERE tenant_id = _tenant_id AND user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(UUID, UUID) FROM anon;

-- RLS on tenants
DROP POLICY IF EXISTS "Owner can view own tenant" ON public.tenants;
CREATE POLICY "Owner can view own tenant" ON public.tenants
  FOR SELECT USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Owner can update own tenant" ON public.tenants;
CREATE POLICY "Owner can update own tenant" ON public.tenants
  FOR UPDATE USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Platform admin can view all tenants" ON public.tenants;
CREATE POLICY "Platform admin can view all tenants" ON public.tenants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admin can update all tenants" ON public.tenants;
CREATE POLICY "Platform admin can update all tenants" ON public.tenants
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members can view their tenant" ON public.tenants;
CREATE POLICY "Members can view their tenant" ON public.tenants
  FOR SELECT TO authenticated USING (public.is_tenant_member(id, auth.uid()));

-- Seller-scoped policies on applications
DROP POLICY IF EXISTS "Seller can view tenant apps" ON public.applications;
CREATE POLICY "Seller can view tenant apps" ON public.applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can create tenant apps" ON public.applications;
CREATE POLICY "Seller can create tenant apps" ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Seller can update tenant apps" ON public.applications;
CREATE POLICY "Seller can update tenant apps" ON public.applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can delete tenant apps" ON public.applications;
CREATE POLICY "Seller can delete tenant apps" ON public.applications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Licenses
DROP POLICY IF EXISTS "Seller can view tenant licenses" ON public.licenses;
CREATE POLICY "Seller can view tenant licenses" ON public.licenses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can create tenant licenses" ON public.licenses;
CREATE POLICY "Seller can create tenant licenses" ON public.licenses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can update tenant licenses" ON public.licenses;
CREATE POLICY "Seller can update tenant licenses" ON public.licenses
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can delete tenant licenses" ON public.licenses;
CREATE POLICY "Seller can delete tenant licenses" ON public.licenses
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Logs
DROP POLICY IF EXISTS "Seller can view tenant logs" ON public.activity_logs;
CREATE POLICY "Seller can view tenant logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Resellers
DROP POLICY IF EXISTS "Seller can view tenant resellers" ON public.resellers;
CREATE POLICY "Seller can view tenant resellers" ON public.resellers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can create tenant resellers" ON public.resellers;
CREATE POLICY "Seller can create tenant resellers" ON public.resellers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can update tenant resellers" ON public.resellers;
CREATE POLICY "Seller can update tenant resellers" ON public.resellers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can delete tenant resellers" ON public.resellers;
CREATE POLICY "Seller can delete tenant resellers" ON public.resellers
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Managers
DROP POLICY IF EXISTS "Seller can view tenant managers" ON public.manager_permissions;
CREATE POLICY "Seller can view tenant managers" ON public.manager_permissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can create tenant managers" ON public.manager_permissions;
CREATE POLICY "Seller can create tenant managers" ON public.manager_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can update tenant managers" ON public.manager_permissions;
CREATE POLICY "Seller can update tenant managers" ON public.manager_permissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can delete tenant managers" ON public.manager_permissions;
CREATE POLICY "Seller can delete tenant managers" ON public.manager_permissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Blacklist
DROP POLICY IF EXISTS "Seller can view tenant blacklist" ON public.blacklist;
CREATE POLICY "Seller can view tenant blacklist" ON public.blacklist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can create tenant blacklist" ON public.blacklist;
CREATE POLICY "Seller can create tenant blacklist" ON public.blacklist
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Seller can update tenant blacklist" ON public.blacklist;
CREATE POLICY "Seller can update tenant blacklist" ON public.blacklist
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can delete tenant blacklist" ON public.blacklist;
CREATE POLICY "Seller can delete tenant blacklist" ON public.blacklist
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Settings
DROP POLICY IF EXISTS "Seller can view tenant settings" ON public.settings;
CREATE POLICY "Seller can view tenant settings" ON public.settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Seller can create tenant settings" ON public.settings;
CREATE POLICY "Seller can create tenant settings" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Seller can update tenant settings" ON public.settings;
CREATE POLICY "Seller can update tenant settings" ON public.settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND tenant_id = public.get_user_tenant_id(auth.uid()));

-- Updated signup trigger: every new signup → tenant + seller role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username TEXT;
BEGIN
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (user_id, username, email, role)
  VALUES (
    NEW.id,
    new_username,
    NEW.email,
    CASE WHEN NEW.email = 'gamingraj7069@gmail.com' THEN 'admin' ELSE 'seller' END
  );

  IF NEW.email = 'gamingraj7069@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'seller'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.tenants (owner_user_id, name, plan)
  VALUES (
    NEW.id,
    new_username || '''s Workspace',
    CASE WHEN NEW.email = 'gamingraj7069@gmail.com' THEN 'platform' ELSE 'free' END
  )
  ON CONFLICT (owner_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for tenants
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
