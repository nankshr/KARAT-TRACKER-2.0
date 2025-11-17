-- ============================================================================
-- MIGRATION: Add Supplier Details Table and Enhanced Calculation Types
-- ============================================================================
-- Purpose:
--   1. Create supplierdetails table for normalized supplier management
--   2. Update supplier_transactions to support Cash and Material types
-- Run this migration after migrate-supplier-management.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE SUPPLIERDETAILS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplierdetails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES public.users(username),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions to web_anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplierdetails TO web_anon;

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR SUPPLIERDETAILS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_supplierdetails_name ON public.supplierdetails(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplierdetails_created_by ON public.supplierdetails(created_by);

-- ============================================================================
-- STEP 3: UPDATE SUPPLIER_TRANSACTIONS TABLE
-- ============================================================================

-- Drop existing CHECK constraint on calculation_type
ALTER TABLE public.supplier_transactions
DROP CONSTRAINT IF EXISTS supplier_transactions_calculation_type_check;

-- Add new CHECK constraint with additional types: 'Cash' and 'Material'
ALTER TABLE public.supplier_transactions
ADD CONSTRAINT supplier_transactions_calculation_type_check
CHECK (calculation_type IN ('cashToKacha', 'kachaToPurity', 'ornamentToPurity', 'Cash', 'Material'));

-- Make input_value_2 and result nullable for Cash and Material types
-- (These fields won't be used for direct Cash/Material entries)
ALTER TABLE public.supplier_transactions
ALTER COLUMN input_value_2 DROP NOT NULL;

ALTER TABLE public.supplier_transactions
ALTER COLUMN result DROP NOT NULL;

-- ============================================================================
-- STEP 4: CREATE ACTIVITY LOG ENTRIES FOR SUPPLIERDETAILS
-- ============================================================================

-- Ensure activity_log table can track supplierdetails operations
-- (No changes needed - activity_log is already generic enough)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Supplier Details Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  ✓ Created supplierdetails table';
    RAISE NOTICE '  ✓ Added indexes for supplier search';
    RAISE NOTICE '  ✓ Updated calculation_type constraint';
    RAISE NOTICE '  ✓ Added Cash and Material types';
    RAISE NOTICE '  ✓ Made input_value_2 and result nullable';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Restart PostgREST to reload schema';
    RAISE NOTICE '  2. Update frontend to use supplier dropdown';
    RAISE NOTICE '  3. Test new Cash and Material transaction types';
    RAISE NOTICE '  4. Migrate existing supplier_name data if needed';
    RAISE NOTICE '========================================';
END $$;
