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
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  phone: string;
  created_at: string;
}

export interface OrderSummary {
  id: string;
  display_order_id: string;
  total_amount: number;
  item_count: number;
  summary_text: string;
  status: string;
  created_at: string;
}
