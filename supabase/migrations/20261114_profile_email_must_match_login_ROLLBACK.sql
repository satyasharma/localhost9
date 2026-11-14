/*
  ROLLBACK for 20261114_profile_email_must_match_login.sql
  Restores the profile policy that was live on 2026-11-14.
  Note: this re-opens email squatting in public.users.
*/

DROP POLICY IF EXISTS "Users manage own profile" ON public.users;
CREATE POLICY "Users manage own profile" ON public.users
  FOR ALL TO public
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
