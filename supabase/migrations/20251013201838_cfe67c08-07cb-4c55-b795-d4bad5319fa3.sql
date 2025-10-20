-- Create a view for public settings (excluding sensitive data)
CREATE OR REPLACE VIEW public.public_settings AS
SELECT 
  restaurant_name,
  restaurant_address,
  service_charge,
  payment_modes,
  table_count
FROM public.settings;

-- Grant public access to the view
GRANT SELECT ON public.public_settings TO anon, authenticated;

-- Enable RLS on the view (views inherit table RLS by default, but we make it explicit)
ALTER VIEW public.public_settings SET (security_invoker = true);

-- Update RLS policy on settings table to restrict merchant_upi_id access
-- Remove the existing public read policy
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;

-- Create new policy that only allows staff to view full settings
CREATE POLICY "Only staff can view full settings" 
ON public.settings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'chef'::app_role)
  OR has_role(auth.uid(), 'waiter'::app_role)
);

-- Add comment to document the security design
COMMENT ON VIEW public.public_settings IS 'Public view of restaurant settings. Excludes sensitive payment information like merchant_upi_id. Use the generate-payment-url edge function to create payment URLs securely.';
