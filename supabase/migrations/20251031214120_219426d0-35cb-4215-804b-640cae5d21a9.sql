-- ========================================
-- PHASE 1: CREATE NEW TABLES
-- ========================================

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name TEXT NOT NULL UNIQUE,
  restaurant_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create tenant_settings table
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  merchant_upi_id TEXT NOT NULL DEFAULT 'merchant@upi',
  service_charge NUMERIC NOT NULL DEFAULT 0,
  restaurant_name TEXT NOT NULL,
  restaurant_address TEXT DEFAULT '',
  table_count INTEGER NOT NULL DEFAULT 10,
  payment_modes JSONB NOT NULL DEFAULT '{"upi": true, "card": true, "cash": true}'::jsonb,
  menu_sheet_url TEXT,
  theme_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Create global_settings table
CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_type TEXT NOT NULL DEFAULT 'google',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_settings_singleton ON public.global_settings ((id IS NOT NULL));

-- Insert default global settings
INSERT INTO public.global_settings (login_type) VALUES ('google') ON CONFLICT DO NOTHING;

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Create restaurant_tables table
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  qr_code_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, table_number)
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_id ON public.restaurant_tables(tenant_id);

-- ========================================
-- PHASE 2: ADD tenant_id TO EXISTING TABLES
-- ========================================

-- Add tenant_id to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);

-- Add tenant_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- Update user_roles enum to include tenant_admin
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'tenant_admin';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add tenant_id to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);

-- Add table_id format constraint to orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_table_id_format;
ALTER TABLE public.orders ADD CONSTRAINT check_table_id_format CHECK (table_id ~ '^[0-9]+$');

-- ========================================
-- PHASE 3: CREATE DATABASE FUNCTIONS
-- ========================================

-- Function to auto-generate tables (CORRECTED with explicit typecast)
CREATE OR REPLACE FUNCTION public.auto_generate_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_url TEXT;
  i INTEGER;
BEGIN
  -- Only proceed if table_count changed
  IF TG_OP = 'UPDATE' AND OLD.table_count = NEW.table_count THEN
    RETURN NEW;
  END IF;

  base_url := current_setting('app.base_url', true);
  IF base_url IS NULL THEN
    base_url := 'https://your-app.vercel.app';
  END IF;

  -- Delete existing tables for this tenant
  DELETE FROM public.restaurant_tables WHERE tenant_id = NEW.tenant_id;

  -- Generate new tables with explicit typecast
  FOR i IN 1..NEW.table_count LOOP
    INSERT INTO public.restaurant_tables (tenant_id, table_number, qr_code_url, is_active)
    VALUES (
      NEW.tenant_id,
      i,
      base_url || '/' || NEW.tenant_id || '/table/' || i::TEXT,
      true
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create BEFORE trigger for table generation
DROP TRIGGER IF EXISTS trigger_auto_generate_tables ON public.tenant_settings;
CREATE TRIGGER trigger_auto_generate_tables
BEFORE INSERT OR UPDATE OF table_count ON public.tenant_settings
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_tables();

-- Update generate_order_id function to be tenant-aware
CREATE OR REPLACE FUNCTION public.generate_order_id(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_date DATE;
  reversed_date TEXT;
  order_count INT;
  new_order_id TEXT;
BEGIN
  today_date := CURRENT_DATE;
  reversed_date := reverse(to_char(today_date, 'YYYYMMDD'));
  
  SELECT COUNT(*) + 1 INTO order_count
  FROM public.orders
  WHERE DATE(created_at) = today_date
    AND tenant_id = p_tenant_id;
  
  new_order_id := 'ORD' || reversed_date || LPAD(order_count::text, 2, '0');
  
  RETURN new_order_id;
END;
$$;

-- Update get_orders_by_table function to be tenant-aware
CREATE OR REPLACE FUNCTION public.get_orders_by_table(
  p_table_id TEXT,
  p_tenant_id UUID
)
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
    AND orders.tenant_id = p_tenant_id
    AND (
      (status != 'completed' AND status != 'rejected') 
      OR last_updated_at > now() - interval '10 minutes'
    )
  ORDER BY created_at DESC;
$$;

-- Create tenant context helper function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Create atomic tenant registration function
CREATE OR REPLACE FUNCTION public.create_new_tenant(
  p_tenant_name TEXT,
  p_restaurant_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_table_count INTEGER,
  p_menu_sheet_url TEXT,
  p_merchant_upi_id TEXT,
  p_service_charge NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create tenant
  INSERT INTO public.tenants (tenant_name, restaurant_name, contact_email, contact_phone, is_active)
  VALUES (p_tenant_name, p_restaurant_name, p_contact_email, p_contact_phone, true)
  RETURNING id INTO new_tenant_id;
  
  -- Create tenant settings (triggers auto table generation)
  INSERT INTO public.tenant_settings (
    tenant_id, merchant_upi_id, service_charge, restaurant_name,
    restaurant_address, table_count, menu_sheet_url
  )
  VALUES (
    new_tenant_id, p_merchant_upi_id, p_service_charge, p_restaurant_name,
    '', p_table_count, p_menu_sheet_url
  );
  
  RETURN new_tenant_id;
END;
$$;

-- Create trigger to prevent modification of order prices by staff
CREATE OR REPLACE FUNCTION public.prevent_order_price_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user is universal admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id IS NULL
  ) INTO is_admin;
  
  -- Universal admin can modify anything
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- For staff: prevent modification of critical fields
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id';
  END IF;
  
  IF OLD.subtotal IS DISTINCT FROM NEW.subtotal THEN
    RAISE EXCEPTION 'Cannot modify subtotal';
  END IF;
  
  IF OLD.service_charge IS DISTINCT FROM NEW.service_charge THEN
    RAISE EXCEPTION 'Cannot modify service_charge';
  END IF;
  
  IF OLD.service_charge_amount IS DISTINCT FROM NEW.service_charge_amount THEN
    RAISE EXCEPTION 'Cannot modify service_charge_amount';
  END IF;
  
  IF OLD.total IS DISTINCT FROM NEW.total THEN
    RAISE EXCEPTION 'Cannot modify total amount';
  END IF;
  
  IF OLD.order_id IS DISTINCT FROM NEW.order_id THEN
    RAISE EXCEPTION 'Cannot modify order_id';
  END IF;
  
  IF OLD.table_id IS DISTINCT FROM NEW.table_id THEN
    RAISE EXCEPTION 'Cannot modify table_id';
  END IF;
  
  IF OLD.items_json IS DISTINCT FROM NEW.items_json THEN
    RAISE EXCEPTION 'Cannot modify items_json';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_order_modification ON public.orders;
CREATE TRIGGER trigger_prevent_order_modification
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_order_price_modification();

-- ========================================
-- PHASE 4: CREATE PUBLIC VIEW FOR SAFE SETTINGS ACCESS
-- ========================================

CREATE OR REPLACE VIEW public.public_tenant_settings AS
SELECT
  tenant_id,
  service_charge,
  restaurant_name,
  restaurant_address,
  menu_sheet_url,
  payment_modes,
  theme_config
FROM public.tenant_settings;

GRANT SELECT ON public.public_tenant_settings TO anon, authenticated;