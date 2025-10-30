import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMenuItems, groupByCategory } from "@/lib/menuService";
import { supabase } from "@/integrations/supabase/client";
import { MenuItem, CartItem } from "@/types/menu";
import { MenuItemCard } from "@/components/MenuItemCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Printer, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ThemeControls } from "@/components/ThemeControls";

type BillingStep = 1 | 2 | 3 | 4;

export default function Billing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get("table") || "1";
  
  const [currentStep, setCurrentStep] = useState<BillingStep>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceChargeRate, setServiceChargeRate] = useState(5);
  const [settings, setSettings] = useState<{ 
    restaurant_name: string; 
    restaurant_address: string;
    merchant_upi_id: string;
  } | null>(null);

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenuItems,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: settingsData } = await supabase
      .from("settings")
      .select("restaurant_name, restaurant_address, merchant_upi_id, service_charge")
      .limit(1)
      .single();

    if (settingsData) {
      setSettings(settingsData);
      setServiceChargeRate(settingsData.service_charge || 5);
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
    
    toast.success(`Added ${item.Item} to bill`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => 
        item["Item Id"] === itemId 
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0);
    });
  };

  const removeItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item["Item Id"] !== itemId));
    toast.success("Item removed");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
  const serviceChargeAmount = subtotal * serviceChargeRate / 100;
  const grandTotal = subtotal + serviceChargeAmount;

  const generateQRCode = () => {
    if (!settings?.merchant_upi_id) return "";
    const upiString = `upi://pay?pa=${settings.merchant_upi_id}&pn=${encodeURIComponent(settings.restaurant_name)}&am=${grandTotal}&tn=Bill+Table+${tableId}&cu=INR`;
    return `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}&size=300`;
  };

  const generateBillHTML = () => {
    const qrUrl = generateQRCode();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bill - Table ${tableId}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            font-size: 14px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: bold;
          }
          .header p {
            margin: 5px 0;
            font-size: 12px;
          }
          .info {
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
          }
          .items {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 15px 0;
            margin: 20px 0;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
          }
          .item-name {
            flex: 1;
          }
          .item-qty {
            width: 40px;
            text-align: center;
          }
          .item-price {
            width: 80px;
            text-align: right;
          }
          .totals {
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
          }
          .total-row.grand {
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 15px;
          }
          .qr-section {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            border: 1px dashed #000;
          }
          .qr-section img {
            width: 200px;
            height: 200px;
          }
          .footer {
            text-align: center;
            margin-top: 25px;
            border-top: 2px dashed #000;
            padding-top: 15px;
            font-size: 12px;
          }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${settings?.restaurant_name || 'Restaurant'}</h1>
          ${settings?.restaurant_address ? `<p>${settings.restaurant_address}</p>` : ''}
          <p style="margin-top: 10px; font-weight: bold;">TAX INVOICE</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span><strong>Table:</strong></span>
            <span>${tableId}</span>
          </div>
          <div class="info-row">
            <span><strong>Date & Time:</strong></span>
            <span>${new Date().toLocaleString()}</span>
          </div>
          ${customerName ? `
          <div class="info-row">
            <span><strong>Customer:</strong></span>
            <span>${customerName}</span>
          </div>
          ` : ''}
          ${customerPhone ? `
          <div class="info-row">
            <span><strong>Phone:</strong></span>
            <span>${customerPhone}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="items">
          <div class="item-row" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 8px;">
            <span class="item-name">ITEM</span>
            <span class="item-qty">QTY</span>
            <span class="item-price">PRICE</span>
          </div>
          ${cart.map(item => `
            <div class="item-row">
              <span class="item-name">${item.Item}</span>
              <span class="item-qty">${item.quantity}</span>
              <span class="item-price">₹${(item.Price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Service Charge (${serviceChargeRate}%):</span>
            <span>₹${serviceChargeAmount.toFixed(2)}</span>
          </div>
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>₹${grandTotal.toFixed(2)}</span>
          </div>
        </div>
        
        ${qrUrl ? `
        <div class="qr-section">
          <p style="margin: 0 0 10px 0; font-weight: bold;">Scan to Pay</p>
          <img src="${qrUrl}" alt="UPI Payment QR Code" />
          <p style="margin: 10px 0 0 0; font-size: 11px;">Scan with any UPI app</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p style="font-weight: bold; margin-bottom: 10px;">Thank you for dining with us!</p>
          <p>Visit us again soon</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadBill = () => {
    const billHTML = generateBillHTML();
    const blob = new Blob([billHTML], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-table-${tableId}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Bill downloaded successfully!");
  };

  const handlePrintBill = () => {
    const billHTML = generateBillHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(billHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[hsl(263,60%,25%)] pb-6">
      {/* Header */}
      <header className="bg-[hsl(25,100%,55%)] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Billing System</h1>
              <p className="text-sm opacity-90">Create and print bills</p>
            </div>
            <ThemeControls variant="compact" />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between max-w-2xl">
            {[
              { step: 1, label: "Menu" },
              { step: 2, label: "Cart" },
              { step: 3, label: "Create Bill" },
              { step: 4, label: "Download/Print" }
            ].map(({ step, label }, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    currentStep >= step ? 'bg-white text-[hsl(25,100%,55%)]' : 'bg-white/30 text-white'
                  }`}>
                    {step}
                  </div>
                  <p className={`text-xs mt-1 ${currentStep >= step ? 'text-white font-semibold' : 'text-white/70'}`}>
                    {label}
                  </p>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-white' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6">
        {/* Step 1: Menu Selection */}
        {currentStep === 1 && (
          <>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : categoryNames.length > 0 ? (
              <Tabs defaultValue={categoryNames[0]} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6 bg-[hsl(263,60%,35%)]">
                  {categoryNames.map((category) => (
                    <TabsTrigger 
                      key={category} 
                      value={category} 
                      className="whitespace-nowrap data-[state=active]:bg-[hsl(142,76%,36%)] data-[state=active]:text-white"
                    >
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
              <div className="text-center py-12 text-white">
                <p>No menu items available</p>
              </div>
            )}

            {/* Floating Cart Button */}
            {totalItems > 0 && (
              <div className="fixed bottom-6 right-6">
                <Button
                  size="lg"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-full shadow-lg bg-[hsl(25,100%,55%)] hover:bg-[hsl(25,100%,45%)] text-white h-16 px-6"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  View Cart ({totalItems})
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step 2: Cart Review */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>

            {cart.length === 0 ? (
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="py-12 text-center">
                  <p className="mb-4">No items in cart</p>
                  <Button onClick={() => setCurrentStep(1)}>Add Items</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map(item => (
                    <Card key={item["Item Id"]} className="bg-white/10 border-white/20 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.Item}</h3>
                            <p className="text-sm text-white/70">₹{item.Price} each</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Button 
                                size="icon" 
                                variant="outline" 
                                onClick={() => updateQuantity(item["Item Id"], -1)}
                                className="h-8 w-8 rounded-full border-white/30 text-white hover:bg-white/20"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="font-semibold w-8 text-center">{item.quantity}</span>
                              <Button 
                                size="icon" 
                                variant="outline" 
                                onClick={() => updateQuantity(item["Item Id"], 1)}
                                className="h-8 w-8 rounded-full border-white/30 text-white hover:bg-white/20"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => removeItem(item["Item Id"])}
                                className="h-8 w-8 text-red-300 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="text-right min-w-[80px]">
                              <p className="font-bold">₹{(item.Price * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-white/10 border-white/20 text-white">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-white/70">
                        <span>Service Charge ({serviceChargeRate}%)</span>
                        <span>₹{serviceChargeAmount.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-xl">
                        <span>Total</span>
                        <span>₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => setCurrentStep(3)} 
                      className="w-full bg-[hsl(25,100%,55%)] hover:bg-[hsl(25,100%,45%)] text-white"
                    >
                      Proceed to Bill Creation
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Step 3: Customer Details & Bill Preview */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(2)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader>
                <CardTitle className="text-white">Customer Details (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-white">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone" className="text-white">Phone Number</Label>
                  <Input
                    id="customer_phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="text-center border-b">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{settings?.restaurant_name || 'Restaurant'}</CardTitle>
                  {settings?.restaurant_address && (
                    <p className="text-sm text-muted-foreground">{settings.restaurant_address}</p>
                  )}
                  <p className="text-xs font-semibold text-primary">TAX INVOICE</p>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Table</p>
                    <p className="font-semibold">{tableId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date & Time</p>
                    <p className="font-semibold">{new Date().toLocaleString()}</p>
                  </div>
                  {customerName && (
                    <div>
                      <p className="text-muted-foreground">Customer</p>
                      <p className="font-semibold">{customerName}</p>
                    </div>
                  )}
                  {customerPhone && (
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-semibold">{customerPhone}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-b py-4 space-y-3">
                  <div className="flex justify-between font-semibold text-sm pb-2 border-b">
                    <span className="flex-1">ITEM</span>
                    <span className="w-16 text-center">QTY</span>
                    <span className="w-20 text-right">PRICE</span>
                  </div>
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="flex-1">{item.Item}</span>
                      <span className="w-16 text-center">{item.quantity}</span>
                      <span className="w-20 text-right">₹{(item.Price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Service Charge ({serviceChargeRate}%)</span>
                    <span>₹{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>TOTAL</span>
                    <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {settings?.merchant_upi_id && (
                  <div className="border rounded-lg p-6 text-center bg-secondary/20">
                    <p className="font-semibold mb-3">Scan to Pay</p>
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <img src={generateQRCode()} alt="UPI Payment QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Scan with any UPI app</p>
                  </div>
                )}

                <Button 
                  onClick={() => setCurrentStep(4)} 
                  className="w-full"
                >
                  Continue to Download/Print
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Download/Print */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader>
                <CardTitle className="text-white text-center">Bill Ready!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-white/80">
                  Your bill has been created successfully. You can now download or print it.
                </p>

                <div className="flex gap-3">
                  <Button onClick={handleDownloadBill} className="flex-1 bg-[hsl(25,100%,55%)] hover:bg-[hsl(25,100%,45%)]">
                    <Download className="mr-2 h-4 w-4" />
                    Download Bill
                  </Button>
                  <Button onClick={handlePrintBill} variant="outline" className="flex-1 border-white/30 text-white hover:bg-white/20">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Bill
                  </Button>
                </div>

                <Button 
                  onClick={() => {
                    setCart([]);
                    setCustomerName("");
                    setCustomerPhone("");
                    setCurrentStep(1);
                    toast.success("Ready for next bill");
                  }}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/20"
                >
                  Create Another Bill
                </Button>

                <Button 
                  onClick={() => navigate(`/menu?table=${tableId}`)}
                  variant="ghost"
                  className="w-full text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Menu
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
