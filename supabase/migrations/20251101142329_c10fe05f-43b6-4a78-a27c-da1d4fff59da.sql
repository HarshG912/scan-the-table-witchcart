-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Universal admin can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Tenant admin can manage tenant roles" ON public.user_roles;

-- Create security definer function to check roles without triggering RLS
-- This function bypasses RLS policies, breaking the recursion cycle
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recreate policies using the has_role() function to avoid recursion
CREATE POLICY "Universal admin can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant admin can manage tenant roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'tenant_admin') 
    AND tenant_id = (
      SELECT ur.tenant_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'tenant_admin'
      LIMIT 1
    )
  );