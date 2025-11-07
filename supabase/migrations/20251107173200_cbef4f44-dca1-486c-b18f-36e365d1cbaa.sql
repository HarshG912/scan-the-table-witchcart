-- Update RLS policy to allow unauthenticated orders when tenant doesn't require auth
DROP POLICY IF EXISTS "Customers can create orders with valid tenant" ON public.orders;

CREATE POLICY "Customers can create orders with valid tenant"
ON public.orders
FOR INSERT
WITH CHECK (
  -- Allow if user is authenticated and matches user_id
  (user_id = auth.uid() AND user_id IS NOT NULL)
  OR
  -- Allow if user_id is NULL (unauthenticated order) and tenant+table are valid
  (
    user_id IS NULL
    AND tenant_id IS NOT NULL
    AND table_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.id = orders.tenant_id
      AND tenants.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM restaurant_tables
      WHERE restaurant_tables.tenant_id = orders.tenant_id
      AND restaurant_tables.table_number::text = orders.table_id
      AND restaurant_tables.is_active = true
    )
  )
);