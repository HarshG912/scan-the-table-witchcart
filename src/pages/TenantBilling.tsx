import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeControls } from "@/components/ThemeControls";
import { useTenant } from "@/contexts/TenantContext";
import type { Order } from "@/types/menu";

export default function TenantBilling() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { settings } = useTenant();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (orderId && tenantId) {
      fetchOrderAndSettings();
    }
  }, [orderId, tenantId]);

  const fetchOrderAndSettings = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderId)
        .eq("tenant_id", tenantId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Use existing QR code from order if available, or regenerate if missing
      if (orderData && orderData.qr_url) {
        setQrUrl(orderData.qr_url);
      } else if (orderData && settings?.merchant_upi_id && settings?.restaurant_name) {
        // Regenerate QR code if missing
        const upiString = `upi://pay?pa=${settings.merchant_upi_id}&pn=${encodeURIComponent(settings.restaurant_name)}&am=${orderData.total}&tn=Order+${orderData.order_id}&cu=INR`;
        const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}&size=300`;
        setQrUrl(qrCodeUrl);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load bill details");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBill = () => {
    if (!order || !settings) return;

    const items = JSON.parse(order.items_json);
    const billHTML = generateBillHTML(order, items, settings, qrUrl);
    
    const blob = new Blob([billHTML], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-${order.order_id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Bill downloaded successfully!");
  };

  const handlePrintBill = () => {
    window.print();
  };

  const generateBillHTML = (order: Order, items: any[], settings: any, qrUrl: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bill - ${order.order_id}</title>
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
            body {
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${settings.restaurant_name}</h1>
          ${settings.restaurant_address ? `<p>${settings.restaurant_address}</p>` : ''}
          <p style="margin-top: 10px; font-weight: bold;">TAX INVOICE</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span><strong>Order ID:</strong></span>
            <span>${order.order_id}</span>
          </div>
          <div class="info-row">
            <span><strong>Table:</strong></span>
            <span>${order.table_id}</span>
          </div>
          <div class="info-row">
            <span><strong>Date & Time:</strong></span>
            <span>${new Date(order.created_at || '').toLocaleString()}</span>
          </div>
          ${order.customer_name ? `
          <div class="info-row">
            <span><strong>Customer:</strong></span>
            <span>${order.customer_name}</span>
          </div>
          ` : ''}
          ${order.customer_phone ? `
          <div class="info-row">
            <span><strong>Phone:</strong></span>
            <span>${order.customer_phone}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="items">
          <div class="item-row" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 8px;">
            <span class="item-name">ITEM</span>
            <span class="item-qty">QTY</span>
            <span class="item-price">PRICE</span>
          </div>
          ${items.map(item => `
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
            <span>₹${(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Service Charge (${order.service_charge || 0}%):</span>
            <span>₹${(order.service_charge_amount || 0).toFixed(2)}</span>
          </div>
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>₹${order.total.toFixed(2)}</span>
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
          ${order.payment_mode ? `<p style="margin-top: 10px;">Payment Mode: ${order.payment_mode.toUpperCase()}</p>` : ''}
        </div>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (!order || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Bill not found</p>
            <Button onClick={() => navigate(-1)} className="w-full mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = JSON.parse(order.items_json);

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-hover"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Bill Details</h1>
              <p className="text-sm opacity-90">Order #{order.order_id}</p>
            </div>
          </div>
          <ThemeControls variant="compact" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{settings.restaurant_name}</CardTitle>
              {settings.restaurant_address && (
                <p className="text-sm text-muted-foreground">{settings.restaurant_address}</p>
              )}
              <p className="text-xs font-semibold text-primary">TAX INVOICE</p>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Order ID</p>
                <p className="font-semibold">{order.order_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Table</p>
                <p className="font-semibold">{order.table_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-semibold">{new Date(order.created_at || '').toLocaleString()}</p>
              </div>
              {order.customer_name && (
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-semibold">{order.customer_name}</p>
                </div>
              )}
            </div>

            <div className="border-t border-b py-4 space-y-3">
              <div className="flex justify-between font-semibold text-sm pb-2 border-b">
                <span className="flex-1">ITEM</span>
                <span className="w-16 text-center">QTY</span>
                <span className="w-20 text-right">PRICE</span>
              </div>
              {items.map((item: any, index: number) => (
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
                <span>₹{(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Service Charge ({order.service_charge || 0}%)</span>
                <span>₹{(order.service_charge_amount || 0).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>TOTAL</span>
                <span className="text-primary">₹{order.total.toFixed(2)}</span>
              </div>
            </div>

            {qrUrl && (
              <div className="border rounded-lg p-6 text-center bg-secondary/20">
                <p className="font-semibold mb-3">Scan to Pay</p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrUrl} alt="UPI Payment QR Code" className="w-48 h-48" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">Scan with any UPI app</p>
              </div>
            )}

            {order.payment_mode && (
              <div className="text-center text-sm">
                <span className="inline-block px-4 py-2 bg-secondary rounded-full">
                  Payment Mode: <strong>{order.payment_mode.toUpperCase()}</strong>
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-4 print:hidden">
              <Button onClick={handleDownloadBill} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download Bill
              </Button>
              <Button onClick={handlePrintBill} variant="outline" className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Print Bill
              </Button>
            </div>

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
