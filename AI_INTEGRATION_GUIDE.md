# Clipt AI Integration Guide

> **For the hired ML engineer.** This document explains exactly how to plug a real jersey-detection computer vision model into the Clipt processing pipeline. Read this once and you'll know exactly what to build.

---

## Pipeline Architecture Overview

```
User submits form (YouTube URL + athlete info)
        │
        ▼
POST /api/process-video
        │  Creates row in processing_jobs (status: queued)
        │  Returns jobId immediately
        ▼
lib/videoProcessor.ts → processVideo(job)  [fire-and-forget on Node.js]
        │
        ├─ Step 1: downloadVideo(url)           → Buffer
        │    └── Update status: "downloading"
        │
        ├─ Step 2: detectJerseyInFrames(buffer, jerseyNumber, sport)  ← YOUR AI GOES HERE
        │    └── Update status: "scanning"
        │
        ├─ Step 3: scoreAndRankClips(detections, sport)
        │    └── Update status: "identifying"
        │
        ├─ Step 4: Assembly delay
        │    └── Update status: "building"
        │
        └─ Step 5: Save to Supabase
             └── Update status: "complete", result_clips: JSON
                 + Insert email into waitlist table (source: "ai_processing_complete")

Client polls GET /api/process-video/status?jobId=UUID every 5 seconds
When status === "complete" → clips saved to localStorage → navigate to /customize
```

---

## The One File You Need to Modify

**`lib/videoProcessor.ts`**

Find the function `detectJerseyInFrames`. The entire stub implementation is between the double-box comment blocks:

```
╔══════════════════════════════════════╗
║        AI INTEGRATION POINT          ║
╚══════════════════════════════════════╝
```

Replace the stub body with your real model call. The function signature is:

```typescript
export async function detectJerseyInFrames(
  videoBuffer: Buffer,      // Raw video bytes (MP4, MOV, etc.)
  jerseyNumber: number,     // Integer 0–99: the target jersey number
  sport: string             // "Basketball" | "Football" | etc.
): Promise<DetectedFrame[]>
```

### Expected Output

```typescript
interface DetectedFrame {
  timestamp: number;   // Seconds into the video where this jersey was visible
  confidence: number;  // Model confidence score 0.0–1.0
}
```

**Example output:**
```json
[
  { "timestamp": 8.4,   "confidence": 0.92 },
  { "timestamp": 9.1,   "confidence": 0.88 },
  { "timestamp": 38.6,  "confidence": 0.94 },
  { "timestamp": 39.3,  "confidence": 0.96 },
  { "timestamp": 104.0, "confidence": 0.97 }
]
```

The `scoreAndRankClips` function (already implemented) will automatically:
- Group nearby timestamps into discrete plays (5-second gap = new play)
- Score each play by average confidence × duration factor
- Return the top 10 clips sorted by score
- Add sport-specific play type labels (e.g., "Touchdown Pass", "Three Pointer")

---

## Supabase Schema

### `processing_jobs` table

```sql
CREATE TABLE processing_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      TEXT,
  last_name       TEXT,
  jersey_number   INTEGER,
  position        TEXT,
  sport           TEXT,
  school          TEXT,
  video_url       TEXT,
  source          TEXT        DEFAULT 'youtube',  -- 'youtube' | 'upload'
  status          TEXT        DEFAULT 'queued',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  result_clips    JSONB,       -- Populated when status = 'complete'
  error_message   TEXT,        -- Populated when status = 'failed'
  email           TEXT
);
```

**Status progression:**
```
queued → downloading → scanning → identifying → building → complete
                                                          ↘ failed
```

### `waitlist` table

```sql
CREATE TABLE waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        UNIQUE,
  source     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

When a job completes, the athlete's email is automatically inserted with `source = "ai_processing_complete"`. This is the hook for future Resend email notifications (see `lib/videoProcessor.ts` → `notifyEmailComplete`).

---

## Environment Variables

Add these to `.env.local`:

```bash
# Required: Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For YouTube downloading (when integrating yt-dlp-wrap)
# No env var needed — install yt-dlp binary on server

# For Replicate (recommended GPU compute)
REPLICATE_API_TOKEN=r8_your_replicate_token

# For OpenAI Vision (easiest starting point)
OPENAI_API_KEY=sk-your-openai-key

# For Resend email notifications (future)
RESEND_API_KEY=re_your_resend_key
```

---

## Recommended Implementation: YOLOv8 on Replicate

This is the recommended approach. Takes about 4 hours to integrate end-to-end.

### Why YOLOv8 + Replicate?
- YOLOv8 is state-of-the-art for object detection — handles jersey numbers well
- Replicate provides pay-per-use GPU inference — no server infrastructure needed
- Fine-tuned sports jersey models exist on Roboflow's model hub

### Step 1: Get a fine-tuned jersey detection model

Option A — **Use Roboflow's pre-built model** (fastest, ~30 minutes):
1. Go to [roboflow.com/models](https://roboflow.com/models)
2. Search "jersey number detection"
3. Use the model directly via Roboflow's hosted API (no Replicate needed)

Option B — **Fine-tune YOLOv8 yourself** (most accurate, ~2 days of work):
1. Download a jersey number dataset from Roboflow Universe
2. Fine-tune `yolov8m.pt` on your dataset:
   ```python
   from ultralytics import YOLO
   model = YOLO("yolov8m.pt")
   model.train(data="jersey_dataset.yaml", epochs=100, imgsz=640)
   ```
3. Push the trained model to Replicate

### Step 2: Frame extraction

Install fluent-ffmpeg to extract frames from the video buffer:

```bash
npm install fluent-ffmpeg @types/fluent-ffmpeg
```

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function extractFrames(videoBuffer: Buffer, fps = 2): Promise<string[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipt-frames-'));
  const inputPath = path.join(tmpDir, 'input.mp4');
  fs.writeFileSync(inputPath, videoBuffer);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([`-vf fps=${fps}`, '-q:v 2'])
      .output(path.join(tmpDir, 'frame_%04d.jpg'))
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  const frames = fs.readdirSync(tmpDir)
    .filter(f => f.endsWith('.jpg'))
    .map(f => path.join(tmpDir, f));

  return frames.sort();  // returns sorted file paths
}
```

At 2fps, a 60-minute game film produces ~7,200 frames. Process in batches of 50.

### Step 3: Replace the stub

Here is the complete implementation for `detectJerseyInFrames` using Replicate:

```typescript
import Replicate from 'replicate';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function detectJerseyInFrames(
  videoBuffer: Buffer,
  jerseyNumber: number,
  sport: string
): Promise<DetectedFrame[]> {
  // 1. Extract frames at 2fps
  const framePaths = await extractFrames(videoBuffer, 2);
  const detections: DetectedFrame[] = [];

  // 2. Process frames in batches of 10 (Replicate rate limit)
  const BATCH_SIZE = 10;
  for (let i = 0; i < framePaths.length; i += BATCH_SIZE) {
    const batch = framePaths.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (framePath, batchIdx) => {
      const frameIndex = i + batchIdx;
      const timestamp = frameIndex / 2;  // 2fps → seconds

      const imageBase64 = fs.readFileSync(framePath).toString('base64');
      const imageUri = `data:image/jpeg;base64,${imageBase64}`;

      // Run YOLOv8 jersey detection on Replicate
      // Replace "owner/model:version" with your actual model ID
      const output = await replicate.run(
        "your-username/jersey-detector:your-version-hash",
        {
          input: {
            image: imageUri,
            jersey_number: jerseyNumber,
            confidence_threshold: 0.5,
          }
        }
      ) as { detections: Array<{ class: number; confidence: number }> };

      // Check if target jersey number was detected
      const match = output.detections?.find(
        d => d.class === jerseyNumber && d.confidence >= 0.65
      );
      if (match) {
        detections.push({ timestamp, confidence: match.confidence });
      }
    }));
  }

  // 3. Cleanup temp files
  framePaths.forEach(f => {
    try { fs.unlinkSync(f); } catch {}
  });

  return detections;
}
```

---

## Alternative: OpenAI Vision API (Easiest Start)

If you want to ship something in 2 hours without training a model:

```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function detectJerseyInFrames(
  videoBuffer: Buffer,
  jerseyNumber: number,
  sport: string
): Promise<DetectedFrame[]> {
  const framePaths = await extractFrames(videoBuffer, 1);  // 1fps for cost control
  const detections: DetectedFrame[] = [];

  // Process in batches of 5 to control API costs
  const BATCH_SIZE = 5;
  for (let i = 0; i < framePaths.length; i += BATCH_SIZE) {
    const batch = framePaths.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const framePath = batch[j];
      const frameIndex = i + j;
      const timestamp = frameIndex;  // 1fps → seconds

      const imageBase64 = fs.readFileSync(framePath).toString('base64');

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",  // Use mini for cost control — $0.15/1M tokens
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "low" }
              },
              {
                type: "text",
                text: `Is jersey number ${jerseyNumber} clearly visible on a player in this ${sport} game footage? Reply with JSON only: {"visible": boolean, "confidence": 0.0-1.0}`
              }
            ]
          }
        ],
        max_tokens: 60,
      });

      try {
        const result = JSON.parse(response.choices[0].message.content ?? '{}');
        if (result.visible && result.confidence >= 0.7) {
          detections.push({ timestamp, confidence: result.confidence });
        }
      } catch {
        // Parse error — skip this frame
      }
    }
  }

  return detections;
}
```

**Cost estimate for OpenAI Vision:** ~$0.02–0.08 per video at 1fps sampling.

---

## Cost Estimates (Per Video Processed)

| Approach | Cost per Video | Speed | Accuracy |
|----------|---------------|-------|----------|
| OpenAI gpt-4o-mini at 1fps (60 min game) | ~$0.05–$0.10 | ~8 min | Good |
| OpenAI gpt-4o at 1fps | ~$0.50–$2.00 | ~8 min | Excellent |
| Replicate YOLOv8 (fine-tuned) at 2fps | ~$0.30–$0.80 | ~3 min | Best |
| Roboflow hosted API at 2fps | ~$0.10–$0.30 | ~5 min | Very Good |
| Self-hosted GPU (A100) | ~$0.05–$0.15 | ~1 min | Best |

**Recommended starting point:** OpenAI gpt-4o-mini + 1fps sampling. Costs under $0.10/video, takes 2 hours to integrate, and provides good accuracy for a beta launch.

**Scale plan:** Once you hit 500+ videos/month, switch to a fine-tuned YOLOv8 on Replicate for 10x cost reduction and 3x speed improvement.

---

## How Completed Clips Flow Back to the Clipt UI

1. **processVideo** saves `result_clips` as JSONB to `processing_jobs.result_clips`
2. **GET /api/process-video/status** returns the full row including `result_clips`
3. **Client** saves clips to `localStorage.aiGeneratedClips` when status === "complete"
4. **Auto-navigation** fires after 2.5 seconds: `router.push("/customize")`
5. **Customize page** reads `aiGeneratedClips` on mount
6. **AI banner** appears: "AI found N clips featuring jersey #XX"
7. **Clip cards** show gold "AI PICK" badge and confidence percentage
8. User can remove individual clips or dismiss and use manual clips

### Expected `result_clips` JSON shape

```json
[
  {
    "startTime": 6.9,
    "endTime": 13.1,
    "confidence": 0.92,
    "playType": "Scoring Play",
    "jerseyVisible": true
  },
  {
    "startTime": 21.7,
    "endTime": 26.0,
    "confidence": 0.88,
    "playType": "Defensive Stop",
    "jerseyVisible": true
  }
]
```

The client-side `AiClip` interface (in `app/process/page.tsx`) augments this with `id`, `clipNumber`, `aiPicked: true`, `duration`, `jerseyNumber`, and `sport` fields before saving to localStorage.

---

## Production Deployment Notes

> ⚠️ The current fire-and-forget pattern only works on long-running Node.js servers. On Vercel serverless, the process terminates after the HTTP response.

For production, use one of:
- **Inngest** — easiest integration, manages retries automatically
- **Trigger.dev** — similar to Inngest, great DX
- **BullMQ + Redis** — classic job queue, self-hosted
- **Vercel Cron + Supabase queue** — serverless-compatible polling approach

The API route (`app/api/process-video/route.ts`) only needs to create the job and return the jobId. The actual processing happens in a separate worker that picks up `queued` jobs from Supabase.

---

## Questions?

Contact the Clipt engineering team or open an issue. The codebase is clean and well-commented — you should be able to read `lib/videoProcessor.ts` top-to-bottom in 10 minutes and understand exactly where everything plugs in.
