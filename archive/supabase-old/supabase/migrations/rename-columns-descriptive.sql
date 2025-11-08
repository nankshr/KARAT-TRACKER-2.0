-- ============================================================================
-- KARAT TRACKER - COLUMN RENAMING MIGRATION
-- ============================================================================
-- 🎯 RENAME COLUMNS TO DESCRIPTIVE NAMES FOR BETTER LLM QUERY GENERATION
--
-- This script renames abbreviated column names to more descriptive ones
-- while maintaining a balance between clarity and token efficiency.
--
-- ✅ SAFE TO RUN: Uses IF EXISTS checks for backward compatibility
-- ✅ PRESERVES DATA: Only renames columns, no data loss
-- ✅ ROLLBACK READY: Can be reversed with inverse script
-- ============================================================================

-- ============================================================================
-- SECTION 1: SALES_LOG TABLE COLUMN RENAMES
-- ============================================================================

-- Rename old material columns
DO $$
BEGIN
    -- o1_gram → old_weight_grams
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'o1_gram'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN o1_gram TO old_weight_grams;
        RAISE NOTICE 'Renamed o1_gram to old_weight_grams';
    END IF;

    -- o1_purity → old_purchase_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'o1_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN o1_purity TO old_purchase_purity;
        RAISE NOTICE 'Renamed o1_purity to old_purchase_purity';
    END IF;

    -- o2_purity → old_sales_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'o2_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN o2_purity TO old_sales_purity;
        RAISE NOTICE 'Renamed o2_purity to old_sales_purity';
    END IF;

    -- o_cost → old_material_profit
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'o_cost'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN o_cost TO old_material_profit;
        RAISE NOTICE 'Renamed o_cost to old_material_profit';
    END IF;
END $$;

-- Rename product columns
DO $$
BEGIN
    -- p_grams → purchase_weight_grams
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'p_grams'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN p_grams TO purchase_weight_grams;
        RAISE NOTICE 'Renamed p_grams to purchase_weight_grams';
    END IF;

    -- p_purity → purchase_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'p_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN p_purity TO purchase_purity;
        RAISE NOTICE 'Renamed p_purity to purchase_purity';
    END IF;

    -- p_cost → purchase_cost
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'p_cost'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN p_cost TO purchase_cost;
        RAISE NOTICE 'Renamed p_cost to purchase_cost';
    END IF;
END $$;

-- Rename selling columns
DO $$
BEGIN
    -- s_purity → selling_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 's_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN s_purity TO selling_purity;
        RAISE NOTICE 'Renamed s_purity to selling_purity';
    END IF;

    -- s_cost → selling_cost
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 's_cost'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN s_cost TO selling_cost;
        RAISE NOTICE 'Renamed s_cost to selling_cost';
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: DAILY_RATES TABLE COLUMN RENAMES
-- ============================================================================

DO $$
BEGIN
    -- n_price → new_price_per_gram
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_rates'
        AND column_name = 'n_price'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.daily_rates RENAME COLUMN n_price TO new_price_per_gram;
        RAISE NOTICE 'Renamed n_price to new_price_per_gram';
    END IF;

    -- o_price → old_price_per_gram
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_rates'
        AND column_name = 'o_price'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.daily_rates RENAME COLUMN o_price TO old_price_per_gram;
        RAISE NOTICE 'Renamed o_price to old_price_per_gram';
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: EXPENSE_LOG TABLE COLUMN RENAMES
-- ============================================================================

DO $$
BEGIN
    -- udhaar → is_credit
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expense_log'
        AND column_name = 'udhaar'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.expense_log RENAME COLUMN udhaar TO is_credit;
        RAISE NOTICE 'Renamed udhaar to is_credit';
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: VERIFICATION
-- ============================================================================

-- Display updated column information for verification
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sales_log', 'daily_rates', 'expense_log')
  AND column_name IN (
    'old_weight_grams', 'old_purchase_purity', 'old_sales_purity', 'old_material_profit',
    'purchase_weight_grams', 'purchase_purity', 'purchase_cost',
    'selling_purity', 'selling_cost',
    'new_price_per_gram', 'old_price_per_gram',
    'is_credit'
  )
ORDER BY table_name, column_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This script has:
-- 1. ✅ Renamed sales_log columns for better clarity
-- 2. ✅ Renamed daily_rates columns for better clarity
-- 3. ✅ Renamed expense_log columns for better clarity
-- 4. ✅ Used safe IF EXISTS checks for backward compatibility
-- 5. ✅ Provided verification queries
--
-- Next steps:
-- 1. Update TypeScript types
-- 2. Update application code to use new column names
-- 3. Test all functionality
-- ============================================================================