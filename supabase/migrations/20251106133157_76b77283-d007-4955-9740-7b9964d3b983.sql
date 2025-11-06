-- Add authentication toggle to tenant_settings
ALTER TABLE public.tenant_settings
ADD COLUMN require_customer_auth boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.tenant_settings.require_customer_auth IS 'When true, customers must authenticate to place orders. When false, they can order without logging in.';