-- Fix RLS policy for user_roles to allow universal admins to insert roles for any user
DROP POLICY IF EXISTS "Universal admin can manage all roles" ON public.user_roles;

CREATE POLICY "Universal admin can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));