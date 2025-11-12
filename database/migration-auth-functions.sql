-- ============================================================================
-- MIGRATION SCRIPT: Update Authentication Functions
-- ============================================================================
-- Purpose: Drop and recreate authentication functions with updated signatures
-- Date: 2025-01-12
--
-- This script resolves "cannot change return type of existing function" errors
-- by dropping old function signatures before creating new ones.
--
-- IMPORTANT: Test on staging/backup database before running on production!
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP OLD FUNCTION SIGNATURES
-- ============================================================================
-- Using IF EXISTS to prevent errors if functions don't exist
-- Using CASCADE to drop dependent objects (if any)

-- Drop change_password (may have different signature in old version)
DROP FUNCTION IF EXISTS change_password(text, text) CASCADE;

-- Drop create_user (may have different signature in old version)
DROP FUNCTION IF EXISTS create_user(text, text, text) CASCADE;

-- Drop admin_update_user (may have different signature in old version)
DROP FUNCTION IF EXISTS admin_update_user(uuid, text, text) CASCADE;

-- Drop logout (may have different signature in old version)
DROP FUNCTION IF EXISTS logout() CASCADE;

-- Drop validate_session (new function, may not exist)
DROP FUNCTION IF EXISTS validate_session() CASCADE;

-- Drop refresh_token (new function, may not exist)
DROP FUNCTION IF EXISTS refresh_token() CASCADE;

-- ============================================================================
-- STEP 2: CREATE NEW FUNCTION SIGNATURES
-- ============================================================================

-- Create user function
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

-- Change password function
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

-- Admin update user function (admin can update other users' info and passwords)
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

-- Logout function
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

-- Validate session function
-- Checks if the current user's session is still valid
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

-- Refresh token function
-- Generates a new JWT token with extended expiration
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

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on all functions to web_anon role
GRANT EXECUTE ON FUNCTION create_user(TEXT, TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION change_password(TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION admin_update_user(UUID, TEXT, TEXT) TO web_anon;
GRANT EXECUTE ON FUNCTION logout() TO web_anon;
GRANT EXECUTE ON FUNCTION validate_session() TO web_anon;
GRANT EXECUTE ON FUNCTION refresh_token() TO web_anon;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The following functions have been updated:
--   ✓ create_user
--   ✓ change_password
--   ✓ admin_update_user
--   ✓ logout
--   ✓ validate_session (NEW)
--   ✓ refresh_token (NEW)
--
-- Next steps:
--   1. Verify all functions exist: SELECT proname FROM pg_proc WHERE proname IN ('create_user', 'change_password', 'logout', 'validate_session', 'refresh_token');
--   2. Test authentication flow in application
--   3. Monitor logs for any errors
-- ============================================================================
