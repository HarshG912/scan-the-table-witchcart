-- Drop and recreate get_orders_by_table function to include service_charge_amount
DROP FUNCTION IF EXISTS public.get_orders_by_table(text);

CREATE OR REPLACE FUNCTION public.get_orders_by_table(p_table_id text)
RETURNS TABLE(
  id uuid, 
  order_id text, 
  table_id text, 
  items_json text, 
  subtotal numeric, 
  service_charge numeric,
  service_charge_amount numeric,
  total numeric, 
  status text, 
  payment_status text, 
  payment_claimed boolean, 
  qr_url text, 
  bill_downloaded boolean, 
  created_at timestamp with time zone, 
  paid_at timestamp with time zone, 
  last_updated_by text, 
  last_updated_at timestamp with time zone, 
  notes text,
  customer_name text,
  customer_email text,
  customer_phone text
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id, order_id, table_id, items_json, subtotal, service_charge,
    service_charge_amount, total, status, payment_status, payment_claimed, 
    qr_url, bill_downloaded, created_at, paid_at, last_updated_by, 
    last_updated_at, notes, customer_name, customer_email, customer_phone
  FROM public.orders 
  WHERE orders.table_id = p_table_id
  AND (
    (status != 'completed' AND status != 'rejected') 
    OR last_updated_at > now() - interval '10 minutes'
  )
  ORDER BY created_at DESC;
$$;