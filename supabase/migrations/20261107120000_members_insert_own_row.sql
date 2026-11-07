-- A user could add anyone to a group, since co-members can read each other's
-- id from groups."createdBy". The auto_join_group trigger still adds a group's
-- creator: it is SECURITY DEFINER, so this policy doesn't apply to it.
DROP POLICY "Enable insert for authenticated users only" ON "public"."members";

CREATE POLICY "Users can join a group themselves" ON "public"."members"
  FOR INSERT TO "authenticated"
  WITH CHECK ("user_id" = (SELECT "auth"."uid"()));
