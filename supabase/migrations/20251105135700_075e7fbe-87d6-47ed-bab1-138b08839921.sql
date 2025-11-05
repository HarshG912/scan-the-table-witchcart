-- Allow public read access to active tenants (for menu pages)
CREATE POLICY "Public can view active tenants"
ON public.tenants
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Check if public_tenant_settings is a table or view and handle accordingly
DO $$
BEGIN
  -- If it's a view, we need to enable RLS on the underlying tables
  -- If it's a table, add the policy directly
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'public_tenant_settings'
  ) THEN
    -- It's a table, add policy
    EXECUTE 'CREATE POLICY "Public can view tenant settings" ON public.public_tenant_settings FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;