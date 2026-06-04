
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'lifetime';

-- Seed sensible defaults for existing rows
UPDATE public.tenants
SET billing_cycle = 'lifetime', plan_expires_at = NULL
WHERE plan IN ('platform','seller');

UPDATE public.tenants
SET billing_cycle = 'lifetime', plan_expires_at = NULL
WHERE plan = 'free' AND plan_expires_at IS NULL;

UPDATE public.tenants
SET billing_cycle = COALESCE(NULLIF(billing_cycle,''), 'monthly'),
    plan_expires_at = COALESCE(plan_expires_at, now() + interval '30 days')
WHERE plan = 'developer';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT;
