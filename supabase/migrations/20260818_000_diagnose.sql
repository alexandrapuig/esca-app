SELECT t.tgname, t.tgenabled, p.proname,
       pg_get_userbyid(p.proowner) AS function_owner
FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

SELECT conrelid::regclass AS child_table, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE confrelid = 'public.users'::regclass;

SELECT policyname, roles, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';