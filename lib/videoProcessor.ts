/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║               CLIPT — AI VIDEO PROCESSING FOUNDATION                   ║
 * ║                                                                          ║
 * ║  This file contains the complete video processing pipeline.             ║
 * ║  It is structured so an AI engineer can plug in a computer vision       ║
 * ║  model at the clearly marked integration point below.                   ║
 * ║                                                                          ║
 * ║  Pipeline:  download → detectJersey → scoreClips → saveResults          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * SERVER-SIDE ONLY — do not import from client components.
 *
 * Dependencies:
 *   npm install ytdl-core       — YouTube stream downloading
 *   npm install fluent-ffmpeg   — Frame extraction (add when integrating CV model)
 */

// ─── NOTE ON YOUTUBE DOWNLOADING ────────────────────────────────────────────
// THIS REQUIRES youtube-dl or yt-dlp installed on the server, OR the
// ytdl-core npm package (already installed). ytdl-core works without a
// system dependency but has occasional breakages when YouTube changes its API.
//
// To use ytdl-core once the pipeline is ready:
//   import ytdl from 'ytdl-core';
//   const stream = ytdl(url, { quality: 'highestvideo' });
//   const chunks: Buffer[] = [];
//   for await (const chunk of stream) chunks.push(Buffer.from(chunk));
//   return Buffer.concat(chunks);
//
// Alternative: use yt-dlp-wrap (wraps the yt-dlp binary, more reliable):
//   https://github.com/foxesdocode/yt-dlp-wrap
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { sendProcessingCompleteEmail, sendProcessingFailedEmail } from "./emailService";
import { classifyAllClips, isGoogleConfigured, type ClipForClassification } from "./googleVideoIntelligence";

// ── Server-side Supabase client ───────────────────────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://placeholder.supabase.co" || key === "your-anon-key-here") {
    console.error("[videoProcessor] Supabase not configured — status updates will fail.");
    return null;
  }
  return createClient(url, key);
}

// ── Email notification helpers ────────────────────────────────────────────────

async function notifyEmailComplete(
  email: string,
  firstName: string,
  jerseyNumber: number,
  clipCount: number
): Promise<void> {
  if (!email?.trim()) return;
  try {
    // 1. Save email to waitlist so we have a record
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from("waitlist")
        .insert({ email: email.trim().toLowerCase(), source: "ai_processing_complete" });
      if (error && error.code !== "23505" && !error.message?.toLowerCase().includes("duplicate")) {
        console.error("[notifyEmailComplete] Waitlist insert error:", error.message);
      }
    }
    // 2. Send real email via Resend
    await sendProcessingCompleteEmail(email, firstName, jerseyNumber, clipCount);
  } catch (err) {
    console.error("[notifyEmailComplete] Unexpected error:", err);
  }
}

async function notifyEmailFailed(
  email: string,
  firstName: string,
  jerseyNumber: number,
  errorMessage: string
): Promise<void> {
  if (!email?.trim()) return;
  try {
    await sendProcessingFailedEmail(email, firstName, jerseyNumber, errorMessage);
  } catch (err) {
    console.error("[notifyEmailFailed] Unexpected error:", err);
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

/** A single detected highlight clip extracted from the game film */
export interface ClipResult {
  /** Timestamp in seconds where the clip starts */
  startTime: number;
  /** Timestamp in seconds where the clip ends */
  endTime: number;
  /** Model confidence score 0–1 that this clip contains the target jersey */
  confidence: number;
  /** Type of play detected, e.g. "touchdown", "dunk", "tackle", "reception" */
  playType: string;
  /** Whether the jersey number was clearly readable in this clip */
  jerseyVisible: boolean;
  /** Optional: CDN URL of a thumbnail frame from this clip */
  thumbnailUrl?: string;
}

/** A detected frame from jersey scanning — internal intermediate type */
interface DetectedFrame {
  /** Timestamp in seconds within the video */
  timestamp: number;
  /** Model confidence that the target jersey number is visible (0–1) */
  confidence: number;
}

/** Full processing job — mirrors the processing_jobs Supabase row */
export interface ProcessingJob {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  /** Hex code (e.g. "#FF0000") or color name (e.g. "royal blue") for HSV masking in the CV model */
  jerseyColor?: string;
  position: string;
  sport: string;
  school: string;
  videoUrl: string;
  source: "youtube" | "upload";
  status:
    | "queued"
    | "downloading"
    | "scanning"
    | "identifying"
    | "building"
    | "complete"
    | "failed";
  email?: string;
  resultClips?: ClipResult[];
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Updates job status in Supabase and logs to console */
async function updateJobStatus(
  jobId: string,
  status: ProcessingJob["status"],
  extra?: Partial<{ error_message: string; result_clips: ClipResult[] }>
): Promise<void> {
  console.log(`[Job ${jobId}] Status → ${status}`);
  const supabase = getSupabase();
  if (!supabase) {
    console.error(`[Job ${jobId}] Cannot update status — Supabase not configured`);
    return;
  }
  const { error } = await supabase
    .from("processing_jobs")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", jobId);

  if (error) {
    console.error(`[Job ${jobId}] Failed to update status in Supabase:`, error.message, error.code);
  }
}

// ── Step 1: Download ───────────────────────────────────────────────────────

/**
 * Downloads a video from a URL and returns it as a Buffer.
 *
 * For YouTube URLs: uses ytdl-core (stubbed — see integration notes above).
 * For direct video URLs: uses a standard fetch request.
 *
 * @param url - A YouTube URL or direct video file URL
 * @returns Buffer containing the raw video data
 */
export async function downloadVideo(url: string): Promise<Buffer> {
  const isYouTube =
    url.includes("youtube.com") || url.includes("youtu.be");

  if (isYouTube) {
    // ── YOUTUBE STUB ────────────────────────────────────────────────────────
    // TODO: Replace this stub with actual ytdl-core implementation.
    //
    // Example implementation:
    //   import ytdl from 'ytdl-core';
    //   const videoInfo = await ytdl.getInfo(url);
    //   const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestvideo' });
    //   const stream = ytdl(url, { format });
    //   const chunks: Buffer[] = [];
    //   await new Promise<void>((resolve, reject) => {
    //     stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    //     stream.on('end', resolve);
    //     stream.on('error', reject);
    //   });
    //   return Buffer.concat(chunks);
    //
    // Note: For production, consider yt-dlp-wrap for better reliability.
    // ───────────────────────────────────────────────────────────────────────
    console.warn("[downloadVideo] YouTube downloading is stubbed. Returning empty buffer.");
    // Simulate download time (~2s)
    await new Promise((r) => setTimeout(r, 2000));
    return Buffer.alloc(0);
  }

  // Direct video URL — fetch as binary
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch video from ${url}: HTTP ${response.status} ${response.statusText}`
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Step 2: Jersey Detection ──────────────────────────────────────────────

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    AI INTEGRATION POINT                                  ║
 * ║                                                                          ║
 * ║  Replace this function with your computer vision model.                  ║
 * ║                                                                          ║
 * ║  INPUT:                                                                   ║
 * ║    videoBuffer   — raw video file as a Node.js Buffer                    ║
 * ║    jerseyNumber  — integer jersey number to search for (e.g. 23)         ║
 * ║    sport         — sport context for model tuning ("Football", etc.)     ║
 * ║    jerseyColor   — hex code or color name for HSV masking ("#FF0000")    ║
 * ║                                                                          ║
 * ║  OUTPUT:                                                                  ║
 * ║    Array of { timestamp, confidence } where jersey was visible           ║
 * ║                                                                          ║
 * ║  RECOMMENDED IMPLEMENTATION APPROACH:                                    ║
 * ║    1. Extract frames at 2fps using ffmpeg:                                ║
 * ║       ffmpeg -i input.mp4 -vf fps=2 frame_%04d.jpg                       ║
 * ║       (use fluent-ffmpeg npm package for programmatic control)           ║
 * ║                                                                          ║
 * ║    2. Run each frame through a fine-tuned object detection model:        ║
 * ║       - YOLO v8 fine-tuned on jersey number detection works well         ║
 * ║       - Roboflow has pre-trained jersey number models you can use        ║
 * ║       - OpenAI Vision API can also read jersey numbers accurately        ║
 * ║                                                                          ║
 * ║    3. Filter detections where model confidence >= 0.7                    ║
 * ║                                                                          ║
 * ║    4. Return timestamps with confidence scores                           ║
 * ║                                                                          ║
 * ║  OPENAI VISION APPROACH (easiest to start):                              ║
 * ║    - Sample frame every 3 seconds                                        ║
 * ║    - Send to gpt-4o with prompt:                                         ║
 * ║      "Is jersey number {N} visible in this frame? Reply with             ║
 * ║       JSON: { visible: boolean, confidence: 0-1 }"                       ║
 * ║    - Use process.env.OPENAI_API_KEY (already configured in .env.local)   ║
 * ║                                                                          ║
 * ║  YOLO APPROACH (more accurate, faster at scale):                         ║
 * ║    - Fine-tune YOLOv8 on jersey number dataset from Roboflow             ║
 * ║    - Run inference on each frame                                         ║
 * ║    - Filter by class == jerseyNumber and confidence >= threshold         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
export async function detectJerseyInFrames(
  videoBuffer: Buffer,
  jerseyNumber: number,
  sport: string,
  jerseyColor: string = "#FFFFFF"
): Promise<DetectedFrame[]> {
  console.log(
    `[detectJerseyInFrames] STUB — scanning for jersey #${jerseyNumber} (${jerseyColor}) in ${sport} game film`
  );
  console.log(
    `[detectJerseyInFrames] Video buffer size: ${videoBuffer.length} bytes`
  );
  console.log(
    "[detectJerseyInFrames] ⚠️  Replace this stub with your CV model integration"
  );

  // ── STUB: Simulate 5-second processing time (~10s total pipeline) ──
  await new Promise((r) => setTimeout(r, 5000));

  // Mock detected frames — replace with actual model output
  const mockDetections: DetectedFrame[] = [
    { timestamp: 8.4, confidence: 0.92 },
    { timestamp: 9.1, confidence: 0.88 },
    { timestamp: 9.8, confidence: 0.91 },
    { timestamp: 23.2, confidence: 0.85 },
    { timestamp: 24.0, confidence: 0.79 },
    { timestamp: 38.6, confidence: 0.94 },
    { timestamp: 39.3, confidence: 0.96 },
    { timestamp: 40.1, confidence: 0.93 },
    { timestamp: 40.8, confidence: 0.88 },
    { timestamp: 55.5, confidence: 0.82 },
    { timestamp: 56.2, confidence: 0.87 },
    { timestamp: 72.1, confidence: 0.91 },
    { timestamp: 72.8, confidence: 0.89 },
    { timestamp: 73.5, confidence: 0.93 },
    { timestamp: 74.2, confidence: 0.9 },
    { timestamp: 89.0, confidence: 0.77 },
    { timestamp: 89.7, confidence: 0.81 },
    { timestamp: 103.3, confidence: 0.95 },
    { timestamp: 104.0, confidence: 0.97 },
    { timestamp: 104.7, confidence: 0.94 },
    { timestamp: 105.4, confidence: 0.91 },
  ];

  return mockDetections;
}

// ── Step 3: Score and Rank ────────────────────────────────────────────────

/**
 * Groups detected jersey frames into discrete plays, scores each play,
 * and returns the top 10 clips sorted by score descending.
 *
 * Grouping logic: frames within 5 seconds of each other belong to the same play.
 * Score = average confidence × clamped duration factor (favors 4–8 second plays).
 */
export async function scoreAndRankClips(
  detections: DetectedFrame[],
  sport: string
): Promise<ClipResult[]> {
  if (detections.length === 0) return [];

  const sorted = [...detections].sort((a, b) => a.timestamp - b.timestamp);
  const plays: DetectedFrame[][] = [];
  let currentPlay: DetectedFrame[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    if (gap <= 5) {
      currentPlay.push(sorted[i]);
    } else {
      plays.push(currentPlay);
      currentPlay = [sorted[i]];
    }
  }
  plays.push(currentPlay);

  const PLAY_TYPES: Record<string, string[]> = {
    Football: ["Touchdown Pass", "Big Run", "Deep Ball Catch", "Key Block", "Interception"],
    Basketball: ["Mid Range Jumper", "Drive to Basket", "Defensive Stop", "Three Pointer", "Fast Break"],
    Baseball: ["Home Run", "Strikeout", "Stolen Base", "Double Play", "Clutch Hit"],
    Soccer: ["Goal", "Key Save", "Assist", "Defensive Stop", "Counter Attack"],
    default: ["Highlight Play", "Key Moment", "Big Play", "Athletic Play", "Score"],
  };

  const playTypes = PLAY_TYPES[sport] ?? PLAY_TYPES.default;

  const clips: ClipResult[] = plays.map((frames, i) => {
    const avgConfidence =
      frames.reduce((sum, f) => sum + f.confidence, 0) / frames.length;
    const rawStart = frames[0].timestamp;
    const rawEnd = frames[frames.length - 1].timestamp;

    // Pad start/end to capture context around the play
    const startTime = Math.max(0, rawStart - 1.5);
    const endTime = rawEnd + 2.0;
    const duration = endTime - startTime;

    // Score: confidence weighted by duration (sweet spot 4–8s)
    const durationFactor = Math.min(duration / 6, 1);
    const score = avgConfidence * 0.7 + durationFactor * 0.3;

    return {
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      confidence: Math.round(avgConfidence * 100) / 100,
      playType: playTypes[i % playTypes.length],
      jerseyVisible: avgConfidence >= 0.8,
      score,
    };
  });

  // Sort by score, take top 10
  return clips
    .sort((a, b) => (b as typeof b & { score: number }).score - (a as typeof a & { score: number }).score)
    .slice(0, 10)
    .map(({ ...clip }) => {
      // Remove internal score field before returning
      const { score: _score, ...publicClip } = clip as ClipResult & { score: number };
      void _score;
      return publicClip;
    });
}

// ── Step 4: Orchestrator ──────────────────────────────────────────────────

/**
 * Full processing pipeline for a single job.
 * Downloads the video → scans for jersey → scores clips → saves results to Supabase.
 *
 * This function is intended to be called without await (fire-and-forget) from
 * the API route so the HTTP response can return immediately.
 *
 * ⚠️  PRODUCTION NOTE: In a production deployment on Vercel or other serverless
 * platforms, the Node.js process is terminated after the HTTP response. This
 * means fire-and-forget won't work. Use one of these approaches instead:
 *   • Vercel: Vercel Cron + Supabase queue table
 *   • Self-hosted: BullMQ + Redis
 *   • Simple: Trigger.dev, Inngest, or similar managed queue
 */
export async function processVideo(job: ProcessingJob): Promise<void> {
  const { id: jobId, videoUrl, jerseyNumber, sport, jerseyColor = "#FFFFFF" } = job;

  try {
    // Step 1: Download
    await updateJobStatus(jobId, "downloading");
    const videoBuffer = await downloadVideo(videoUrl);

    // Step 2: Scan for jersey (jersey color passed for HSV masking in CV model)
    await updateJobStatus(jobId, "scanning");
    const detectedFrames = await detectJerseyInFrames(
      videoBuffer,
      jerseyNumber,
      sport,
      jerseyColor
    );

    // Step 3: Score and rank
    await updateJobStatus(jobId, "identifying");
    const rankedClips = await scoreAndRankClips(detectedFrames, sport);

    // Step 3.5: Enrich clip play types with Google Video Intelligence
    //
    // If Google API is configured → classify each clip using LABEL_DETECTION.
    // If not configured or API fails → keep the mock play types from scoreAndRankClips.
    let clips: ClipResult[];
    if (isGoogleConfigured()) {
      console.log(`[Job ${jobId}] Using Google Video Intelligence for play classification`);
      try {
        const clipsForClassification: ClipForClassification[] = rankedClips.map((c) => ({
          ...c,
          videoUrl: job.videoUrl,
        }));
        const enriched = await classifyAllClips(clipsForClassification, sport, job.position ?? "");
        clips = enriched.map((c) => ({
          startTime:      c.startTime,
          endTime:        c.endTime,
          confidence:     c.confidence,
          playType:       c.playType,
          jerseyVisible:  typeof c.jerseyVisible === "boolean" ? c.jerseyVisible : true,
          thumbnailUrl:   typeof c.thumbnailUrl === "string"   ? c.thumbnailUrl : undefined,
        }));
        console.log(`[Job ${jobId}] Google Video Intelligence classification complete.`);
      } catch (gviErr) {
        console.error(`[Job ${jobId}] Google Video Intelligence failed — falling back to mock play types:`, gviErr);
        clips = rankedClips;
      }
    } else {
      console.log(`[Job ${jobId}] Using mock play types — Google API not configured`);
      clips = rankedClips;
    }

    // Step 4: Simulate reel assembly (~2s)
    await updateJobStatus(jobId, "building");
    await new Promise((r) => setTimeout(r, 2000));

    // Step 5: Save results
    await updateJobStatus(jobId, "complete", { result_clips: clips });
    console.log(`[Job ${jobId}] ✓ Complete — ${clips.length} clips found`);

    // Step 5: Notify athlete via email (Supabase record + Resend)
    if (job.email) {
      await notifyEmailComplete(job.email, job.firstName, job.jerseyNumber, clips.length);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown processing error";
    console.error(`[Job ${jobId}] ✗ Failed:`, message);
    await updateJobStatus(jobId, "failed", { error_message: message });
    // Send failure notification email
    if (job.email) {
      await notifyEmailFailed(job.email, job.firstName, job.jerseyNumber, message);
    }
  }
}
