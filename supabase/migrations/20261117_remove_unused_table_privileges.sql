/*
  Defence in depth: remove table permissions nothing uses.

  Row-level security already blocked every one of these. Removing the
  permissions adds a second lock: the request is refused before RLS is even
  checked. TRUNCATE in particular ignores RLS, so it should never be granted
  to visitors or customers (the website's API cannot send it, but it should
  not exist).

  What stays (everything the site uses):
  - anon (logged out): SELECT on all tables (RLS limits it to the menu and
    store settings).
  - authenticated (customers): SELECT on all tables (RLS: own rows only);
    users INSERT + UPDATE (profile save at login); orders UPDATE(status)
    (cancel); user_addresses UPDATE(label, full_address, phone) + DELETE;
    EXECUTE on place_order (unchanged).
  - The admin panel uses the service role and is not affected.

  Removed:
  - anon: INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER on every table.
  - authenticated: TRUNCATE, REFERENCES, TRIGGER on every table; any write on
    dishes and store_settings; DELETE on orders and users; UPDATE and DELETE on
    order_items; INSERT on user_addresses (new addresses are saved only by
    place_order).

  Rollback: 20261117_remove_unused_table_privileges_ROLLBACK.sql
*/

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.dishes, public.store_settings, public.orders, public.order_items, public.users, public.user_addresses
  FROM anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON public.dishes, public.store_settings, public.orders, public.order_items, public.users, public.user_addresses
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.dishes, public.store_settings FROM authenticated;
REVOKE DELETE ON public.orders FROM authenticated;
REVOKE UPDATE, DELETE ON public.order_items FROM authenticated;
REVOKE DELETE ON public.users FROM authenticated;
REVOKE INSERT ON public.user_addresses FROM authenticated;
