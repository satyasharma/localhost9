/*
  # Update orders table for custom order ID

  1. Changes
    - Modify orders table to use text primary key instead of uuid
    - This allows us to use custom order IDs based on phone number + epoch + algorithm
    - Update foreign key constraint in order_items table

  2. Important
    - Custom order ID format: first 2 digits of phone + last 4 digits of phone + last 4 digits of epoch timestamp
    - Then multiply combined number by 1359 and sum all digits for final ID
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'order_items'
  ) THEN
    ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE orders ALTER COLUMN id SET DATA TYPE text USING id::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'order_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE order_items ALTER COLUMN order_id SET DATA TYPE text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'order_items'
  ) THEN
    ALTER TABLE order_items 
    ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;
END $$;