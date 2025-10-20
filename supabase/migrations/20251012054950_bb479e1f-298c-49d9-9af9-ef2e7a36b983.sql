-- Add fields for cooking time tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cook_name text;

-- Function to generate sequential order IDs
-- Format: ORD + reversed date (DDMMYYYY) + sequential number
-- Example: 12/10/2025 → ORD5201211201 (first order of the day)
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date date;
  reversed_date text;
  order_count int;
  new_order_id text;
BEGIN
  -- Get today's date
  today_date := CURRENT_DATE;
  
  -- Reverse date format: DDMMYYYY → YYYYMMDD reversed
  reversed_date := to_char(today_date, 'YYYYMMDD');
  reversed_date := reverse(reversed_date);
  
  -- Count orders created today (use FOR UPDATE to prevent race conditions)
  SELECT COUNT(*) + 1 INTO order_count
  FROM public.orders
  WHERE DATE(created_at) = today_date
  FOR UPDATE;
  
  -- Generate order ID: ORD + reversed_date + sequential_number
  new_order_id := 'ORD' || reversed_date || LPAD(order_count::text, 2, '0');
  
  RETURN new_order_id;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.generate_order_id() TO anon, authenticated;