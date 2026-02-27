/**
 * POST /api/classify-clips
 *
 * Calls Google Video Intelligence API to classify each clip segment,
 * then maps returned labels to Clipt play types. Falls back to
 * position-order mock classification when the API is not configured.
 *
 * ── Supabase schema (run in Supabase SQL Editor) ─────────────────────────
 * ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS reviewed_clips JSONB;
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Request body:
 *   { videoUrl: string, clips: ClipInput[], sport: string, position: string, _testOnly?: boolean }
 *
 * ClipInput:
 *   { startTime: number, endTime: number, confidence: number }
 *
 * Response:
 *   { clips: EnrichedClip[], fallback?: boolean, fallbackReason?: string }
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Label → play type mapping ──────────────────────────────────────────────

const LABEL_MAP: Array<{ keywords: string[]; playType: string; sports?: string[] }> = [
  // Basketball
  { keywords: ["slam dunk", "dunk", "dunk shot"],                              playType: "Scoring Play",    sports: ["Basketball"] },
  { keywords: ["layup", "lay up", "lay-up"],                                   playType: "Scoring Play",    sports: ["Basketball"] },
  { keywords: ["jump shot", "three point", "3-pointer", "three-pointer", "basket", "field goal"], playType: "Scoring Play", sports: ["Basketball"] },
  { keywords: ["rebound", "offensive rebound", "defensive rebound"],           playType: "Rebound",         sports: ["Basketball"] },
  { keywords: ["block", "blocked shot", "rejection"],                          playType: "Block",           sports: ["Basketball"] },
  { keywords: ["fast break", "transition", "outlet pass"],                     playType: "Fast Break",      sports: ["Basketball"] },
  { keywords: ["steal", "deflection", "interception"],                         playType: "Defensive Play" },
  { keywords: ["assist", "pass", "assist pass"],                               playType: "Assist" },
  // Football
  { keywords: ["touchdown", "end zone", "score"],                              playType: "Touchdown",       sports: ["Football"] },
  { keywords: ["tackle", "sack", "quarterback sack"],                          playType: ["Tackle", "Sack"] as unknown as string, sports: ["Football"] },
  { keywords: ["sack", "quarterback sack"],                                    playType: "Sack",            sports: ["Football"] },
  { keywords: ["tackle"],                                                       playType: "Tackle",          sports: ["Football"] },
  { keywords: ["interception", "pick"],                                        playType: "Interception",    sports: ["Football"] },
  { keywords: ["reception", "catch", "first down"],                            playType: "Reception",       sports: ["Football"] },
  { keywords: ["run", "rush", "running back"],                                 playType: "Run Play",        sports: ["Football"] },
  // Soccer
  { keywords: ["goal", "shoot", "shot on goal"],                               playType: "Goal",            sports: ["Soccer"] },
  { keywords: ["save", "goalkeeper save", "goalkeeping"],                      playType: "Save",            sports: ["Soccer"] },
  { keywords: ["dribble", "dribbling"],                                        playType: "Dribble",         sports: ["Soccer"] },
  { keywords: ["header", "heading"],                                           playType: "Header",          sports: ["Soccer"] },
  // Baseball
  { keywords: ["home run", "homer", "grand slam"],                             playType: "Home Run",        sports: ["Baseball"] },
  { keywords: ["strikeout", "strike out", "pitch"],                            playType: "Strikeout",       sports: ["Baseball"] },
  { keywords: ["catch", "fly ball", "pop up"],                                 playType: "Defensive Play",  sports: ["Baseball"] },
  { keywords: ["hit", "single", "double", "triple"],                           playType: "Hit",             sports: ["Baseball"] },
  // Lacrosse
  { keywords: ["goal", "shot on goal", "score"],                               playType: "Goal",            sports: ["Lacrosse"] },
  { keywords: ["save", "goalkeeper"],                                           playType: "Save",            sports: ["Lacrosse"] },
  { keywords: ["ground ball", "scoop"],                                        playType: "Ground Ball",     sports: ["Lacrosse"] },
  // Universal
  { keywords: ["defense", "defensive play", "stop", "guard"],                  playType: "Defensive Play" },
  { keywords: ["athletic", "athletic play", "agility"],                        playType: "Athletic Play" },
];

function labelsToPlayType(labels: string[], sport: string): string {
  const lower = labels.map((l) => l.toLowerCase());
  for (const entry of LABEL_MAP) {
    if (entry.sports && !entry.sports.includes(sport)) continue;
    const matches = entry.keywords.some((kw) => lower.some((l) => l.includes(kw)));
    if (matches) {
      // Handle the tackle/sack dual case
      const pt = typeof entry.playType === "string" ? entry.playType : (entry.playType as string[])[0];
      // Special case: refine tackle vs sack
      if (pt === "Tackle" && lower.some((l) => l.includes("sack"))) return "Sack";
      return pt;
    }
  }
  return "Great Play";
}

// ── Fallback mock classifier ───────────────────────────────────────────────

const SPORT_PLAY_TYPES: Record<string, string[]> = {
  Basketball: ["Scoring Play", "Defensive Play", "Assist", "Rebound", "Block", "Fast Break", "Steal", "Great Play"],
  Football:   ["Touchdown", "Sack", "Interception", "Tackle", "Reception", "Run Play", "Defensive Play", "Great Play"],
  Soccer:     ["Goal", "Save", "Dribble", "Header", "Assist", "Defensive Play", "Tackle", "Great Play"],
  Baseball:   ["Home Run", "Strikeout", "Defensive Play", "Hit", "RBI", "Stolen Base", "Pitching", "Great Play"],
  Lacrosse:   ["Goal", "Save", "Ground Ball", "Assist", "Defensive Play", "Fast Break", "Transition", "Great Play"],
};

function mockClassify(clips: ClipInput[], sport: string): EnrichedClip[] {
  const types = SPORT_PLAY_TYPES[sport] ?? SPORT_PLAY_TYPES.Basketball;
  return clips.map((clip, i) => ({
    ...clip,
    playType: types[i % types.length] ?? "Great Play",
  }));
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ClipInput {
  startTime: number;
  endTime: number;
  confidence: number;
}

interface EnrichedClip extends ClipInput {
  playType: string;
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { videoUrl?: string; clips?: ClipInput[]; sport?: string; position?: string; _testOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { videoUrl, clips = [], sport = "Basketball", _testOnly = false } = body;

  if (!videoUrl && !_testOnly) {
    return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
  }
  if (clips.length === 0 && !_testOnly) {
    return NextResponse.json({ error: "clips array is required and must not be empty" }, { status: 400 });
  }

  // Check Google Cloud credentials
  const credPath   = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId  = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const PLACEHOLDER_PATHS = ["/path/to/clipt-service-account.json", "", undefined];
  const apiConfigured = !!credPath && !PLACEHOLDER_PATHS.includes(credPath) && !!projectId && projectId !== "your-project-id-here";

  if (!apiConfigured) {
    console.warn(
      "[classify-clips] Google Video Intelligence not configured.",
      "GOOGLE_APPLICATION_CREDENTIALS:", credPath ?? "(missing)",
      "GOOGLE_CLOUD_PROJECT_ID:", projectId ?? "(missing)"
    );
    return NextResponse.json({
      clips: _testOnly ? [] : mockClassify(clips, sport),
      fallback: true,
      fallbackReason: !credPath || PLACEHOLDER_PATHS.includes(credPath)
        ? "GOOGLE_APPLICATION_CREDENTIALS not set. See GOOGLE_CLOUD_SETUP.md."
        : "GOOGLE_CLOUD_PROJECT_ID not set.",
    });
  }

  // _testOnly just validates the API is reachable without doing real work
  if (_testOnly) {
    try {
      const { VideoIntelligenceServiceClient } = await import("@google-cloud/video-intelligence");
      new VideoIntelligenceServiceClient({ projectId });
      return NextResponse.json({ ok: true, clips: [], fallback: false });
    } catch (e) {
      return NextResponse.json({ error: `API init failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }
  }

  // ── Call Google Video Intelligence ──────────────────────────────────────
  try {
    const { VideoIntelligenceServiceClient } = await import("@google-cloud/video-intelligence");
    const client = new VideoIntelligenceServiceClient({ projectId });

    // Annotate the full video with segment context for each clip
    const [operation] = await client.annotateVideo({
      inputUri: videoUrl!,
      features: [
        "LABEL_DETECTION" as never,
        "SHOT_CHANGE_DETECTION" as never,
      ],
      videoContext: {
        segments: clips.map((clip) => ({
          startTimeOffset: { seconds: Math.floor(clip.startTime), nanos: 0 },
          endTimeOffset:   { seconds: Math.floor(clip.endTime),   nanos: 0 },
        })),
        labelDetectionConfig: {
          labelDetectionMode: "SHOT_AND_FRAME_MODE" as never,
          stationaryCamera: false,
        },
      },
    });

    console.log("[classify-clips] Waiting for Video Intelligence operation...");
    const [result] = await operation.promise();
    const annotations = result.annotationResults?.[0];

    // Map each clip to its play type using segment label annotations
    const enriched: EnrichedClip[] = clips.map((clip, segIdx) => {
      const segAnnotations = annotations?.segmentLabelAnnotations ?? [];
      const segLabels: string[] = [];

      for (const ann of segAnnotations) {
        for (const seg of ann.segments ?? []) {
          const segStart = Number(seg.segment?.startTimeOffset?.seconds ?? 0);
          const segEnd   = Number(seg.segment?.endTimeOffset?.seconds ?? 0);
          // Check if this annotation overlaps with our clip
          if (segStart <= clip.endTime && segEnd >= clip.startTime) {
            const entity = ann.entity?.description ?? "";
            if (entity) segLabels.push(entity);
          }
        }
      }

      // Also look at shot labels around the segment
      const shotLabels = (annotations?.shotLabelAnnotations ?? [])
        .filter((ann) => {
          return (ann.segments ?? []).some((s) => {
            const ss = Number(s.segment?.startTimeOffset?.seconds ?? 0);
            const se = Number(s.segment?.endTimeOffset?.seconds ?? 0);
            return ss <= clip.endTime && se >= clip.startTime;
          });
        })
        .map((ann) => ann.entity?.description ?? "")
        .filter(Boolean);

      const allLabels = [...new Set([...segLabels, ...shotLabels])];
      console.log(`[classify-clips] Clip ${segIdx + 1} (${clip.startTime}s–${clip.endTime}s) labels:`, allLabels);

      return {
        ...clip,
        playType: labelsToPlayType(allLabels, sport),
      };
    });

    return NextResponse.json({ clips: enriched, fallback: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[classify-clips] Google Video Intelligence error:", msg);

    // Fail gracefully — return mock data so the UI doesn't break
    return NextResponse.json({
      clips: mockClassify(clips, sport),
      fallback: true,
      fallbackReason: `Google API error: ${msg}`,
    }, { status: 200 }); // 200 so client treats it as success with mock data
  }
}
