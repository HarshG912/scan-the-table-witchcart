import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { orderToBillData, downloadBill } from "@/lib/unifiedBilling";
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
              
              // Fetch tenant-specific restaurant settings
              const { data: settings, error: settingsError } = await supabase
                .from('tenant_settings')
                .select('restaurant_name, restaurant_address, merchant_upi_id, service_charge')
                .eq('tenant_id', order.tenant_id)
                .single();

              if (settingsError) {
                console.error('Error fetching settings:', settingsError);
                return;
              }

              // Convert order to bill data using unified system
              const billData = orderToBillData(
                order,
                settings.restaurant_name || 'Restaurant',
                settings.restaurant_address || '',
                settings.merchant_upi_id || '',
                settings.service_charge || 0
              );
              
              // Download bill with consistent formatting and QR code
              downloadBill(billData);
              
              // Store bill URL placeholder
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
