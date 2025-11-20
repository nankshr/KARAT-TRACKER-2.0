-- ============================================================================
-- MIGRATION: Add Supplier Details Table and Enhanced Calculation Types
-- ============================================================================
-- Purpose:
--   1. Create supplierdetails table for normalized supplier management
--   2. Update supplier_transactions to support new calculation types and columns
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

-- Drop old columns if they exist (for migration from old schema)
ALTER TABLE public.supplier_transactions
DROP COLUMN IF EXISTS input_value_1;

ALTER TABLE public.supplier_transactions
DROP COLUMN IF EXISTS input_value_2;

ALTER TABLE public.supplier_transactions
DROP COLUMN IF EXISTS result;

-- Add new columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='supplier_transactions' AND column_name='description') THEN
        ALTER TABLE public.supplier_transactions ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='supplier_transactions' AND column_name='amount_currency') THEN
        ALTER TABLE public.supplier_transactions ADD COLUMN amount_currency DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='supplier_transactions' AND column_name='grams_weight') THEN
        ALTER TABLE public.supplier_transactions ADD COLUMN grams_weight DECIMAL(10,3);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='supplier_transactions' AND column_name='purity_percentage') THEN
        ALTER TABLE public.supplier_transactions ADD COLUMN purity_percentage DECIMAL(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='supplier_transactions' AND column_name='rate_price') THEN
        ALTER TABLE public.supplier_transactions ADD COLUMN rate_price DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='supplier_transactions' AND column_name='result_amount') THEN
        ALTER TABLE public.supplier_transactions ADD COLUMN result_amount DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='supplier_transactions' AND column_name='result_grams') THEN
        ALTER TABLE public.supplier_transactions ADD COLUMN result_grams DECIMAL(10,3);
    END IF;
END $$;

-- Drop existing CHECK constraint on calculation_type
ALTER TABLE public.supplier_transactions
DROP CONSTRAINT IF EXISTS supplier_transactions_calculation_type_check;

-- Add new CHECK constraint with all calculation types
ALTER TABLE public.supplier_transactions
ADD CONSTRAINT supplier_transactions_calculation_type_check
CHECK (calculation_type IN ('cashToKacha', 'kachaToPurity', 'ornamentToPurity', 'Cash', 'Material', 'ornamentToCash', 'PurityCalculation'));

-- Drop old result constraint if exists
ALTER TABLE public.supplier_transactions
DROP CONSTRAINT IF EXISTS check_result_exists;

-- Add constraint to ensure at least one result column has value
ALTER TABLE public.supplier_transactions
ADD CONSTRAINT check_result_exists CHECK (result_amount IS NOT NULL OR result_grams IS NOT NULL);

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
    RAISE NOTICE '  ✓ Dropped old columns: input_value_1, input_value_2, result';
    RAISE NOTICE '  ✓ Added new columns: description, amount_currency, grams_weight, purity_percentage, rate_price, result_amount, result_grams';
    RAISE NOTICE '  ✓ Updated calculation_type constraint to include all 7 types';
    RAISE NOTICE '  ✓ Added ornamentToCash and PurityCalculation types';
    RAISE NOTICE '  ✓ Added constraint to ensure at least one result column has value';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Restart PostgREST to reload schema';
    RAISE NOTICE '  2. Update frontend to use new column structure';
    RAISE NOTICE '  3. Test all calculation types';
    RAISE NOTICE '  4. Verify grouped supplier view functionality';
    RAISE NOTICE '========================================';
END $$;
