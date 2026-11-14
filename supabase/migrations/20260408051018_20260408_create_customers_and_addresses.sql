/*
  # Create customers and addresses tables

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `phone` (text, unique) - Customer's phone number
      - `name` (text) - Customer's name
      - `created_at` (timestamp)

    - `customer_addresses`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `nickname` (text) - Address nickname (e.g., "Home Kallappa Layout", "Office bagmane")
      - `full_address` (text) - Complete delivery address
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies allowing public read/write (customer data is not sensitive in this context)

  3. Purpose
    - Store customer information for reuse across orders
    - Allow customers to save multiple addresses with nicknames for quick selection
*/

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  full_address text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to customers"
  ON customers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to customer addresses"
  ON customer_addresses
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);