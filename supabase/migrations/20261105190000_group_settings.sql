-- A member leaves a group by deleting their own membership row. Postgres
-- also applies the SELECT policy to the rows a DELETE ... WHERE reads.
CREATE POLICY "Members can see their own memberships" ON "public"."members"
  FOR SELECT TO "authenticated"
  USING ("user_id" = (SELECT "auth"."uid"()));

CREATE POLICY "Members can leave a group" ON "public"."members"
  FOR DELETE TO "authenticated"
  USING ("user_id" = (SELECT "auth"."uid"()));

-- Only members see a group, so that leaving it hides it, even for its
-- creator. Creators are already members through the auto_join_group trigger;
-- the backfill covers groups created before it.
INSERT INTO "public"."members" ("user_id", "group_id")
  SELECT "createdBy", "id" FROM "public"."groups"
  WHERE "createdBy" IN (SELECT "id" FROM "auth"."users")
  ON CONFLICT DO NOTHING;

DROP POLICY "Policy with security definer functions" ON "public"."groups";

CREATE POLICY "Policy with security definer functions" ON "public"."groups"
  USING ("custom_auth"."is_group_allowed"("id"));

-- Renames, new members and deletions reach the other members right away.
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."groups";
