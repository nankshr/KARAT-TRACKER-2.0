-- Function to get table schema information
-- This can be executed in Supabase SQL Editor if needed

CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  character_maximum_length integer,
  numeric_precision integer,
  numeric_scale integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale
  FROM information_schema.columns c
  WHERE c.table_name = get_table_schema.table_name
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$;