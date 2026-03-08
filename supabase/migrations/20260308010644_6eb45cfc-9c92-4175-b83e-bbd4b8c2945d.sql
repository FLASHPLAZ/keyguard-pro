
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'reseller');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  suspended BOOLEAN NOT NULL DEFAULT false,
  kill_switch BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Licenses table
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hwid TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  banned BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'unused',
  last_used TIMESTAMPTZ,
  created_by_reseller UUID REFERENCES auth.users(id)
);
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Resellers table
CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  allowed_apps UUID[] DEFAULT '{}',
  total_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

-- Logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  application_name TEXT,
  action TEXT NOT NULL,
  ip TEXT,
  hwid TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: only viewable by the user
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Applications: owner can CRUD
CREATE POLICY "Owner can view apps" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can create apps" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update apps" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete apps" ON public.applications FOR DELETE USING (auth.uid() = user_id);

-- Licenses: owner can CRUD
CREATE POLICY "Owner can view licenses" ON public.licenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can create licenses" ON public.licenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update licenses" ON public.licenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete licenses" ON public.licenses FOR DELETE USING (auth.uid() = user_id);

-- Resellers: admin can manage their resellers
CREATE POLICY "Admin can view resellers" ON public.resellers FOR SELECT USING (auth.uid() = admin_id);
CREATE POLICY "Admin can create resellers" ON public.resellers FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Admin can update resellers" ON public.resellers FOR UPDATE USING (auth.uid() = admin_id);
CREATE POLICY "Admin can delete resellers" ON public.resellers FOR DELETE USING (auth.uid() = admin_id);

-- Activity logs: owner can view
CREATE POLICY "Owner can view logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_licenses_key ON public.licenses(license_key);
CREATE INDEX idx_licenses_app ON public.licenses(application_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_applications_user ON public.applications(user_id);
