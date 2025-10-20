-- Fix security definer view by recreating with security_invoker
-- This ensures the view respects RLS policies instead of bypassing them
DROP VIEW IF EXISTS public.public_settings;

CREATE VIEW public.public_settings
WITH (security_invoker=on)
AS
SELECT 
  restaurant_name,
  restaurant_address,
  service_charge,
  payment_modes,
  table_count,
  menu_sheet_url
FROM public.settings
LIMIT 1;

-- Grant SELECT to anonymous and authenticated users
GRANT SELECT ON public.public_settings TO anon, authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_settings IS 
'Public view exposing non-sensitive restaurant settings. Uses security_invoker to respect RLS policies. merchant_upi_id is excluded to maintain security.';