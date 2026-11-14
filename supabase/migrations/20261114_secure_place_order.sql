/*
  Security fix: orders can no longer be placed with prices, totals or a user
  chosen by the browser.

  Before:
  - place_order trusted p_total, item prices/names, p_item_count, p_summary
    and p_user_id from the browser, and logged-out visitors (anon) could call it.
  - Logged-in users could also INSERT into orders / order_items directly with
    any total above 0, bypassing place_order.

  After:
  - place_order takes the user from the login token (auth.uid()).
  - It looks up each dish's name and price in the dishes table and computes
    the total, item count and summary itself.
  - It validates quantities (1-10 per dish, like the cart), phone (+91 and
    10 digits), and text lengths.
  - Only signed-in users can call it.
  - Direct inserts into orders / order_items are removed, so place_order is
    the only way to create an order.

  The function signature is unchanged, so the current website keeps working.
  The ignored parameters (p_user_id, p_total, p_item_count, p_summary,
  p_address_phone, item price/name) are kept only for compatibility.

  Rollback: 20261114_secure_place_order_ROLLBACK.sql
*/

CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id uuid,
  p_phone text,
  p_address text,
  p_total numeric,
  p_item_count integer,
  p_summary text,
  p_notes text,
  p_address_label text DEFAULT NULL::text,
  p_address_phone text DEFAULT NULL::text,
  p_items text DEFAULT '[]'::text
)
RETURNS TABLE(id uuid, display_order_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_items jsonb;
  v_order_id uuid;
  v_display_id text;
  v_recent_count integer;
  v_lines integer;
  v_bad_lines integer;
  v_unavailable integer;
  v_total numeric;
  v_item_count integer;
  v_summary text;
  v_phone text := btrim(coalesce(p_phone, ''));
  v_address text := btrim(coalesce(p_address, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
  v_label text := nullif(btrim(coalesce(p_address_label, '')), '');
BEGIN
  -- The user always comes from the login token, never from the browser.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  -- Input checks (the website already sends data in this shape).
  IF v_phone !~ '^\+91[0-9]{10}$' THEN
    RAISE EXCEPTION 'Invalid phone' USING ERRCODE = '22023';
  END IF;
  IF length(v_address) = 0 OR length(v_address) > 1000 THEN
    RAISE EXCEPTION 'Invalid address' USING ERRCODE = '22023';
  END IF;
  IF length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'Notes too long' USING ERRCODE = '22023';
  END IF;
  IF v_label IS NOT NULL AND length(v_label) > 100 THEN
    RAISE EXCEPTION 'Address label too long' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_items := p_items::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Invalid items' USING ERRCODE = '22023';
  END;
  IF jsonb_typeof(v_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_items) = 0
     OR jsonb_array_length(v_items) > 50 THEN
    RAISE EXCEPTION 'Invalid items' USING ERRCODE = '22023';
  END IF;

  -- Rate limit: max 5 orders per user per hour.
  SELECT count(*) INTO v_recent_count
  FROM orders o
  WHERE o.user_id = v_uid
    AND o.created_at > now() - interval '1 hour';
  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = '42501';
  END IF;

  -- Price everything from the dishes table. Only dish_id and quantity are
  -- read from the browser.
  BEGIN
    SELECT count(*),
           count(*) FILTER (WHERE r.dish_id IS NULL OR r.qty IS NULL OR r.qty < 1 OR r.qty > 10),
           count(*) FILTER (WHERE d.id IS NULL OR d.available IS NOT TRUE),
           sum(d.price * r.qty),
           sum(r.qty),
           string_agg(d.name || ' ×' || r.qty, ', ' ORDER BY d.created_at, d.name)
      INTO v_lines, v_bad_lines, v_unavailable, v_total, v_item_count, v_summary
      FROM (
        SELECT x.dish_id, sum(x.quantity)::integer AS qty
        FROM jsonb_to_recordset(v_items) AS x(dish_id uuid, quantity integer)
        GROUP BY x.dish_id
      ) r
      LEFT JOIN dishes d ON d.id = r.dish_id;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Invalid items' USING ERRCODE = '22023';
  END;

  IF v_bad_lines > 0 THEN
    RAISE EXCEPTION 'Invalid quantity' USING ERRCODE = '22023';
  END IF;
  IF v_unavailable > 0 THEN
    -- Same error code as before: the website shows "no longer available".
    RAISE EXCEPTION 'One or more items are no longer available' USING ERRCODE = 'P0001';
  END IF;
  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'Invalid total' USING ERRCODE = '22023';
  END IF;

  -- Save address if a label was given (same behaviour as before).
  IF v_label IS NOT NULL THEN
    INSERT INTO user_addresses (user_id, label, full_address, phone)
    VALUES (v_uid, v_label, v_address, v_phone);
  END IF;

  INSERT INTO orders (user_id, phone, delivery_address, total_amount, item_count, summary_text, status, notes)
  VALUES (v_uid, v_phone, v_address, v_total, v_item_count, v_summary, 'pending', v_notes)
  RETURNING orders.id, orders.display_order_id INTO v_order_id, v_display_id;

  INSERT INTO order_items (order_id, dish_id, dish_name, quantity, price)
  SELECT v_order_id, d.id, d.name, r.qty, d.price
  FROM (
    SELECT x.dish_id, sum(x.quantity)::integer AS qty
    FROM jsonb_to_recordset(v_items) AS x(dish_id uuid, quantity integer)
    GROUP BY x.dish_id
  ) r
  JOIN dishes d ON d.id = r.dish_id;

  RETURN QUERY SELECT v_order_id, v_display_id;
END;
$function$;

-- Only signed-in users may call place_order.
REVOKE ALL ON FUNCTION public.place_order(uuid, text, text, numeric, integer, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, text, numeric, integer, text, text, text, text, text) TO authenticated;

-- Close the direct-insert path. place_order (SECURITY DEFINER) still inserts.
DROP POLICY IF EXISTS "Users can create orders with rate limit" ON public.orders;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
REVOKE INSERT ON public.orders, public.order_items FROM anon, authenticated;
