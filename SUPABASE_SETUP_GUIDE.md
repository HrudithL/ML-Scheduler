# Supabase Setup & OAuth Configuration Guide

Complete step-by-step guide to set up Supabase and configure Google OAuth for this app.

---

## Part 1: Create Supabase Project & Get API Keys

### Step 1: Create a Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click **Start your project** or **Sign Up**
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

### Step 2: Create a New Project
1. Once logged in, click **New Project**
2. Select your organization (or create one)
3. Fill in project details:
   - **Name**: `productivity-app` (or any name you prefer)
   - **Database Password**: Create a strong password (save it somewhere safe!)
   - **Region**: Select closest to you (e.g., `US East (Ohio)`)
   - **Pricing Plan**: Select **Free** tier
4. Click **Create new project**
5. Wait 2-3 minutes for your project to be provisioned

### Step 3: Get Your API Keys
1. Once the project is ready, you'll see the dashboard
2. Go to **Settings** (gear icon in left sidebar)
3. Click **API** in the settings menu
4. You'll see two important values:

   **Project URL:**
   ```
   https://your-project-id.supabase.co
   ```
   
   **API Keys:**
   - `anon` / `public` - this is your **VITE_SUPABASE_ANON_KEY**
   - `service_role` - ⚠️ DO NOT use this in your frontend!

5. Copy these values and update your `.env.local` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```

---

## Part 2: Run Database Migrations

### Step 1: Open SQL Editor
1. In your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Run Migrations in Order

#### Migration 1: Initial Schema
1. Open `src/database/migrations/01_initial_schema.sql` in VS Code
2. Copy the entire file content
3. Paste into the SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)
5. You should see: "Success. No rows returned"

#### Migration 2: Indexes
1. Open `src/database/migrations/02_indexes.sql`
2. Copy and paste into SQL Editor
3. Click **Run**
4. Wait for confirmation

#### Migration 3: Row Level Security
1. Open `src/database/migrations/03_rls_policies.sql`
2. Copy and paste into SQL Editor
3. Click **Run**
4. This sets up security policies

#### Migration 4: Computed Views
1. Open `src/database/migrations/04_computed_columns_view.sql`
2. Copy and paste into SQL Editor
3. Click **Run**
4. Creates the `tasks_enriched` view with risk scores

### Step 3: Verify Tables Created
1. Click **Table Editor** in the left sidebar
2. You should see tables: `tasks`, `task_events`, `courses`, `daily_logs`

---

## Part 3: Configure Google OAuth

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click **Select a project** → **New Project**
4. Enter project name: `Productivity App`
5. Click **Create**
6. Wait for the project to be created (you'll get a notification)

### Step 2: Enable Google+ API

1. In the Google Cloud Console, make sure your new project is selected
2. Go to **APIs & Services** → **Library** (or use search bar)
3. Search for "Google+ API" or "Google Identity"
4. Click on **Google+ API**
5. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: `Productivity & Deadline Optimizer`
   - **User support email**: Your email
   - **Developer contact email**: Your email
   - **App logo**: (Optional) Skip for now
5. Click **Save and Continue**
6. **Scopes**: Click **Save and Continue** (no additional scopes needed)
7. **Test users**: 
   - Click **Add Users**
   - Add your Gmail address (the one you'll use to test)
   - Click **Save and Continue**
8. Click **Back to Dashboard**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter name: `Productivity App Web Client`
5. **Authorized JavaScript origins**:
   - Click **Add URI**
   - Add: `http://localhost:5173` (for local development)
   - Click **Add URI** again
   - Add your Supabase project URL: `https://your-project-id.supabase.co`
6. **Authorized redirect URIs**:
   - Click **Add URI**
   - Add: `https://your-project-id.supabase.co/auth/v1/callback`
   
   ⚠️ **Important**: Replace `your-project-id` with your actual Supabase project ID
   
7. Click **Create**
8. You'll see a popup with your credentials:
   - **Client ID**: Copy this (looks like: `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret**: Copy this
9. Click **OK**

### Step 5: Add Google OAuth to Supabase

1. Go back to your **Supabase dashboard**
2. Click **Authentication** in the left sidebar
3. Click **Providers** tab
4. Find **Google** in the list
5. Toggle it **ON** (enable it)
6. Fill in the fields:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
7. Click **Save**

### Step 6: Add Your Email as a Test User (If Needed)

1. Still in Supabase, go to **Authentication** → **Policies** 
2. Or go to **Table Editor** → **auth.users**
3. Your user will be automatically created when you first sign in

---

## Part 4: Test the Setup

### Step 1: Restart Development Server

1. Stop the current `pnpm dev` server (if running) by pressing Ctrl+C in the terminal
2. Start it again:
   ```bash
   pnpm dev
   ```

### Step 2: Open the App

1. Open your browser to [http://localhost:5173](http://localhost:5173)
2. You should see the **Login Page** with:
   - App title and icon
   - "Sign in with Google" button

### Step 3: Sign In

1. Click **Sign in with Google**
2. You'll be redirected to Google's sign-in page
3. Select your Google account (must be one you added as a test user)
4. Review permissions and click **Continue**
5. You'll be redirected back to the app
6. You should now see the **Today View** with navigation tabs

### Step 4: Verify Authentication

1. Check the top-right corner - you should see your profile picture
2. Try navigating between tabs: Today, Inbox, Due Soon, etc.
3. Try creating a task in the Inbox view
4. Check Supabase → **Table Editor** → **tasks** - your task should appear!

---

## Troubleshooting

### Problem: "Missing Supabase environment variables"
- **Solution**: Make sure `.env.local` exists and has the correct values
- Restart the dev server after creating/updating `.env.local`

### Problem: "Invalid redirect URI" error when signing in
- **Solution**: 
  1. Check Google Cloud Console → Credentials → Your OAuth Client
  2. Make sure `https://your-project-id.supabase.co/auth/v1/callback` is listed exactly
  3. Replace `your-project-id` with your actual project ID

### Problem: "Access blocked: This app's request is invalid"
- **Solution**:
  1. Make sure OAuth consent screen is configured
  2. Add yourself as a test user in Google Cloud Console
  3. Make sure Google+ API is enabled

### Problem: Redirected to login page after signing in
- **Solution**:
  1. Check browser console for errors (F12 → Console tab)
  2. Verify Supabase RLS policies are applied (run migration 03)
  3. Check Supabase → Authentication → Users - your user should appear

### Problem: Can't see data after creating tasks
- **Solution**:
  1. Check Supabase → Table Editor → Tasks
  2. Make sure all migrations ran successfully
  3. Check browser console for errors

### Problem: Database connection errors
- **Solution**:
  1. Verify API keys are correct in `.env.local`
  2. Check Supabase project is active (not paused)
  3. Free tier projects pause after 7 days of inactivity - click "Restore" if paused

---

## Next Steps

Once authentication is working:

1. **Create some courses** in the Courses view
2. **Add tasks** in the Inbox view
3. **Plan tasks for today** using the "Plan for Today" button
4. **Track daily metrics** in the Daily Log view
5. **Export data** from the Export view for ML analysis

---

## Security Notes

- ✅ The `anon` key is safe to use in your frontend (it's public)
- ❌ NEVER use `service_role` key in frontend code
- ✅ Row Level Security (RLS) policies protect your data
- ✅ Each user can only see/modify their own data
- ✅ OAuth tokens are managed securely by Supabase

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Need Help?** 
- Check browser console (F12) for detailed errors
- Check Supabase logs: Dashboard → Logs
- Verify all migration files ran successfully in SQL Editor
