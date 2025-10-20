-- Create Orders table for restaurant orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  table_id TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  qr_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert orders (for customer ordering)
CREATE POLICY "Anyone can create orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anyone to read orders (for cook dashboard)
CREATE POLICY "Anyone can view orders"
  ON public.orders
  FOR SELECT
  USING (true);

-- Create policy to allow anyone to update orders (for status changes)
CREATE POLICY "Anyone can update orders"
  ON public.orders
  FOR UPDATE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_table_id ON public.orders(table_id);