-- Allow all tenant staff (manager, chef, waiter, tenant_admin) to view their associated tenant
CREATE POLICY "Tenant staff can view own tenant"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tenant_id
    FROM user_roles
    WHERE user_id = auth.uid()
    AND tenant_id IS NOT NULL
  )
);