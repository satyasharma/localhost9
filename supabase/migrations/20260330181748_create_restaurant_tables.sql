/*
  # localHost9 Restaurant Database Schema

  1. New Tables
    - `dishes`
      - `id` (uuid, primary key) - Unique identifier for each dish
      - `name` (text) - Name of the dish
      - `description` (text) - Description of the dish
      - `price` (decimal) - Price of the dish
      - `image_url` (text) - URL to dish image
      - `available` (boolean) - Whether dish is currently available
      - `category` (text) - Category of the dish
      - `created_at` (timestamptz) - When the dish was added
    
    - `orders`
      - `id` (uuid, primary key) - Unique identifier for each order
      - `customer_name` (text) - Name of the customer
      - `customer_phone` (text) - Phone number for contact
      - `customer_address` (text) - Delivery address
      - `total_amount` (decimal) - Total order amount
      - `status` (text) - Order status (pending, preparing, delivered, cancelled)
      - `notes` (text) - Special instructions from customer
      - `created_at` (timestamptz) - When the order was placed
    
    - `order_items`
      - `id` (uuid, primary key) - Unique identifier
      - `order_id` (uuid, foreign key) - Reference to orders table
      - `dish_id` (uuid, foreign key) - Reference to dishes table
      - `quantity` (integer) - Number of items ordered
      - `price` (decimal) - Price at time of order
      - `created_at` (timestamptz) - When the item was added

  2. Security
    - Enable RLS on all tables
    - Public can read available dishes
    - Public can create orders
    - Order items are readable by anyone (for display purposes)
*/

CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL,
  image_url text NOT NULL,
  available boolean DEFAULT true,
  category text DEFAULT 'main',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available dishes"
  ON dishes FOR SELECT
  USING (available = true);

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  USING (true);

INSERT INTO dishes (name, description, price, image_url, category) VALUES
  ('Butter Chicken', 'Creamy tomato-based curry with tender chicken pieces, served with naan or rice', 12.99, 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg', 'main'),
  ('Biryani Special', 'Aromatic basmati rice with spiced meat or vegetables, served with raita', 14.99, 'https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg', 'main'),
  ('Dal Tadka', 'Yellow lentils tempered with cumin, garlic, and spices - a comforting daily favorite', 8.99, 'https://images.pexels.com/photos/5410401/pexels-photo-5410401.jpeg', 'main');