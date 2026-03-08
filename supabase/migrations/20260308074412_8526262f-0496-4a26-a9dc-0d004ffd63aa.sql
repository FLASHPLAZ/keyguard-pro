
CREATE TABLE public.reseller_app_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  total_generated integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (reseller_id, application_id)
);

CREATE INDEX idx_reseller_app_credits_reseller ON public.reseller_app_credits (reseller_id);

ALTER TABLE public.reseller_app_credits ENABLE ROW LEVEL SECURITY;

-- Admin can manage all credits
CREATE POLICY "Admin can view reseller app credits" ON public.reseller_app_credits
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert reseller app credits" ON public.reseller_app_credits
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update reseller app credits" ON public.reseller_app_credits
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete reseller app credits" ON public.reseller_app_credits
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Resellers can view and update their own credits
CREATE POLICY "Reseller can view own app credits" ON public.reseller_app_credits
  FOR SELECT TO authenticated
  USING (reseller_id IN (SELECT id FROM public.resellers WHERE user_id = auth.uid()));

CREATE POLICY "Reseller can update own app credits" ON public.reseller_app_credits
  FOR UPDATE TO authenticated
  USING (reseller_id IN (SELECT id FROM public.resellers WHERE user_id = auth.uid()));
