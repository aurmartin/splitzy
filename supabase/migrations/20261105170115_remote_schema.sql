SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS "custom_auth";

ALTER SCHEMA "custom_auth" OWNER TO "postgres";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "custom_auth"."auto_join_group"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$begin
  if auth.uid() IS NOT NULL then
    insert into members (user_id, group_id) values (auth.uid(), new.id);
  end if;

  return null;
end;$$;

ALTER FUNCTION "custom_auth"."auto_join_group"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "custom_auth"."is_group_allowed"("group_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$begin
  return exists (
    select 1 from members
    where (select auth.uid()) = members.user_id and members.group_id = $1
  );
end;$_$;

ALTER FUNCTION "custom_auth"."is_group_allowed"("group_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."cascade_soft_delete_expenses"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL THEN
    UPDATE public.expenses
      SET "deletedAt" = NEW."deletedAt"
      WHERE "groupId" = NEW.id AND "deletedAt" IS NULL;
  END IF;
  RETURN NULL;
END;
$$;

ALTER FUNCTION "public"."cascade_soft_delete_expenses"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" NOT NULL,
    "groupId" "uuid" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "payerName" "text" NOT NULL,
    "splitExpense" "text" NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deletedAt" timestamp without time zone,
    "receipt" "text"
);

ALTER TABLE "public"."expenses" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "members" "text" DEFAULT ''::"text" NOT NULL,
    "deletedAt" timestamp without time zone,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "currency" "text" NOT NULL,
    "createdBy" "uuid" DEFAULT "auth"."uid"()
);

ALTER TABLE "public"."groups" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."members" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL
);

ALTER TABLE "public"."members" OWNER TO "postgres";

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("user_id", "group_id");

CREATE OR REPLACE TRIGGER "auto_join_group" AFTER INSERT ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "custom_auth"."auto_join_group"();

CREATE OR REPLACE TRIGGER "cascade_soft_delete_expenses" AFTER UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."cascade_soft_delete_expenses"();

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Enable insert for authenticated users only" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Policy with security definer functions" ON "public"."expenses" USING (( SELECT "custom_auth"."is_group_allowed"("expenses"."groupId") AS "is_group_allowed"));

CREATE POLICY "Policy with security definer functions" ON "public"."groups" USING (("custom_auth"."is_group_allowed"("id") OR ("createdBy" = "auth"."uid"())));

ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;

CREATE PUBLICATION "powersync" WITH (publish = 'insert, update, delete, truncate');

ALTER PUBLICATION "powersync" OWNER TO "postgres";

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

ALTER PUBLICATION "powersync" ADD TABLE ONLY "public"."expenses";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."expenses";

ALTER PUBLICATION "powersync" ADD TABLE ONLY "public"."members";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "custom_auth"."is_group_allowed"("group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "custom_auth"."is_group_allowed"("group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "custom_auth"."is_group_allowed"("group_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."cascade_soft_delete_expenses"() TO "anon";
GRANT ALL ON FUNCTION "public"."cascade_soft_delete_expenses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cascade_soft_delete_expenses"() TO "service_role";

GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";

GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";

GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

--
-- Dumped schema changes for auth and storage
--

