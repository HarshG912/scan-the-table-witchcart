-- Security Enhancement Migration for Scan The Table App

-- 1. Create a secure function for customers to track orders by table_id
-- This replaces the overly permissive public SELECT policy
CREATE OR REPLACE FUNCTION public.get_orders_by_table(p_table_id text)
RETURNS TABLE (
  id uuid,
  order_id text,
  table_id text,
  items_json text,
  subtotal numeric,
  service_charge numeric,
  total numeric,
  status text,
  payment_status text,
  payment_claimed boolean,
  qr_url text,
  created_at timestamp with time zone,
  paid_at timestamp with time zone,
  last_updated_by text,
  last_updated_at timestamp with time zone,
  notes text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, order_id, table_id, items_json, subtotal, service_charge, 
    total, status, payment_status, payment_claimed, qr_url, 
    created_at, paid_at, last_updated_by, last_updated_at, notes
  FROM public.orders 
  WHERE orders.table_id = p_table_id
  AND (
    (status != 'completed' AND status != 'rejected') 
    OR last_updated_at > now() - interval '10 minutes'
  );
$$;

-- 2. Drop the overly permissive public policies
DROP POLICY IF EXISTS "Anyone can view orders by table_id for tracking" ON public.orders;
DROP POLICY IF EXISTS "Allow public order creation" ON public.orders;

-- 3. Create more restrictive INSERT policy with table_id validation
CREATE POLICY "Restricted order creation with valid table_id"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  table_id IS NOT NULL 
  AND length(table_id) > 0 
  AND length(table_id) <= 50
  AND table_id ~ '^[A-Za-z0-9_-]+$'
);

-- 4. Restrict payment_claimed and payment_status updates
-- Drop the overly permissive customer payment claim policy
DROP POLICY IF EXISTS "Customers can claim payment" ON public.orders;

-- Create new policy: Only cooks/managers can update payment fields
CREATE POLICY "Only staff can update payment status"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'cook'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'cook'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- 5. Ensure update_orders_updated_at function has proper search_path
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Grant execute permission on the tracking function to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_orders_by_table(text) TO anon, authenticated;