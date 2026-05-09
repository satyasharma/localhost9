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

export interface SavedCustomerInfo {
  name: string;
  phone: string;
  address: string;
}
