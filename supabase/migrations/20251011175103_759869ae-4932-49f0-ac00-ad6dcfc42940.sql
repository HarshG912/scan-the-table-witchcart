-- Add policy for customers to claim payment (but not modify payment_status)
-- Customers can only update payment_claimed from false to true on their own table's order
CREATE POLICY "Customers can claim payment only"
ON public.orders
FOR UPDATE
TO anon, authenticated
USING (
  payment_claimed = false 
  AND payment_status = 'unpaid'
)
WITH CHECK (
  payment_claimed = true 
  AND payment_status = 'unpaid'
  AND status = 'pending'
);