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
import { orderToBillData, downloadBill } from "@/lib/billGenerator";

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
  initialTableId?: string;
  refreshTrigger?: number;
}

export function TrackOrder({ initialTableId, refreshTrigger }: TrackOrderProps) {
  const [tableId, setTableId] = useState(initialTableId || "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const confettiTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (initialTableId) {
      fetchOrder(initialTableId);
    }
  }, [initialTableId]);

  // Handle manual refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && tableId) {
      fetchOrder(tableId);
    }
  }, [refreshTrigger]);

  // Real-time subscription for order status changes
  useEffect(() => {
    if (!tableId) return;

    const channel = supabase
      .channel(`order-tracking-${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `table_id=eq.${tableId}`
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
  }, [tableId]);

  const fetchOrder = async (table: string) => {
    if (!table) return;
    
    if (orders.length === 0) setLoading(true);

    try {
      // Use secure function to fetch orders - includes 10-minute auto-clear logic
      const { data, error } = await supabase
        .rpc('get_orders_by_table', { p_table_id: table });

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
      setSearching(false);
    }
  };

  const handleDownloadBill = async (order: Order) => {
    if (!order || order.bill_downloaded) return;
    
    try {
      // Fetch restaurant settings
      const { data: settings } = await supabase
        .from('settings')
        .select('restaurant_name, restaurant_address')
        .limit(1)
        .single();
      
      const restaurantName = settings?.restaurant_name || 'Scan The Table';
      const restaurantAddress = settings?.restaurant_address || '';
      
      // Generate and download bill
      const billData = orderToBillData(order as any, restaurantName, restaurantAddress);
      await downloadBill(billData);
      
      // Update database
      await supabase
        .from("orders")
        .update({ bill_downloaded: true })
        .eq("id", order.id);
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id ? { ...o, bill_downloaded: true } : o
        )
      );
      
      toast.success("Bill downloaded successfully!");
    } catch (error) {
      console.error("Error downloading bill:", error);
      toast.error("Failed to download bill");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    fetchOrder(tableId);
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

  if (!initialTableId) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle>Track Your Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tableId">Enter Table Number</Label>
                <Input
                  id="tableId"
                  type="text"
                  placeholder="Table number"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={searching || !tableId}>
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Track Order"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Card key={order.id} className="rounded-xl shadow-lg border-destructive">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="w-6 h-6 text-destructive" />
                    Order #{order.order_id}
                  </CardTitle>
                  <Badge variant="destructive">Rejected ❌</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Sorry, this order was rejected. Please contact the staff or place a new order.
                </p>
                
                <div className="space-y-2 pt-4 border-t">
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
                  disabled={order.bill_downloaded} 
                  className={order.bill_downloaded ? "opacity-40 w-full" : "w-full"}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {order.bill_downloaded ? "Bill Downloaded" : "Download Bill"}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
