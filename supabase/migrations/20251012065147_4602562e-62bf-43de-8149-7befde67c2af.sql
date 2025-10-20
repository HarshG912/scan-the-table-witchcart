-- Fix generate_order_id function to avoid FOR UPDATE with aggregates
DROP FUNCTION IF EXISTS public.generate_order_id();

CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Count orders created today (without FOR UPDATE since we're using COUNT)
  -- This is safe because order_id has a unique constraint
  SELECT COUNT(*) + 1 INTO order_count
  FROM public.orders
  WHERE DATE(created_at) = today_date;
  
  -- Generate order ID: ORD + reversed_date + sequential_number
  new_order_id := 'ORD' || reversed_date || LPAD(order_count::text, 2, '0');
  
  RETURN new_order_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_order_id() TO anon, authenticated;