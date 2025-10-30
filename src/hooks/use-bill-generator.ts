import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { orderToBillData, downloadBill } from "@/lib/billGenerator";
import { Order } from "@/types/menu";

export function useBillGenerator() {
  useEffect(() => {
    // Subscribe to order updates
    const channel = supabase
      .channel('bill-generator')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'payment_status=eq.paid'
        },
        async (payload) => {
          const order = payload.new as Order;
          
          // Only generate bill if it hasn't been generated yet
          if (order.payment_status === 'paid' && !order.bill_url) {
            try {
              console.log('Auto-generating bill for order:', order.order_id);
              
              // Fetch restaurant settings
              const { data: settings } = await supabase
                .from('settings')
                .select('restaurant_name, restaurant_address, merchant_upi_id')
                .limit(1)
                .single();

              const restaurantName = settings?.restaurant_name || 'Scan The Table';
              const restaurantAddress = settings?.restaurant_address || '';
              
              // Generate QR code URL if merchant UPI ID exists
              let qrUrl = '';
              if (settings?.merchant_upi_id) {
                const upiString = `upi://pay?pa=${settings.merchant_upi_id}&pn=${encodeURIComponent(restaurantName)}&am=${order.total}&tn=Order+${order.order_id}&cu=INR`;
                qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}&size=300`;
              }
              
              // Convert order to bill data and download
              const billData = orderToBillData(order, restaurantName, restaurantAddress);
              await downloadBill(billData, qrUrl);
              
              // Store bill URL placeholder (in real implementation, you'd upload to storage)
              await supabase
                .from('orders')
                .update({ bill_url: `bill_${order.order_id}.html` })
                .eq('id', order.id);
                
              console.log('Bill generated successfully for order:', order.order_id);
            } catch (error) {
              console.error('Error generating bill:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
