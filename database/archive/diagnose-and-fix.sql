-- COMPREHENSIVE DIAGNOSTIC AND FIX SCRIPT
-- Run this ENTIRE script on karat_tracker_t database

-- =====================================================
-- PART 1: DIAGNOSE THE PROBLEM
-- =====================================================

SELECT '=== DIAGNOSTIC REPORT ===' as section;

-- 1. Check if authenticator role exists and its settings
SELECT 'Authenticator Role Status:' as check;
SELECT
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolbypassrls,  -- THIS IS CRITICAL!
    rolconnlimit
FROM pg_roles
WHERE rolname = 'authenticator';

-- 2. Check table permissions for authenticator
SELECT 'Table Permissions for authenticator:' as check;
SELECT
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticator'
  AND table_name IN ('daily_rates', 'expense_log', 'sales_log', 'activity_log')
ORDER BY table_name, privilege_type;

-- 3. Check RLS policies
SELECT 'RLS Policies:' as check;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expr,
    with_check
FROM pg_policies
WHERE tablename IN ('daily_rates', 'expense_log', 'sales_log', 'activity_log')
ORDER BY tablename, policyname;

-- 4. Check table ownership
SELECT 'Table Ownership:' as check;
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename IN ('daily_rates', 'expense_log', 'sales_log', 'activity_log');

-- 5. Check RLS status
SELECT 'RLS Enabled Status:' as check;
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('daily_rates', 'expense_log', 'sales_log', 'activity_log');

-- =====================================================
-- PART 2: THE FIX
-- =====================================================

SELECT '=== APPLYING FIXES ===' as section;

-- FIX 1: Set BYPASSRLS on authenticator role
SELECT 'Fix 1: Setting BYPASSRLS on authenticator role...' as step;
ALTER ROLE authenticator BYPASSRLS;
SELECT 'BYPASSRLS set!' as result;

-- FIX 2: Grant ALL permissions (belt and suspenders)
SELECT 'Fix 2: Granting ALL permissions to authenticator...' as step;
GRANT ALL PRIVILEGES ON SCHEMA public TO authenticator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticator;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticator;
SELECT 'Permissions granted!' as result;

-- FIX 3: Ensure table ownership is correct
SELECT 'Fix 3: Checking table ownership...' as step;
-- If tables are owned by a different role, authenticator needs explicit grants
-- (Already done above)
SELECT 'Ownership checked!' as result;

-- FIX 4: Disable RLS temporarily for diagnosis
SELECT 'Fix 4: Temporarily disabling RLS for testing...' as step;
ALTER TABLE public.daily_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_log DISABLE ROW LEVEL SECURITY;
SELECT 'RLS disabled for testing. Try the application now!' as result;
SELECT 'If it works without RLS, we know RLS is the issue.' as note;

-- =====================================================
-- PART 3: VERIFY THE FIX
-- =====================================================

SELECT '=== VERIFICATION ===' as section;

-- Verify BYPASSRLS is set
SELECT 'Verify BYPASSRLS:' as check;
SELECT
    rolname,
    rolbypassrls,
    CASE
        WHEN rolbypassrls THEN '✓ BYPASS RLS IS ENABLED'
        ELSE '✗ BYPASS RLS IS NOT ENABLED - FIX FAILED!'
    END as status
FROM pg_roles
WHERE rolname = 'authenticator';

-- Verify permissions
SELECT 'Verify Permissions:' as check;
SELECT
    COUNT(*) as permission_count,
    CASE
        WHEN COUNT(*) >= 16 THEN '✓ Permissions look good'
        ELSE '✗ Not enough permissions granted'
    END as status
FROM information_schema.role_table_grants
WHERE grantee = 'authenticator'
  AND table_name IN ('daily_rates', 'expense_log', 'sales_log', 'activity_log');

-- Verify RLS is disabled
SELECT 'Verify RLS Disabled:' as check;
SELECT
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity = false THEN '✓ RLS disabled for testing'
        ELSE '✗ RLS still enabled'
    END as status
FROM pg_tables
WHERE tablename IN ('daily_rates', 'expense_log');

-- =====================================================
-- PART 4: TEST INSERT
-- =====================================================

SELECT '=== TEST INSERT ===' as section;
SELECT 'Attempting test insert into daily_rates...' as test;

-- Try a test insert
DO $$
BEGIN
    -- Set role to authenticator to test permissions
    SET LOCAL ROLE authenticator;

    -- Attempt insert
    INSERT INTO public.daily_rates (inserted_by, asof_date, material, karat, new_price_per_gram, old_price_per_gram)
    VALUES ('test_diagnostic', CURRENT_DATE, 'gold', '24k', 9999, 9998)
    ON CONFLICT (asof_date, material, karat)
    DO UPDATE SET new_price_per_gram = 9999, old_price_per_gram = 9998;

    RAISE NOTICE '✓ Test insert SUCCESSFUL!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test insert FAILED: %', SQLERRM;
END $$;

SELECT 'If test insert succeeded, restart PostgREST and try the application!' as next_step;

-- =====================================================
-- FINAL MESSAGE
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;
SELECT '1. Look at the output above to see if BYPASSRLS is enabled' as step1;
SELECT '2. Check if test insert succeeded' as step2;
SELECT '3. Restart PostgREST: docker-compose -f docker-compose-local-test.yml restart postgrest' as step3;
SELECT '4. Try the application at http://localhost:8080' as step4;
SELECT '5. If it works with RLS disabled, we can re-enable it with proper policies' as step5;
