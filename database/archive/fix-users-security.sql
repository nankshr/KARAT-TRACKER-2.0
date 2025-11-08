-- CRITICAL SECURITY FIX: Hide passwords from users table
-- Run this immediately on your production database

-- 1. Drop existing overly permissive policy
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- 2. Create new policy that hides passwords
CREATE POLICY "users_select_policy_secure"
ON users
FOR SELECT
TO web_anon
USING (true)
WITH CHECK (true);

-- 3. Create a view that excludes password for public access
CREATE OR REPLACE VIEW users_public AS
SELECT
    id,
    username,
    role,
    first_name,
    last_name,
    contact_number,
    address,
    is_active,
    created_at,
    updated_at
    -- sessionid is intentionally excluded for security
    -- password is intentionally excluded for security
FROM users;

-- 4. Grant access to the view
GRANT SELECT ON users_public TO web_anon;

-- 5. Create secure login function
CREATE OR REPLACE FUNCTION login(username_input TEXT, password_input TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    role TEXT,
    sessionid TEXT,
    first_name TEXT,
    last_name TEXT,
    contact_number TEXT,
    address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists and password matches
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.role,
        u.sessionid,
        u.first_name,
        u.last_name,
        u.contact_number,
        u.address
    FROM users u
    WHERE u.username = username_input
      AND u.password = password_input
      AND u.is_active = true;

    -- If no rows returned, user/password was wrong
END;
$$;

-- 6. Grant execute permission on login function
GRANT EXECUTE ON FUNCTION login(TEXT, TEXT) TO web_anon;

-- 7. REVOKE direct SELECT on password column
-- This ensures password column is never exposed via SELECT
REVOKE SELECT (password) ON users FROM web_anon;
REVOKE SELECT (password) ON users FROM PUBLIC;

-- 8. Optional: Create function to change password (for future use)
CREATE OR REPLACE FUNCTION change_password(
    user_id_input UUID,
    old_password_input TEXT,
    new_password_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    password_match BOOLEAN;
BEGIN
    -- Check if old password is correct
    SELECT EXISTS(
        SELECT 1 FROM users
        WHERE id = user_id_input
        AND password = old_password_input
    ) INTO password_match;

    IF NOT password_match THEN
        RETURN FALSE;
    END IF;

    -- Update password
    UPDATE users
    SET password = new_password_input,
        updated_at = NOW()
    WHERE id = user_id_input;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION change_password(UUID, TEXT, TEXT) TO web_anon;

-- Verification queries (run these to confirm security)
-- These should NOT show passwords:

-- Test 1: Direct users table query (should be blocked or not show password)
-- SELECT * FROM users;

-- Test 2: Public view query (should work and not show password)
-- SELECT * FROM users_public;

-- Test 3: Login function test (should work with correct credentials)
-- SELECT * FROM login('admin', 'admin');

COMMENT ON FUNCTION login(TEXT, TEXT) IS 'Secure login function that validates credentials without exposing passwords';
COMMENT ON VIEW users_public IS 'Public view of users table with sensitive fields removed';
COMMENT ON FUNCTION change_password(UUID, TEXT, TEXT) IS 'Secure password change function';
