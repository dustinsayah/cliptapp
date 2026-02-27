/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            CLIPT — Google Video Intelligence Service                    ║
 * ║                                                                          ║
 * ║  Handles all interactions with the Google Cloud Video Intelligence API. ║
 * ║  Used by the /api/classify-clips route and the video processing         ║
 * ║  pipeline in lib/videoProcessor.ts.                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── VERCEL / PRODUCTION DEPLOYMENT NOTE ─────────────────────────────────────
 *
 * On Vercel (and most serverless platforms), the filesystem is READ-ONLY.
 * The GOOGLE_APPLICATION_CREDENTIALS environment variable normally points to
 * a JSON key file on disk — but that file is never deployed to Vercel, so
 * the file-path approach WILL NOT WORK in production.
 *
 * SOLUTION: Store the entire contents of google-credentials.json as a single
 * environment variable called GOOGLE_CREDENTIALS_JSON in the Vercel dashboard.
 *
 * How to set it up:
 *   1. Open secrets/google-credentials.json.json in a text editor
 *   2. Select all (Ctrl+A / Cmd+A) and copy the entire JSON content
 *   3. Go to Vercel dashboard → your project → Settings → Environment Variables
 *   4. Add a new variable:
 *      Name:  GOOGLE_CREDENTIALS_JSON
 *      Value: paste the entire JSON (it will be a single long line)
 *   5. Also add: GOOGLE_CLOUD_PROJECT_ID = clipt-production
 *   6. Redeploy from Vercel dashboard → Deployments → Redeploy
 *
 * For LOCAL DEVELOPMENT, you do NOT need GOOGLE_CREDENTIALS_JSON.
 * Just ensure GOOGLE_APPLICATION_CREDENTIALS=./secrets/google-credentials.json.json
 * is set in .env.local and the file exists at that path.
 *
 * The getClient() function below handles both cases automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SERVER-SIDE ONLY — do not import from client components.
 */

import { VideoIntelligenceServiceClient } from "@google-cloud/video-intelligence";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a time in seconds to the protobuf Duration format.
 * e.g. 10.5s → { seconds: 10, nanos: 500000000 }
 */
function secondsToProto(seconds: number): { seconds: number; nanos: number } {
  const floor = Math.floor(seconds);
  return {
    seconds: floor,
    nanos: Math.round((seconds - floor) * 1_000_000_000),
  };
}

/**
 * Constructs an authenticated VideoIntelligenceServiceClient.
 *
 * Priority:
 *   1. GOOGLE_CREDENTIALS_JSON env var (Vercel / production — inline JSON)
 *   2. GOOGLE_APPLICATION_CREDENTIALS file path (local development)
 *
 * Throws if neither is configured.
 */
function getClient(): VideoIntelligenceServiceClient {
  const credJson    = process.env.GOOGLE_CREDENTIALS_JSON?.trim();
  const projectId   = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (credJson) {
    // Vercel / production path: inline JSON credentials
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(credJson) as Record<string, unknown>;
    } catch (e) {
      throw new Error(
        `GOOGLE_CREDENTIALS_JSON is set but could not be parsed as JSON: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
    return new VideoIntelligenceServiceClient({ credentials, projectId });
  }

  // Local dev path: GOOGLE_APPLICATION_CREDENTIALS file (auto-read by the SDK)
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const PLACEHOLDER_PATHS = ["", "/path/to/clipt-service-account.json", undefined];
  if (!credPath || PLACEHOLDER_PATHS.includes(credPath)) {
    throw new Error(
      "Google Video Intelligence not configured. " +
      "Set GOOGLE_CREDENTIALS_JSON (Vercel) or GOOGLE_APPLICATION_CREDENTIALS (local) " +
      "in your environment variables. See GOOGLE_CLOUD_SETUP.md."
    );
  }

  return new VideoIntelligenceServiceClient({ projectId });
}

/**
 * Returns true if Google credentials are configured in the current environment.
 * Does NOT verify the credentials are valid — use testGoogleConnection() for that.
 */
export function isGoogleConfigured(): boolean {
  const credJson = process.env.GOOGLE_CREDENTIALS_JSON?.trim();
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const PLACEHOLDER_PATHS = ["", "/path/to/clipt-service-account.json"];
  if (credJson) return true;
  if (credPath && !PLACEHOLDER_PATHS.includes(credPath)) return true;
  return false;
}

// ── Label → Play Type Mapping ─────────────────────────────────────────────────

interface LabelRule {
  keywords: string[];
  playType: string;
  sports?: string[];
}

const LABEL_RULES: LabelRule[] = [
  // ── Basketball ──────────────────────────────────────────────────────────
  {
    keywords: ["jump shot", "shooting", "basket", "layup", "lay up", "dunk", "three-point", "3-pointer", "three pointer", "score", "field goal"],
    playType: "Scoring Play",
    sports: ["Basketball"],
  },
  {
    keywords: ["pass", "assist"],
    playType: "Assist",
    sports: ["Basketball"],
  },
  {
    keywords: ["steal", "deflect", "intercept", "block", "blocked shot", "rejection"],
    playType: "Defensive Play",
    sports: ["Basketball"],
  },
  {
    keywords: ["rebound"],
    playType: "Rebound",
    sports: ["Basketball"],
  },
  {
    keywords: ["fast break", "transition", "sprint", "outlet"],
    playType: "Fast Break",
    sports: ["Basketball"],
  },
  {
    keywords: ["dribble", "ball handling", "ball-handling", "crossover"],
    playType: "Ball Handling",
    sports: ["Basketball"],
  },

  // ── Football ─────────────────────────────────────────────────────────────
  {
    keywords: ["touchdown", "end zone", "end-zone"],
    playType: "Touchdown",
    sports: ["Football"],
  },
  {
    keywords: ["tackle", "sack", "quarterback sack", "hit"],
    playType: "Tackle/Sack",
    sports: ["Football"],
  },
  {
    keywords: ["interception", "intercept", "pick six", "pick-six"],
    playType: "Interception",
    sports: ["Football"],
  },
  {
    keywords: ["pass", "throw", "catch", "reception", "first down", "caught"],
    playType: "Completion",
    sports: ["Football"],
  },
  {
    keywords: ["run", "rush", "carry", "running back", "handoff"],
    playType: "Run Play",
    sports: ["Football"],
  },

  // ── Lacrosse ─────────────────────────────────────────────────────────────
  {
    keywords: ["goal", "score"],
    playType: "Goal",
    sports: ["Lacrosse"],
  },
  {
    keywords: ["save", "goalie", "goalkeeper"],
    playType: "Save",
    sports: ["Lacrosse"],
  },
  {
    keywords: ["ground", "pickup", "pick up", "scoop"],
    playType: "Ground Ball",
    sports: ["Lacrosse"],
  },
  {
    keywords: ["pass", "assist"],
    playType: "Assist",
    sports: ["Lacrosse"],
  },

  // ── Soccer ───────────────────────────────────────────────────────────────
  {
    keywords: ["goal", "shot on goal", "shoot", "score"],
    playType: "Goal",
    sports: ["Soccer"],
  },
  {
    keywords: ["save", "goalkeeper save", "goalkeeping"],
    playType: "Save",
    sports: ["Soccer"],
  },
  {
    keywords: ["dribble", "dribbling"],
    playType: "Dribble",
    sports: ["Soccer"],
  },
  {
    keywords: ["header", "heading"],
    playType: "Header",
    sports: ["Soccer"],
  },
  {
    keywords: ["assist", "pass"],
    playType: "Assist",
    sports: ["Soccer"],
  },

  // ── Baseball ─────────────────────────────────────────────────────────────
  {
    keywords: ["home run", "homer", "grand slam"],
    playType: "Home Run",
    sports: ["Baseball"],
  },
  {
    keywords: ["strikeout", "strike out", "pitch", "pitching"],
    playType: "Strikeout",
    sports: ["Baseball"],
  },
  {
    keywords: ["catch", "fly ball", "pop up", "fielding"],
    playType: "Defensive Play",
    sports: ["Baseball"],
  },
  {
    keywords: ["hit", "single", "double", "triple", "batting"],
    playType: "Hit",
    sports: ["Baseball"],
  },

  // ── Universal (no sport filter) ──────────────────────────────────────────
  {
    keywords: ["defense", "defensive play", "stop", "guard"],
    playType: "Defensive Play",
  },
  {
    keywords: ["athletic", "agility", "speed", "acceleration"],
    playType: "Athletic Play",
  },
];

/**
 * Maps an array of detected label strings to a single Clipt play type.
 * Uses LABEL_RULES with optional sport filtering.
 * Returns "Great Play" if no label matches any rule.
 */
function labelsToPlayType(labels: string[], sport: string): string {
  const lower = labels.map((l) => l.toLowerCase());
  for (const rule of LABEL_RULES) {
    // Skip rules that don't apply to this sport
    if (rule.sports && !rule.sports.includes(sport)) continue;
    const matches = rule.keywords.some((kw) => lower.some((l) => l.includes(kw)));
    if (matches) return rule.playType;
  }
  return "Great Play";
}

// ── Exported Functions ────────────────────────────────────────────────────────

/**
 * Tests the Google Video Intelligence API connection.
 *
 * Makes a minimal API call with invalid input content. A successful credential
 * check returns an INVALID_ARGUMENT error (bad video data) rather than
 * PERMISSION_DENIED/UNAUTHENTICATED (bad credentials).
 *
 * Used by the admin panel /api/test-connections route.
 */
export async function testGoogleConnection(): Promise<{ success: boolean; message: string }> {
  // Check configuration before making any network call
  const credJson = process.env.GOOGLE_CREDENTIALS_JSON?.trim();
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const PLACEHOLDER_PATHS = ["", "/path/to/clipt-service-account.json"];

  if (!credJson && (!credPath || PLACEHOLDER_PATHS.includes(credPath))) {
    return {
      success: false,
      message: "Google credentials not configured. Set GOOGLE_CREDENTIALS_JSON in Vercel environment variables.",
    };
  }

  try {
    const client = getClient();

    // Send a minimal annotateVideo request with 1 byte of invalid content.
    // Valid credentials → Google returns INVALID_ARGUMENT (video can't be decoded).
    // Invalid credentials → Google returns PERMISSION_DENIED or UNAUTHENTICATED.
    try {
      await client.annotateVideo({
        inputContent: Buffer.from("x").toString("base64"),
        features: ["LABEL_DETECTION" as never],
      });
      // If this resolves without error (unlikely with 1-byte input), we're connected
      return { success: true, message: "Google Video Intelligence connected successfully." };
    } catch (apiErr) {
      const msg = (apiErr instanceof Error ? apiErr.message : String(apiErr)).toLowerCase();

      // These errors mean credentials are VALID — the API rejected our bad input, not our auth
      const validCredentialErrors = [
        "invalid_argument",
        "invalid argument",
        "could not decode",
        "bad video",
        "unsupported",
        "empty video",
        "failed to process",
        "unable to",
        "3 internal",           // generic internal errors also imply connection works
      ];
      if (validCredentialErrors.some((e) => msg.includes(e))) {
        return {
          success: true,
          message: "Google Video Intelligence — connected. Credentials are valid and API is reachable.",
        };
      }

      // These errors mean credentials are INVALID or there are permissions issues
      const authErrors = [
        "permission_denied",
        "permission denied",
        "unauthenticated",
        "invalid_grant",
        "invalid grant",
        "unauthorized",
        "could not load",
        "credentials",
        "access denied",
        "forbidden",
      ];
      if (authErrors.some((e) => msg.includes(e))) {
        return {
          success: false,
          message: `Authentication failed: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`,
        };
      }

      // Unknown error — still likely connected if we made a network call
      return {
        success: false,
        message: `API error: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`,
      };
    }
  } catch (initErr) {
    // getClient() threw — credentials not configured or JSON parse failed
    return {
      success: false,
      message: initErr instanceof Error ? initErr.message : String(initErr),
    };
  }
}

/**
 * Classifies a single video clip segment using Google Video Intelligence
 * LABEL_DETECTION.
 *
 * @param videoUrl  - Public HTTP/HTTPS URL or gs:// GCS URI of the video.
 *                    Note: YouTube URLs are NOT directly supported by the API.
 * @param startTime - Clip start in seconds.
 * @param endTime   - Clip end in seconds.
 * @param sport     - Athlete's sport for label→playType mapping.
 * @param position  - Athlete's position (reserved for future model tuning).
 *
 * @returns { playType, confidence, rawLabels }
 *   - playType: Clipt play type string mapped from detected labels.
 *   - confidence: Average confidence across all detected labels (0–1).
 *   - rawLabels: All detected label strings for debugging.
 *
 * Never throws — returns fallback values { "Great Play", 0.5, [] } on any error.
 */
export async function classifyClipPlayType(
  videoUrl: string,
  startTime: number,
  endTime: number,
  sport: string,
  _position: string
): Promise<{ playType: string; confidence: number; rawLabels: string[] }> {
  const FALLBACK = { playType: "Great Play", confidence: 0.5, rawLabels: [] };

  if (!isGoogleConfigured()) {
    return FALLBACK;
  }

  try {
    const client = getClient();

    console.log(
      `[GVI] classifyClipPlayType: ${sport} clip ${startTime}s–${endTime}s — ${videoUrl.slice(0, 60)}...`
    );

    const [operation] = await client.annotateVideo({
      inputUri: videoUrl,
      features: ["LABEL_DETECTION" as never],
      videoContext: {
        segments: [
          {
            startTimeOffset: secondsToProto(startTime),
            endTimeOffset: secondsToProto(endTime),
          },
        ],
        labelDetectionConfig: {
          labelDetectionMode: "SHOT_AND_FRAME_MODE" as never,
          stationaryCamera: false,
        },
      },
    });

    console.log(`[GVI] Waiting for operation to complete...`);
    const [result] = await operation.promise();
    const annotations = result.annotationResults?.[0];

    // Gather all label entity descriptions + their confidence scores
    const labelEntries: Array<{ description: string; confidence: number }> = [];

    // Segment-level labels
    for (const ann of annotations?.segmentLabelAnnotations ?? []) {
      const desc = ann.entity?.description;
      if (!desc) continue;
      // Use the first segment's confidence score, or fall back to 0.7
      const conf = Number(ann.segments?.[0]?.confidence ?? 0.7);
      labelEntries.push({ description: desc, confidence: conf });
    }

    // Frame-level labels (aggregate by entity)
    const frameMap = new Map<string, number[]>();
    for (const ann of annotations?.frameLabelAnnotations ?? []) {
      const desc = ann.entity?.description;
      if (!desc) continue;
      const confs = (ann.frames ?? []).map((f) => Number(f.confidence ?? 0.5));
      if (confs.length > 0) {
        const existing = frameMap.get(desc) ?? [];
        frameMap.set(desc, [...existing, ...confs]);
      }
    }
    for (const [desc, confs] of frameMap) {
      const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
      labelEntries.push({ description: desc, confidence: avg });
    }

    if (labelEntries.length === 0) {
      console.log(`[GVI] No labels detected for clip ${startTime}s–${endTime}s`);
      return FALLBACK;
    }

    const rawLabels = labelEntries.map((e) => e.description);
    const avgConfidence =
      labelEntries.reduce((sum, e) => sum + e.confidence, 0) / labelEntries.length;
    const playType = labelsToPlayType(rawLabels, sport);

    console.log(`[GVI] Clip ${startTime}s–${endTime}s → ${playType} (labels: ${rawLabels.slice(0, 5).join(", ")})`);

    return {
      playType,
      confidence: Math.round(avgConfidence * 100) / 100,
      rawLabels,
    };
  } catch (err) {
    console.error(`[GVI] classifyClipPlayType error (${startTime}s–${endTime}s):`, err);
    return FALLBACK;
  }
}

// ── Clip input type ───────────────────────────────────────────────────────────

export interface ClipForClassification {
  videoUrl: string;
  startTime: number;
  endTime: number;
  [key: string]: unknown;
}

export interface EnrichedClip extends ClipForClassification {
  playType: string;
  confidence: number;
  rawLabels?: string[];
}

/**
 * Classifies all clips sequentially (to respect API rate limits) using
 * Google Video Intelligence LABEL_DETECTION.
 *
 * Each clip must have { videoUrl, startTime, endTime }.
 * All other fields on the clip object are preserved in the returned array.
 *
 * Falls back gracefully — if Google API is not configured, each clip gets
 * playType "Great Play" with confidence 0.5.
 *
 * @param clips     - Array of clip objects with at minimum videoUrl, startTime, endTime.
 * @param sport     - Sport for label→playType mapping.
 * @param position  - Position (reserved for future use).
 */
export async function classifyAllClips(
  clips: ClipForClassification[],
  sport: string,
  position: string
): Promise<EnrichedClip[]> {
  if (clips.length === 0) return [];

  if (!isGoogleConfigured()) {
    console.log(
      "[GVI] classifyAllClips: Google API not configured — returning clips with default play types."
    );
    return clips.map((clip) => ({ ...clip, playType: "Great Play", confidence: 0.5 }));
  }

  console.log(
    `[GVI] classifyAllClips: classifying ${clips.length} clips (sport: ${sport}, position: ${position})`
  );

  const enriched: EnrichedClip[] = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    console.log(`[GVI] Classifying clip ${i + 1}/${clips.length} (${clip.startTime}s–${clip.endTime}s)...`);
    const result = await classifyClipPlayType(
      clip.videoUrl,
      clip.startTime,
      clip.endTime,
      sport,
      position
    );
    enriched.push({
      ...clip,
      playType: result.playType,
      confidence: result.confidence,
      rawLabels: result.rawLabels,
    });
  }

  console.log(`[GVI] classifyAllClips: complete — ${enriched.length} clips classified.`);
  return enriched;
}
