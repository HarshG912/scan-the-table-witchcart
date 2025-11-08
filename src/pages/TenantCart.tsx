import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, X, Wallet, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/AuthDialog";
import { ThemeControls } from "@/components/ThemeControls";
import { useTenant } from "@/contexts/TenantContext";
import type { User, Session } from "@supabase/supabase-js";

export default function TenantCart() {
  const { tenantId, tableNumber } = useParams<{ tenantId: string; tableNumber: string }>();
  const { settings, tenant } = useTenant();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [upiUrl, setUpiUrl] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash" | "card">("upi");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; phone?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const serviceChargeRate = settings?.service_charge || 0;
  const availablePaymentModes = (settings?.payment_modes as any) || { upi: true, cash: true, card: true };

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${tenantId}_${tableNumber}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    
    // Check if user just logged in (returning from OAuth)
    const wasRedirectedFromAuth = sessionStorage.getItem('pending_order_placement');
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).then(() => {
          // If user just logged in and has pending order, automatically place it
          if (wasRedirectedFromAuth === 'true') {
            sessionStorage.removeItem('pending_order_placement');
            setTimeout(() => {
              handleConfirmOrder();
            }, 500);
          }
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId, tableNumber]);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", userId)
      .single();
    
    if (data) {
      setUserProfile(data);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prevCart => {
      const updatedCart = prevCart.map(item => item["Item Id"] === itemId ? {
        ...item,
        quantity: Math.max(0, item.quantity + delta)
      } : item).filter(item => item.quantity > 0);
      localStorage.setItem(`cart_${tenantId}_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const removeItem = (itemId: string) => {
    setCart(prevCart => {
      const updatedCart = prevCart.filter(item => item["Item Id"] !== itemId);
      localStorage.setItem(`cart_${tenantId}_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast.success("Item removed from cart");
  };

  const handleConfirmOrder = async () => {
    // Wait for auth to load before checking
    if (isAuthLoading) {
      console.log("Order blocked: Auth still loading");
      return;
    }

    // Pre-flight validation: Check authentication only if required
    const requireAuth = settings?.require_customer_auth ?? true;
    
    if (requireAuth && (!user || !session)) {
      console.log("Order blocked: User not authenticated");
      sessionStorage.setItem('pending_order_placement', 'true');
      setShowAuthDialog(true);
      return;
    }

    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    
    console.log("Starting order creation:", {
      tenantId,
      tableNumber,
      userId: user?.id || 'guest',
      paymentMode,
      cartItems: cart.length,
      cartTotal: cart.reduce((sum, item) => sum + item.Price * item.quantity, 0)
    });

    try {
      // Pre-flight validation: Verify tenant and table exist
      const { data: tableData, error: tableError } = await supabase
        .from("restaurant_tables")
        .select("id, is_active, tenant_id")
        .eq("tenant_id", tenantId)
        .eq("table_number", parseInt(tableNumber!))
        .single();

      if (tableError || !tableData) {
        console.error("Table validation failed:", { tenantId, tableNumber, tableError });
        toast.error("Invalid table. Please scan the QR code again.");
        return;
      }

      if (!tableData.is_active) {
        console.error("Table is not active:", { tenantId, tableNumber });
        toast.error("This table is currently inactive. Please contact staff.");
        return;
      }

      console.log("Table validation passed:", tableData);

      // Generate order ID using tenant-aware function
      const { data: orderIdData, error: orderIdError } = await supabase.rpc("generate_order_id", {
        p_tenant_id: tenantId
      });
      
      if (orderIdError) {
        console.error("Order ID generation failed:", orderIdError);
        throw new Error("Failed to generate order ID");
      }
      
      const newOrderId = orderIdData;
      console.log("Generated order ID:", newOrderId);

      const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
      const serviceChargeAmount = subtotal * serviceChargeRate / 100;
      const grandTotal = subtotal + serviceChargeAmount;
      let qrUrl = "";
      let upiString = "";

      if (paymentMode === "upi") {
        console.log("Generating UPI payment URL...");
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('generate-payment-url', {
          body: {
            order_id: newOrderId,
            amount: grandTotal,
            tenant_id: tenantId
          }
        });
        
        if (paymentError || !paymentData) {
          console.error("Payment URL generation failed:", paymentError);
          throw new Error("Failed to generate payment URL. Please try cash or card payment.");
        }
        
        upiString = paymentData.upi_url;
        qrUrl = paymentData.qr_url;
        setUpiUrl(upiString);
        console.log("Payment URL generated successfully");
      }

      console.log("Inserting order into database...");
      const requireAuth = settings?.require_customer_auth ?? true;
      
      const { error: insertError } = await supabase.from("orders").insert({
        tenant_id: tenantId,
        order_id: newOrderId,
        table_id: tableNumber!,
        items_json: JSON.stringify(cart),
        subtotal,
        service_charge: serviceChargeRate,
        service_charge_amount: serviceChargeAmount,
        total: grandTotal,
        status: "pending",
        payment_status: "unpaid",
        payment_mode: paymentMode,
        qr_url: qrUrl || null,
        notes: "",
        user_id: requireAuth && user ? user.id : null,
        customer_name: userProfile?.full_name || "Guest",
        customer_email: userProfile?.email || (user ? user.email : "") || "",
        customer_phone: userProfile?.phone || null,
      });
      
      if (insertError) {
        console.error("Order insert failed:", insertError);
        throw insertError;
      }

      console.log("Order created successfully:", newOrderId);
      setOrderId(newOrderId);
      
      if (paymentMode === "upi") {
        setQrUrl(qrUrl);
        setShowPayment(true);
        toast.success("Order placed! Please complete payment.");
      } else {
        localStorage.removeItem(`cart_${tenantId}_${tableNumber}`);
        toast.success(`Order placed successfully! Payment mode: ${paymentMode.toUpperCase()}`);
        navigate(`/${tenantId}/table/${tableNumber}`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      
      // Enhanced error handling with specific messages
      let errorMessage = "Failed to place order. Please try again.";
      
      if (error?.message) {
        if (error.message.includes("row-level security") || error.message.includes("policy")) {
          errorMessage = "Unable to place order. Please ensure you're logged in and the table is valid.";
          console.error("RLS Policy violation:", {
            tenantId,
            tableNumber,
            userId: user?.id,
            error: error.message
          });
        } else if (error.message.includes("payment")) {
          errorMessage = "Failed to generate payment details. Please try cash or card payment.";
        } else if (error.message.includes("generate_order_id")) {
          errorMessage = "Failed to generate order ID. Please try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, { duration: 5000 });
      
      // Comprehensive error logging for debugging
      console.error("Complete order creation failure details:", {
        tenantId,
        tableNumber,
        userId: user?.id,
        userEmail: user?.email,
        paymentMode,
        cartItemCount: cart.length,
        subtotal: cart.reduce((sum, item) => sum + item.Price * item.quantity, 0),
        serviceChargeRate,
        errorType: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        fullError: error
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleNotifyCook = async () => {
    try {
      const { error } = await supabase.from("orders").update({
        payment_claimed: true,
        paid_at: new Date().toISOString()
      }).eq("order_id", orderId);
      if (error) throw error;
      localStorage.removeItem(`cart_${tenantId}_${tableNumber}`);

      window.location.href = upiUrl;

      setTimeout(() => {
        navigate(`/${tenantId}/table/${tableNumber}`);
      }, 2000);
    } catch (error) {
      console.error("Error claiming payment:", error);
      toast.error("Failed to claim payment.");
    }
  };

  const handleClearCart = () => {
    setCart([]);
    localStorage.removeItem(`cart_${tenantId}_${tableNumber}`);
    toast.success("Cart cleared");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
  const serviceChargeAmount = subtotal * serviceChargeRate / 100;
  const grandTotal = subtotal + serviceChargeAmount;

  if (showPayment) {
    return (
      <div className="min-h-screen bg-background pb-6 animate-fade-in">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Payment</h1>
              <p className="text-sm opacity-90">Order #{orderId}</p>
            </div>
            <ThemeControls variant="compact" />
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
          <Card className="rounded-xl shadow-lg animate-slide-up">
            <CardHeader>
              <CardTitle>Scan QR Code to Pay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-md">
                  <img src={qrUrl} alt="Payment QR Code" className="w-64 h-64" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Service Charge ({serviceChargeRate}%)</span>
                  <span>₹{serviceChargeAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button onClick={handleNotifyCook} className="w-full h-12 text-base">
                  Pay & Notify Cook
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
        redirectPath={`/${tenantId}/cart/${tableNumber}`}
        onAuthSuccess={() => {
          setShowAuthDialog(false);
        }}
      />
      
      <div className="min-h-screen bg-background pb-6 animate-fade-in">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your Cart</h1>
              <p className="text-sm opacity-90">{tenant?.restaurant_name} • Table {tableNumber}</p>
            </div>
            <div className="flex gap-2">
              <ThemeControls variant="compact" />
              <Button variant="ghost" size="icon" onClick={() => navigate(`/${tenantId}/table/${tableNumber}`)} className="text-primary-foreground hover:bg-primary-hover h-9 w-9">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
          {cart.length === 0 ? (
            <Card className="rounded-xl shadow-lg animate-slide-up">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">Your cart is empty</p>
                <Button onClick={() => navigate(`/${tenantId}/table/${tableNumber}`)}>Browse Menu</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map(item => (
                  <Card key={item["Item Id"]} className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg break-words">{item.Item}</h3>
                          <p className="text-sm text-primary font-bold mt-1">₹{item.Price} each</p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Button size="icon" variant="outline" onClick={() => updateQuantity(item["Item Id"], -1)} className="h-8 w-8 rounded-full">
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-semibold w-8 text-center">{item.quantity}</span>
                            <Button size="icon" variant="outline" onClick={() => updateQuantity(item["Item Id"], 1)} className="h-8 w-8 rounded-full">
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeItem(item["Item Id"])} className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="text-right min-w-[70px] sm:min-w-[80px]">
                            <p className="font-bold text-base sm:text-lg whitespace-nowrap">₹{(item.Price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="rounded-xl shadow-lg">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Service Charge ({serviceChargeRate}%)</span>
                      <span>₹{serviceChargeAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-xl">
                      <span>Grand Total</span>
                      <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="space-y-3 p-4 rounded-lg bg-secondary/20 border border-border">
                      <Label className="text-sm font-semibold">Payment Mode</Label>
                      <RadioGroup value={paymentMode} onValueChange={(value: "upi" | "cash" | "card") => setPaymentMode(value)}>
                        {availablePaymentModes.upi && (
                          <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-secondary/30 transition-colors cursor-pointer">
                            <RadioGroupItem value="upi" id="upi" />
                            <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer flex-1">
                              <Wallet className="w-4 h-4 text-primary" />
                              <span>UPI Payment</span>
                            </Label>
                          </div>
                        )}
                        {availablePaymentModes.cash && (
                          <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-secondary/30 transition-colors cursor-pointer">
                            <RadioGroupItem value="cash" id="cash" />
                            <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                              <Banknote className="w-4 h-4 text-primary" />
                              <span>Cash Payment</span>
                            </Label>
                          </div>
                        )}
                        {availablePaymentModes.card && (
                          <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-secondary/30 transition-colors cursor-pointer">
                            <RadioGroupItem value="card" id="card" />
                            <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                              <CreditCard className="w-4 h-4 text-primary" />
                              <span>Card Payment</span>
                            </Label>
                          </div>
                        )}
                      </RadioGroup>
                    </div>

                    <Button onClick={handleConfirmOrder} disabled={isPlacingOrder} className="w-full h-12 text-base">
                      {isPlacingOrder ? "Placing Order..." : "Confirm Order"}
                    </Button>
                    <Button onClick={handleClearCart} variant="outline" className="w-full">
                      Clear Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
