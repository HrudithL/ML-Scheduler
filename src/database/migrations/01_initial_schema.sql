-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL DEFAULT 'backlog' 
        CHECK (state IN ('backlog', 'planned', 'in_progress', 'blocked', 'done', 'dropped')),
    category TEXT CHECK (category IN ('class', 'recruiting', 'team_research', 'personal')),
    task_type TEXT CHECK (task_type IN ('coding', 'study_reading', 'writing_report', 'admin_logistics', 'interview_prep')),
    hard_deadline BOOLEAN DEFAULT false,
    effort_bucket TEXT CHECK (effort_bucket IN ('10m', '25m', '50m', '90m', '2h_plus')),
    effort_min INTEGER CHECK (effort_min IN (10, 25, 50, 90, 120)),
    priority_label TEXT CHECK (priority_label IN ('low', 'medium', 'high', 'critical')),
    importance TEXT CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
    due_at TIMESTAMPTZ,
    planned_start_at TIMESTAMPTZ,
    planned_end_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    course_id UUID,
    log_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create task_events table
CREATE TABLE IF NOT EXISTS task_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB,
    old_state TEXT,
    new_state TEXT,
    old_due_at TIMESTAMPTZ,
    new_due_at TIMESTAMPTZ,
    old_planned_start_at TIMESTAMPTZ,
    new_planned_start_at TIMESTAMPTZ,
    old_planned_end_at TIMESTAMPTZ,
    new_planned_end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    days TEXT[] CHECK (days <@ ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::TEXT[]),
    start_time_str TEXT,
    end_time_str TEXT,
    semester TEXT,
    credits INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create daily_logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    energy INTEGER CHECK (energy >= 1 AND energy <= 5),
    focus INTEGER CHECK (focus >= 1 AND focus <= 5),
    stress INTEGER CHECK (stress >= 1 AND stress <= 5),
    sleep_hours NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint for courses
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_courses 
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
