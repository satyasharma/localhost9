/*
  ROLLBACK for 20261117_remove_unused_table_privileges.sql
  Restores the exact table grants that existed on 2026-11-17 before it ran
  (column grants orders.status and user_addresses label/full_address/phone
  were not touched and stay as they are).
*/

GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON public.dishes TO anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON public.store_settings TO anon, authenticated;
GRANT DELETE, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON public.order_items TO anon, authenticated;
GRANT DELETE, REFERENCES, TRIGGER, TRUNCATE ON public.orders TO anon, authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON public.users TO anon, authenticated;
GRANT REFERENCES, TRIGGER, TRUNCATE ON public.user_addresses TO anon;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE ON public.user_addresses TO authenticated;
