import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types/menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { ThemeControls } from "@/components/ThemeControls";

export default function Billing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get("table") || "1";
  
  // Get cart from localStorage or navigation state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceChargeRate, setServiceChargeRate] = useState(5);
  const [settings, setSettings] = useState<{ 
    restaurant_name: string; 
    restaurant_address: string;
    merchant_upi_id: string;
  } | null>(null);

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem(`cart_${tableId}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      toast.error("No items in cart. Please add items first.");
      navigate(`/menu?table=${tableId}`);
    }

    // Fetch settings
    fetchSettings();
  }, [tableId]);

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

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">No items to bill</p>
            <Button onClick={() => navigate(`/menu?table=${tableId}`)} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/cart?table=${tableId}`)}
              className="text-primary-foreground hover:bg-primary-hover"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Bill</h1>
              <p className="text-sm opacity-90">Table {tableId}</p>
            </div>
          </div>
          <ThemeControls variant="compact" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Customer Details */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle>Customer Details (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Phone Number</Label>
              <Input
                id="customer_phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bill Preview */}
        <Card className="rounded-xl shadow-lg">
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
            {/* Order Info */}
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

            {/* Items */}
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

            {/* Totals */}
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

            {/* QR Code */}
            {settings?.merchant_upi_id && (
              <div className="border rounded-lg p-6 text-center bg-secondary/20">
                <p className="font-semibold mb-3">Scan to Pay</p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={generateQRCode()} alt="UPI Payment QR Code" className="w-48 h-48" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">Scan with any UPI app</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleDownloadBill} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download Bill
              </Button>
              <Button onClick={handlePrintBill} variant="outline" className="flex-1">
                <Printer className="mr-2 h-4 w-4" />
                Print Bill
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t">
              <p className="font-semibold mb-2">Thank you for dining with us!</p>
              <p className="text-sm text-muted-foreground">Visit us again soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
