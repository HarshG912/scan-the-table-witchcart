import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Order, CartItem } from "@/types/menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, LogOut, Download, ChefHat } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { useBillGenerator } from "@/hooks/use-bill-generator";
import { orderToBillData, downloadBill } from "@/lib/billGenerator";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function Cook() {
  const [filter, setFilter] = useState<string>("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { tenantId } = useParams<{ tenantId: string }>();
  
  // Enable automatic bill generation
  useBillGenerator();

  // Real-time subscription for new orders and order updates
  useEffect(() => {
    const channel = supabase
      .channel('cook-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order received:', payload);
          sonnerToast.success("🍽️ New Order Received", {
            description: `Table ${payload.new.table_id}`,
            duration: 5000,
          });
          // Optional: Play notification sound
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnYpBSuBzvLZiTYIGWi56+mfTQ0NUKXk9LdkGwU3kdbyynkqBSh+zO/ekTsKFGC173CtYBoGPJfZ88p3KgUqgc3z2og3CCZYTO/kmEcNDVan4fO4YxwGN5HV8sp5KgUrgc7y2Ik3CBlosuzon00NDFCl5PSvXxoEOJPY8sp5KgUqf8zv3pE7ChRgtO90rWAaBjyX2fPLdyoFKoHN89qINwgZZ7rr6J9NDQxQpeP0sGIcBjiS1vLKeScFKYHO8tmJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OYSA0PVqzn77BdGAg+ltryxnYpBSuBzvLZiTYIGWi56+mfTQ0NUKXk9LdkGwU3kdbyynkqBSh+zO/ekTsKFGC173CtYBoGPJfZ88p3KgUqgc3z2og3CCZYTO/kmEcNDVan4fO4YxwGN5HV8sp5KgUrgc7y2Ik3CBlosuzon00NDFCl5PSvXxoEOJPY8sp5KgUqf8zv3pE7ChRgtO90rWAaBjyX2fPLdyoFKoHN89qINwgZZ7rr6J9NDQxQpeP0sGIcBjiS1vLKeScFKYHO8tmJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OYSA0PVqzn77BdGAg+ltryxnYpBSuBzvLZiTYIGWi56+mfTQ0NUKXk9LdkGwU3kdbyynkqBSh+zO/ekTsKFGC173CtYBoGPJfZ88p3KgUqgc3z2og3CCZYTO/kmEcNDVan4fO4YxwGN5HV8sp5KgUrgc7y2Ik3CBlosuzon00NDFCl5PSvXxoEOJPY8sp5KgUqf8zv3pE7ChRgtO90rWAaBjyX2fPLdyoFKoHN89qINwgZZ7rr6J9NDQxQpeP0sGIcBjiS1vLKeScFKYHO8tmJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OYSA0PVqzn77BdGAg+ltryxnYpBSuBzvLZiTYIGWi56+mfTQ0NUKXk9LdkGwU3kdbyynkqBSh+zO/ekTsKFGC173CtYBoGPJfZ88p3KgUqgc3z2og3CCZYTO/kmEcNDVan4fO4YxwGN5HV8sp5KgUrgc7y2Ik3CBlosuzon00NDFCl5PSvXxoEOJPY8sp5KgUqf8zv3pE7ChRgtO90rWAaBjyX2fPLdyoFKoHN89qINwgZZ7rr6J9NDQxQpeP0sGIcBjiS1vLKeScFKYHO8tmJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2RQAoUXrTp66hVFA==');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch (e) {
            console.log('Could not play notification sound');
          }
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const [cookName, setCookName] = useState<string>("");
  const [isManager, setIsManager] = useState(false);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", session.user.id)
      .eq("tenant_id", tenantId)
      .in("role", ["chef", "manager"]);

    if (!roles || roles.length === 0) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You need chef or manager privileges to access this page.",
        duration: 2000,
      });
      // Sign out the user for unauthorized access
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth"), 2000);
      return;
    }

    const isManagerRole = roles.some(r => r.role === 'manager');
    setIsManager(isManagerRole);
    
    setUserId(session.user.id);
    setCookName(session.user.email?.split('@')[0] || 'Chef');
    setIsAuthenticated(true);
  };

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      // Filter out orders that are completed/rejected and older than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`status.not.in.(completed,rejected),and(status.in.(completed,rejected),last_updated_at.gte.${tenMinutesAgo})`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: isAuthenticated,
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, newStatus, markPaid, cookName }: { orderId: string; newStatus: string; markPaid?: boolean; cookName?: string }) => {
      const updateData: any = { 
        status: newStatus,
        last_updated_by: userId,
        last_updated_at: new Date().toISOString(),
      };

      if (markPaid) {
        updateData.payment_status = "paid";
        updateData.paid_at = new Date().toISOString();
      }

      // Track cooking time milestones
      if (newStatus === "accepted") {
        updateData.accepted_at = new Date().toISOString();
        if (cookName) updateData.cook_name = cookName;
      }
      
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Status updated",
        description: "Order status has been updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status.",
      });
    },
  });

  const togglePaymentStatus = useMutation({
    mutationFn: async ({ orderId, currentStatus }: { orderId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
      const updateData: any = {
        payment_status: newStatus,
        last_updated_by: userId,
        last_updated_at: new Date().toISOString(),
      };

      if (newStatus === "paid") {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Payment status updated",
        description: "Payment status has been updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating payment status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update payment status.",
      });
    },
  });

  const filteredOrders = orders?.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "accepted":
        return "default";
      case "cooking":
        return "default";
      case "completed":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    return status === "paid" ? "default" : "destructive";
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: "accepted",
      accepted: "cooking",
      cooking: "completed",
      completed: "completed",
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || currentStatus;
  };

  const getStatusButtonText = (currentStatus: string) => {
    const buttonText = {
      pending: "Accept Order",
      accepted: "Start Cooking",
      cooking: "Mark Completed",
      completed: "Done",
    };
    return buttonText[currentStatus as keyof typeof buttonText] || "Update";
  };

  const handleDownloadBill = async (order: Order) => {
    // Fetch restaurant settings
    const { data: settings } = await supabase
      .from('settings')
      .select('restaurant_name, restaurant_address')
      .limit(1)
      .single();
    
    const restaurantName = settings?.restaurant_name || 'Scan The Table';
    const restaurantAddress = settings?.restaurant_address || '';
    const billData = orderToBillData(order, restaurantName, restaurantAddress);
    await downloadBill(billData);
    
    toast({
      title: "Bill Downloaded",
      description: `Bill for order ${order.order_id} has been downloaded.`,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <DashboardHeader
        title="Chef Dashboard"
        subtitle="Scan The Table"
        logo={
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <ChefHat className="h-6 w-6" />
          </div>
        }
        actions={
          <Button
            variant="secondary"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
            className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm h-9 w-9 sm:h-10 sm:w-10 active:scale-95 transition-transform"
            title="Refresh orders"
            aria-label="Refresh order list"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
        navigationLinks={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/${tenantId}/admin`)}
              size="sm"
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Admin Panel
            </Button>
            {isManager && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/${tenantId}/analytics`)}
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20"
              >
                Analytics
              </Button>
            )}
          </div>
        }
        onLogout={handleLogout}
      />

      {/* Add padding-top to account for fixed header */}
      <div className="pt-14 sm:pt-16 md:pt-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <div className="relative mb-6">
            <div className="overflow-x-auto scrollbar-hide pb-2">
              <TabsList className="w-max flex gap-2 bg-transparent">
                <TabsTrigger value="all" className="whitespace-nowrap">All</TabsTrigger>
                <TabsTrigger value="pending" className="whitespace-nowrap">Pending</TabsTrigger>
                <TabsTrigger value="accepted" className="whitespace-nowrap">Accepted</TabsTrigger>
                <TabsTrigger value="cooking" className="whitespace-nowrap">Cooking</TabsTrigger>
                <TabsTrigger value="completed" className="whitespace-nowrap">Completed</TabsTrigger>
                <TabsTrigger value="rejected" className="whitespace-nowrap">Rejected</TabsTrigger>
              </TabsList>
            </div>
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const items: CartItem[] = JSON.parse(order.items_json);
                
                return (
                  <Card key={order.order_id} className="rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">Order {order.order_id}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Table {order.table_id} • {new Date(order.created_at!).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status.toUpperCase()}
                          </Badge>
                          {order.payment_status === "paid" && order.payment_mode ? (
                            <Badge variant="default">
                              {order.payment_mode.toUpperCase()}
                            </Badge>
                          ) : order.payment_status === "paid" ? (
                            <Badge variant="default">
                              PAID
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              UNPAID
                            </Badge>
                          )}
                          {order.payment_claimed && order.payment_status !== "paid" && (
                            <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700">
                              Payment Pending - Verify
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Order Items */}
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>
                              {item.quantity}x {item.Item}
                            </span>
                            <span className="font-semibold">
                              ₹{(item.Price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span className="text-primary">₹{order.total.toFixed(2)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2">
                        <Button
                          onClick={() => togglePaymentStatus.mutate({ 
                            orderId: order.id!, 
                            currentStatus: order.payment_status 
                          })}
                          disabled={togglePaymentStatus.isPending}
                          variant={order.payment_status === "paid" ? "outline" : "default"}
                          className="w-full"
                        >
                          {order.payment_status === "paid" ? "Mark as Unpaid" : "Mark as Paid"}
                        </Button>
                        {order.payment_status === "paid" && (
                          <Button
                            onClick={() => handleDownloadBill(order)}
                            variant="outline"
                            className="w-full"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Bill
                          </Button>
                        )}
                        {order.status === "pending" && order.payment_claimed && (
                          <Button
                            onClick={() => updateOrderStatus.mutate({ 
                              orderId: order.id!, 
                              newStatus: "accepted",
                              markPaid: true,
                              cookName: cookName
                            })}
                            disabled={updateOrderStatus.isPending}
                            className="bg-accent hover:bg-accent/90 w-full h-11"
                          >
                            Accept & Mark as Paid
                          </Button>
                        )}
                        {order.status !== "completed" && order.status !== "rejected" && order.status !== "pending" && order.payment_status === "paid" && (
                          <Button
                            onClick={() => updateOrderStatus.mutate({ 
                              orderId: order.id!, 
                              newStatus: getNextStatus(order.status),
                              cookName: cookName
                            })}
                            disabled={updateOrderStatus.isPending}
                            className="w-full h-11"
                          >
                            {getStatusButtonText(order.status)}
                          </Button>
                        )}
                        {order.status === "pending" && !order.payment_claimed && (
                          <Button
                            onClick={() => updateOrderStatus.mutate({ 
                              orderId: order.id!, 
                              newStatus: "accepted",
                              cookName: cookName
                            })}
                            disabled={updateOrderStatus.isPending}
                            className="w-full h-11"
                          >
                            Accept Order
                          </Button>
                        )}
                        {(order.status === "pending" || order.status === "accepted") && (
                          <Button
                            onClick={() => updateOrderStatus.mutate({ 
                              orderId: order.id!, 
                              newStatus: "rejected"
                            })}
                            disabled={updateOrderStatus.isPending}
                            variant="destructive"
                            className="w-full"
                          >
                            Reject Order
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          )}
        </Tabs>
        </div>
      </div>
    </div>
  );
}
