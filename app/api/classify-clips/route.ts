/**
 * POST /api/classify-clips
 *
 * Accepts a video URL + array of clip segments and returns each clip
 * enriched with a play type classification from Google Video Intelligence.
 *
 * Falls back to position-order mock classification when the Google API is
 * not configured (GOOGLE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS
 * not set in environment variables).
 *
 * ── Supabase schema (run in Supabase SQL Editor) ─────────────────────────
 * ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS reviewed_clips JSONB;
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Request body:
 *   {
 *     videoUrl:  string,
 *     clips:     ClipInput[],
 *     sport:     string,
 *     position:  string,
 *     _testOnly?: boolean   // admin panel: validate API is reachable, skip real work
 *   }
 *
 * ClipInput:
 *   { startTime: number, endTime: number, confidence: number }
 *
 * Response (success):
 *   { clips: EnrichedClip[], fallback: false }
 *
 * Response (fallback / no API configured):
 *   { clips: EnrichedClip[], fallback: true, fallbackReason: string }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  classifyAllClips,
  testGoogleConnection,
  isGoogleConfigured,
  type ClipForClassification,
} from "@/lib/googleVideoIntelligence";

export const runtime = "nodejs";
export const maxDuration = 120; // up to 2 min — Video Intelligence operations can take ~30–60s

// ── Types ──────────────────────────────────────────────────────────────────

interface ClipInput {
  startTime: number;
  endTime: number;
  confidence: number;
  [key: string]: unknown;
}

// ── Quality score helper ───────────────────────────────────────────────────

function computeQualityScore(playType: string, confidenceScore: number, duration: number): number {
  const confPts = Math.round(confidenceScore * 40);
  const SCORING   = ["Goal","Home Run","Touchdown","Scoring Play","Score","Point"];
  const ASSIST    = ["Assist","Completion","RBI"];
  const DEFENSIVE = ["Defensive Play","Block","Tackle/Sack","Interception","Save","Ground Ball","Strikeout"];
  const HUSTLE    = ["Steal","Rebound","Stolen Base","Fast Break"];
  const typePts =
    SCORING.some((t) => playType.includes(t))   ? 30 :
    ASSIST.some((t) => playType.includes(t))    ? 25 :
    DEFENSIVE.some((t) => playType.includes(t)) ? 25 :
    HUSTLE.some((t) => playType.includes(t))    ? 15 : 10;
  const durPts =
    duration >= 4 && duration <= 12 ? 20 :
    duration > 12 && duration <= 20 ? 15 :
    duration < 4 ? 5 : 10;
  return Math.min(100, confPts + typePts + durPts);
}

// ── Mock fallback classifier ───────────────────────────────────────────────

const SPORT_PLAY_TYPES: Record<string, string[]> = {
  Basketball: ["Scoring Play", "Defensive Play", "Assist", "Rebound", "Block", "Fast Break", "Steal", "Great Play"],
  Football:   ["Touchdown", "Tackle/Sack", "Interception", "Completion", "Run Play", "Defensive Play", "Great Play"],
  Soccer:     ["Goal", "Save", "Dribble", "Header", "Assist", "Defensive Play", "Great Play"],
  Baseball:   ["Home Run", "Strikeout", "Defensive Play", "Hit", "RBI", "Stolen Base", "Great Play"],
  Lacrosse:   ["Goal", "Save", "Ground Ball", "Assist", "Defensive Play", "Fast Break", "Great Play"],
};

function mockClassify(clips: ClipInput[], sport: string): ClipInput[] {
  const types = SPORT_PLAY_TYPES[sport] ?? SPORT_PLAY_TYPES.Basketball;
  return clips.map((clip, i) => {
    const playType = types[i % types.length] ?? "Great Play";
    const duration = clip.endTime - clip.startTime;
    return {
      ...clip,
      playType,
      qualityScore: computeQualityScore(playType, clip.confidence, duration),
    };
  });
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Parse body
  let body: {
    videoUrl?: string;
    clips?: ClipInput[];
    sport?: string;
    position?: string;
    _testOnly?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    videoUrl,
    clips = [],
    sport = "Basketball",
    position = "",
    _testOnly = false,
  } = body;

  // ── _testOnly mode: admin panel connection check ──────────────────────────
  if (_testOnly) {
    const result = await testGoogleConnection();
    if (result.success) {
      return NextResponse.json({ ok: true, clips: [], fallback: false, message: result.message });
    } else {
      return NextResponse.json(
        { ok: false, clips: [], fallback: true, fallbackReason: result.message },
        { status: 200 } // return 200 so admin UI can show the message normally
      );
    }
  }

  // ── Validate required fields ──────────────────────────────────────────────
  if (!videoUrl) {
    return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
  }
  if (clips.length === 0) {
    return NextResponse.json({ error: "clips array is required and must not be empty" }, { status: 400 });
  }

  // ── Check if Google API is configured ────────────────────────────────────
  if (!isGoogleConfigured()) {
    console.warn("[classify-clips] Google Video Intelligence not configured — using mock fallback.");
    return NextResponse.json({
      clips: mockClassify(clips, sport),
      fallback: true,
      fallbackReason:
        "Google API not configured. Set GOOGLE_CREDENTIALS_JSON (Vercel) or " +
        "GOOGLE_APPLICATION_CREDENTIALS (local). See GOOGLE_CLOUD_SETUP.md.",
    });
  }

  // ── Call classifyAllClips ────────────────────────────────────────────────
  try {
    // Map ClipInput to ClipForClassification (add videoUrl to each clip)
    const clipsForClassification: ClipForClassification[] = clips.map((clip) => ({
      ...clip,
      videoUrl,
    }));

    console.log(
      `[classify-clips] Classifying ${clips.length} clips for sport=${sport} position=${position}`
    );

    const enriched = await classifyAllClips(clipsForClassification, sport, position);
    const scored = enriched.map((c: ClipInput & { playType?: string }) => ({
      ...c,
      qualityScore: computeQualityScore(
        c.playType ?? "Great Play",
        c.confidence,
        c.endTime - c.startTime
      ),
    }));

    return NextResponse.json({ clips: scored, fallback: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[classify-clips] classifyAllClips error:", msg);

    // Graceful fallback — return mock-classified clips so the UI doesn't break
    return NextResponse.json(
      {
        clips: mockClassify(clips, sport),
        fallback: true,
        fallbackReason: `Google API error: ${msg}`,
      },
      { status: 200 }
    );
  }
}
