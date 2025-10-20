import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, ArrowLeft, X, Wallet, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/AuthDialog";
import { ThemeControls } from "@/components/ThemeControls";
import type { User, Session } from "@supabase/supabase-js";
export default function Cart() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get("table") || "1";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [upiUrl, setUpiUrl] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash" | "card">("upi");
  const [serviceChargeRate, setServiceChargeRate] = useState(5);
  const [availablePaymentModes, setAvailablePaymentModes] = useState({
    upi: true,
    cash: true,
    card: true
  });
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; phone?: string } | null>(null);
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${tableId}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
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

    // Fetch service charge and payment modes from public settings view
    const fetchSettings = async () => {
      const { data: settingsData } = await supabase
        .from("public_settings")
        .select("service_charge, payment_modes")
        .limit(1)
        .single();

      if (settingsData) {
        setServiceChargeRate(settingsData.service_charge || 5);
        if (settingsData.payment_modes) {
          const modes = settingsData.payment_modes as { upi?: boolean; cash?: boolean; card?: boolean };
          setAvailablePaymentModes({
            upi: modes.upi ?? true,
            cash: modes.cash ?? true,
            card: modes.card ?? true,
          });
        }
      }
    };
    
    fetchSettings();

    return () => {
      subscription.unsubscribe();
    };
  }, [tableId]);

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

  // Debug auth state
  useEffect(() => {
    console.log('Auth State:', { 
      user: !!user, 
      session: !!session, 
      userProfile: !!userProfile 
    });
  }, [user, session, userProfile]);
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prevCart => {
      const updatedCart = prevCart.map(item => item["Item Id"] === itemId ? {
        ...item,
        quantity: Math.max(0, item.quantity + delta)
      } : item).filter(item => item.quantity > 0);
      localStorage.setItem(`cart_${tableId}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
  };
  const removeItem = (itemId: string) => {
    setCart(prevCart => {
      const updatedCart = prevCart.filter(item => item["Item Id"] !== itemId);
      localStorage.setItem(`cart_${tableId}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast.success("Item removed from cart");
  };
  const handleConfirmOrder = async () => {
    // More robust authentication check
    if (!user || !session) {
      console.log('Auth check failed - showing dialog', { user: !!user, session: !!session });
      setShowAuthDialog(true);
      return;
    }

    // Verify session is still valid
    const { data: { session: currentSession }, error } = await supabase.auth.getSession();
    if (error || !currentSession) {
      console.log('Session validation failed - showing dialog', { error });
      setShowAuthDialog(true);
      return;
    }

    if (isPlacingOrder) return; // Prevent duplicate submissions

    setIsPlacingOrder(true);
    try {
      // Generate sequential order ID using database function
      const {
        data: orderIdData,
        error: orderIdError
      } = await supabase.rpc("generate_order_id");
      if (orderIdError) throw orderIdError;
      const newOrderId = orderIdData;
      const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
      const serviceChargeAmount = subtotal * serviceChargeRate / 100;
      const grandTotal = subtotal + serviceChargeAmount;
      let qrUrl = "";
      let upiString = "";

      // Generate UPI payment URL securely via edge function (if payment mode is UPI)
      if (paymentMode === "upi") {
        const {
          data: paymentData,
          error: paymentError
        } = await supabase.functions.invoke('generate-payment-url', {
          body: {
            order_id: newOrderId,
            amount: grandTotal
          }
        });
        if (paymentError || !paymentData) {
          throw new Error('Failed to generate payment URL');
        }
        upiString = paymentData.upi_url;
        qrUrl = paymentData.qr_url;
        setUpiUrl(upiString);
      }

      // Create order in Supabase with customer information
      const { error } = await supabase.from("orders").insert({
        order_id: newOrderId,
        table_id: tableId,
        items_json: JSON.stringify(cart),
        subtotal,
        service_charge: serviceChargeRate,
        service_charge_amount: serviceChargeAmount,
        total: grandTotal,
        status: "pending",
        payment_status: paymentMode === "upi" ? "unpaid" : "paid",
        payment_mode: paymentMode,
        qr_url: qrUrl || null,
        notes: "",
        user_id: user!.id,
        customer_name: userProfile?.full_name || "Guest",
        customer_email: userProfile?.email || user!.email || "",
        customer_phone: userProfile?.phone || null,
      });
      if (error) throw error;
      setOrderId(newOrderId);
      if (paymentMode === "upi") {
        setQrUrl(qrUrl);
        setShowPayment(true);
        toast.success("Order placed! Please complete payment.");
      } else {
        // For cash/card, clear cart and navigate to menu with track tab active
        localStorage.removeItem(`cart_${tableId}`);
        toast.success(`Order placed successfully! Payment mode: ${paymentMode.toUpperCase()}`);
        navigate(`/menu?table=${tableId}`, {
          state: {
            activeTab: 'track'
          }
        });
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };
  const handleNotifyCook = async () => {
    try {
      // Customer can only claim payment, not set payment_status to "paid"
      // Cook will verify and update payment_status when accepting order
      const {
        error
      } = await supabase.from("orders").update({
        payment_claimed: true,
        paid_at: new Date().toISOString()
      }).eq("order_id", orderId);
      if (error) throw error;
      localStorage.removeItem(`cart_${tableId}`);

      // Open UPI payment URL
      window.location.href = upiUrl;

      // Navigate back to menu after a delay
      setTimeout(() => {
        navigate(`/menu?table=${tableId}`);
      }, 2000);
    } catch (error) {
      console.error("Error claiming payment:", error);
      toast.error("Failed to claim payment.");
    }
  };
  const handleCancelOrder = async () => {
    try {
      const {
        data: orderData
      } = await supabase.from("orders").select("status").eq("order_id", orderId).single();
      if (orderData && ["accepted", "cooking", "completed"].includes(orderData.status)) {
        toast.error("Cannot cancel order - already in progress");
        return;
      }
      const {
        error
      } = await supabase.from("orders").delete().eq("order_id", orderId);
      if (error) throw error;
      setShowPayment(false);
      toast.success("Order cancelled");
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    }
  };
  const handleClearCart = () => {
    setCart([]);
    localStorage.removeItem(`cart_${tableId}`);
    toast.success("Cart cleared");
  };
  const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
  const serviceChargeAmount = subtotal * serviceChargeRate / 100;
  const grandTotal = subtotal + serviceChargeAmount;
  if (showPayment) {
    return <div className="min-h-screen bg-background pb-6 animate-fade-in">
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
      </div>;
  }
  return (
    <>
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
        onAuthSuccess={() => {
          setShowAuthDialog(false);
          // Re-check auth state after successful login
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              setSession(session);
              setUser(session.user);
              fetchUserProfile(session.user.id);
              // Auto-trigger order confirmation after auth with longer delay
              setTimeout(() => {
                handleConfirmOrder();
              }, 1000);
            }
          });
        }}
      />
      
      <div className="min-h-screen bg-background pb-6 animate-fade-in">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your Cart</h1>
              <p className="text-sm opacity-90">Table {tableId}</p>
            </div>
            <div className="flex gap-2">
              <ThemeControls variant="compact" />
              <Button variant="ghost" size="icon" onClick={() => navigate(`/menu?table=${tableId}`)} className="text-primary-foreground hover:bg-primary-hover h-9 w-9">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {cart.length === 0 ? <Card className="rounded-xl shadow-lg animate-slide-up">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={() => navigate(`/menu?table=${tableId}`)}>Browse Menu</Button>
            </CardContent>
          </Card> : <>
            <div className="space-y-3">
              {cart.map(item => <Card key={item["Item Id"]} className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
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
                </Card>)}
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
                  {/* Payment Mode Selection */}
                  <div className="space-y-3 p-4 rounded-lg bg-secondary/20 border border-border">
                    <Label className="text-sm font-semibold">Payment Mode</Label>
                    <RadioGroup value={paymentMode} onValueChange={(value: "upi" | "cash" | "card") => setPaymentMode(value)}>
                      {availablePaymentModes.upi && <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-secondary/30 transition-colors cursor-pointer">
                          <RadioGroupItem value="upi" id="upi" />
                          <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Wallet className="w-4 h-4 text-primary" />
                            <span>UPI Payment</span>
                          </Label>
                        </div>}
                      {availablePaymentModes.cash && <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-secondary/30 transition-colors cursor-pointer">
                          <RadioGroupItem value="cash" id="cash" />
                          <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Banknote className="w-4 h-4 text-green-600" />
                            <span>Cash Payment</span>
                          </Label>
                        </div>}
                      {availablePaymentModes.card && <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-secondary/30 transition-colors cursor-pointer">
                          <RadioGroupItem value="card" id="card" />
                          <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <span>Card Payment</span>
                          </Label>
                        </div>}
                    </RadioGroup>
                  </div>
                  
                  <Button onClick={handleConfirmOrder} disabled={isPlacingOrder} className="w-full h-12 text-base">
                    {isPlacingOrder ? "Placing Order..." : `Confirm Order (${paymentMode.toUpperCase()})`}
                  </Button>
                  <div className="flex gap-3">
                    <Button onClick={() => navigate(`/menu?table=${tableId}`)} variant="outline" className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Menu
                    </Button>
                    <Button onClick={handleClearCart} variant="outline" className="flex-1">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>}
      </div>
    </div>
    </>
  );
}