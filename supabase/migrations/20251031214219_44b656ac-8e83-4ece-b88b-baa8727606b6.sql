-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- ========================================
-- TENANTS TABLE POLICIES
-- ========================================

-- Universal admin can view all tenants
DROP POLICY IF EXISTS "Universal admin can view all tenants" ON public.tenants;
CREATE POLICY "Universal admin can view all tenants"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Universal admin can manage all tenants
DROP POLICY IF EXISTS "Universal admin can manage tenants" ON public.tenants;
CREATE POLICY "Universal admin can manage tenants"
  ON public.tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Tenant admins can view their own tenant
DROP POLICY IF EXISTS "Tenant admin can view own tenant" ON public.tenants;
CREATE POLICY "Tenant admin can view own tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- ========================================
-- TENANT_SETTINGS TABLE POLICIES
-- ========================================

-- Universal admin can view all tenant settings
DROP POLICY IF EXISTS "Universal admin can view all settings" ON public.tenant_settings;
CREATE POLICY "Universal admin can view all settings"
  ON public.tenant_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Universal admin can manage all tenant settings
DROP POLICY IF EXISTS "Universal admin can manage all settings" ON public.tenant_settings;
CREATE POLICY "Universal admin can manage all settings"
  ON public.tenant_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Tenant admin can view and update their own settings
DROP POLICY IF EXISTS "Tenant admin can manage own settings" ON public.tenant_settings;
CREATE POLICY "Tenant admin can manage own settings"
  ON public.tenant_settings FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- Only staff can view full tenant settings
DROP POLICY IF EXISTS "Only staff can view full settings" ON public.tenant_settings;
CREATE POLICY "Only staff can view full settings"
  ON public.tenant_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- GLOBAL_SETTINGS TABLE POLICIES
-- ========================================

-- Only universal admin can manage global settings
DROP POLICY IF EXISTS "Universal admin can manage global settings" ON public.global_settings;
CREATE POLICY "Universal admin can manage global settings"
  ON public.global_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Everyone can read global settings (for login flow)
DROP POLICY IF EXISTS "Public can view global settings" ON public.global_settings;
CREATE POLICY "Public can view global settings"
  ON public.global_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- ========================================
-- ORDERS TABLE POLICIES (UPDATED FOR MULTI-TENANT)
-- ========================================

-- Drop all existing order policies
DROP POLICY IF EXISTS "Authenticated users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Chefs and managers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Chefs and managers can view orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can claim payment only" ON public.orders;
DROP POLICY IF EXISTS "Only staff can update payment status" ON public.orders;
DROP POLICY IF EXISTS "Restricted order creation with valid table_id" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Waiters can create orders" ON public.orders;
DROP POLICY IF EXISTS "Waiters can view orders" ON public.orders;

-- Universal admin can see all orders
CREATE POLICY "Universal admin can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Tenant staff can view their tenant's orders
CREATE POLICY "Tenant staff can view own tenant orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('tenant_admin', 'chef', 'manager', 'waiter')
    )
  );

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Customers can create orders with valid tenant and table validation
CREATE POLICY "Customers can create orders with valid tenant"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    tenant_id IS NOT NULL AND
    table_id IS NOT NULL AND
    -- Validate tenant exists and is active
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE id = orders.tenant_id AND is_active = true
    ) AND
    -- Validate table exists for this tenant and is active
    EXISTS (
      SELECT 1 FROM public.restaurant_tables
      WHERE tenant_id = orders.tenant_id 
        AND table_number::TEXT = orders.table_id
        AND is_active = true
    )
  );

-- Tenant staff can update order status only (protected by trigger for price fields)
CREATE POLICY "Tenant staff can update order status only"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('chef', 'manager', 'waiter', 'tenant_admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('chef', 'manager', 'waiter', 'tenant_admin')
    )
  );

-- ========================================
-- RESTAURANT_TABLES TABLE POLICIES
-- ========================================

-- Public can view active tables (for QR validation)
DROP POLICY IF EXISTS "Public can view active tables" ON public.restaurant_tables;
CREATE POLICY "Public can view active tables"
  ON public.restaurant_tables FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Tenant admin can manage their tables
DROP POLICY IF EXISTS "Tenant admin can manage tables" ON public.restaurant_tables;
CREATE POLICY "Tenant admin can manage tables"
  ON public.restaurant_tables FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- Universal admin can manage all tables
DROP POLICY IF EXISTS "Universal admin can manage all tables" ON public.restaurant_tables;
CREATE POLICY "Universal admin can manage all tables"
  ON public.restaurant_tables FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- ========================================
-- USER_ROLES TABLE POLICIES (UPDATED)
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Universal admin can manage all roles
CREATE POLICY "Universal admin can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Tenant admin can manage roles within their tenant
CREATE POLICY "Tenant admin can manage tenant roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- PROFILES TABLE POLICIES (UPDATED)
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Staff can view profiles in their tenant
CREATE POLICY "Staff can view tenant profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'chef', 'waiter', 'tenant_admin')
    )
    OR auth.uid() = id
  );

-- Universal admin can view all profiles
CREATE POLICY "Universal admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
    )
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);