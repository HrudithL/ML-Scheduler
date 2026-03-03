-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Grant table permissions to authenticated and anon roles
GRANT ALL ON tasks TO authenticated, anon;
GRANT ALL ON task_events TO authenticated, anon;
GRANT ALL ON courses TO authenticated, anon;
GRANT ALL ON daily_logs TO authenticated, anon;

-- Permissive policies for single-user MVP
-- TODO: Replace with proper auth.uid() filters when adding multi-user support

-- Tasks policies
CREATE POLICY "Allow all operations on tasks" ON tasks
    FOR ALL USING (true) WITH CHECK (true);

-- Task events policies
CREATE POLICY "Allow all operations on task_events" ON task_events
    FOR ALL USING (true) WITH CHECK (true);

-- Courses policies
CREATE POLICY "Allow all operations on courses" ON courses
    FOR ALL USING (true) WITH CHECK (true);

-- Daily logs policies
CREATE POLICY "Allow all operations on daily_logs" ON daily_logs
    FOR ALL USING (true) WITH CHECK (true);
