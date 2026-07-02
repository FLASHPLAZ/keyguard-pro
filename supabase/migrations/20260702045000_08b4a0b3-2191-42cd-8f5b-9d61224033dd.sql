
-- Wipe app data (admin has no created rows we want to preserve either — starting fresh)
TRUNCATE TABLE
  public.license_ips,
  public.licenses,
  public.activity_logs,
  public.reseller_app_credits,
  public.blacklist,
  public.rate_limits,
  public.applications,
  public.manager_permissions,
  public.resellers
RESTART IDENTITY CASCADE;

-- Delete non-admin tenants
DELETE FROM public.tenants
WHERE owner_user_id <> '542c10c7-ff1f-492c-9544-ebe5da6ed799';

-- Delete non-admin profiles / roles
DELETE FROM public.user_roles
WHERE user_id <> '542c10c7-ff1f-492c-9544-ebe5da6ed799';

DELETE FROM public.profiles
WHERE user_id <> '542c10c7-ff1f-492c-9544-ebe5da6ed799';

-- Delete non-admin auth users (cascades to any remaining FK rows)
DELETE FROM auth.users
WHERE id <> '542c10c7-ff1f-492c-9544-ebe5da6ed799';

-- Reset admin tenant to lifetime plan
UPDATE public.tenants
SET plan = 'lifetime',
    suspended = false,
    plan_started_at = now(),
    plan_expires_at = NULL,
    billing_cycle = 'lifetime'
WHERE owner_user_id = '542c10c7-ff1f-492c-9544-ebe5da6ed799';

-- Update signup handler: new users default to free; admin email keeps admin/lifetime
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.tenants (owner_user_id, name, plan, billing_cycle)
  VALUES (
    NEW.id,
    new_username || '''s Workspace',
    CASE WHEN NEW.email = 'gamingraj7069@gmail.com' THEN 'lifetime' ELSE 'free' END,
    CASE WHEN NEW.email = 'gamingraj7069@gmail.com' THEN 'lifetime' ELSE 'free' END
  )
  ON CONFLICT (owner_user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
