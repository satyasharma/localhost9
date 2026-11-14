/*
  Security fix: customers can only cancel their own orders, nothing else.

  Before:
  - Policy "Users can cancel own orders" only checked that the new status
    was 'cancelled'. In the same request a customer could also rewrite
    total_amount, delivery_address, summary_text, notes and created_at on
    their own order (verified in a rolled-back test on 2026-11-14).
    Moving the order to another account (user_id) was already blocked by the
    "Users can view own orders" policy.

  After:
  - Customers (authenticated) may update only the status column.
  - Logged-out visitors (anon) may not update orders at all.
  - The order must stay in the customer's own account and end up 'cancelled',
    and only pending/accepted orders can be cancelled (same as before).

  The website's cancel button sends only { status: 'cancelled' }, so it keeps
  working. The admin panel uses the service role and is not affected.

  Rollback: 20261114_restrict_order_cancel_ROLLBACK.sql
*/

REVOKE UPDATE ON public.orders FROM anon, authenticated;
GRANT UPDATE (status) ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Users can cancel own orders" ON public.orders;
CREATE POLICY "Users can cancel own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    ((SELECT auth.uid()) = user_id)
    AND (status = ANY (ARRAY['pending'::text, 'accepted'::text]))
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND (status = 'cancelled'::text)
  );
