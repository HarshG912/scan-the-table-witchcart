export interface MenuItem {
  "Item Id": string;
  "Item": string;
  "Category": string;
  "Price": number;
  "Veg": boolean;
  "Image URL": string;
  "Available": boolean;
  "qty"?: string;
  "description"?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id?: string;
  order_id: string;
  table_id: string;
  tenant_id?: string;
  items_json: string;
  subtotal?: number;
  service_charge?: number;
  service_charge_amount?: number;
  total: number;
  status: string;
  payment_status: string;
  payment_mode?: string;
  payment_claimed?: boolean;
  qr_url?: string;
  bill_url?: string;
  bill_downloaded?: boolean;
  created_at?: string;
  paid_at?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  notes?: string;
  user_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}
