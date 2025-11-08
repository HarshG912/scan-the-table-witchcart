import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Clock, ChefHat, Package, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { orderToBillData, downloadBill } from "@/lib/unifiedBilling";

interface Order {
  id: string;
  order_id: string;
  table_id: string;
  items_json: string;
  total: number;
  status: string;
  payment_status: string;
  payment_claimed: boolean;
  payment_mode?: string;
  bill_downloaded?: boolean;
  created_at: string;
  last_updated_at: string;
}

interface TrackOrderProps {
  tableId: string;
  tenantId: string;
  refreshTrigger?: number;
}

export function TrackOrder({ tableId, tenantId, refreshTrigger }: TrackOrderProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const confettiTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (tableId && tenantId) {
      fetchOrder();
    }
  }, [tableId, tenantId]);

  // Handle manual refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && tableId && tenantId) {
      fetchOrder();
    }
  }, [refreshTrigger]);

  // Real-time subscription for order status changes
  useEffect(() => {
    if (!tableId || !tenantId) return;

    const channel = supabase
      .channel(`order-tracking-${tenantId}-${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `table_id=eq.${tableId},tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          const newStatus = updatedOrder.status;
          const newPaymentStatus = updatedOrder.payment_status;
          const orderId = updatedOrder.order_id;
          
          // Update orders state with functional update to avoid stale closure
          setOrders(prevOrders => {
            const previousOrder = prevOrders.find(o => o.id === updatedOrder.id);
            
            // Show toast for payment status changes
            if (previousOrder && previousOrder.payment_status !== newPaymentStatus) {
              if (newPaymentStatus === 'paid') {
                toast.success("💰 Payment Confirmed!", {
                  description: updatedOrder.payment_mode 
                    ? `Payment via ${updatedOrder.payment_mode.toUpperCase()} confirmed.`
                    : "Your payment has been confirmed.",
                  duration: 4000,
                });
              } else if (newPaymentStatus === 'unpaid') {
                toast.info("Payment status updated to unpaid", {
                  duration: 3000,
                });
              }
            }

            // Show toast for status changes
            const previousStatus = previousStatusRef.current.get(orderId);
            if (previousStatus && previousStatus !== newStatus) {
              switch (newStatus) {
                case 'accepted':
                  toast.success("✅ Order Accepted!", {
                    description: "Your order has been confirmed by the kitchen.",
                    duration: 4000,
                  });
                  break;
                case 'cooking':
                  toast.info("👨‍🍳 Your food is now cooking!", {
                    description: "The chef is preparing your delicious meal.",
                    duration: 4000,
                  });
                  break;
                case 'completed':
                  toast.success("🍽️ Order Completed!", {
                    description: "Enjoy your meal!",
                    duration: 4000,
                  });
                  // Trigger confetti only once per order
                  if (!confettiTriggeredRef.current.has(orderId)) {
                    confettiTriggeredRef.current.add(orderId);
                    confetti({
                      particleCount: 100,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#FF6B00', '#2B2B2B', '#FFF8F2'],
                    });
                    setTimeout(() => {
                      confetti.reset();
                    }, 2000);
                  }
                  break;
                case 'rejected':
                  toast.error("❌ Order Rejected", {
                    description: "Sorry, your order was rejected. Refund will be processed soon.",
                    duration: 5000,
                  });
                  break;
              }
            }
            
            previousStatusRef.current.set(orderId, newStatus);
            
            // Return updated orders array
            return prevOrders.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, tenantId]);

  const fetchOrder = async () => {
    if (!tableId || !tenantId) return;
    
    setLoading(true);

    try {
      // Use tenant-aware function to fetch orders
      const { data, error } = await supabase
        .rpc('get_orders_by_table', { 
          p_table_id: tableId,
          p_tenant_id: tenantId 
        });

      if (error) throw error;

      const fetchedOrders = data || [];
      
      // Initialize previous status refs on first load
      fetchedOrders.forEach((order: Order) => {
        if (!previousStatusRef.current.has(order.order_id)) {
          previousStatusRef.current.set(order.order_id, order.status);
        }
      });
      
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBill = async (order: Order) => {
    if (!order) return;
    
    try {
      // Fetch tenant-specific restaurant settings from public view (accessible without auth)
      const { data: settings, error } = await supabase
        .from('public_tenant_settings')
        .select('restaurant_name, restaurant_address, merchant_upi_id, service_charge')
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) throw error;
      
      const billData = orderToBillData(
        order as any,
        settings.restaurant_name || 'Restaurant',
        settings.restaurant_address || '',
        settings.merchant_upi_id || '',
        settings.service_charge || 0
      );
      
      downloadBill(billData);
      
      toast.success("Bill downloaded successfully!");
    } catch (error) {
      console.error('Error downloading bill:', error);
      toast.error("Failed to download bill");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "accepted":
        return <CheckCircle2 className="w-5 h-5" />;
      case "cooking":
        return <ChefHat className="w-5 h-5" />;
      case "completed":
        return <Package className="w-5 h-5" />;
      case "rejected":
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "accepted":
        return "bg-blue-500";
      case "cooking":
        return "bg-primary animate-pulse-border";
      case "completed":
        return "bg-green-500";
      case "rejected":
        return "bg-destructive";
      default:
        return "bg-gray-500";
    }
  };

  const statuses = ["pending", "accepted", "cooking", "completed"];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-muted-foreground">No active orders for this table.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 animate-fade-in">
      {orders.map((order) => {
        const items = JSON.parse(order.items_json);
        const currentStatusIndex = order.status !== "rejected" 
          ? statuses.indexOf(order.status) 
          : -1;

        if (order.status === "rejected") {
          return (
            <Card key={order.id} className="rounded-xl shadow-lg border-destructive bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <span>Order #{order.order_id}</span>
                  </CardTitle>
                  <Badge variant="destructive" className="w-fit">Rejected ❌</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-3">
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-muted-foreground">
                    Sorry, this order was rejected. Please contact the staff or place a new order.
                  </p>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <h3 className="font-semibold text-sm">Items</h3>
                  <div className="space-y-2">
                    {items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}× {item.Item}
                        </span>
                        <span>₹{(item.Price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={order.id} className="rounded-xl shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order #{order.order_id}</CardTitle>
                {order.payment_status === "paid" ? (
                  <Badge variant="default">
                    {order.payment_mode ? order.payment_mode.toUpperCase() : "PAID"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {order.payment_claimed ? "Verifying Payment" : "Unpaid"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Progress */}
              <div className="space-y-4">
                <h3 className="font-semibold">Order Status</h3>
                <div className="flex items-center justify-between relative">
                  {statuses.map((status, index) => (
                    <div key={status} className="flex flex-col items-center flex-1 relative z-10">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          index <= currentStatusIndex ? getStatusColor(status) : "bg-gray-200"
                        } text-white transition-all duration-300`}
                      >
                        {getStatusIcon(status)}
                      </div>
                      <p className="text-xs mt-2 capitalize text-center font-medium">{status}</p>
                      {index < statuses.length - 1 && (
                        <div
                          className={`absolute top-6 h-1 transition-all duration-300 ${
                            index < currentStatusIndex ? getStatusColor(status) : "bg-gray-200"
                          }`}
                          style={{ 
                            left: "50%", 
                            width: "calc(100% + 1rem)",
                            zIndex: -1
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold">Items</h3>
                <div className="space-y-2">
                  {items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}× {item.Item}
                      </span>
                      <span>₹{(item.Price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">₹{order.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Download Bill Button - Only show after order is accepted */}
              {(order.status === "accepted" || order.status === "cooking" || order.status === "completed") && (
        <Button 
          onClick={() => handleDownloadBill(order)} 
          className="w-full"
          variant="outline"
        >
              <Download className="mr-2 h-4 w-4" />
              Download Bill
            </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
