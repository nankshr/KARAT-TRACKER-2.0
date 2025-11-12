-- ============================================================================
-- KARAT TRACKER 2.0 - COMPLETE DATABASE SETUP
-- ============================================================================
-- Purpose: Complete PostgreSQL database setup with proper roles and permissions
-- Database: karat_tracker_p
-- Roles: authenticator (connection), web_anon (API access)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ROLES
-- ============================================================================

-- Create authenticator role (used by PostgREST to connect to database)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN;
        RAISE NOTICE 'Created role: authenticator';
    ELSE
        RAISE NOTICE 'Role authenticator already exists';
    END IF;
END
$$;

-- Create web_anon role (anonymous API access)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_anon') THEN
        CREATE ROLE web_anon NOLOGIN;
        RAISE NOTICE 'Created role: web_anon';
    ELSE
        RAISE NOTICE 'Role web_anon already exists';
    END IF;
END
$$;

-- Grant web_anon to authenticator (allows authenticator to switch to web_anon)
GRANT web_anon TO authenticator;

-- ============================================================================
-- STEP 2: CREATE SCHEMA AND TABLES
-- ============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    sessionid TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create daily_rates table
CREATE TABLE IF NOT EXISTS public.daily_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    material TEXT NOT NULL CHECK (material IN ('gold', 'silver')),
    karat TEXT NOT NULL,
    new_price_per_gram DECIMAL(10,2) NOT NULL,
    old_price_per_gram DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expense_log table
CREATE TABLE IF NOT EXISTS public.expense_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('direct', 'indirect')),
    item_name TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    is_credit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sales_log table
CREATE TABLE IF NOT EXISTS public.sales_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inserted_by TEXT NOT NULL REFERENCES public.users(username),
    date_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    asof_date DATE NOT NULL,
    material TEXT NOT NULL CHECK (material IN ('gold', 'silver')),
    type TEXT NOT NULL CHECK (type IN ('wholesale', 'retail')),
    item_name TEXT NOT NULL,
    tag_no TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    old_weight_grams DECIMAL(10,3),
    old_purchase_purity DECIMAL(5,2),
    o2_gram DECIMAL(10,3),
    old_sales_purity DECIMAL(5,2),
    old_material_profit DECIMAL(10,2),
    purchase_weight_grams DECIMAL(10,3) NOT NULL,
    purchase_purity DECIMAL(5,2) NOT NULL,
    purchase_cost DECIMAL(10,2) NOT NULL,
    selling_purity DECIMAL(5,2),
    wastage DECIMAL(5,2),
    selling_cost DECIMAL(10,2) NOT NULL,
    profit DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create supplier_transactions table
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

-- Create activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(username),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create jwt_config table for JWT configuration
CREATE TABLE IF NOT EXISTS public.jwt_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS TO web_anon
-- ============================================================================

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO web_anon;

-- Grant SELECT, INSERT, UPDATE, DELETE on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_rates TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_log TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_log TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_transactions TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jwt_config TO web_anon;

-- Grant EXECUTE on all functions in public schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO web_anon;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO web_anon;

-- ============================================================================
-- STEP 4: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Function to hash passwords using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Login function
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

GRANT EXECUTE ON FUNCTION admin_update_user(UUID, TEXT, TEXT) TO web_anon;

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

-- Get current user ID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'user_id')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user role
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

-- Execute safe query function (for admin use)
CREATE OR REPLACE FUNCTION execute_safe_query(query_text TEXT)
RETURNS SETOF RECORD AS $$
BEGIN
    RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get table schema function
CREATE OR REPLACE FUNCTION get_table_schema(table_name TEXT)
RETURNS TABLE (
    column_name TEXT,
    data_type TEXT,
    is_nullable TEXT,
    column_default TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.column_name::TEXT,
        c.data_type::TEXT,
        c.is_nullable::TEXT,
        c.column_default::TEXT
    FROM information_schema.columns c
    WHERE c.table_name = get_table_schema.table_name
        AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sign JWT function (using pgjwt extension if available, otherwise simple base64)
-- Try to create pgjwt extension, but don't fail if it's not available
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgjwt;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgjwt extension not available, using fallback JWT signing';
END $$;

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

-- ============================================================================
-- STEP 4B: RECREATE ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Note: These policies may have been dropped when functions were dropped with CASCADE
-- Recreate them to ensure proper access control

-- Enable RLS on tables that need it
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can update own record, admin/owner can update all" ON public.users;
DROP POLICY IF EXISTS "Users can view own record, admin/owner can view all" ON public.users;

-- Users table policies
CREATE POLICY "Users can view own record, admin/owner can view all"
ON public.users FOR SELECT
USING (
  id = current_user_id()
  OR current_user_role() IN ('admin', 'owner')
);

CREATE POLICY "Users can update own record, admin/owner can update all"
ON public.users FOR UPDATE
USING (
  id = current_user_id()
  OR current_user_role() IN ('admin', 'owner')
);

-- ============================================================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_sessionid ON public.users(sessionid);
CREATE INDEX IF NOT EXISTS idx_daily_rates_asof_date ON public.daily_rates(asof_date);
CREATE INDEX IF NOT EXISTS idx_expense_log_asof_date ON public.expense_log(asof_date);
CREATE INDEX IF NOT EXISTS idx_sales_log_asof_date ON public.sales_log(asof_date);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_asof_date ON public.supplier_transactions(asof_date);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON public.supplier_transactions(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_material ON public.supplier_transactions(material);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON public.activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);

-- ============================================================================
-- STEP 6: INSERT DEFAULT JWT CONFIGURATION
-- ============================================================================

-- Insert JWT secret (CHANGE THIS IN PRODUCTION!)
INSERT INTO public.jwt_config (key, value)
VALUES ('secret', '7XMblEc5aEcKvaIWJ4mcDhBJRlQXAW9NU0KxLdxxx4w=')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Verify roles and permissions
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Roles created:';
    RAISE NOTICE '  - authenticator (for PostgREST connection)';
    RAISE NOTICE '  - web_anon (for API access)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - users, daily_rates, expense_log';
    RAISE NOTICE '  - sales_log, supplier_transactions';
    RAISE NOTICE '  - activity_log, jwt_config';
    RAISE NOTICE '';
    RAISE NOTICE 'Permissions granted to web_anon role';
    RAISE NOTICE 'Functions created for authentication';
    RAISE NOTICE '========================================';
END $$;
