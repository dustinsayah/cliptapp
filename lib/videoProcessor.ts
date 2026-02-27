/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║               CLIPT — AI VIDEO PROCESSING FOUNDATION                   ║
 * ║                                                                          ║
 * ║  Pipeline:  download → detectJersey → scoreClips → saveResults          ║
 * ║                                                                          ║
 * ║  Status updates are written to jobStatusMap (in-memory).                ║
 * ║  The browser reads status via /api/process-video/status and writes      ║
 * ║  the final result back to Supabase directly — no server↔Supabase        ║
 * ║  network calls needed.                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * SERVER-SIDE ONLY — do not import from client components.
 */

import { sendProcessingCompleteEmail, sendProcessingFailedEmail } from "./emailService";
import { classifyAllClips, isGoogleConfigured, type ClipForClassification } from "./googleVideoIntelligence";

// ── In-memory job status map ──────────────────────────────────────────────────
// The browser polls /api/process-video/status which reads from this map.
// When the job is complete the browser writes the final status to Supabase directly.

export interface JobStatus {
  status: ProcessingJob["status"];
  resultClips?: ClipResult[];
  errorMessage?: string;
  queuePosition?: number;
}

export const jobStatusMap = new Map<string, JobStatus>();

// ── Email notification helpers ────────────────────────────────────────────────

async function notifyEmailComplete(
  email: string,
  firstName: string,
  jerseyNumber: number,
  clipCount: number
): Promise<void> {
  if (!email?.trim()) return;
  try {
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
  startTime: number;
  endTime: number;
  confidence: number;
  playType: string;
  jerseyVisible: boolean;
  thumbnailUrl?: string;
}

interface DetectedFrame {
  timestamp: number;
  confidence: number;
}

/** Full processing job — mirrors the processing_jobs Supabase row */
export interface ProcessingJob {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
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

/** Updates the in-memory status map — browser reads this via /api/process-video/status */
function updateJobStatus(
  jobId: string,
  status: ProcessingJob["status"],
  extra?: Partial<{ errorMessage: string; resultClips: ClipResult[] }>
): void {
  console.log(`[Job ${jobId}] Status → ${status}`);
  const current = jobStatusMap.get(jobId) ?? {};
  jobStatusMap.set(jobId, {
    ...current,
    status,
    ...(extra?.resultClips  ? { resultClips:  extra.resultClips  } : {}),
    ...(extra?.errorMessage ? { errorMessage: extra.errorMessage } : {}),
  });
}

// ── Step 1: Download ───────────────────────────────────────────────────────

export async function downloadVideo(url: string): Promise<Buffer> {
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  if (isYouTube) {
    // ── YOUTUBE STUB ────────────────────────────────────────────────────────
    // TODO: Replace with ytdl-core or yt-dlp-wrap implementation.
    // See AI_INTEGRATION_GUIDE.md for details.
    // ───────────────────────────────────────────────────────────────────────
    console.warn("[downloadVideo] YouTube downloading is stubbed. Returning empty buffer.");
    await new Promise((r) => setTimeout(r, 2000));
    return Buffer.alloc(0);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video from ${url}: HTTP ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Step 2: Jersey Detection ──────────────────────────────────────────────

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    AI INTEGRATION POINT                                  ║
 * ║  Replace this function with your computer vision model.                  ║
 * ║  See AI_INTEGRATION_GUIDE.md for full details.                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
export async function detectJerseyInFrames(
  videoBuffer: Buffer,
  jerseyNumber: number,
  sport: string,
  jerseyColor: string = "#FFFFFF"
): Promise<DetectedFrame[]> {
  console.log(`[detectJerseyInFrames] STUB — scanning for jersey #${jerseyNumber} (${jerseyColor}) in ${sport} game film`);
  console.log(`[detectJerseyInFrames] Video buffer size: ${videoBuffer.length} bytes`);
  console.log("[detectJerseyInFrames] ⚠️  Replace this stub with your CV model integration");

  await new Promise((r) => setTimeout(r, 5000));

  return [
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
}

// ── Step 3: Score and Rank ────────────────────────────────────────────────

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
    Football:   ["Touchdown Pass", "Big Run", "Deep Ball Catch", "Key Block", "Interception"],
    Basketball: ["Mid Range Jumper", "Drive to Basket", "Defensive Stop", "Three Pointer", "Fast Break"],
    Baseball:   ["Home Run", "Strikeout", "Stolen Base", "Double Play", "Clutch Hit"],
    Soccer:     ["Goal", "Key Save", "Assist", "Defensive Stop", "Counter Attack"],
    default:    ["Highlight Play", "Key Moment", "Big Play", "Athletic Play", "Score"],
  };

  const playTypes = PLAY_TYPES[sport] ?? PLAY_TYPES.default;

  const clips: ClipResult[] = plays.map((frames, i) => {
    const avgConfidence = frames.reduce((sum, f) => sum + f.confidence, 0) / frames.length;
    const rawStart = frames[0].timestamp;
    const rawEnd = frames[frames.length - 1].timestamp;
    const startTime = Math.max(0, rawStart - 1.5);
    const endTime = rawEnd + 2.0;
    const duration = endTime - startTime;
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

  return clips
    .sort((a, b) => (b as typeof b & { score: number }).score - (a as typeof a & { score: number }).score)
    .slice(0, 10)
    .map(({ ...clip }) => {
      const { score: _score, ...publicClip } = clip as ClipResult & { score: number };
      void _score;
      return publicClip;
    });
}

// ── Step 4: Orchestrator ──────────────────────────────────────────────────

/**
 * Full processing pipeline for a single job.
 * All status updates go to jobStatusMap (in-memory).
 * The browser reads status via /api/process-video/status and writes
 * the final result to Supabase directly.
 *
 * ⚠️  PRODUCTION NOTE: Fire-and-forget does not work reliably on Vercel
 * serverless because the process terminates after the HTTP response.
 * For production use Inngest, Trigger.dev, or a self-hosted queue.
 */
export async function processVideo(job: ProcessingJob): Promise<void> {
  const { id: jobId, videoUrl, jerseyNumber, sport, jerseyColor = "#FFFFFF" } = job;

  try {
    updateJobStatus(jobId, "downloading");
    const videoBuffer = await downloadVideo(videoUrl);

    updateJobStatus(jobId, "scanning");
    const detectedFrames = await detectJerseyInFrames(videoBuffer, jerseyNumber, sport, jerseyColor);

    updateJobStatus(jobId, "identifying");
    const rankedClips = await scoreAndRankClips(detectedFrames, sport);

    // Optional: Google Video Intelligence classification
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
          startTime:     c.startTime,
          endTime:       c.endTime,
          confidence:    c.confidence,
          playType:      c.playType,
          jerseyVisible: typeof c.jerseyVisible === "boolean" ? c.jerseyVisible : true,
          thumbnailUrl:  typeof c.thumbnailUrl  === "string"  ? c.thumbnailUrl  : undefined,
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

    updateJobStatus(jobId, "building");
    await new Promise((r) => setTimeout(r, 2000));

    updateJobStatus(jobId, "complete", { resultClips: clips });
    console.log(`[Job ${jobId}] ✓ Complete — ${clips.length} clips found`);

    if (job.email) {
      await notifyEmailComplete(job.email, job.firstName, job.jerseyNumber, clips.length);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown processing error";
    console.error(`[Job ${jobId}] ✗ Failed:`, message);
    updateJobStatus(jobId, "failed", { errorMessage: message });
    if (job.email) {
      await notifyEmailFailed(job.email, job.firstName, job.jerseyNumber, message);
    }
  }
}
