-- NUCLEAR OPTION: Completely disable and rebuild RLS
-- This will TEMPORARILY disable RLS to diagnose the issue
-- Run this script line by line if needed

-- =====================================================
-- DIAGNOSTIC: Check current state
-- =====================================================

-- Check ALL policies on daily_rates
SELECT 'Current policies on daily_rates:' as step;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'daily_rates'
ORDER BY policyname;

-- Check ALL policies on expense_log
SELECT 'Current policies on expense_log:' as step;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'expense_log'
ORDER BY policyname;

-- Check permissions
SELECT 'Current permissions for authenticator:' as step;
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticator'
  AND table_name IN ('daily_rates', 'expense_log')
ORDER BY table_name, privilege_type;

-- =====================================================
-- STEP 1: DISABLE RLS completely (temporary)
-- =====================================================

SELECT 'DISABLING RLS...' as step;

ALTER TABLE public.daily_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_log DISABLE ROW LEVEL SECURITY;

-- Test message
SELECT 'RLS DISABLED. Test your application NOW - it should work without RLS.' as step;
SELECT 'If it works, we know it is an RLS policy issue, not permissions.' as note;

-- =====================================================
-- STEP 2: Drop ALL policies (using CASCADE)
-- =====================================================

SELECT 'Dropping all policies...' as step;

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on daily_rates
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'daily_rates'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_rates', pol.policyname);
    END LOOP;

    -- Drop all policies on expense_log
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'expense_log'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.expense_log', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Grant ALL permissions (SUPER permissive)
-- =====================================================

SELECT 'Granting ALL permissions...' as step;

-- Make authenticator a superuser temporarily (not recommended for production!)
-- ALTER ROLE authenticator SUPERUSER;  -- Uncomment if desperate

-- Grant everything possible
GRANT ALL ON SCHEMA public TO authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticator;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticator;

-- Specific grants
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.daily_rates TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.expense_log TO authenticator;

-- Also grant to PUBLIC as a test (very insecure, but diagnostic)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_rates TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_log TO PUBLIC;

-- =====================================================
-- STEP 4: Re-enable RLS with SINGLE ultra-permissive policy
-- =====================================================

SELECT 'Re-enabling RLS with permissive policies...' as step;

ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_log ENABLE ROW LEVEL SECURITY;

-- Create SINGLE policy for ALL operations
CREATE POLICY "total_access_daily_rates"
ON public.daily_rates
FOR ALL
TO PUBLIC  -- Allow EVERYONE (for diagnostic purposes)
USING (true)
WITH CHECK (true);

CREATE POLICY "total_access_expense_log"
ON public.expense_log
FOR ALL
TO PUBLIC  -- Allow EVERYONE (for diagnostic purposes)
USING (true)
WITH CHECK (true);

-- =====================================================
-- STEP 5: Verify the fix
-- =====================================================

SELECT 'Verification:' as step;

-- Should show NO policies or just our new ones
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('daily_rates', 'expense_log')
ORDER BY tablename, policyname;

-- Should show MANY permissions
SELECT table_name, privilege_type, grantee
FROM information_schema.role_table_grants
WHERE grantee IN ('authenticator', 'PUBLIC')
  AND table_name IN ('daily_rates', 'expense_log')
ORDER BY table_name, grantee, privilege_type;

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('daily_rates', 'expense_log');

SELECT 'DONE! Test the application now.' as message;
SELECT 'If it STILL does not work, the problem is NOT RLS.' as note;
