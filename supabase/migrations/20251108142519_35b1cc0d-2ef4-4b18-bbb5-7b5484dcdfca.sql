-- Drop and recreate public_tenant_settings view to include merchant_upi_id
DROP VIEW IF EXISTS public_tenant_settings;

CREATE VIEW public_tenant_settings AS
SELECT 
  tenant_id,
  restaurant_name,
  restaurant_address,
  merchant_upi_id,
  service_charge,
  payment_modes,
  menu_sheet_url,
  theme_config,
  require_customer_auth
FROM tenant_settings;