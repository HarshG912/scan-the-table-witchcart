-- Part 2: Create settings table and policies using the new enum values
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_upi_id text NOT NULL DEFAULT 'merchant@upi',
  service_charge numeric NOT NULL DEFAULT 0,
  restaurant_name text NOT NULL DEFAULT 'Scan The Table',
  table_count integer NOT NULL DEFAULT 10,
  payment_modes jsonb NOT NULL DEFAULT '{"cash": true, "upi": true, "card": true}'::jsonb,
  menu_sheet_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add bill_url column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bill_url text;

-- Enable RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Settings policies: Only admins can update, everyone can read
CREATE POLICY "Anyone can view settings"
ON public.settings
FOR SELECT
USING (true);

CREATE POLICY "Only admins can update settings"
ON public.settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings row (only if table is empty)
INSERT INTO public.settings (merchant_upi_id, service_charge, restaurant_name, table_count)
SELECT 'merchant@upi', 5, 'Scan The Table', 10
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- Create trigger for updating settings updated_at
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_settings_updated_at();

-- Allow waiters to view orders
CREATE POLICY "Waiters can view orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'waiter'::app_role));

-- Allow waiters to create orders
CREATE POLICY "Waiters can create orders"
ON public.orders
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'waiter'::app_role));