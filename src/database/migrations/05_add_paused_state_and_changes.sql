-- Migration 05: Add paused state, changes_summary, and course day_schedules

-- 1. Update tasks state check to include 'paused'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_state_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_state_check 
    CHECK (state IN ('backlog', 'planned', 'in_progress', 'blocked', 'paused', 'done', 'dropped'));

-- 2. Add changes_summary column to task_events
ALTER TABLE task_events ADD COLUMN IF NOT EXISTS changes_summary TEXT;

-- 3. Add day_schedules JSONB column to courses for per-day time customization
-- Format: { "mon": { "start_time": "09:00", "end_time": "10:15" }, "wed": { "start_time": "09:00", "end_time": "10:15" } }
ALTER TABLE courses ADD COLUMN IF NOT EXISTS day_schedules JSONB;
