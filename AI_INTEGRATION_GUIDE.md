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
        ├─ Step 2: detectJerseyInFrames(buffer, jerseyNumber, sport, jerseyColor)  ← YOUR AI GOES HERE
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
When status === "complete" → clips saved to localStorage → navigate to /review (athlete approves clips) → /customize
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
  sport: string,            // "Basketball" | "Football" | etc.
  jerseyColor: string       // Hex code e.g. "#FF0000" or color name e.g. "royal blue"
): Promise<DetectedFrame[]>
```

### Python equivalent signature (for Farhan's jersey detection script)

```python
def detect_jersey_in_frames(
    video_url: str,
    jersey_number: int,
    jersey_color: str,  # hex code e.g. "#FF0000" or color name e.g. "royal blue"
    sport: str  # "basketball", "football", or "lacrosse"
) -> list[dict]
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

### Step 2: Color masking with `jersey_color`

Before running the number detector on each frame, apply a jersey color mask to dramatically reduce noise and improve accuracy. Convert the `jersey_color` hex code to an HSV range using OpenCV, create a binary mask that isolates only the regions matching the jersey color, and run number detection only within those masked regions.

**Why this matters:**
- A basketball court has many numbers (scoreboard, shot clock, opponent jerseys). Without color filtering, false positives are high.
- Restricting detection to the jersey color reduces the search region by ~90%, making the model faster and more accurate.

```python
import cv2
import numpy as np

def hex_to_hsv_range(hex_color: str, tolerance: int = 20) -> tuple:
    """Convert a hex color string to an HSV lower/upper bound pair for cv2.inRange."""
    hex_color = hex_color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    bgr = np.uint8([[[b, g, r]]])
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)[0][0]
    h, s, v = int(hsv[0]), int(hsv[1]), int(hsv[2])
    lower = np.array([max(0, h - tolerance), max(0, s - 60), max(0, v - 60)])
    upper = np.array([min(179, h + tolerance), min(255, s + 60), min(255, v + 60)])
    return lower, upper

def apply_jersey_color_mask(frame_bgr: np.ndarray, jersey_color: str) -> np.ndarray:
    """
    Step 2 — Convert jersey_color hex code to HSV range using OpenCV.
    Use this color range to create a mask that filters each frame to only
    the regions matching the jersey color. Run number detection only within
    these masked regions. This dramatically improves accuracy and speed.
    """
    hsv_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    lower, upper = hex_to_hsv_range(jersey_color)
    mask = cv2.inRange(hsv_frame, lower, upper)
    # Dilate mask slightly to capture jersey number digits near the color boundary
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.dilate(mask, kernel, iterations=2)
    # Apply mask: set non-jersey regions to black
    masked_frame = cv2.bitwise_and(frame_bgr, frame_bgr, mask=mask)
    return masked_frame
```

Use this before passing each frame to your YOLO or OCR model:

```python
masked = apply_jersey_color_mask(frame, jersey_color)
detections = model.predict(masked, jersey_number=jersey_number)
```

### Step 3: Frame extraction

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

### Step 4: Replace the stub

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
  sport: string,
  jerseyColor: string       // e.g. "#FF0000" — used by Python script for HSV masking
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
            jersey_color: jerseyColor,     // pass hex to model for HSV masking
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
  sport: string,
  jerseyColor: string       // e.g. "#FF0000" — include in prompt for better accuracy
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
                text: `Is jersey number ${jerseyNumber} (jersey color: ${jerseyColor}) clearly visible on a player in this ${sport} game footage? Focus on jerseys matching the specified color. Reply with JSON only: {"visible": boolean, "confidence": 0.0-1.0}`
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

## Example API Call — POST /api/process-video

This is the request the Clipt frontend sends when an athlete submits their film. The `jersey_color` field is now required and passed through the entire pipeline to the jersey detection model.

```bash
curl -X POST https://your-app.vercel.app/api/process-video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl":     "https://www.youtube.com/watch?v=example123",
    "firstName":    "Marcus",
    "lastName":     "Johnson",
    "jerseyNumber": 23,
    "jerseyColor":  "#0000FF",
    "position":     "Point Guard",
    "sport":        "Basketball",
    "school":       "Westlake High School",
    "email":        "marcus@example.com"
  }'
```

**Response (201 Created):**
```json
{
  "jobId": "a3f2c1d0-4b5e-6f7a-8b9c-0d1e2f3a4b5c",
  "status": "queued",
  "queuePosition": 1
}
```

The client then polls `GET /api/process-video/status?jobId=<jobId>` every 3–5 seconds until `status === "complete"`.

---

## How Completed Clips Flow Back to the Clipt UI

1. **processVideo** saves `result_clips` as JSONB to `processing_jobs.result_clips`
2. **GET /api/process-video/status** returns the full row including `result_clips`
3. **Client** saves clips to `localStorage.aiGeneratedClips` when status === "complete"
4. **Auto-navigation** fires after 2.5 seconds: `router.push("/review")`
5. **Review page** (`/review`) loads clips — athlete watches each clip, removes unwanted ones, drag-reorders, then clicks "Build My Reel"
6. **Build My Reel** saves kept clips back to Supabase as `reviewed_clips` JSONB, sets `localStorage.clipSource = "ai"`, navigates to `/customize`
7. **Customize page** reads `aiGeneratedClips` on mount
8. **AI banner** appears: "AI found N clips featuring jersey #XX"
9. **Clip cards** show gold "AI PICK" badge and confidence percentage
10. User can remove individual clips, reorder, or dismiss and use manual clips

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
