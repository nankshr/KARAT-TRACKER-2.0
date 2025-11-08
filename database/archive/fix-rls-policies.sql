-- Fix RLS Policies for Karat Tracker
-- Run this script on your Coolify PostgreSQL database to fix RLS issues

-- ===========================================
-- 1. VERIFY RLS POLICIES
-- ===========================================

-- Check existing policies on daily_rates
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'daily_rates'
ORDER BY policyname;

-- ===========================================
-- 2. DROP EXISTING RESTRICTIVE POLICIES
-- ===========================================

-- Drop all existing policies on daily_rates
DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'daily_rates' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_record.policyname || '" ON public.daily_rates';
    END LOOP;
END $$;

-- ===========================================
-- 3. CREATE PERMISSIVE RLS POLICIES
-- ===========================================

-- Enable RLS on daily_rates table
ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;

-- Allow authenticator role to view all daily rates
CREATE POLICY "Authenticator can view daily rates"
ON public.daily_rates
FOR SELECT
TO authenticator
USING (true);

-- Allow authenticator role to insert daily rates
CREATE POLICY "Authenticator can insert daily rates"
ON public.daily_rates
FOR INSERT
TO authenticator
WITH CHECK (true);

-- Allow authenticator role to update daily rates
CREATE POLICY "Authenticator can update daily rates"
ON public.daily_rates
FOR UPDATE
TO authenticator
USING (true)
WITH CHECK (true);

-- Allow authenticator role to delete daily rates
CREATE POLICY "Authenticator can delete daily rates"
ON public.daily_rates
FOR DELETE
TO authenticator
USING (true);

-- ===========================================
-- 4. FIX OTHER TABLES (IF NEEDED)
-- ===========================================

-- Sales Log
DROP POLICY IF EXISTS "Users can insert sales_log" ON public.sales_log;
CREATE POLICY "Authenticator can insert sales_log"
ON public.sales_log
FOR INSERT
TO authenticator
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update sales_log" ON public.sales_log;
CREATE POLICY "Authenticator can update sales_log"
ON public.sales_log
FOR UPDATE
TO authenticator
USING (true)
WITH CHECK (true);

-- Expense Log
DROP POLICY IF EXISTS "Users can insert expense_log" ON public.expense_log;
CREATE POLICY "Authenticator can insert expense_log"
ON public.expense_log
FOR INSERT
TO authenticator
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update expense_log" ON public.expense_log;
CREATE POLICY "Authenticator can update expense_log"
ON public.expense_log
FOR UPDATE
TO authenticator
USING (true)
WITH CHECK (true);

-- Activity Log
DROP POLICY IF EXISTS "Users can insert activity_log" ON public.activity_log;
CREATE POLICY "Authenticator can insert activity_log"
ON public.activity_log
FOR INSERT
TO authenticator
WITH CHECK (true);

-- ===========================================
-- 5. GRANT PERMISSIONS TO ROLES
-- ===========================================

-- Grant permissions to authenticator role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_rates TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_log TO authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_log TO authenticator;
GRANT SELECT, INSERT ON public.activity_log TO authenticator;
GRANT SELECT ON public.users TO authenticator;

-- ===========================================
-- 6. VERIFY FIXES
-- ===========================================

-- Check policies were created
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log')
ORDER BY tablename, policyname;

-- Check table permissions
SELECT table_name, privilege_type, grantee
FROM information_schema.role_table_grants
WHERE table_name IN ('daily_rates', 'sales_log', 'expense_log', 'activity_log')
  AND grantee = 'authenticator'
ORDER BY table_name, privilege_type;
