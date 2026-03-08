
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS device_name text;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS device_name text;
