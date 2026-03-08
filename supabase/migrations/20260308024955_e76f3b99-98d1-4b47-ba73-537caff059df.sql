
-- Update handle_new_user to only assign admin role to the specific admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN NEW.email = 'gamingraj7069@gmail.com' THEN 'admin' ELSE 'reseller' END
  );
  
  -- Only assign admin role to the specific admin email
  IF NEW.email = 'gamingraj7069@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'reseller');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy for resellers to view their allowed apps
CREATE POLICY "Resellers can view allowed apps" ON public.applications
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'reseller') AND
    id IN (
      SELECT unnest(allowed_apps) FROM public.resellers WHERE user_id = auth.uid()
    )
  );

-- Add RLS policy for resellers to view own reseller record
CREATE POLICY "Reseller can view own record" ON public.resellers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Add RLS policy for resellers to insert licenses (for allowed apps)
CREATE POLICY "Resellers can create licenses" ON public.licenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'reseller') AND
    created_by_reseller IS NOT NULL
  );

-- Add RLS policy for resellers to view their own created licenses
CREATE POLICY "Resellers can view own licenses" ON public.licenses
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'reseller') AND
    created_by_reseller IN (SELECT id FROM public.resellers WHERE user_id = auth.uid())
  );

-- Allow resellers to insert activity logs
-- (already exists for authenticated users)

-- Allow resellers to update own reseller record (for credits/total_generated)
CREATE POLICY "Reseller can update own record" ON public.resellers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
