-- Drop and recreate public_tenant_settings view with require_customer_auth
DROP VIEW IF EXISTS public.public_tenant_settings;

CREATE VIEW public.public_tenant_settings AS
SELECT 
  tenant_id,
  restaurant_name,
  restaurant_address,
  service_charge,
  payment_modes,
  menu_sheet_url,
  theme_config,
  require_customer_auth
FROM public.tenant_settings;