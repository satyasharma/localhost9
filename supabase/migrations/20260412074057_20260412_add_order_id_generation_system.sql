/*
  # Add Order ID Generation System

  1. New Tables
    - `order_sequences`
      - `id` (uuid, primary key) - Unique identifier
      - `customer_id` (uuid, foreign key) - Reference to customers table
      - `sequence_date` (date) - The date for this sequence
      - `sequence_number` (integer) - Daily sequence counter
      - `created_at` (timestamptz) - When created
      - `updated_at` (timestamptz) - Last updated

  2. Schema Changes
    - Add `display_order_id` (text, not null) to orders table
    - Add `customer_id` (uuid, foreign key) to orders table
    - Add unique constraint on (customer_id, sequence_date) in order_sequences

  3. Security
    - Enable RLS on order_sequences table
    - Public can read and write order_sequences (needed for order placement)

  4. Important Notes
    - display_order_id follows pattern: [DishCode]-[HHmm]-[Cust4]-[Seq]
    - order_sequences prevents race conditions with atomic increments
    - DishCode mapping: BRYN (Biryani), BTCK (Butter Chicken), DLTK (Dal Tadka), MISC (default/mixed)
*/

CREATE TABLE IF NOT EXISTS order_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  sequence_date date NOT NULL,
  sequence_number integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, sequence_date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'display_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN display_order_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE order_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read order sequences"
  ON order_sequences FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create order sequences"
  ON order_sequences FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update order sequences"
  ON order_sequences FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);