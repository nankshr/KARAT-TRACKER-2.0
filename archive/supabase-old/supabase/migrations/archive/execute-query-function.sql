-- Function to execute safe SELECT queries dynamically
-- This allows the application to run AI-generated SQL queries safely

CREATE OR REPLACE FUNCTION execute_safe_query(query_text text)
RETURNS TABLE (result_json jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_lower text;
BEGIN
  -- Convert to lowercase for validation
  query_lower := lower(trim(query_text));

  -- Security checks: Only allow SELECT statements
  IF query_lower NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;

  -- Block dangerous keywords
  IF query_lower ~ '\b(drop|delete|update|insert|create|alter|truncate|grant|revoke)\b' THEN
    RAISE EXCEPTION 'Query contains forbidden operations';
  END IF;

  -- Block function calls that could be dangerous
  IF query_lower ~ '\b(pg_|information_schema\.|current_user|session_user)\b' THEN
    RAISE EXCEPTION 'Query contains forbidden system functions';
  END IF;

  -- Execute the query and return results as JSONB
  RETURN QUERY
  EXECUTE format('
    WITH query_result AS (%s)
    SELECT to_jsonb(query_result.*) as result_json
    FROM query_result
  ', query_text);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_safe_query(text) TO authenticated;