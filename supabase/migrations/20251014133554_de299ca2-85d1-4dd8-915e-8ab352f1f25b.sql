-- Drop existing public_settings view
DROP VIEW IF EXISTS public.public_settings;

-- Recreate view with menu_sheet_url included
CREATE VIEW public.public_settings AS
SELECT 
  restaurant_name,
  restaurant_address,
  service_charge,
  payment_modes,
  table_count,
  menu_sheet_url
FROM public.settings
LIMIT 1;

-- Grant access to anonymous and authenticated users
GRANT SELECT ON public.public_settings TO anon, authenticated;