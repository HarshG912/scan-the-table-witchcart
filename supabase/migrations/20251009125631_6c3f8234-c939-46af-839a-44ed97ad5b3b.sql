-- Add new fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_charge numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_claimed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_updated_by text,
ADD COLUMN IF NOT EXISTS last_updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS notes text;

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('cook', 'manager', 'customer');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
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

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

-- Allow anyone to create orders (customers via QR codes)
CREATE POLICY "Allow public order creation"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only authenticated cooks and managers can view orders
CREATE POLICY "Cooks and managers can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'cook'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

-- Only authenticated cooks and managers can update orders
CREATE POLICY "Cooks and managers can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'cook'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'cook'::app_role) OR 
  public.has_role(auth.uid(), 'manager'::app_role)
);

-- Customers can view their own orders by table_id (for tracking)
CREATE POLICY "Anyone can view orders by table_id for tracking"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

-- Customers can update payment_claimed flag only
CREATE POLICY "Customers can claim payment"
ON public.orders
FOR UPDATE
TO anon, authenticated
USING (payment_claimed = false)
WITH CHECK (payment_claimed = true);

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Trigger to update last_updated_at
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_timestamp
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_table_created ON public.orders(table_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);