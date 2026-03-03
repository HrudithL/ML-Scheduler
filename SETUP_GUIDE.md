# Setup Guide - Productivity & Deadline Optimization App

This guide will help you set up the productivity app from scratch.

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- A Supabase account ([supabase.com](https://supabase.com))

## Step 1: Supabase Project Setup

1. **Create a new Supabase project**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Click "New Project"
   - Choose organization, name, and database password
   - Select a region close to you
   - Wait for project to provision (~2 minutes)

2. **Get your project credentials**
   - Go to Project Settings > API
   - Copy the `Project URL` and `anon` `public` key
   - You'll need these for `.env.local`

## Step 2: Database Setup

1. **Navigate to SQL Editor in Supabase**
   - In your Supabase dashboard, go to "SQL Editor"

2. **Run migrations in order**
   
   Execute each migration file in sequence:

   **Migration 1: Initial Schema**
   ```sql
   -- Copy and paste contents from: src/database/migrations/01_initial_schema.sql
   -- Creates tables: tasks, task_events, courses, daily_logs
   -- Sets up triggers for updated_at columns
   ```

   **Migration 2: Indexes**
   ```sql
   -- Copy and paste contents from: src/database/migrations/02_indexes.sql
   -- Creates performance indexes on commonly queried columns
   ```

   **Migration 3: RLS Policies**
   ```sql
   -- Copy and paste contents from: src/database/migrations/03_rls_policies.sql
   -- Enables Row Level Security with permissive policies for single-user
   ```

   **Migration 4: Computed Columns View**
   ```sql
   -- Copy and paste contents from: src/database/migrations/04_computed_columns_view.sql
   -- Creates tasks_enriched view with computed columns like risk_score
   ```

3. **Verify tables created**
   - Go to "Table Editor" in Supabase
   - You should see: `tasks`, `task_events`, `courses`, `daily_logs`
   - Go to "Database" > "Views" to see `tasks_enriched`

## Step 3: Google OAuth Setup

1. **Create Google OAuth credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     http://localhost:5173/auth/callback (for development)
     ```
   - Save the Client ID and Client Secret

2. **Configure Supabase Auth**
   - In Supabase dashboard, go to "Authentication" > "Providers"
   - Find "Google" and enable it
   - Enter your Google Client ID and Client Secret
   - Save

3. **Configure site URL**
   - Go to Authentication > URL Configuration
   - Set Site URL to: `http://localhost:5173` (for development)
   - Add redirect URLs as needed

## Step 4: Local Development Setup

1. **Install dependencies**
   ```bash
   cd productivity-app
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

   The app should open at `http://localhost:5173`

## Step 5: First Login

1. Navigate to `http://localhost:5173`
2. Click "Sign in with Google"
3. Authorize the app
4. You'll be redirected to the Today view

## Step 6: Test the App

### Create a Course
1. Go to "Courses" tab
2. Click "New Course"
3. Fill in details (e.g., "BUSN 460 - Data Science", days: Mon/Wed/Fri, 10:00-11:15 AM)
4. Save

### Create Tasks
1. Go to "Inbox" tab
2. Click "New Task"
3. Fill in task details:
   - Title: "Complete project proposal"
   - Category: Class
   - Effort: 90m
   - Priority: High
   - Add due date
4. Save

### Schedule a Task
1. In Inbox, click "Plan for Today" on a task
2. Task moves to Today view
3. Click "Start ▶" to begin work
4. Click "Done ✅" when complete

### Log Daily Metrics
1. Go to "Daily Log" tab
2. Set energy, focus, stress levels (1-5)
3. Enter sleep hours
4. Add notes
5. Save

### Export Data
1. Go to "Export" tab
2. Click "Download CSV" for any table
3. Verify data exports correctly

## Verification Checklist

- [ ] Can sign in with Google
- [ ] Can create and edit courses
- [ ] Can create tasks in Inbox
- [ ] Can move tasks to Today
- [ ] Can transition task states (Start, Block, Done)
- [ ] Due Soon view shows upcoming tasks
- [ ] Completed view shows finished tasks
- [ ] Can log daily metrics
- [ ] Can export CSV files
- [ ] Task events are logged (check task_events table in Supabase)

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has valid credentials
- Restart the dev server after adding env variables

### Can't sign in with Google
- Verify Google OAuth credentials are correct in Supabase
- Check that redirect URLs match exactly
- Make sure the Google provider is enabled in Supabase Auth

### Database errors
- Verify all migrations ran successfully
- Check RLS policies are enabled
- Look for error details in Supabase logs

### TypeScript errors
- Run `pnpm install` to ensure all dependencies are installed
- Make sure `tailwindcss-animate` is installed

### Tasks not showing up
- Check the state filter for each view
- Verify tasks have appropriate planned_start_at times for Today view
- Check due_at dates for Due Soon view

## Next Steps

### For Production Deployment

1. **Deploy to Vercel/Netlify/etc**
   - Add production environment variables
   - Update Supabase redirect URLs for production domain

2. **Update RLS Policies**
   - Replace permissive policies with user-specific ones
   - Filter by `auth.uid()` in policies

3. **Add proper authentication**
   - Consider adding other OAuth providers
   - Add user profiles table

4. **Monitor event logging**
   - Regularly check that task_events are being logged
   - Export data for ML analysis

### Optional Enhancements

- Add task recurrence
- Implement notifications
- Build analytics dashboard
- Add mobile app
- Integrate with calendar
- Add collaboration features

## Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Check browser console for errors
3. Verify database schema is correct
4. Ensure all migrations ran successfully

For questions or issues, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)  
- [shadcn/ui Documentation](https://ui.shadcn.com)
