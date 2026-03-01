/**
 * lib/clipClassifier.ts
 *
 * Client-side clip classifier — used by upload, customize, and editor pages.
 * Provides realistic ESTIMATED classifications when Google AI cannot be called
 * (blob URLs are browser-only; Google Video Intelligence requires a public HTTP URL).
 *
 * Calls /api/classify-clips for real Google AI when a public URL is available.
 * Falls back gracefully on any error.
 *
 * All logs are prefixed "CLIPT AI:" for easy filtering in browser console.
 */

import { SPORTS_CONFIG } from "./sportsConfig";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClipClassification {
  playType: string;
  qualityScore: number;  // 0–100
  confidence: number;    // 0–1
  classifiedBy: "google-ai" | "estimated";
}

// ── Quality score (mirrors server route formula) ──────────────────────────────

function computeQualityScore(playType: string, confidence: number, duration: number): number {
  const confPts = Math.round(confidence * 40);
  const SCORING   = ["Goal", "Touchdown", "Scoring Play", "Three Pointer", "Drive to Basket", "Score"];
  const ASSIST    = ["Assist", "Completion"];
  const DEFENSIVE = ["Defensive Play", "Defensive Stop", "Block", "Tackle/Sack", "Interception", "Save", "Ground Ball"];
  const HUSTLE    = ["Steal", "Rebound", "Fast Break", "Hustle Play"];
  const typePts =
    SCORING.some((t)   => playType.includes(t)) ? 30 :
    ASSIST.some((t)    => playType.includes(t)) ? 25 :
    DEFENSIVE.some((t) => playType.includes(t)) ? 25 :
    HUSTLE.some((t)    => playType.includes(t)) ? 15 : 10;
  const durPts =
    duration >= 4 && duration <= 12 ? 20 :
    duration > 12 && duration <= 20 ? 15 :
    duration < 4  ? 5 : 10;
  return Math.min(100, confPts + typePts + durPts);
}

// ── Play type → badge color ───────────────────────────────────────────────────

export function playTypeBadgeColor(playType: string): string {
  if (!playType) return "#64748b";
  const pt = playType.toLowerCase();
  if (pt.includes("scoring") || pt.includes("goal") || pt.includes("touchdown") ||
      pt.includes("three pointer") || pt.includes("drive") || pt.includes("score")) return "#FBBF24";
  if (pt.includes("defensive") || pt.includes("block") || pt.includes("tackle") ||
      pt.includes("interception") || pt.includes("save") || pt.includes("stop")) return "#00A3FF";
  if (pt.includes("assist") || pt.includes("completion") || pt.includes("ground ball")) return "#22C55E";
  if (pt.includes("fast break") || pt.includes("hustle") || pt.includes("steal") || pt.includes("rebound")) return "#F97316";
  return "#64748b";
}

// ── Estimated fallback classifier ─────────────────────────────────────────────

/**
 * Generates a realistic ESTIMATED classification for a manual-upload clip.
 * Uses clipTypes from SPORTS_CONFIG in confidence order.
 * Quality scores start at 94 and decrease by ~4 per clip index.
 * Labeled "estimated" so athlete knows it's not real Google AI.
 */
export function estimateClipClassification(
  sport: string,
  position: string,
  clipIndex: number,
  duration: number
): ClipClassification {
  console.log(`CLIPT AI: [estimating] clip ${clipIndex + 1} — sport=${sport} position=${position} duration=${duration}s`);

  const sportCfg = SPORTS_CONFIG[sport];
  if (!sportCfg) {
    const fallback: ClipClassification = { playType: "Highlight Play", qualityScore: 80, confidence: 0.75, classifiedBy: "estimated" };
    console.log(`CLIPT AI: [estimated] clip ${clipIndex + 1} → no sport config, using fallback:`, fallback);
    return fallback;
  }

  const clipTypes = sportCfg.getClipTypes(position);
  const idx = clipIndex % clipTypes.length;
  const clipType = clipTypes[idx];
  // Confidence decreases slightly per clip for realism
  const confidence = Math.max(0.5, Math.round((clipType.confidence - clipIndex * 0.008) * 100) / 100);
  const qualityScore = computeQualityScore(clipType.label, confidence, duration);

  const result: ClipClassification = {
    playType: clipType.label,
    qualityScore,
    confidence,
    classifiedBy: "estimated",
  };

  console.log(`CLIPT AI: [estimated] clip ${clipIndex + 1} → playType="${result.playType}" confidence=${result.confidence} quality=${result.qualityScore}`);
  return result;
}

// ── API-based classifier ──────────────────────────────────────────────────────

/**
 * Calls POST /api/classify-clips for a single clip.
 * Works when a public HTTP URL is available (Cloudinary, etc).
 * For blob URLs: the API falls back to mock classification (returns fallback:true).
 * Falls back to estimateClipClassification on network/parse error.
 */
export async function classifyClipViaApi(
  videoUrl: string,
  duration: number,
  sport: string,
  position: string,
  clipIndex: number
): Promise<ClipClassification> {
  const isBlob = videoUrl.startsWith("blob:");
  if (isBlob) {
    console.warn(`CLIPT AI: ⚠️ blob URLs cannot be analyzed by Google AI (browser-only URL). Using estimated classification for clip ${clipIndex + 1}.`);
    return estimateClipClassification(sport, position, clipIndex, duration);
  }

  try {
    console.log(`CLIPT AI: calling /api/classify-clips for clip ${clipIndex + 1} — url=${videoUrl.slice(0, 80)}`);
    const res = await fetch("/api/classify-clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl,
        clips: [{ startTime: 0, endTime: duration || 10, confidence: 0.85 }],
        sport,
        position,
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const clip = data.clips?.[0];
    if (!clip?.playType) throw new Error("No playType in response");

    const classifiedBy: "google-ai" | "estimated" = data.fallback ? "estimated" : "google-ai";
    const qualityScore: number = typeof clip.qualityScore === "number" ? clip.qualityScore : 75;
    const confidence: number   = typeof clip.confidence  === "number" ? clip.confidence  : 0.75;

    console.log(`CLIPT AI: result for clip ${clipIndex + 1} → playType="${clip.playType}" quality=${qualityScore} classifiedBy=${classifiedBy} (server fallback=${data.fallback})`);
    if (data.fallback) {
      console.log(`CLIPT AI: server fallback reason: ${data.fallbackReason}`);
    }

    return { playType: clip.playType, qualityScore, confidence, classifiedBy };
  } catch (err) {
    console.warn(`CLIPT AI: API classify failed for clip ${clipIndex + 1}:`, err, "— using estimated fallback");
    return estimateClipClassification(sport, position, clipIndex, duration);
  }
}
