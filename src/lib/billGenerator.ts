import { CartItem, Order } from "@/types/menu";

interface BillData {
  orderId: string;
  restaurantName: string;
  restaurantAddress: string;
  tableId: string;
  items: CartItem[];
  subtotal: number;
  serviceCharge: number;
  total: number;
  paymentMode: string;
  timestamp: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

// Helper function to convert Order to BillData
export const orderToBillData = (order: Order, restaurantName: string = "Scan The Table", restaurantAddress: string = ""): BillData => {
  return {
    orderId: order.order_id,
    restaurantName,
    restaurantAddress,
    tableId: order.table_id,
    items: JSON.parse(order.items_json) as CartItem[],
    subtotal: order.subtotal || 0,
    serviceCharge: order.service_charge || 0,
    total: order.total,
    paymentMode: order.payment_mode?.toUpperCase() || 'UPI',
    timestamp: order.created_at || new Date().toISOString(),
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
  };
};

export const generateBillPDF = async (billData: BillData): Promise<Blob> => {
  // Create a simple HTML bill
  const billHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bill - ${billData.orderId}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          max-width: 300px;
          margin: 0 auto;
          padding: 20px;
          font-size: 12px;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
        }
        .info {
          margin-bottom: 15px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .items {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 10px 0;
          margin: 15px 0;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
        }
        .item-name {
          flex: 1;
        }
        .item-qty {
          width: 30px;
          text-align: center;
        }
        .item-price {
          width: 60px;
          text-align: right;
        }
        .totals {
          margin-top: 15px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .total-row.grand {
          font-weight: bold;
          font-size: 14px;
          border-top: 2px solid #000;
          padding-top: 5px;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          border-top: 2px dashed #000;
          padding-top: 10px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${billData.restaurantName}</h1>
        ${billData.restaurantAddress ? `<p style="font-size: 10px; margin: 5px 0;">${billData.restaurantAddress}</p>` : ''}
        <p>TAX INVOICE</p>
      </div>
      
      <div class="info">
        <div class="info-row">
          <span>Order ID:</span>
          <span>${billData.orderId}</span>
        </div>
        <div class="info-row">
          <span>Table:</span>
          <span>${billData.tableId}</span>
        </div>
        <div class="info-row">
          <span>Date & Time:</span>
          <span>${new Date(billData.timestamp).toLocaleString()}</span>
        </div>
        ${billData.customerName ? `
        <div class="info-row">
          <span>Customer:</span>
          <span>${billData.customerName}</span>
        </div>
        ` : ''}
        ${billData.customerEmail ? `
        <div class="info-row">
          <span>Email:</span>
          <span>${billData.customerEmail}</span>
        </div>
        ` : ''}
        ${billData.customerPhone ? `
        <div class="info-row">
          <span>Phone:</span>
          <span>${billData.customerPhone}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="items">
        <div class="item-row" style="font-weight: bold;">
          <span class="item-name">ITEM</span>
          <span class="item-qty">QTY</span>
          <span class="item-price">PRICE</span>
        </div>
        ${billData.items.map(item => `
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
          <span>₹${billData.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Service Charge:</span>
          <span>₹${billData.serviceCharge.toFixed(2)}</span>
        </div>
        <div class="total-row grand">
          <span>TOTAL:</span>
          <span>₹${billData.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for dining with us!</p>
        <p>Visit us again soon</p>
      </div>
    </body>
    </html>
  `;

  // Convert HTML to Blob
  const blob = new Blob([billHTML], { type: 'text/html' });
  return blob;
};

export const downloadBill = async (billData: BillData) => {
  const blob = await generateBillPDF(billData);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bill-${billData.orderId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
