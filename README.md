# Productivity & Deadline Optimization App

A fast, simple web app for daily task scheduling with Supabase-backed event logging for ML analysis.

## Features

- **Daily Task Scheduler**: Manage tasks with states (backlog, planned, in-progress, blocked, done, dropped)
- **Event Logging**: Every task change is automatically logged for ML analysis
- **Risk Scoring**: Automated risk calculation based on priority, deadline, difficulty, and scheduling
- **Course Integration**: Link tasks to courses with schedules
- **Daily Logging**: Track energy, focus, stress, and sleep metrics
- **Data Export**: Export all data as CSV for ML pipelines

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Postgres + Auth)
- **Auth**: Google OAuth via Supabase

## Setup

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project

### Installation

1. Clone the repository and navigate to the project:
   ```bash
   cd productivity-app
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Database Setup

1. Run the SQL migrations in your Supabase project (in order):
   - `src/database/migrations/01_initial_schema.sql`
   - `src/database/migrations/02_indexes.sql`
   - `src/database/migrations/03_rls_policies.sql`
   - `src/database/migrations/04_computed_columns_view.sql`

2. Configure Google OAuth in Supabase:
   - Go to Authentication > Providers > Google
   - Enable Google provider
   - Add OAuth credentials
   - Add authorized redirect URLs

### Development

Start the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
pnpm build
pnpm preview
```

## Database Schema

### Key Tables

- **tasks**: Current state of each task with all properties
- **task_events**: Event log capturing every change for ML analysis
- **courses**: Course schedules linked to tasks
- **daily_logs**: Daily metrics (energy, focus, stress, sleep)

### Views

- **tasks_enriched**: Tasks with computed columns (risk_score, days_until_due, cycle_time_hours, etc.)

## Architecture

### Event Logging

All task mutations go through `TaskService` which automatically logs events to `task_events` table. This ensures:
- Complete audit trail
- ML-ready data
- No missed events

**Never update tasks directly** - always use TaskService methods:
- `createTask()`
- `updateTask()`
- `transitionState()`
- `updatePlannedBlock()`
- `updateDueDate()`
- `deleteTask()`

### Views

- **Today**: Tasks planned/in-progress for today
- **Inbox**: Backlog tasks sorted by risk score
- **Due Soon**: Tasks due within 7 days
- **Blocked**: Tasks awaiting unblocking
- **Completed**: Recently completed tasks with stats
- **Courses**: CRUD interface for course management
- **Daily Log**: Daily metrics entry
- **Export**: CSV data export for ML

## Risk Score Formula

Tasks are scored based on:
- Priority (0-30 points)
- Difficulty (0-20 points)
- Blocked status (+20 points)
- Unscheduled (+15 points)
- Due date proximity (0-30 points)

Higher score = higher risk/urgency

## Data Export

Go to Export view to download CSV files of:
- Tasks
- Task events
- Courses
- Daily logs

Perfect for ML pipelines and data analysis.

## Future Enhancements

- [ ] Multi-user support with proper RLS policies
- [ ] Offline-first functionality
- [ ] Task recurrence
- [ ] Email/push notifications
- [ ] Advanced analytics dashboard
- [ ] ML-powered task recommendations
- [ ] Mobile app

## License

MIT
