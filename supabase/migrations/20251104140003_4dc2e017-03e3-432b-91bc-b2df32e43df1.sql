-- Fix race condition in generate_order_id function by using advisory locks
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
  lock_key BIGINT;
  max_retries INT := 10;
  retry_count INT := 0;
BEGIN
  today_date := CURRENT_DATE;
  reversed_date := reverse(to_char(today_date, 'YYYYMMDD'));
  
  -- Create a unique lock key based on tenant_id and date
  -- This ensures different tenants can generate IDs concurrently
  lock_key := ('x' || substr(md5(p_tenant_id::text || today_date::text), 1, 15))::bit(60)::bigint;
  
  -- Acquire advisory lock (will wait if another transaction has it)
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Now safely count orders for this tenant and date
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_id ~ ('^ORD' || reversed_date || '[0-9]+$')
      THEN SUBSTRING(order_id FROM '[0-9]+$')::INT 
      ELSE 0 
    END
  ), 0) + 1 INTO order_count
  FROM public.orders
  WHERE DATE(created_at) = today_date
    AND tenant_id = p_tenant_id
    AND order_id LIKE 'ORD' || reversed_date || '%';
  
  -- Generate order ID: ORD + reversed_date + sequential_number (padded to 2 digits)
  new_order_id := 'ORD' || reversed_date || LPAD(order_count::text, 2, '0');
  
  -- Verify uniqueness (extra safety check)
  WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_id = new_order_id) LOOP
    retry_count := retry_count + 1;
    IF retry_count > max_retries THEN
      RAISE EXCEPTION 'Failed to generate unique order ID after % attempts', max_retries;
    END IF;
    order_count := order_count + 1;
    new_order_id := 'ORD' || reversed_date || LPAD(order_count::text, 2, '0');
  END LOOP;
  
  RETURN new_order_id;
  
  -- Lock is automatically released at transaction end
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_order_id(UUID) TO anon, authenticated;