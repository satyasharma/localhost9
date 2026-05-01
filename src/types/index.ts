export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  category: string;
  created_at: string;
}

export interface CartItem extends Dish {
  quantity: number;
}

export interface Order {
  id?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  status: string;
  notes: string;
  display_order_id?: string;
  created_at?: string;
}

export interface OrderItem {
  order_id: string;
  dish_id: string;
  quantity: number;
  price: number;
}

export interface SavedAddress {
  id: string;
  nickname: string;
  full_address: string;
}
