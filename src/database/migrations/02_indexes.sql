-- Indexes for performance

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_state_due_at ON tasks(state, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_state_planned_start ON tasks(state, planned_start_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_course_id ON tasks(course_id);
CREATE INDEX IF NOT EXISTS idx_tasks_log_date ON tasks(log_date);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);

-- Task events indexes
CREATE INDEX IF NOT EXISTS idx_task_events_task_id_created ON task_events(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON task_events(event_type);
CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);

-- Daily logs index
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date DESC);
