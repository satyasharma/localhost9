-- ============================================
-- localHost9 Full Database Setup
-- Run this in Supabase SQL Editor (one shot)
-- ============================================

-- 1. Create dishes table
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

-- 2. Create orders table (text ID for custom order IDs)
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 3. Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text REFERENCES orders(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Create customer_addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  full_address text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6. Add display_order_id and customer_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS display_order_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- 7. Enable RLS on all tables
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- 9. RLS Policies — Dishes
CREATE POLICY "Anyone can view available dishes" ON dishes FOR SELECT USING (available = true);

-- 10. RLS Policies — Orders
CREATE POLICY "Customers can create orders" ON orders FOR INSERT
  WITH CHECK (
    customer_name IS NOT NULL AND
    customer_phone IS NOT NULL AND
    customer_address IS NOT NULL AND
    total_amount > 0
  );

CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);

-- 11. RLS Policies — Order Items
CREATE POLICY "Customers can create order items" ON order_items FOR INSERT
  WITH CHECK (
    order_id IS NOT NULL AND
    dish_id IS NOT NULL AND
    quantity > 0 AND
    price > 0 AND
    EXISTS (SELECT 1 FROM orders WHERE id = order_id) AND
    EXISTS (SELECT 1 FROM dishes WHERE id = dish_id)
  );

CREATE POLICY "Anyone can view order items" ON order_items FOR SELECT USING (true);

-- 12. RLS Policies — Customers
CREATE POLICY "Customers readable by public" ON customers FOR SELECT TO public USING (true);
CREATE POLICY "Customers creatable by public" ON customers FOR INSERT TO public WITH CHECK (true);

-- 13. RLS Policies — Customer Addresses
CREATE POLICY "Customer addresses readable by public" ON customer_addresses FOR SELECT TO public USING (true);
CREATE POLICY "Customer addresses creatable by public" ON customer_addresses FOR INSERT TO public WITH CHECK (true);

-- 14. Seed dishes
INSERT INTO dishes (name, description, price, image_url, category) VALUES
  ('Butter Chicken', 'Creamy tomato-based curry with tender chicken pieces, served with naan or rice', 12.99, 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg', 'main'),
  ('Biryani Special', 'Aromatic basmati rice with spiced meat or vegetables, served with raita', 14.99, 'https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg', 'main'),
  ('Dal Tadka', 'Yellow lentils tempered with cumin, garlic, and spices - a comforting daily favorite', 8.99, 'https://images.pexels.com/photos/5410401/pexels-photo-5410401.jpeg', 'main');
