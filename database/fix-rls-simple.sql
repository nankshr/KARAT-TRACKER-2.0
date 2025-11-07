-- SIMPLIFIED RLS FIX SCRIPT
-- Copy and paste this ENTIRE script into your database SQL console
-- This will fix the permission denied errors

-- =====================================================
-- STEP 1: Drop ALL existing policies (clean slate)
-- =====================================================

DO $$
BEGIN
    -- Daily rates
    DROP POLICY IF EXISTS "Users can view all daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Users can insert daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Users can update daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Users can delete daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticated users can view daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticated users can insert daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticated users can update daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticated users can delete daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticator can view daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticator can insert daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticator can update daily rates" ON public.daily_rates;
    DROP POLICY IF EXISTS "Authenticator can delete daily rates" ON public.daily_rates;

    -- Sales log
    DROP POLICY IF EXISTS "Users can insert sales_log" ON public.sales_log;
    DROP POLICY IF EXISTS "Users can update sales_log" ON public.sales_log;
    DROP POLICY IF EXISTS "Authenticator can insert sales_log" ON public.sales_log;
    DROP POLICY IF EXISTS "Authenticator can update sales_log" ON public.sales_log;

    -- Expense log
    DROP POLICY IF EXISTS "Users can insert expense_log" ON public.expense_log;
    DROP POLICY IF EXISTS "Users can update expense_log" ON public.expense_log;
    DROP POLICY IF EXISTS "Authenticator can insert expense_log" ON public.expense_log;
    DROP POLICY IF EXISTS "Authenticator can update expense_log" ON public.expense_log;

    -- Activity log
    DROP POLICY IF EXISTS "Users can insert activity_log" ON public.activity_log;
    DROP POLICY IF EXISTS "Authenticator can insert activity_log" ON public.activity_log;
END $$;

-- =====================================================
-- STEP 2: Grant FULL permissions to authenticator role
-- =====================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA public TO authenticator;

-- Specific table grants (belt and suspenders approach)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_rates TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_log TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_log TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticator;

-- =====================================================
-- STEP 3: Enable RLS (but make it permissive)
-- =====================================================

ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create VERY permissive policies
-- =====================================================

-- DAILY RATES - Allow ALL operations
CREATE POLICY "allow_all_daily_rates"
ON public.daily_rates
FOR ALL
TO authenticator
USING (true)
WITH CHECK (true);

-- SALES LOG - Allow ALL operations
CREATE POLICY "allow_all_sales_log"
ON public.sales_log
FOR ALL
TO authenticator
USING (true)
WITH CHECK (true);

-- EXPENSE LOG - Allow ALL operations
CREATE POLICY "allow_all_expense_log"
ON public.expense_log
FOR ALL
TO authenticator
USING (true)
WITH CHECK (true);

-- ACTIVITY LOG - Allow ALL operations
CREATE POLICY "allow_all_activity_log"
ON public.activity_log
FOR ALL
TO authenticator
USING (true)
WITH CHECK (true);

-- USERS - Allow ALL operations
CREATE POLICY "allow_all_users"
ON public.users
FOR ALL
TO authenticator
USING (true)
WITH CHECK (true);

-- =====================================================
-- STEP 5: Verify everything worked
-- =====================================================

-- Check policies were created
SELECT
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log', 'users')
ORDER BY tablename, policyname;

-- Check permissions were granted
SELECT
    table_name,
    privilege_type,
    grantee
FROM information_schema.role_table_grants
WHERE grantee = 'authenticator'
  AND table_schema = 'public'
  AND table_name IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log', 'users')
ORDER BY table_name, privilege_type;

-- Success message
SELECT 'RLS policies fixed successfully! Restart PostgREST and test the application.' AS message;
