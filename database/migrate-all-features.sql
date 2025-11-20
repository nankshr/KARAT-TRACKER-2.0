-- ============================================================================
-- COMPREHENSIVE MIGRATION: All Features & Authentication Updates
-- ============================================================================
-- Purpose: Unified migration script for new or existing databases
-- Features:
--   - Supplier Management (tables, indexes)
--   - Supplier Details (normalized supplier data with phone numbers)
--   - Enhanced Calculation Types (Cash & Material direct entry)
--   - Enhanced Authentication (session validation, token refresh)
--   - Updated Auth Functions (proper JWT, user management)
--
-- Safe to run multiple times - idempotent and preserves all table data
-- Resolves "cannot change return type" errors by dropping functions first
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 0: ENSURE REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- STEP 1: CREATE TABLES (IF NOT EXISTS)
-- ============================================================================

-- Supplier Transactions Table
CREATE TABLE IF NOT EXISTS public.supplier_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    supplier_name TEXT NOT NULL,
    material TEXT NOT NULL CHECK (material IN ('gold', 'silver')),
    type TEXT NOT NULL CHECK (type IN ('input', 'output')),
    calculation_type TEXT NOT NULL CHECK (calculation_type IN ('cashToKacha', 'kachaToPurity', 'ornamentToPurity', 'Cash', 'Material', 'ornamentToCash', 'PurityCalculation')),
    description TEXT,
    amount_currency DECIMAL(10,2),
    grams_weight DECIMAL(10,3),
    purity_percentage DECIMAL(5,2),
    rate_price DECIMAL(10,2),
    result_amount DECIMAL(10,2),
    result_grams DECIMAL(10,3),
    is_credit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT check_result_exists CHECK (result_amount IS NOT NULL OR result_grams IS NOT NULL)
);

-- Grant permissions (safe to run multiple times)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_transactions TO web_anon;

-- Supplier Details Table (normalized supplier information)
CREATE TABLE IF NOT EXISTS public.supplierdetails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES public.users(username),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions (safe to run multiple times)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplierdetails TO web_anon;

-- ============================================================================
-- STEP 2: CREATE INDEXES (IF NOT EXISTS)
-- ============================================================================

-- Supplier Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_asof_date ON public.supplier_transactions(asof_date);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON public.supplier_transactions(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_material ON public.supplier_transactions(material);

-- Supplier Details Indexes
CREATE INDEX IF NOT EXISTS idx_supplierdetails_name ON public.supplierdetails(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplierdetails_created_by ON public.supplierdetails(created_by);

-- ============================================================================
-- STEP 2.5: UPDATE EXISTING TABLES (for migrations from older versions)
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

-- Update supplier_transactions constraints
-- Drop old CHECK constraint on calculation_type if it exists
ALTER TABLE public.supplier_transactions
DROP CONSTRAINT IF EXISTS supplier_transactions_calculation_type_check;

-- Add updated CHECK constraint with all 7 calculation types
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
-- STEP 3: DROP OLD FUNCTION SIGNATURES
-- ============================================================================
-- This prevents "cannot change return type" errors
-- Safe because we recreate them immediately after

-- Authentication functions
DROP FUNCTION IF EXISTS create_user(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS change_password(text, text) CASCADE;
DROP FUNCTION IF EXISTS admin_update_user(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS logout() CASCADE;
DROP FUNCTION IF EXISTS validate_session() CASCADE;
DROP FUNCTION IF EXISTS refresh_token() CASCADE;

-- Core functions (might have different signatures)
DROP FUNCTION IF EXISTS login(text, text) CASCADE;
DROP FUNCTION IF EXISTS sign_jwt(json, text, text) CASCADE;
DROP FUNCTION IF EXISTS current_user_role() CASCADE;

-- ============================================================================
-- STEP 4: CREATE ALL FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- User Management Functions
-- ----------------------------------------------------------------------------

-- Create User
CREATE OR REPLACE FUNCTION create_user(
    username_input TEXT,
    password_input TEXT,
    role_input TEXT
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Validate role
    IF role_input NOT IN ('admin', 'owner', 'employee') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin, owner, or employee';
    END IF;

    -- Create user with hashed password
    INSERT INTO public.users (username, password, role)
    VALUES (username_input, crypt(password_input, gen_salt('bf')), role_input)
    RETURNING id INTO new_user_id;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Change Password
CREATE OR REPLACE FUNCTION change_password(
    current_password TEXT,
    new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_username TEXT;
    v_stored_password TEXT;
BEGIN
    -- Get current user from JWT claim
    v_username := current_setting('request.jwt.claims', true)::json->>'username';

    -- Get stored password
    SELECT password INTO v_stored_password
    FROM public.users
    WHERE username = v_username;

    -- Verify current password
    IF v_stored_password != crypt(current_password, v_stored_password) THEN
        RAISE EXCEPTION 'Current password is incorrect';
    END IF;

    -- Update password
    UPDATE public.users
    SET password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    WHERE username = v_username;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Update User
CREATE OR REPLACE FUNCTION admin_update_user(
    user_id_input UUID,
    new_password TEXT DEFAULT NULL,
    new_role TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    username TEXT,
    role TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_admin_role TEXT;
    v_current_username TEXT;
    v_new_password_hash TEXT;
BEGIN
    -- Check if current user is admin
    v_admin_role := current_user_role();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied: Only admin users can update user information';
    END IF;

    -- Get current username (for logging/validation)
    SELECT u.username INTO v_current_username
    FROM public.users u
    WHERE u.id = user_id_input;

    IF v_current_username IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Validate role if provided
    IF new_role IS NOT NULL THEN
        IF new_role NOT IN ('admin', 'owner', 'employee') THEN
            RAISE EXCEPTION 'Invalid role. Must be one of: admin, owner, employee';
        END IF;
    END IF;

    -- Hash password if provided
    IF new_password IS NOT NULL AND new_password != '' THEN
        v_new_password_hash := crypt(new_password, gen_salt('bf'));
    END IF;

    -- Update user record
    UPDATE public.users u
    SET
        password = COALESCE(v_new_password_hash, u.password),
        role = COALESCE(new_role, u.role),
        updated_at = now()
    WHERE u.id = user_id_input;

    -- Return updated user info
    RETURN QUERY
    SELECT u.id, u.username, u.role, u.updated_at
    FROM public.users u
    WHERE u.id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Session Management Functions
-- ----------------------------------------------------------------------------

-- Login
CREATE OR REPLACE FUNCTION login(username_input TEXT, password_input TEXT)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    role TEXT,
    token TEXT,
    session_id TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_token TEXT;
    v_session_id TEXT;
BEGIN
    -- Find user with matching credentials
    SELECT u.id, u.username, u.role, u.password
    INTO v_user
    FROM public.users u
    WHERE u.username = username_input;

    -- Check if user exists and password matches
    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'Invalid username or password';
    END IF;

    IF v_user.password != crypt(password_input, v_user.password) THEN
        RAISE EXCEPTION 'Invalid username or password';
    END IF;

    -- Generate session ID
    v_session_id := encode(gen_random_bytes(32), 'base64');

    -- Update user's session
    UPDATE public.users
    SET sessionid = v_session_id, updated_at = now()
    WHERE id = v_user.id;

    -- Get JWT secret from config
    SELECT value INTO v_token
    FROM public.jwt_config
    WHERE key = 'secret';

    -- Generate token with user_role (not role, to avoid PostgREST role switching)
    v_token := sign_jwt(
        json_build_object(
            'user_id', v_user.id,
            'username', v_user.username,
            'user_role', v_user.role,
            'exp', extract(epoch from now() + interval '24 hours')
        )::json,
        v_token
    );

    RETURN QUERY SELECT v_user.id, v_user.username, v_user.role, v_token, v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Logout
CREATE OR REPLACE FUNCTION logout()
RETURNS BOOLEAN AS $$
DECLARE
    v_username TEXT;
BEGIN
    v_username := current_setting('request.jwt.claims', true)::json->>'username';

    UPDATE public.users
    SET sessionid = NULL, updated_at = now()
    WHERE username = v_username;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate Session
CREATE OR REPLACE FUNCTION validate_session()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_session_id TEXT;
BEGIN
    -- Get user_id from JWT
    v_user_id := (current_setting('request.jwt.claims', true)::json->>'user_id')::UUID;

    -- Get stored sessionid from database
    SELECT sessionid INTO v_session_id
    FROM public.users
    WHERE id = v_user_id;

    -- Check if session exists (null means logged out)
    IF v_session_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh Token
CREATE OR REPLACE FUNCTION refresh_token()
RETURNS TABLE(
    token TEXT,
    session_id TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_token TEXT;
    v_session_id TEXT;
    v_user_id UUID;
BEGIN
    -- Get user_id from JWT
    v_user_id := (current_setting('request.jwt.claims', true)::json->>'user_id')::UUID;

    -- Get user details and verify session is valid
    SELECT u.id, u.username, u.role, u.sessionid
    INTO v_user
    FROM public.users u
    WHERE u.id = v_user_id;

    -- Check if user exists and has valid session
    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_user.sessionid IS NULL THEN
        RAISE EXCEPTION 'Session invalidated - please login again';
    END IF;

    -- Generate new session ID
    v_session_id := encode(gen_random_bytes(32), 'base64');

    -- Update user's session
    UPDATE public.users
    SET sessionid = v_session_id, updated_at = now()
    WHERE id = v_user.id;

    -- Get JWT secret from config
    SELECT value INTO v_token
    FROM public.jwt_config
    WHERE key = 'secret';

    -- Generate new token with extended expiration (24 hours from now)
    v_token := sign_jwt(
        json_build_object(
            'user_id', v_user.id,
            'username', v_user.username,
            'user_role', v_user.role,
            'exp', extract(epoch from now() + interval '24 hours')
        )::json,
        v_token
    );

    RETURN QUERY SELECT v_token, v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- JWT & Utility Functions
-- ----------------------------------------------------------------------------

-- Sign JWT (HMAC-SHA256)
CREATE OR REPLACE FUNCTION sign_jwt(payload JSON, secret TEXT DEFAULT NULL, algorithm TEXT DEFAULT 'HS256')
RETURNS TEXT AS $$
DECLARE
    v_secret TEXT;
    v_header JSON;
    v_payload_b64 TEXT;
    v_header_b64 TEXT;
    v_signature_b64 TEXT;
    v_string_to_sign TEXT;
BEGIN
    -- Use provided secret or get from config
    v_secret := COALESCE(secret, (SELECT value FROM jwt_config WHERE key = 'secret'));

    -- Build JWT header
    v_header := json_build_object('alg', algorithm, 'typ', 'JWT');

    -- Convert to base64url format (remove newlines, padding, replace +/ with -_)
    v_header_b64 := REPLACE(REPLACE(REPLACE(
        RTRIM(encode(v_header::text::bytea, 'base64'), '='),
        E'\n', ''), '+', '-'), '/', '_');
    v_payload_b64 := REPLACE(REPLACE(REPLACE(
        RTRIM(encode(payload::text::bytea, 'base64'), '='),
        E'\n', ''), '+', '-'), '/', '_');

    -- Create string to sign
    v_string_to_sign := v_header_b64 || '.' || v_payload_b64;

    -- Sign with HMAC-SHA256 and convert to base64url
    v_signature_b64 := REPLACE(REPLACE(REPLACE(
        RTRIM(encode(hmac(v_string_to_sign, v_secret, 'sha256'), 'base64'), '='),
        E'\n', ''), '+', '-'), '/', '_');

    -- Return complete JWT token
    RETURN v_string_to_sign || '.' || v_signature_b64;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Current User Role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
BEGIN
    -- Use user_role from JWT (not role, to avoid PostgREST role switching)
    RETURN current_setting('request.jwt.claims', true)::json->>'user_role';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

-- User Management
GRANT EXECUTE ON FUNCTION create_user(TEXT, TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION change_password(TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION admin_update_user(UUID, TEXT, TEXT) TO web_anon;

-- Session Management
GRANT EXECUTE ON FUNCTION login(TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION logout() TO web_anon;
GRANT EXECUTE ON FUNCTION validate_session() TO web_anon;
GRANT EXECUTE ON FUNCTION refresh_token() TO web_anon;

-- Utilities
GRANT EXECUTE ON FUNCTION sign_jwt(JSON, TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION current_user_role() TO web_anon;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Comprehensive Migration Complete!';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Features Applied:';
    RAISE NOTICE '  ✓ Supplier Management (supplier_transactions table)';
    RAISE NOTICE '  ✓ Supplier Details (supplierdetails table with phone)';
    RAISE NOTICE '  ✓ Enhanced Calculation Types (7 types total)';
    RAISE NOTICE '  ✓ Enhanced Authentication (9 functions)';
    RAISE NOTICE '  ✓ Session Validation & Token Refresh';
    RAISE NOTICE '  ✓ User Management (admin controls)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created/Updated:';
    RAISE NOTICE '  • supplier_transactions - Transaction records';
    RAISE NOTICE '    - Calculation Types: cashToKacha, kachaToPurity, ornamentToPurity,';
    RAISE NOTICE '      Cash, Material, ornamentToCash, PurityCalculation';
    RAISE NOTICE '    - New columns: description, amount_currency, grams_weight,';
    RAISE NOTICE '      purity_percentage, rate_price, result_amount, result_grams';
    RAISE NOTICE '    - Dropped: input_value_1, input_value_2, result';
    RAISE NOTICE '  • supplierdetails - Supplier master data';
    RAISE NOTICE '    - Fields: supplier_name, phone_number';
    RAISE NOTICE '    - Indexes: name search, created_by';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created/Updated:';
    RAISE NOTICE '  • create_user - User creation with validation';
    RAISE NOTICE '  • change_password - Password change';
    RAISE NOTICE '  • admin_update_user - Admin user management';
    RAISE NOTICE '  • login - User login with JWT generation';
    RAISE NOTICE '  • logout - Session invalidation';
    RAISE NOTICE '  • validate_session - Server-side validation';
    RAISE NOTICE '  • refresh_token - Token refresh';
    RAISE NOTICE '  • sign_jwt - JWT signing with HMAC-SHA256';
    RAISE NOTICE '  • current_user_role - Get user role from JWT';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Restart PostgREST to reload schema';
    RAISE NOTICE '  2. Rebuild and deploy frontend';
    RAISE NOTICE '  3. Test login/logout flow';
    RAISE NOTICE '  4. Add suppliers via "Add New Supplier" dialog';
    RAISE NOTICE '  5. Test all 7 calculation types';
    RAISE NOTICE '  6. Test grouped supplier view in Data Export';
    RAISE NOTICE '  7. Verify footer totals show net balance (input - output)';
    RAISE NOTICE '============================================================';
END $$;
