-- Quick verification script to check if RLS policies are correctly set
-- Run this to verify the fix was applied

-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'daily_rates';

-- 2. Check RLS policies on daily_rates
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'daily_rates'
ORDER BY cmd, policyname;

-- 3. Check permissions granted to authenticator role
SELECT
    table_name,
    privilege_type,
    grantee
FROM information_schema.role_table_grants
WHERE table_name = 'daily_rates'
  AND grantee = 'authenticator'
ORDER BY privilege_type;

-- 4. Verify authenticator role exists
SELECT rolname, rolsuper, rolinherit, rolcreatedb, rolcreaterole, rolcanlogin
FROM pg_roles
WHERE rolname = 'authenticator';
