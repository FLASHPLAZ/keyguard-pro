
ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS licenses_created_by_reseller_fkey;
ALTER TABLE public.licenses ADD CONSTRAINT licenses_created_by_reseller_fkey FOREIGN KEY (created_by_reseller) REFERENCES public.resellers(id) ON DELETE SET NULL;
