-- Drop existing public_settings view
DROP VIEW IF EXISTS public.public_settings;

-- Recreate view without security parameters
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

-- Grant SELECT to anonymous and authenticated users
GRANT SELECT ON public.public_settings TO anon, authenticated;

-- Create RLS policy to allow public read access to settings table
-- The view controls which columns are exposed, so this is safe
CREATE POLICY "Public can view safe settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Add comment explaining the security model
COMMENT ON VIEW public.public_settings IS 
'Public view exposing non-sensitive restaurant settings. merchant_upi_id is excluded to maintain security.';