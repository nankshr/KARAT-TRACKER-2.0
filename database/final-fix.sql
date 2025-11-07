-- FINAL FIX - Grant table permissions directly to authenticator
-- This is a table-level permission issue, not RLS

-- Check current permissions
SELECT 'Current permissions before fix:' as status;
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('daily_rates', 'expense_log')
  AND grantee = 'authenticator';

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO authenticator;

-- Grant ALL on specific tables
GRANT ALL ON TABLE public.daily_rates TO authenticator;
GRANT ALL ON TABLE public.expense_log TO authenticator;
GRANT ALL ON TABLE public.sales_log TO authenticator;
GRANT ALL ON TABLE public.activity_log TO authenticator;
GRANT ALL ON TABLE public.users TO authenticator;

-- Grant on sequences if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticator;

-- Verify permissions were granted
SELECT 'Permissions after fix:' as status;
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('daily_rates', 'expense_log')
  AND grantee = 'authenticator'
ORDER BY table_name, privilege_type;

-- Verify authenticator can connect
SELECT 'Authenticator role details:' as status;
SELECT
    rolname,
    rolcanlogin,
    rolbypassrls
FROM pg_roles
WHERE rolname = 'authenticator';

SELECT 'If you see at least 7-8 privileges per table above, restart PostgREST and test!' as next_step;
