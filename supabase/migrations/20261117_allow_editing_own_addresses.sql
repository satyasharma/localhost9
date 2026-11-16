/*
  Allow customers to edit their own saved addresses (label, address, phone),
  and tighten write access on user_addresses.

  Before:
  - No UPDATE policy on user_addresses, so saved addresses could not be edited.
  - anon (logged-out) still had INSERT / UPDATE / DELETE table grants
    (blocked by RLS, but unnecessary).
  - authenticated had UPDATE on every column, including user_id.

  After:
  - Logged-out visitors have no write access to user_addresses at all.
  - Customers may UPDATE only label, full_address and phone, only on rows that
    are already theirs, and the result must stay theirs and be valid:
      label 1-100 chars, full_address 1-1000 chars, phone +91 and 10 digits
    (the same limits place_order uses).
  - Delete stays as before: customers can delete only their own addresses.
  - place_order (SECURITY DEFINER) is unaffected.
  - Past orders are unaffected: each order stores its own copy of the address.

  Rollback: 20261117_allow_editing_own_addresses_ROLLBACK.sql
*/

REVOKE INSERT, UPDATE, DELETE ON public.user_addresses FROM anon;

REVOKE UPDATE ON public.user_addresses FROM authenticated;
GRANT UPDATE (label, full_address, phone) ON public.user_addresses TO authenticated;

DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;
CREATE POLICY "Users can update own addresses" ON public.user_addresses
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND length(btrim(label)) BETWEEN 1 AND 100
    AND length(btrim(full_address)) BETWEEN 1 AND 1000
    AND phone ~ '^\+91[0-9]{10}$'
  );
