/*
  ROLLBACK for 20261114_restrict_order_cancel.sql
  Restores the update permissions and cancel policy that were live on
  2026-11-14 before the fix. Note: this re-opens the gap where a cancel
  request can also rewrite other columns.
*/

REVOKE UPDATE (status) ON public.orders FROM authenticated;
GRANT UPDATE ON public.orders TO anon, authenticated;

DROP POLICY IF EXISTS "Users can cancel own orders" ON public.orders;
CREATE POLICY "Users can cancel own orders" ON public.orders
  FOR UPDATE TO public
  USING (
    ((SELECT auth.uid()) = user_id)
    AND (status = ANY (ARRAY['pending'::text, 'accepted'::text]))
  )
  WITH CHECK (status = 'cancelled'::text);
