-- Test inserting directly into daily_rates as authenticator user
-- This will help us understand if the issue is RLS or something else

-- =====================================================
-- Test 1: Check if we can SELECT
-- =====================================================

SELECT 'Test 1: Can we SELECT from daily_rates?' as test;
SET ROLE authenticator;
SELECT COUNT(*) as row_count FROM public.daily_rates;
RESET ROLE;

-- =====================================================
-- Test 2: Try direct INSERT (bypassing RLS temporarily)
-- =====================================================

SELECT 'Test 2: Direct INSERT as superuser' as test;
-- This should work (as superuser)
INSERT INTO public.daily_rates (inserted_by, asof_date, material, karat, new_price_per_gram, old_price_per_gram)
VALUES ('test_user', CURRENT_DATE, 'gold', '24k', 5000, 4800)
ON CONFLICT (asof_date, material, karat)
DO UPDATE SET new_price_per_gram = 5000, old_price_per_gram = 4800;

SELECT 'Direct INSERT worked!' as result;

-- =====================================================
-- Test 3: Try INSERT as authenticator role
-- =====================================================

SELECT 'Test 3: INSERT as authenticator role' as test;
SET ROLE authenticator;

BEGIN;
    INSERT INTO public.daily_rates (inserted_by, asof_date, material, karat, new_price_per_gram, old_price_per_gram)
    VALUES ('test_user', CURRENT_DATE, 'silver', '999', 75, 70)
    ON CONFLICT (asof_date, material, karat)
    DO UPDATE SET new_price_per_gram = 75, old_price_per_gram = 70;

    SELECT 'INSERT as authenticator worked!' as result;
COMMIT;

RESET ROLE;

-- =====================================================
-- Test 4: Check what policies are blocking
-- =====================================================

SELECT 'Test 4: Check policies' as test;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,  -- PERMISSIVE or RESTRICTIVE
    roles,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'daily_rates'
ORDER BY policyname;

-- =====================================================
-- Test 5: Check table ownership
-- =====================================================

SELECT 'Test 5: Table ownership' as test;
SELECT
    tablename,
    tableowner
FROM pg_tables
WHERE tablename IN ('daily_rates', 'expense_log', 'sales_log', 'activity_log');

-- =====================================================
-- Test 6: Check if authenticator role exists and settings
-- =====================================================

SELECT 'Test 6: Authenticator role details' as test;
SELECT
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolbypassrls  -- This is important!
FROM pg_roles
WHERE rolname = 'authenticator';
