CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  endpoint text NOT NULL DEFAULT 'validate',
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_ip_endpoint ON public.rate_limits (ip, endpoint);
CREATE INDEX idx_rate_limits_window ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only (edge function uses service role key)
CREATE POLICY "Service role full access" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);