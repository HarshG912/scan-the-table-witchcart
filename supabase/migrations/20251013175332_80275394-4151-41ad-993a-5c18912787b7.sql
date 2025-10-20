-- Add new columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'upi';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bill_downloaded boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_charge_amount numeric DEFAULT 0;

-- Add restaurant_address to settings table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS restaurant_address text DEFAULT '';

-- Step 1: Drop policies that depend on the enum
DROP POLICY IF EXISTS "Cooks and managers can view orders" ON public.orders;
DROP POLICY IF EXISTS "Cooks and managers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Only staff can update payment status" ON public.orders;
DROP POLICY IF EXISTS "Waiters can view orders" ON public.orders;
DROP POLICY IF EXISTS "Waiters can create orders" ON public.orders;
DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.settings;

-- Step 2: Drop the has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Step 3: Create a new enum with both cook and chef temporarily
CREATE TYPE public.app_role_new AS ENUM ('admin', 'cook', 'chef', 'waiter', 'manager');

-- Step 4: Update user_roles table to use the new enum
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role_new USING role::text::public.app_role_new;

-- Step 5: Update all cook roles to chef
UPDATE public.user_roles SET role = 'chef' WHERE role = 'cook';

-- Step 6: Drop old enum and rename new one
DROP TYPE public.app_role CASCADE;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 7: Recreate the has_role function with the new enum
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

-- Step 8: Recreate RLS policies with chef instead of cook
CREATE POLICY "Chefs and managers can view orders" ON public.orders
FOR SELECT USING (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Chefs and managers can update orders" ON public.orders
FOR UPDATE USING (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Only staff can update payment status" ON public.orders
FOR UPDATE USING (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Waiters can view orders" ON public.orders
FOR SELECT USING (has_role(auth.uid(), 'waiter'::app_role));

CREATE POLICY "Waiters can create orders" ON public.orders
FOR INSERT WITH CHECK (has_role(auth.uid(), 'waiter'::app_role));

CREATE POLICY "Managers can view all roles" ON public.user_roles
FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Only admins can update settings" ON public.settings
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));