/*
  ROLLBACK for 20261117_allow_editing_own_addresses.sql
  Restores user_addresses permissions as they were on 2026-11-17 (no edit
  policy; table-level write grants for anon and authenticated).
  Note: after this, the site's Edit button will show "Couldn’t save".
*/

DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;

REVOKE UPDATE (label, full_address, phone) ON public.user_addresses FROM authenticated;
GRANT UPDATE ON public.user_addresses TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.user_addresses TO anon;
