import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeControls } from "@/components/ThemeControls";
import { CartItem, MenuItem } from "@/types/menu";
import { useQuery } from "@tanstack/react-query";
import { fetchMenuItems, groupByCategory } from "@/lib/menuService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuItemCard } from "@/components/MenuItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cartToBillData, downloadBill as downloadBillUnified, printBill } from "@/lib/unifiedBilling";

export default function TenantBilling() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<{ 
    restaurant_name: string; 
    restaurant_address: string; 
    merchant_upi_id: string;
    service_charge: number;
  } | null>(null);

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ["menu", tenantId],
    queryFn: () => fetchMenuItems(tenantId!),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
    }
  }, [tenantId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("tenant_settings")
        .select("restaurant_name, restaurant_address, merchant_upi_id, service_charge")
        .eq("tenant_id", tenantId)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load restaurant settings");
    }
  };

  const categories = menuItems ? groupByCategory(menuItems) : {};
  const categoryNames = Object.keys(categories);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i["Item Id"] === item["Item Id"]);
      if (existingItem) {
        return prevCart.map((i) =>
          i["Item Id"] === item["Item Id"]
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    
    const quantity = cart.find((i) => i["Item Id"] === item["Item Id"])?.quantity || 0;
    toast.success(`Added to bill — ${quantity + 1} × ${item.Item}`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prevCart => {
      const updatedCart = prevCart.map(item => 
        item["Item Id"] === itemId 
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0);
      return updatedCart;
    });
  };

  const removeItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item["Item Id"] !== itemId));
    toast.success("Item removed from bill");
  };

  const handleClearCart = () => {
    setCart([]);
    toast.success("Bill cleared");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
  const serviceChargeRate = settings?.service_charge || 0;
  const serviceChargeAmount = subtotal * serviceChargeRate / 100;
  const grandTotal = subtotal + serviceChargeAmount;

  const handleDownloadBill = () => {
    if (cart.length === 0) {
      toast.error("Please add items to the bill first");
      return;
    }

    if (!settings) {
      toast.error("Restaurant settings not loaded");
      return;
    }

    const billData = cartToBillData(
      cart,
      settings.restaurant_name,
      settings.restaurant_address,
      settings.merchant_upi_id,
      settings.service_charge
    );
    
    downloadBillUnified(billData);
    toast.success("Bill downloaded successfully!");
    setCart([]); // Clear cart after download
  };

  const handlePrintBill = () => {
    if (cart.length === 0) {
      toast.error("Please add items to the bill first");
      return;
    }

    if (!settings) {
      toast.error("Restaurant settings not loaded");
      return;
    }

    const billData = cartToBillData(
      cart,
      settings.restaurant_name,
      settings.restaurant_address,
      settings.merchant_upi_id,
      settings.service_charge
    );
    
    printBill(billData);
    setCart([]); // Clear cart after print
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/${tenantId}/chef`)}
              className="text-primary-foreground hover:bg-primary-hover"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Bill</h1>
              <p className="text-sm opacity-90">{settings?.restaurant_name}</p>
            </div>
          </div>
          <ThemeControls variant="compact" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Section */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle>Select Items</CardTitle>
              </CardHeader>
              <CardContent>
                {menuLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : categoryNames.length > 0 ? (
                  <Tabs defaultValue={categoryNames[0]} className="w-full">
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-4">
                      {categoryNames.map((category) => (
                        <TabsTrigger key={category} value={category} className="whitespace-nowrap">
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {categoryNames.map((category) => (
                      <TabsContent key={category} value={category} className="space-y-3">
                        {categories[category].map((item) => (
                          <MenuItemCard
                            key={item["Item Id"]}
                            item={item}
                            onAddToCart={handleAddToCart}
                          />
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No menu items available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bill Section */}
          <div className="lg:col-span-1">
            <Card className="rounded-xl shadow-lg sticky top-24">
              <CardHeader>
                <CardTitle>Current Bill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Add items to create a bill</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {cart.map(item => (
                        <Card key={item["Item Id"]} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.Item}</p>
                              <p className="text-xs text-muted-foreground">₹{item.Price} each</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="icon" 
                                variant="outline" 
                                onClick={() => updateQuantity(item["Item Id"], -1)}
                                className="h-7 w-7"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <Button 
                                size="icon" 
                                variant="outline" 
                                onClick={() => updateQuantity(item["Item Id"], 1)}
                                className="h-7 w-7"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => removeItem(item["Item Id"])}
                                className="h-7 w-7 text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-right mt-1">
                            <p className="font-bold text-sm">₹{(item.Price * item.quantity).toFixed(2)}</p>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
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

                    <div className="space-y-2 pt-2">
                      <Button onClick={handleDownloadBill} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download Bill
                      </Button>
                      <Button onClick={handlePrintBill} variant="outline" className="w-full">
                        <Printer className="mr-2 h-4 w-4" />
                        Print Bill
                      </Button>
                      <Button onClick={handleClearCart} variant="ghost" className="w-full">
                        Clear Bill
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
