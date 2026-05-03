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

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  created_at: string;
}

export interface Order {
  id: string;
  display_order_id: string;
  user_id: string;
  phone: string;
  delivery_address: string;
  total_amount: number;
  item_count: number;
  summary_text: string;
  status: string;
  notes: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string;
  dish_name: string;
  quantity: number;
  price: number;
}
