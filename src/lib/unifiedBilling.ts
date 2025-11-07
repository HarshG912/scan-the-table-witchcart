import { Order } from "@/types/menu";

/**
 * Unified Billing System
 * Single source of truth for all bill generation across the app
 * Ensures consistency in calculations, formatting, and QR codes
 */

export interface BillItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface BillData {
  // Order Information
  orderId: string;
  tableId?: string;
  orderDate: Date;
  
  // Restaurant Information
  restaurantName: string;
  restaurantAddress: string;
  merchantUpiId: string;
  
  // Items
  items: BillItem[];
  
  // Calculations
  subtotal: number;
  serviceChargePercentage: number;
  serviceChargeAmount: number;
  total: number;
  
  // Payment
  paymentMode?: string;
  paymentStatus?: string;
  
  // Customer (optional)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Calculate service charge amount from percentage and subtotal
 */
export function calculateServiceCharge(subtotal: number, percentage: number): number {
  return Number(((subtotal * percentage) / 100).toFixed(2));
}

/**
 * Generate UPI payment QR code URL
 */
export function generateUPIQRCode(
  merchantUpiId: string,
  restaurantName: string,
  amount: number,
  orderId?: string
): string {
  const upiString = `upi://pay?pa=${merchantUpiId}&pn=${encodeURIComponent(restaurantName)}&am=${amount.toFixed(2)}${orderId ? `&tn=Order+${orderId}` : ''}&cu=INR`;
  return `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}&size=300`;
}

/**
 * Convert Order object to standardized BillData
 */
export function orderToBillData(
  order: Order,
  restaurantName: string,
  restaurantAddress: string,
  merchantUpiId: string,
  serviceChargePercentage: number
): BillData {
  const items: BillItem[] = JSON.parse(order.items_json).map((item: any) => ({
    name: item.Item || item.name,
    quantity: item.quantity,
    price: item.Price || item.price,
    total: (item.Price || item.price) * item.quantity,
  }));

  const subtotal = Number((order.subtotal || items.reduce((sum, item) => sum + item.total, 0)).toFixed(2));
  const serviceChargeAmount = calculateServiceCharge(subtotal, serviceChargePercentage);
  const total = Number((subtotal + serviceChargeAmount).toFixed(2));

  return {
    orderId: order.order_id,
    tableId: order.table_id,
    orderDate: new Date(order.created_at || Date.now()),
    restaurantName,
    restaurantAddress,
    merchantUpiId,
    items,
    subtotal,
    serviceChargePercentage,
    serviceChargeAmount,
    total,
    paymentMode: order.payment_mode,
    paymentStatus: order.payment_status,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
  };
}

/**
 * Convert cart items to standardized BillData
 */
export function cartToBillData(
  cartItems: any[],
  restaurantName: string,
  restaurantAddress: string,
  merchantUpiId: string,
  serviceChargePercentage: number,
  orderId?: string,
  tableId?: string
): BillData {
  const items: BillItem[] = cartItems.map((item) => ({
    name: item.Item || item.name,
    quantity: item.quantity,
    price: item.Price || item.price,
    total: (item.Price || item.price) * item.quantity,
  }));

  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const serviceChargeAmount = calculateServiceCharge(subtotal, serviceChargePercentage);
  const total = Number((subtotal + serviceChargeAmount).toFixed(2));

  return {
    orderId: orderId || `BILL-${Date.now()}`,
    tableId,
    orderDate: new Date(),
    restaurantName,
    restaurantAddress,
    merchantUpiId,
    items,
    subtotal,
    serviceChargePercentage,
    serviceChargeAmount,
    total,
  };
}

/**
 * Generate complete bill HTML with consistent formatting
 * ALWAYS includes QR code for UPI payment
 */
export function generateBillHTML(billData: BillData): string {
  const qrUrl = generateUPIQRCode(
    billData.merchantUpiId,
    billData.restaurantName,
    billData.total,
    billData.orderId
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bill - ${billData.restaurantName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
          font-size: 14px;
          line-height: 1.5;
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
          text-transform: uppercase;
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
        .info-row strong {
          font-weight: bold;
        }
        .items {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 15px 0;
          margin: 20px 0;
        }
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          border-bottom: 1px solid #000;
          padding-bottom: 8px;
          margin-bottom: 10px;
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
        .item-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
        }
        .totals {
          margin-top: 20px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          padding: 4px 0;
        }
        .total-row.highlight {
          font-size: 13px;
          color: #555;
        }
        .total-row.grand {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #000;
          padding-top: 12px;
          margin-top: 12px;
        }
        .qr-section {
          text-align: center;
          margin: 25px 0;
          padding: 20px;
          border: 2px dashed #000;
          background: #f9f9f9;
        }
        .qr-section p {
          margin: 0 0 12px 0;
          font-weight: bold;
          font-size: 14px;
        }
        .qr-section img {
          width: 200px;
          height: 200px;
          display: block;
          margin: 0 auto;
        }
        .qr-section .qr-note {
          margin: 12px 0 0 0;
          font-size: 11px;
          color: #666;
          font-weight: normal;
        }
        .footer {
          text-align: center;
          margin-top: 25px;
          border-top: 2px dashed #000;
          padding-top: 15px;
          font-size: 12px;
        }
        .footer p {
          margin: 5px 0;
        }
        .footer .thank-you {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
        }
        @media print {
          body {
            padding: 10px;
          }
          .qr-section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${billData.restaurantName}</h1>
        ${billData.restaurantAddress ? `<p>${billData.restaurantAddress}</p>` : ''}
        <p style="margin-top: 10px; font-weight: bold; font-size: 14px;">TAX INVOICE</p>
      </div>
      
      <div class="info">
        <div class="info-row">
          <span><strong>Order ID:</strong></span>
          <span>${billData.orderId}</span>
        </div>
        ${billData.tableId ? `
        <div class="info-row">
          <span><strong>Table:</strong></span>
          <span>${billData.tableId}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span><strong>Date & Time:</strong></span>
          <span>${billData.orderDate.toLocaleString('en-IN', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
          })}</span>
        </div>
        ${billData.customerName ? `
        <div class="info-row">
          <span><strong>Customer:</strong></span>
          <span>${billData.customerName}</span>
        </div>
        ` : ''}
        ${billData.paymentMode ? `
        <div class="info-row">
          <span><strong>Payment Mode:</strong></span>
          <span>${billData.paymentMode.toUpperCase()}</span>
        </div>
        ` : ''}
        ${billData.paymentStatus ? `
        <div class="info-row">
          <span><strong>Payment Status:</strong></span>
          <span>${billData.paymentStatus.toUpperCase()}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="items">
        <div class="items-header">
          <span class="item-name">ITEM</span>
          <span class="item-qty">QTY</span>
          <span class="item-price">PRICE</span>
        </div>
        ${billData.items.map(item => `
        <div class="item-row">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.quantity}</span>
          <span class="item-price">₹${item.total.toFixed(2)}</span>
        </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>₹${billData.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row highlight">
          <span>Service Charge (${billData.serviceChargePercentage}%):</span>
          <span>₹${billData.serviceChargeAmount.toFixed(2)}</span>
        </div>
        <div class="total-row grand">
          <span>TOTAL AMOUNT:</span>
          <span>₹${billData.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="qr-section">
        <p>SCAN TO PAY VIA UPI</p>
        <img src="${qrUrl}" alt="UPI Payment QR Code" />
        <p class="qr-note">Scan with any UPI app (GPay, PhonePe, Paytm, etc.)</p>
      </div>
      
      <div class="footer">
        <p class="thank-you">Thank you for dining with us!</p>
        <p>We appreciate your patronage</p>
        <p style="margin-top: 10px;">Visit us again soon</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download bill as HTML file
 */
export function downloadBill(billData: BillData): void {
  const billHTML = generateBillHTML(billData);
  const blob = new Blob([billHTML], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bill-${billData.orderId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Print bill
 */
export function printBill(billData: BillData): void {
  const billHTML = generateBillHTML(billData);
  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    printWindow.document.write(billHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setTimeout(() => {
      printWindow.close();
    }, 100);
  }
}
