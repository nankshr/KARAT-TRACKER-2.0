-- Final diagnostic - What went wrong?

-- 1. Check if authenticator role exists
SELECT '=== Does authenticator role exist? ===' as check;
SELECT
    rolname,
    rolcanlogin,
    rolbypassrls
FROM pg_roles
WHERE rolname = 'authenticator';

-- 2. Check actual table privileges (from pg_class directly)
SELECT '=== Table privileges from pg_class ===' as check;
SELECT
    n.nspname as schema,
    c.relname as table_name,
    c.relowner::regrole as owner,
    c.relacl as acl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log')
  AND n.nspname = 'public';

-- 3. Check privileges from information_schema
SELECT '=== Privileges from information_schema ===' as check;
SELECT
    table_schema,
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log')
  AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- 4. Check if there are any privileges at all for authenticator
SELECT '=== ALL privileges for authenticator ===' as check;
SELECT
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'authenticator'
ORDER BY table_name;

-- 5. Try granting as superuser explicitly
SELECT '=== Attempting to grant permissions ===' as check;
GRANT ALL PRIVILEGES ON TABLE public.daily_rates TO authenticator;
GRANT ALL PRIVILEGES ON TABLE public.sales_log TO authenticator;
GRANT ALL PRIVILEGES ON TABLE public.expense_log TO authenticator;
GRANT ALL PRIVILEGES ON TABLE public.activity_log TO authenticator;

-- 6. Verify after grant
SELECT '=== Verify after explicit GRANT ===' as check;
SELECT
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'authenticator'
  AND table_name IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log')
ORDER BY table_name, privilege_type;

-- 7. Check if the tables even exist
SELECT '=== Do the tables exist? ===' as check;
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log')
  AND schemaname = 'public';

SELECT '=== SUMMARY ===' as final;
SELECT 'Run this script and send me the full output.' as instruction;
SELECT 'Look for the "Verify after explicit GRANT" section' as instruction2;
SELECT 'You should see at least 7-8 privilege types per table' as instruction3;
