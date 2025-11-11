-- ============================================================================
-- MIGRATION: Add Supplier Management Feature
-- ============================================================================
-- Purpose: Upgrade existing database to add supplier management functionality
-- Run this on production database if it already exists
-- For new databases, use setup-complete.sql instead
-- ============================================================================

-- ============================================================================
-- STEP 0: ENSURE PGCRYPTO EXTENSION EXISTS (Required for password hashing)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- STEP 1: CREATE SUPPLIER_TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    supplier_name TEXT NOT NULL,
    material TEXT NOT NULL CHECK (material IN ('gold', 'silver')),
    type TEXT NOT NULL CHECK (type IN ('input', 'output')),
    calculation_type TEXT NOT NULL CHECK (calculation_type IN ('cashToKacha', 'kachaToPurity', 'ornamentToPurity')),
    input_value_1 DECIMAL(10,3) NOT NULL,
    input_value_2 DECIMAL(10,3) NOT NULL,
    result DECIMAL(10,3) NOT NULL,
    is_credit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions to web_anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_transactions TO web_anon;

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR SUPPLIER_TRANSACTIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_asof_date ON public.supplier_transactions(asof_date);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON public.supplier_transactions(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_material ON public.supplier_transactions(material);

-- ============================================================================
-- STEP 3: FIX LOGIN FUNCTION (user_role instead of role in JWT)
-- ============================================================================

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

-- ============================================================================
-- STEP 4: FIX SIGN_JWT FUNCTION (proper HMAC-SHA256 signing)
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION sign_jwt(JSON, TEXT, TEXT) TO web_anon;

-- ============================================================================
-- STEP 5: FIX CURRENT_USER_ROLE FUNCTION (read user_role from JWT)
-- ============================================================================

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
-- STEP 6: ADD ADMIN_UPDATE_USER FUNCTION (for admin user management)
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION admin_update_user(UUID, TEXT, TEXT) TO web_anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Supplier Management Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  ✓ Created supplier_transactions table';
    RAISE NOTICE '  ✓ Added indexes for performance';
    RAISE NOTICE '  ✓ Fixed JWT to use user_role';
    RAISE NOTICE '  ✓ Updated sign_jwt with HMAC-SHA256';
    RAISE NOTICE '  ✓ Updated current_user_role function';
    RAISE NOTICE '  ✓ Added admin_update_user function';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Restart PostgREST to reload schema';
    RAISE NOTICE '  2. Test login functionality';
    RAISE NOTICE '  3. Verify supplier management works';
    RAISE NOTICE '  4. Test user management (admin only)';
    RAISE NOTICE '========================================';
END $$;
