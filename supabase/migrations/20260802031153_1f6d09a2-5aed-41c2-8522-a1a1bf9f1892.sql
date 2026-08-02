-- 1. Missing columns
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS download_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS download_verified_email text;

-- 2. Signup bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_username text; new_email text; assigned_role text;
BEGIN
  new_email := lower(coalesce(NEW.email, ''));
  new_username := nullif(trim(coalesce(NEW.raw_user_meta_data->>'username', split_part(new_email, '@', 1), 'user')), '');
  assigned_role := CASE WHEN new_email = 'gamingraj7069@gmail.com' THEN 'admin' ELSE 'seller' END;

  INSERT INTO public.profiles (user_id, username, email, role)
  VALUES (NEW.id, coalesce(new_username, 'user'), new_email, assigned_role)
  ON CONFLICT (user_id) DO UPDATE
  SET email = excluded.email,
      username = coalesce(nullif(public.profiles.username, ''), excluded.username),
      role = coalesce(nullif(public.profiles.role, ''), excluded.role);

  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role::public.app_role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN others THEN RAISE LOG 'handle_new_user role insert failed for %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.tenants (owner_user_id, name, plan, billing_cycle)
    VALUES (NEW.id, coalesce(new_username, 'user') || '''s Workspace',
      CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END,
      CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END)
    ON CONFLICT (owner_user_id) DO NOTHING;
  EXCEPTION WHEN others THEN RAISE LOG 'handle_new_user tenant insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_user_id uuid; current_email text; current_username text; assigned_role text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT lower(coalesce(email, '')),
         nullif(trim(coalesce(raw_user_meta_data->>'username', split_part(lower(coalesce(email, '')), '@', 1), 'user')), '')
  INTO current_email, current_username FROM auth.users WHERE id = current_user_id;

  assigned_role := CASE WHEN current_email = 'gamingraj7069@gmail.com' THEN 'admin' ELSE 'seller' END;

  INSERT INTO public.profiles (user_id, username, email, role)
  VALUES (current_user_id, coalesce(current_username, 'user'), current_email, assigned_role)
  ON CONFLICT (user_id) DO UPDATE
  SET email = excluded.email,
      username = coalesce(nullif(public.profiles.username, ''), excluded.username),
      role = coalesce(nullif(public.profiles.role, ''), excluded.role);

  INSERT INTO public.user_roles (user_id, role) VALUES (current_user_id, assigned_role::public.app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tenants (owner_user_id, name, plan, billing_cycle)
  VALUES (current_user_id, coalesce(current_username, 'user') || '''s Workspace',
    CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END,
    CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END)
  ON CONFLICT (owner_user_id) DO NOTHING;

  RETURN assigned_role;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_bootstrap() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;

-- 3. tenant_id auto-stamp triggers
DROP TRIGGER IF EXISTS auto_tenant_id_applications ON public.applications;
CREATE TRIGGER auto_tenant_id_applications BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();
DROP TRIGGER IF EXISTS auto_tenant_id_licenses ON public.licenses;
CREATE TRIGGER auto_tenant_id_licenses BEFORE INSERT ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();
DROP TRIGGER IF EXISTS auto_tenant_id_activity_logs ON public.activity_logs;
CREATE TRIGGER auto_tenant_id_activity_logs BEFORE INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();
DROP TRIGGER IF EXISTS auto_tenant_id_blacklist ON public.blacklist;
CREATE TRIGGER auto_tenant_id_blacklist BEFORE INSERT ON public.blacklist
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();
DROP TRIGGER IF EXISTS auto_tenant_id_settings ON public.settings;
CREATE TRIGGER auto_tenant_id_settings BEFORE INSERT ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();
DROP TRIGGER IF EXISTS auto_tenant_id_resellers ON public.resellers;
CREATE TRIGGER auto_tenant_id_resellers BEFORE INSERT ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();
DROP TRIGGER IF EXISTS auto_tenant_id_manager_permissions ON public.manager_permissions;
CREATE TRIGGER auto_tenant_id_manager_permissions BEFORE INSERT ON public.manager_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_auth();

-- 4. License creation limits + updated_at
DROP TRIGGER IF EXISTS trg_enforce_license_creation_limits ON public.licenses;
CREATE TRIGGER trg_enforce_license_creation_limits BEFORE INSERT ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_creation_limits();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_manager_permissions_updated_at ON public.manager_permissions;
CREATE TRIGGER update_manager_permissions_updated_at BEFORE UPDATE ON public.manager_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reseller_app_credits_updated_at ON public.reseller_app_credits;
CREATE TRIGGER update_reseller_app_credits_updated_at BEFORE UPDATE ON public.reseller_app_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Payment transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  plan text NOT NULL CHECK (plan IN ('monthly', 'lifetime')),
  provider text NOT NULL DEFAULT 'nowpayments',
  status text NOT NULL DEFAULT 'created',
  order_id text NOT NULL UNIQUE,
  invoice_id text,
  payment_id text,
  payment_url text,
  pay_address text,
  pay_amount numeric,
  price_amount numeric(10, 2) NOT NULL,
  price_currency text NOT NULL DEFAULT 'usd',
  pay_currency text NOT NULL DEFAULT 'ltc',
  actually_paid numeric,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own payment transactions" ON public.payment_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_created ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id ON public.payment_transactions(invoice_id);

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON public.licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_tenant_created ON public.licenses(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created ON public.activity_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_tenant ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON public.rate_limits(ip, endpoint);