-- Remove qr_code_url column from restaurant_tables
ALTER TABLE public.restaurant_tables DROP COLUMN IF EXISTS qr_code_url;

-- Update auto_generate_tables function to not generate URLs
CREATE OR REPLACE FUNCTION public.auto_generate_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Only proceed if table_count changed
  IF TG_OP = 'UPDATE' AND OLD.table_count = NEW.table_count THEN
    RETURN NEW;
  END IF;

  -- Delete existing tables for this tenant
  DELETE FROM public.restaurant_tables WHERE tenant_id = NEW.tenant_id;

  -- Generate new tables without QR URLs
  FOR i IN 1..NEW.table_count LOOP
    INSERT INTO public.restaurant_tables (tenant_id, table_number, is_active)
    VALUES (NEW.tenant_id, i, true);
  END LOOP;

  RETURN NEW;
END;
$$;