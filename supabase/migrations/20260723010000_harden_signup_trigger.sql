-- Keep auth signup alive even if profile/tenant bootstrap hits an existing-row edge case.
-- Profile bootstrap is also retried client-side in AuthContext for extra safety.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username text;
  new_email text;
  assigned_role text;
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
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role::public.app_role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE LOG 'handle_new_user role insert failed for user %, role %: %', NEW.id, assigned_role, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.tenants (owner_user_id, name, plan, billing_cycle)
    VALUES (
      NEW.id,
      coalesce(new_username, 'user') || '''s Workspace',
      CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END,
      CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END
    )
    ON CONFLICT (owner_user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE LOG 'handle_new_user tenant insert failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_email text;
  current_username text;
  assigned_role text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    lower(coalesce(email, '')),
    nullif(trim(coalesce(raw_user_meta_data->>'username', split_part(lower(coalesce(email, '')), '@', 1), 'user')), '')
  INTO current_email, current_username
  FROM auth.users
  WHERE id = current_user_id;

  assigned_role := CASE WHEN current_email = 'gamingraj7069@gmail.com' THEN 'admin' ELSE 'seller' END;

  INSERT INTO public.profiles (user_id, username, email, role)
  VALUES (current_user_id, coalesce(current_username, 'user'), current_email, assigned_role)
  ON CONFLICT (user_id) DO UPDATE
  SET email = excluded.email,
      username = coalesce(nullif(public.profiles.username, ''), excluded.username),
      role = coalesce(nullif(public.profiles.role, ''), excluded.role);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, assigned_role::public.app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tenants (owner_user_id, name, plan, billing_cycle)
  VALUES (
    current_user_id,
    coalesce(current_username, 'user') || '''s Workspace',
    CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END,
    CASE WHEN assigned_role = 'admin' THEN 'lifetime' ELSE 'free' END
  )
  ON CONFLICT (owner_user_id) DO NOTHING;

  RETURN assigned_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;
