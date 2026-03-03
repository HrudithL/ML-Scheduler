# Quick Start Guide

## Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Supabase account created
- [ ] Google Cloud OAuth credentials

## 5-Minute Setup

### 1. Supabase Setup (2 min)
```bash
# 1. Go to https://supabase.com and create a new project
# 2. In SQL Editor, run these 4 migrations in order:
#    - src/database/migrations/01_initial_schema.sql
#    - src/database/migrations/02_indexes.sql
#    - src/database/migrations/03_rls_policies.sql
#    - src/database/migrations/04_computed_columns_view.sql
# 3. Go to Authentication > Providers > Enable Google
# 4. Add your Google OAuth credentials
```

### 2. Local Setup (2 min)
```bash
cd productivity-app

# Install dependencies
pnpm install

# Create .env.local
cp .env.example .env.local
# Edit .env.local and add your Supabase credentials

# Start dev server
pnpm dev
```

### 3. Test (1 min)
1. Open http://localhost:5173
2. Sign in with Google
3. Create a task
4. Done! 🎉

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm typecheck        # Check TypeScript errors

# Database
# Run migrations in Supabase SQL Editor (dashboard)
```

## Environment Variables

Create `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: **Supabase Dashboard > Project Settings > API**

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists
- Restart dev server after adding env vars

### Can't sign in
- Check Google OAuth is enabled in Supabase
- Verify redirect URLs match
- Check browser console for errors

### Database errors
- Make sure all 4 migrations ran successfully
- Check Supabase logs in dashboard

## File Structure (Key Files)

```
productivity-app/
├── src/
│   ├── components/views/   # 8 main views (Today, Inbox, etc.)
│   ├── services/           # TaskService (handles all mutations)
│   ├── lib/supabase.ts     # Supabase client
│   ├── lib/auth.tsx        # Auth context
│   └── database/migrations/ # SQL files (run these in Supabase)
├── .env.local              # YOUR credentials (create this)
├── SETUP_GUIDE.md          # Detailed setup instructions
└── PROJECT_SUMMARY.md      # Complete project overview
```

## What's Included

✅ **8 Views**: Today, Inbox, Due Soon, Blocked, Completed, Courses, Daily Log, Export  
✅ **Authentication**: Google OAuth via Supabase  
✅ **Event Logging**: Every task change logged for ML  
✅ **Risk Scoring**: Automated priority calculation  
✅ **Data Export**: CSV downloads for all tables  
✅ **TypeScript**: Full type safety  
✅ **Responsive**: Mobile-friendly design  

## Usage Flow

1. **Create Course** (optional)
   - Go to Courses tab
   - Click "New Course"
   - Fill in details

2. **Create Task**
   - Go to Inbox tab
   - Click "New Task"
   - Set priority, effort, deadline

3. **Schedule Task**
   - Click "Plan for Today"
   - Task appears in Today view

4. **Work on Task**
   - Click "Start ▶"
   - When done, click "Done ✅"

5. **Track Metrics**
   - Go to Daily Log
   - Set energy, focus, stress, sleep

6. **Export Data**
   - Go to Export tab
   - Download CSV for ML analysis

## Event Logging (Important!)

**All task changes are automatically logged** to `task_events` table.

This happens through `TaskService`:
- Never update tasks directly in UI
- Always use: `taskService.createTask()`, `taskService.updateTask()`, etc.
- Check `task_events` table in Supabase to verify logging

## ML-Ready Data

Export these tables for analysis:
1. **tasks**: Current task state
2. **task_events**: Complete change history
3. **daily_logs**: Daily metrics
4. **courses**: Course schedules

All data is timestamped in UTC, stored as proper types (no JSON blobs).

## Getting Help

- **Detailed Setup**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Architecture**: See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Supabase Docs**: https://supabase.com/docs
- **shadcn/ui Docs**: https://ui.shadcn.com

## Production Deployment

### Deploy to Vercel
```bash
# 1. Connect GitHub repo to Vercel
# 2. Add environment variables in Vercel dashboard:
#    VITE_SUPABASE_URL
#    VITE_SUPABASE_ANON_KEY
# 3. Update Supabase Auth redirect URLs to include your Vercel domain
# 4. Deploy!
```

### Update RLS Policies (Multi-User)
When ready for multiple users, replace the permissive policies with:
```sql
CREATE POLICY "Users can access their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);
```

## What's Next?

- [ ] Complete setup and test
- [ ] Create some tasks and verify event logging
- [ ] Log daily metrics
- [ ] Export data and check CSV format
- [ ] Start building ML models!

---

**Need more details?** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for comprehensive instructions.
