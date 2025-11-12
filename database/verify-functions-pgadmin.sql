-- ============================================================================
-- VERIFICATION SCRIPT: Check Authentication Functions (pgAdmin Compatible)
-- ============================================================================
-- Purpose: Verify that all required functions exist with correct signatures
-- Usage: Run this in pgAdmin query tool after migration-auth-functions.sql
-- ============================================================================

-- Check if all required functions exist
SELECT
    '============================================================================' as "Status Line 1",
    'VERIFYING AUTHENTICATION FUNCTIONS' as "Status Line 2",
    '============================================================================' as "Status Line 3";

SELECT
    CASE
        WHEN COUNT(*) = 6 THEN '✓ All 6 required functions exist'
        ELSE '✗ Missing functions! Expected 6, found ' || COUNT(*)::text
    END as "Overall Status"
FROM pg_proc
WHERE proname IN (
    'create_user',
    'change_password',
    'logout',
    'validate_session',
    'refresh_token',
    'admin_update_user'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Show detailed information about each function
SELECT
    p.proname as "Function Name",
    pg_get_function_arguments(p.oid) as "Parameters",
    pg_get_function_result(p.oid) as "Return Type"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'create_user',
    'change_password',
    'admin_update_user',
    'logout',
    'validate_session',
    'refresh_token'
)
ORDER BY p.proname;

-- Summary
SELECT
    '============================================================================' as "Summary Line 1",
    'VERIFICATION COMPLETE' as "Summary Line 2",
    '============================================================================' as "Summary Line 3";

-- Expected Results Table
SELECT
    'Expected Function Signatures:' as "Information",
    '' as "Details"
UNION ALL
SELECT
    '  • create_user',
    '(username_input text, password_input text, role_input text) → uuid'
UNION ALL
SELECT
    '  • change_password',
    '(current_password text, new_password text) → boolean'
UNION ALL
SELECT
    '  • admin_update_user',
    '(user_id_input uuid, new_password text, new_role text) → TABLE(...)'
UNION ALL
SELECT
    '  • logout',
    '() → boolean'
UNION ALL
SELECT
    '  • validate_session',
    '() → boolean'
UNION ALL
SELECT
    '  • refresh_token',
    '() → TABLE(token text, session_id text)';
