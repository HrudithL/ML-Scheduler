-- Fix: Grant table permissions to authenticated and anon roles
-- Run this in Supabase SQL Editor

-- Grant permissions for all tables
GRANT ALL ON tasks TO authenticated, anon;
GRANT ALL ON task_events TO authenticated, anon;
GRANT ALL ON courses TO authenticated, anon;
GRANT ALL ON daily_logs TO authenticated, anon;

-- Verify permissions were granted successfully
SELECT 
    schemaname,
    tablename,
    grantee,
    privilege_type
FROM pg_tables t
LEFT JOIN information_schema.table_privileges p 
    ON t.tablename = p.table_name AND t.schemaname = p.table_schema
WHERE t.schemaname = 'public' 
    AND t.tablename IN ('tasks', 'task_events', 'courses', 'daily_logs')
    AND grantee IN ('authenticated', 'anon')
ORDER BY tablename, grantee;
