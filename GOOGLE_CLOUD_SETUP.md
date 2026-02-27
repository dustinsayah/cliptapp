# Google Video Intelligence API — Setup Guide

This guide walks you through enabling the Google Video Intelligence API so Clipt can automatically classify each clip segment (e.g. "Scoring Play", "Defensive Play") using machine learning.

---

## Cost Information

> **Important:** Google Video Intelligence API is a paid service.
>
> - **Price:** ~$0.10 per minute of video analyzed
> - **Example:** A 5-minute game film = **$0.50 per submission**
> - Set up a **billing alert at $50** to avoid unexpected charges (instructions below)

---

## Step-by-Step Setup

### 1. Go to Google Cloud Console

Open [console.cloud.google.com](https://console.cloud.google.com) and sign in with your Google account.

---

### 2. Create a New Project

1. Click the project dropdown at the top of the page
2. Click **"New Project"**
3. Name it **`clipt-production`**
4. Click **"Create"**
5. Wait for the project to be created, then select it

---

### 3. Enable the Video Intelligence API

1. Go to **APIs & Services → Library** (left sidebar)
2. Search for **"Video Intelligence API"**
3. Click on **"Cloud Video Intelligence API"**
4. Click **"Enable"**

---

### 4. Enable Billing

1. Go to **Billing** (left sidebar)
2. Link a billing account to the project
3. If you don't have one, create one with a credit card

**Set up a billing alert (strongly recommended):**
1. Go to **Billing → Budgets & Alerts**
2. Click **"Create Budget"**
3. Set scope to your `clipt-production` project
4. Set amount to **$50**
5. Set alerts at 50%, 90%, and 100% of the budget
6. Add your email for notifications

---

### 5. Create a Service Account

1. Go to **IAM & Admin → Service Accounts** (left sidebar)
2. Click **"Create Service Account"**
3. Name: `clipt-video-intelligence`
4. Description: `Clipt AI clip classification service`
5. Click **"Create and Continue"**
6. In the "Grant this service account access" step, add the role:
   - **Cloud Video Intelligence → Cloud Video Intelligence API User**
7. Click **"Continue"** then **"Done"**

---

### 6. Download the JSON Key File

1. Click on the service account you just created (`clipt-video-intelligence@...`)
2. Go to the **"Keys"** tab
3. Click **"Add Key" → "Create new key"**
4. Choose **"JSON"** format
5. Click **"Create"** — a JSON file will download automatically
6. Store it somewhere safe (e.g. `~/.credentials/clipt-service-account.json`)
   > **Never commit this file to Git!** Add it to `.gitignore`.

---

### 7. Set Environment Variables

In your `.env.local` file (local development):

```bash
# Path to the JSON key file you downloaded
GOOGLE_APPLICATION_CREDENTIALS=/Users/yourname/.credentials/clipt-service-account.json

# Your Google Cloud project ID (visible on Cloud Console home page)
GOOGLE_CLOUD_PROJECT_ID=clipt-production
```

In **Vercel** (production):

> **Important:** On Vercel the filesystem is read-only, so the JSON file path does NOT work.
> Use the `GOOGLE_CREDENTIALS_JSON` variable instead — the app handles both automatically.

1. Open `secrets/google-credentials.json` in a text editor
2. Select all content (Ctrl+A / Cmd+A) and **copy the entire JSON**
3. Go to your Vercel project → **Settings → Environment Variables**
4. Add a new variable:
   - **Name:** `GOOGLE_CREDENTIALS_JSON`
   - **Value:** paste the entire JSON content (it will appear as one long line — that is correct)
   - Select environments: **Production**, **Preview**, **Development** (check all three)
5. Add another variable:
   - **Name:** `GOOGLE_CLOUD_PROJECT_ID`
   - **Value:** `clipt-production`
6. Click **Save** for each, then go to **Deployments → Redeploy** your latest deployment

> **Do NOT** add `GOOGLE_APPLICATION_CREDENTIALS` on Vercel — it won't work because the file is not deployed.
> The app checks for `GOOGLE_CREDENTIALS_JSON` first and automatically uses inline credentials on Vercel.

---

### 8. Test the Connection

Run this from your project root to verify the API is configured:

```bash
node -e "
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const client = new VideoIntelligenceServiceClient();
console.log('✓ Google Video Intelligence client initialized successfully');
console.log('Project:', process.env.GOOGLE_CLOUD_PROJECT_ID);
"
```

Or use the **Admin Panel** (`/admin`) → **"API Connections"** section → click **"Test All Connections"**.

This button calls `GET /api/test-connections` which tests both Supabase and Google Video Intelligence
simultaneously and shows a green checkmark or red error for each.

---

### 9. Test with a Real Video

Send a test request to the classify-clips API:

```bash
curl -X POST http://localhost:3000/api/classify-clips \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "gs://your-bucket/test-video.mp4",
    "clips": [
      { "startTime": 10, "endTime": 15, "confidence": 0.9 },
      { "startTime": 45, "endTime": 51, "confidence": 0.85 }
    ],
    "sport": "Basketball",
    "position": "Point Guard"
  }'
```

> **Note:** The `videoUrl` must be a public HTTP/HTTPS URL or a `gs://` Google Cloud Storage URI.
> YouTube URLs are **not** supported by the Video Intelligence API — the video must be accessible to Google's servers.

---

## Fallback Behavior

If `GOOGLE_APPLICATION_CREDENTIALS` is not configured or the API call fails:

- The `/api/classify-clips` route **falls back to mock classification** based on clip position in the array
- The review page shows a gray notice: *"Using estimated play labels — connect Google Video Intelligence for accurate classification."*
- The app continues to function normally — athletes can still review, keep, and build their reel

---

## When Farhan's Jersey Detection Script Is Ready

The Google Video Intelligence pipeline slots in at Layer 2:

1. **Layer 1 (Farhan's script):** Detects jersey number in each frame → outputs `{ startTime, endTime, confidence }[]`
2. **Layer 2 (this route):** Calls Google Video Intelligence on each clip segment → adds `playType`
3. **Layer 3 (review page):** Athlete reviews, approves, and reorders → saved as `reviewed_clips` in Supabase

To connect Layer 1, update `lib/videoProcessor.ts` to:
1. Call the jersey detection script with the video URL
2. Pass the resulting clips array to `POST /api/classify-clips`
3. Store the enriched clips in `result_clips` on the processing job row

---

## SQL: Add reviewed_clips Column to Supabase

Run this in **Supabase SQL Editor** (Dashboard → SQL Editor):

```sql
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS reviewed_clips JSONB;
```

This stores the clips the athlete kept after the review step, creating a permanent record of what was approved.
