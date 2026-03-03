-- Create view with computed columns for tasks

CREATE OR REPLACE VIEW tasks_enriched AS
SELECT 
    t.*,
    -- Planned minutes
    CASE 
        WHEN t.planned_start_at IS NOT NULL AND t.planned_end_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.planned_end_at - t.planned_start_at)) / 60
        ELSE 0
    END AS planned_minutes,
    
    -- Days until due
    CASE 
        WHEN t.due_at IS NOT NULL 
        THEN EXTRACT(DAY FROM (t.due_at - NOW()))::INTEGER
        ELSE NULL
    END AS days_until_due,
    
    -- Is overdue
    CASE 
        WHEN t.state NOT IN ('done', 'dropped') AND t.due_at < NOW() 
        THEN true
        ELSE false
    END AS is_overdue,
    
    -- Cycle time in hours
    CASE 
        WHEN t.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600
        ELSE NULL
    END AS cycle_time_hours,
    
    -- Lateness in hours
    CASE 
        WHEN t.due_at IS NOT NULL AND t.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.due_at)) / 3600
        ELSE NULL
    END AS lateness_hours,
    
    -- On time
    CASE 
        WHEN t.due_at IS NOT NULL AND t.completed_at IS NOT NULL 
        THEN t.completed_at <= t.due_at
        ELSE false
    END AS on_time,
    
    -- Risk score calculation
    CASE 
        WHEN t.state = 'done' THEN 0
        ELSE 
            -- Priority points
            (CASE t.priority_label
                WHEN 'critical' THEN 30
                WHEN 'high' THEN 20
                WHEN 'medium' THEN 10
                ELSE 0
            END) +
            -- Difficulty points
            (CASE t.difficulty
                WHEN 'extreme' THEN 20
                WHEN 'hard' THEN 12
                WHEN 'medium' THEN 6
                ELSE 0
            END) +
            -- Blocked points
            (CASE WHEN t.state = 'blocked' THEN 20 ELSE 0 END) +
            -- Unscheduled points
            (CASE WHEN t.planned_start_at IS NULL THEN 15 ELSE 0 END) +
            -- Due soon points
            (CASE 
                WHEN t.due_at IS NOT NULL AND t.state NOT IN ('done', 'dropped') THEN
                    CASE 
                        WHEN EXTRACT(DAY FROM (t.due_at - NOW())) <= 1 THEN 30
                        WHEN EXTRACT(DAY FROM (t.due_at - NOW())) <= 3 THEN 20
                        WHEN EXTRACT(DAY FROM (t.due_at - NOW())) <= 7 THEN 10
                        ELSE 0
                    END
                ELSE 0
            END)
    END AS risk_score
FROM tasks t;

-- Grant access to the view
GRANT SELECT ON tasks_enriched TO authenticated, anon;
