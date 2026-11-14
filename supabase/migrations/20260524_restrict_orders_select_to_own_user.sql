/*
  # Restrict orders SELECT to own user

  Security fix: Previously any authenticated user could query ALL orders
  (exposing other customers' phone numbers, addresses, order details).

  Changes:
  - Drop "Anyone can view orders" policy
  - Add "Users can view own orders" — restricts SELECT to user_id = auth.uid()
  - Add "Users can update own orders" — restricts UPDATE (cancel) to own orders

  Note: Admin API uses service role key which bypasses RLS entirely.
*/

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
