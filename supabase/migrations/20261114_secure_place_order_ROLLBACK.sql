/*
  ROLLBACK for 20261114_secure_place_order.sql
  Restores the exact place_order, grants and insert policies that were live
  on 2026-11-14 before the fix. Only run this if the fix breaks ordering.
  Note: this re-opens the price-manipulation hole.
*/

CREATE OR REPLACE FUNCTION public.place_order(p_user_id uuid, p_phone text, p_address text, p_total numeric, p_item_count integer, p_summary text, p_notes text, p_address_label text DEFAULT NULL::text, p_address_phone text DEFAULT NULL::text, p_items text DEFAULT '[]'::text)
 RETURNS TABLE(id uuid, display_order_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id UUID;
  v_display_id TEXT;
  v_items JSONB;
  v_recent_count INTEGER;
  v_unavailable_count INTEGER;
BEGIN
  v_items := p_items::JSONB;

  -- Rate limit: max 5 orders per user per hour
  SELECT COUNT(*) INTO v_recent_count
  FROM orders o
  WHERE o.user_id = p_user_id
    AND o.created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = '42501';
  END IF;

  -- Check all dishes are still available
  SELECT COUNT(*) INTO v_unavailable_count
  FROM jsonb_array_elements(v_items) AS item
  JOIN dishes d ON d.id = (item->>'dish_id')::UUID
  WHERE d.available = false;

  IF v_unavailable_count > 0 THEN
    RAISE EXCEPTION 'One or more items are no longer available' USING ERRCODE = 'P0001';
  END IF;

  -- Save address if label provided
  IF p_address_label IS NOT NULL AND p_address_label != '' THEN
    INSERT INTO user_addresses (user_id, label, full_address, phone)
    VALUES (p_user_id, p_address_label, p_address, COALESCE(p_address_phone, p_phone));
  END IF;

  -- Insert order
  INSERT INTO orders (user_id, phone, delivery_address, total_amount, item_count, summary_text, status, notes)
  VALUES (p_user_id, p_phone, p_address, p_total, p_item_count, p_summary, 'pending', p_notes)
  RETURNING orders.id, orders.display_order_id INTO v_order_id, v_display_id;

  -- Insert order items
  INSERT INTO order_items (order_id, dish_id, dish_name, quantity, price)
  SELECT v_order_id, (item->>'dish_id')::UUID, item->>'dish_name', (item->>'quantity')::INTEGER, (item->>'price')::NUMERIC
  FROM jsonb_array_elements(v_items) AS item;

  RETURN QUERY SELECT v_order_id, v_display_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, text, numeric, integer, text, text, text, text, text) TO PUBLIC, anon, authenticated;

GRANT INSERT ON public.orders, public.order_items TO anon, authenticated;

CREATE POLICY "Users can create orders with rate limit" ON public.orders
  FOR INSERT TO public
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND (total_amount > (0)::numeric)
    AND ((SELECT count(*) FROM orders o
          WHERE o.user_id = (SELECT auth.uid())
            AND o.created_at > (now() - '01:00:00'::interval)) < 5)
  );

CREATE POLICY "Users can create order items" ON public.order_items
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
              AND orders.user_id = (SELECT auth.uid()))
  );
