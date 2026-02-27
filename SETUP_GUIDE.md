# Clipt — Production Setup Guide

This guide covers everything you need to configure to get Clipt fully working in production on Vercel.

---

## 1. Environment Variables

### What they are
Environment variables are secret configuration values that your app needs to connect to external services. They are **never committed to git** — `.env.local` is for local development only. You must add them separately in Vercel for the live site to work.

### Required Variables

| Variable | Service | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Project Settings → API → Project API keys → anon public |
| `RESEND_API_KEY` | Resend | resend.com/api-keys |
| `VIDEO_PROCESSING_WEBHOOK_SECRET` | Your own | Generate with `openssl rand -hex 32` |
| `OPENAI_API_KEY` | OpenAI | platform.openai.com/api-keys |

### Adding Variables in Vercel (Production)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project (the reelapp deployment)
3. Click **Settings** in the top navigation
4. Click **Environment Variables** in the left sidebar
5. For each variable:
   - Click **Add New**
   - Enter the **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the **Value** (paste your actual key/URL)
   - Select which environments it applies to: **Production**, **Preview**, **Development** (check all three)
   - Click **Save**
6. After adding all variables, go to **Deployments** and click **Redeploy** on your latest deployment to pick up the new variables

> **Important:** Vercel does NOT automatically pick up new environment variables in existing deployments. You must redeploy after adding or changing them.

### Local Development (.env.local)

Your `.env.local` file already has placeholders. Replace `your-anon-key-here` and `your-resend-api-key-here` with real values for local testing. This file is in `.gitignore` — never commit it.

---

## 2. Supabase Setup (Full SQL)

Run **all of this SQL** in Supabase Dashboard → SQL Editor → New query → Run.

You can safely run this multiple times — the `IF NOT EXISTS` and `CREATE OR REPLACE` clauses prevent errors on re-runs.

```sql
-- ═══════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS processing_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      TEXT,
  last_name       TEXT,
  jersey_number   INTEGER,
  position        TEXT,
  sport           TEXT,
  school          TEXT,
  video_url       TEXT,
  source          TEXT        DEFAULT 'youtube',
  status          TEXT        DEFAULT 'queued',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  result_clips    JSONB,
  error_message   TEXT,
  email           TEXT,
  queue_position  INTEGER     DEFAULT 0
);

CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        UNIQUE,
  source     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- ADD QUEUE_POSITION (safe if column already exists)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS queue_position INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger to ensure it's current
DROP TRIGGER IF EXISTS update_processing_jobs_updated_at ON processing_jobs;
CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

-- processing_jobs
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert"  ON processing_jobs;
DROP POLICY IF EXISTS "Allow public select"  ON processing_jobs;
DROP POLICY IF EXISTS "Allow public update"  ON processing_jobs;

CREATE POLICY "Allow public insert"  ON processing_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select"  ON processing_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public update"  ON processing_jobs FOR UPDATE USING (true);

-- waitlist
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert" ON waitlist;
DROP POLICY IF EXISTS "Allow public select" ON waitlist;

CREATE POLICY "Allow public insert" ON waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON waitlist FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════
-- ENABLE REALTIME
-- (so status polling can eventually be replaced with subscriptions)
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
```

---

## 3. Resend Email Setup

1. Create a free account at [resend.com](https://resend.com)
2. Go to **API Keys** → Create API Key → copy the key
3. Add `RESEND_API_KEY=re_...` to `.env.local` for local dev
4. Add `RESEND_API_KEY` to Vercel environment variables (see section 1)
5. **Verify your sending domain** in Resend → Domains for production emails
   - Until verified, Resend sends from `onboarding@resend.dev` (test only)
   - For production, add your domain (e.g., `cliptapp.com`) and follow the DNS verification steps
6. Update `FROM_ADDRESS` in `lib/emailService.ts` to match your verified domain

---

## 4. Verify API Routes Are Working

After deployment, test these URLs:

```
GET  https://your-domain.vercel.app/api/process-video
```

Should return: `{ "ok": true, "env": { "supabase": true, "resend": true } }`

If `supabase: false` — your Supabase env vars are missing or wrong in Vercel.
If `resend: false` — add `RESEND_API_KEY` to Vercel environment variables.

---

## 5. Supabase Realtime (for future live updates)

To use realtime subscriptions instead of polling in the future:

1. In Supabase Dashboard → **Database** → **Replication**
2. Enable realtime for the `processing_jobs` table if not already done via SQL above
3. In your Next.js code, subscribe with:

```typescript
const channel = supabase
  .channel('job-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'processing_jobs',
    filter: `id=eq.${jobId}`,
  }, (payload) => {
    console.log('Job updated:', payload.new);
  })
  .subscribe();

// Clean up
return () => supabase.removeChannel(channel);
```

---

## 6. Health Check Before Launch

- [ ] Visit `/api/process-video` and confirm `{ ok: true, env: { supabase: true } }`
- [ ] Submit a test video from `/process` and confirm it appears in `/admin`
- [ ] Check that status updates from `queued` → `complete` appear in `/admin`
- [ ] Test the history page at `/history` with a real email
- [ ] Verify a processing complete email is received (requires Resend key + verified domain)
- [ ] Test mobile view of `/process` at 375px width

---

## 7. Production Checklist

- [ ] All 5 environment variables added in Vercel
- [ ] Supabase SQL fully run (including `queue_position` column)
- [ ] Resend domain verified
- [ ] Realtime enabled on `processing_jobs` table
- [ ] `/admin` route is NOT linked from any public nav or footer (stays secret)
- [ ] Real AI model plugged into `lib/videoProcessor.ts` at the `detectJerseyInFrames` stub

---

*See `AI_INTEGRATION_GUIDE.md` for the full ML engineer onboarding guide.*
