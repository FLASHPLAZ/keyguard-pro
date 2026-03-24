ALTER TABLE public.licenses ADD COLUMN notes text DEFAULT NULL;
ALTER TABLE public.licenses ADD COLUMN tags text[] DEFAULT '{}'::text[];