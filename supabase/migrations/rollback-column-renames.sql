-- ============================================================================
-- KARAT TRACKER - ROLLBACK COLUMN RENAMING MIGRATION
-- ============================================================================
-- 🔄 ROLLBACK SCRIPT TO REVERT DESCRIPTIVE COLUMN NAMES TO ORIGINAL NAMES
--
-- This script reverts the descriptive column names back to their original
-- abbreviated forms if needed for any reason.
--
-- ⚠️  WARNING: Only run this if you need to rollback the column renames!
-- ============================================================================

-- ============================================================================
-- SECTION 1: ROLLBACK SALES_LOG TABLE COLUMN RENAMES
-- ============================================================================

-- Rollback old material columns
DO $$
BEGIN
    -- old_weight_grams → o1_gram
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'old_weight_grams'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN old_weight_grams TO o1_gram;
        RAISE NOTICE 'Rolled back old_weight_grams to o1_gram';
    END IF;

    -- old_purchase_purity → o1_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'old_purchase_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN old_purchase_purity TO o1_purity;
        RAISE NOTICE 'Rolled back old_purchase_purity to o1_purity';
    END IF;

    -- old_sales_purity → o2_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'old_sales_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN old_sales_purity TO o2_purity;
        RAISE NOTICE 'Rolled back old_sales_purity to o2_purity';
    END IF;

    -- old_material_profit → o_cost
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'old_material_profit'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN old_material_profit TO o_cost;
        RAISE NOTICE 'Rolled back old_material_profit to o_cost';
    END IF;
END $$;

-- Rollback product columns
DO $$
BEGIN
    -- purchase_weight_grams → p_grams
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'purchase_weight_grams'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN purchase_weight_grams TO p_grams;
        RAISE NOTICE 'Rolled back purchase_weight_grams to p_grams';
    END IF;

    -- purchase_purity → p_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'purchase_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN purchase_purity TO p_purity;
        RAISE NOTICE 'Rolled back purchase_purity to p_purity';
    END IF;

    -- purchase_cost → p_cost
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'purchase_cost'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN purchase_cost TO p_cost;
        RAISE NOTICE 'Rolled back purchase_cost to p_cost';
    END IF;
END $$;

-- Rollback selling columns
DO $$
BEGIN
    -- selling_purity → s_purity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'selling_purity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN selling_purity TO s_purity;
        RAISE NOTICE 'Rolled back selling_purity to s_purity';
    END IF;

    -- selling_cost → s_cost
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_log'
        AND column_name = 'selling_cost'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sales_log RENAME COLUMN selling_cost TO s_cost;
        RAISE NOTICE 'Rolled back selling_cost to s_cost';
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: ROLLBACK DAILY_RATES TABLE COLUMN RENAMES
-- ============================================================================

DO $$
BEGIN
    -- new_price_per_gram → n_price
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_rates'
        AND column_name = 'new_price_per_gram'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.daily_rates RENAME COLUMN new_price_per_gram TO n_price;
        RAISE NOTICE 'Rolled back new_price_per_gram to n_price';
    END IF;

    -- old_price_per_gram → o_price
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_rates'
        AND column_name = 'old_price_per_gram'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.daily_rates RENAME COLUMN old_price_per_gram TO o_price;
        RAISE NOTICE 'Rolled back old_price_per_gram to o_price';
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: ROLLBACK EXPENSE_LOG TABLE COLUMN RENAMES
-- ============================================================================

DO $$
BEGIN
    -- is_credit → udhaar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expense_log'
        AND column_name = 'is_credit'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.expense_log RENAME COLUMN is_credit TO udhaar;
        RAISE NOTICE 'Rolled back is_credit to udhaar';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display rolled back column information for verification
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sales_log', 'daily_rates', 'expense_log')
  AND column_name IN (
    'o1_gram', 'o1_purity', 'o2_purity', 'o_cost',
    'p_grams', 'p_purity', 'p_cost',
    's_purity', 's_cost',
    'n_price', 'o_price',
    'udhaar'
  )
ORDER BY table_name, column_name;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================