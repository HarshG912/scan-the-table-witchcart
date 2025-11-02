-- Create helper function to get user's tenant_id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = _user_id 
    AND role = 'tenant_admin'
  LIMIT 1
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Tenant admin can manage tenant roles" ON public.user_roles;

CREATE POLICY "Tenant admin can manage tenant roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'tenant_admin') 
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );