/*
  Security fix: a customer's profile email must be their own login email.

  Before:
  - Policy "Users manage own profile" only checked the row id, so a customer
    could set public.users.email to any unused address. When the real owner
    of that address signed up later, their profile upsert failed on the
    unique email constraint and they could not place orders.

  After:
  - Inserts and updates must keep email equal to the email in the login
    token (auth.jwt() ->> 'email').
  - Customers can still read and update their own profile; the website's
    login upsert sends the login email, so it keeps working.
  - Checked on 2026-11-14: all 7 existing profiles already match.

  Rollback: 20261114_profile_email_must_match_login_ROLLBACK.sql
*/

DROP POLICY IF EXISTS "Users manage own profile" ON public.users;
CREATE POLICY "Users manage own profile" ON public.users
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    ((SELECT auth.uid()) = id)
    AND (email IS NOT DISTINCT FROM (SELECT auth.jwt() ->> 'email'))
  );
