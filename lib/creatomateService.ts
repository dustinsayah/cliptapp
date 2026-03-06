// ── Creatomate server-side video rendering service ─────────────────────────────
// Required env vars:
//   CREATOMATE_API_KEY  — your Creatomate API key from https://app.creatomate.com/settings/api
//
// Output: real MP4 (h264 + aac) — works on all devices including iPhone.
//
// REST API docs: https://creatomate.com/docs/rest-api

const CREATOMATE_API = "https://api.creatomate.com/v1";

export interface ClipInput {
  url: string;
  duration?: number;     // total clip length in seconds (used as trimEnd fallback)
  trimStart?: number;    // seconds to trim from the beginning of the source
  trimEnd?: number;      // end point in seconds from the beginning of the source
  skillCategory?: string; // e.g. "Scoring", "Defensive", "Transition"
  markX?: number;        // player spotlight X position as 0–100 percent (default 50)
  markY?: number;        // player spotlight Y position as 0–100 percent (default 40)
}

export interface ReelRenderInput {
  // Athlete identity
  firstName?: string;
  lastName?: string;
  jerseyNumber?: string;
  sport?: string;
  school?: string;
  position?: string;
  gradYear?: string;
  email?: string;
  phone?: string;
  heightFt?: string;
  heightIn?: string;
  weight?: string;       // body weight in lbs, e.g. "185"
  gpa?: string;          // GPA string, e.g. "3.8" — shown on title card only if >= 3.0
  clubTeam?: string;
  location?: string; // e.g. "Dallas, TX" — replaces separate city/state fields
  // legacy fields (still accepted for backward compat with old saved data)
  city?: string;
  state?: string;

  // Recruiting contact
  coachName?: string;
  coachEmail?: string;

  // Additional profile fields
  socialHandle?: string; // e.g. "@athleteuser" — shown on title card
  achievement?: string;  // e.g. "2x All-State" — shown on title card (max 50 chars)
  hometown?: string;     // e.g. "Atlanta, GA" — shown on title card

  // Stats
  statsData?: Record<string, string>;

  // Clips — prefer clips[] (has trim + category data), fall back to clipUrls[]
  clips?: ClipInput[];
  clipUrls?: string[];  // legacy — treated as clips with no trim data

  // Audio / style
  musicUrl?:  string | null;  // full URL to audio file — Cloudinary or blob
  music?:     string | null;  // track identifier — "no-music" skips audio even if musicUrl set
  musicName?: string | null;  // display name for UI only
  accentHex?: string;

  // Dimensions
  width?: number;
  height?: number;

  // Overlay options
  transitionStyle?: string;
  jerseyOverlay?: boolean;   // show jersey # lower-third on all clips
  statsEnabled?: boolean;    // include season stats card

  // Creative options
  spotlightStyle?: "arrow" | "circle" | "none"; // text overlay on first 2s of each clip
  exportType?: "coach" | "social" | "landscape"; // informational; dimensions driven by width/height
}

export interface RenderStatus {
  id: string;
  status: "planned" | "waiting" | "rendering" | "succeeded" | "failed";
  url: string | null;
  error_message: string | null;
}

export function isCreatomateConfigured(): boolean {
  return !!process.env.CREATOMATE_API_KEY;
}

// Starts a render on Creatomate and returns the render ID immediately (non-blocking).
// Poll getRenderStatus(renderId) every 4s until status is "succeeded" or "failed".
export async function startRender(input: ReelRenderInput): Promise<string> {
  if (!process.env.CREATOMATE_API_KEY) {
    throw new Error("CREATOMATE_API_KEY not configured");
  }

  const source    = buildReelSource(input);
  const clipCount = input.clips?.length ?? input.clipUrls?.length ?? 0;
  console.log(`[Creatomate] Starting render — ${clipCount} clips, source ${JSON.stringify(source).length} bytes`);

  const response = await fetch(`${CREATOMATE_API}/renders`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.CREATOMATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    throw new Error(`Creatomate render start failed: ${response.status} — ${errorText}`);
  }

  const data: Array<{ id: string }> = await response.json();
  if (!data?.[0]?.id) throw new Error("Creatomate returned no render ID");
  console.log("[Creatomate] Render started — ID:", data[0].id);
  return data[0].id;
}

// Fetches current render status. Poll every 3–5 seconds until "succeeded" or "failed".
export async function getRenderStatus(renderId: string): Promise<RenderStatus> {
  if (!process.env.CREATOMATE_API_KEY) {
    throw new Error("CREATOMATE_API_KEY not configured");
  }

  const response = await fetch(`${CREATOMATE_API}/renders/${renderId}`, {
    headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Creatomate status fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    id:            data.id,
    status:        data.status,
    url:           data.url           ?? null,
    error_message: data.error_message ?? null,
  };
}

// ── Composition Builder ───────────────────────────────────────────────────────

function buildReelSource(input: ReelRenderInput): Record<string, unknown> {
  console.log("CREATOMATE MUSIC INPUT:", input.musicUrl, input.music);

  const {
    firstName    = "ATHLETE",
    lastName     = "",
    jerseyNumber = "",
    sport        = "",
    school       = "",
    position     = "",
    gradYear     = "",
    email        = "",
    phone        = "",
    heightFt     = "",
    heightIn     = "",
    weight       = "",
    gpa          = "",
    clubTeam     = "",
    location     = "",
    city         = "",
    state        = "",
    coachName    = "",
    coachEmail   = "",
    socialHandle = "",
    achievement  = "",
    hometown     = "",
    statsData    = {},
    clips:       rawClips,
    clipUrls,
    musicUrl,
    music,
    accentHex    = "#00A3FF",
    width        = 1920,
    height       = 1080,
    transitionStyle = "Hard Cut",
    jerseyOverlay   = false,
    statsEnabled    = true,
    spotlightStyle  = "none",
  } = input;

  // ── Diagnostics ────────────────────────────────────────────────────────────
  const s          = height / 1080; // scale factor — all sizes are 1080p references
  const isVertical = width === 1080 && height === 1920;
  console.log("CREATOMATE DIMENSIONS:", width, "x", height, "| vertical:", isVertical);
  console.log("MUSIC URL AT BUILD START:", musicUrl ?? "null", "| music id:", music ?? "undefined");

  // ── Normalize clip list ───────────────────────────────────────────────────
  const clips: ClipInput[] =
    rawClips && rawClips.length > 0
      ? rawClips
      : (clipUrls || []).map(url => ({ url }));

  if (clips.length === 0) throw new Error("No clips provided to buildReelSource");

  // ── Derived strings ───────────────────────────────────────────────────────
  const fullName  = [firstName, lastName].filter(Boolean).join(" ").toUpperCase();
  const subLine   = [position, sport].filter(Boolean).join("  ·  ").toUpperCase();
  // Prefer new `location` field; fall back to legacy city+state
  const locationStr = location || [city, state].filter(Boolean).join(", ");

  const statsEntries = Object.entries(statsData)
    .filter(([, v]) => v?.trim())
    .slice(0, 9); // up to 9 stats on one card (3×3 grid)
  const showStatsCard = statsEnabled !== false && statsEntries.length > 0;

  // ── Duration constants (seconds) ─────────────────────────────────────────
  const TITLE_DUR   = 6;
  const STATS_DUR   = 5;
  const END_DUR     = 5;
  // ── Sport max duration warning ────────────────────────────────────────────
  const SPORT_MAX: Record<string, number> = { Basketball: 240, Football: 300, Lacrosse: 240 };
  const maxDur = SPORT_MAX[sport] ?? 300;
  const estimatedClipDur = clips.reduce((sum, c) => {
    const cs = c.trimStart ?? 0;
    const ce = c.trimEnd ?? (c.duration ?? 10);
    return sum + Math.max(ce - cs, 1);
  }, 0);
  const statsSlideDur  = showStatsCard ? STATS_DUR : 0;
  const estimatedTotal = TITLE_DUR + statsSlideDur + estimatedClipDur + END_DUR;
  if (estimatedTotal > maxDur) {
    console.warn(`[Creatomate] WARNING: estimated ${estimatedTotal}s exceeds ${sport || "default"} max ${maxDur}s`);
  }

  // ── Transition map ────────────────────────────────────────────────────────
  const transitionMap: Record<string, Record<string, unknown>> = {
    "Fade to Black": { type: "fade",      duration: 0.5, color: "#000000" },
    "Crossfade":     { type: "crossfade", duration: 0.4 },
    "Flash Cut":     { type: "fade",      duration: 0.2, color: "#FFFFFF" },
    "Hard Cut":      { type: "fade",      duration: 0.1, color: "#000000" },
  };
  const clipTransition = transitionMap[transitionStyle] ?? { type: "fade", duration: 0.1, color: "#000000" };

  // Root elements array — audio MUST live here at root, never inside a composition
  const elements: unknown[] = [];
  let currentTime = 0;

  // ── 1. TITLE CARD (6s) — two-column layout ──────────────────────────────────
  //
  // Left half  (x 0–52%):  athlete identity, left-aligned
  // Right half (x 52–100%): up to 4 season stats in 2×2 grid
  // Vertical divider at x 52% spans y 25%–92%

  const heightWeight = [
    heightFt ? `${heightFt}'${heightIn || "0"}"` : null,
    weight   ? `${weight} lbs`                   : null,
  ].filter(Boolean).join(" — ");

  const gpaNum  = parseFloat(gpa || "");
  const showGpa = gpa && !isNaN(gpaNum) && gpaNum >= 3.0;

  // Up to 4 stats shown on right side of title card
  const titleCardStats = statsEntries.slice(0, 4);

  const titleEls: unknown[] = [
    // Full background
    {
      type: "shape", shape: "rectangle",
      x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
      width: "100%", height: "100%", fill_color: "#050A14",
    },
    // Top accent bar — 20px
    {
      type: "shape", shape: "rectangle",
      x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%",
      width: "100%", height: `${Math.round(20 * s)}px`, fill_color: accentHex,
    },
    // Bottom accent bar — 20px
    {
      type: "shape", shape: "rectangle",
      x: "0%", y: "100%", x_anchor: "0%", y_anchor: "100%",
      width: "100%", height: `${Math.round(20 * s)}px`, fill_color: accentHex,
    },
    // Vertical divider line — x 52%, spans y 25%–92% (center 58.5%, height 67%)
    {
      type: "shape", shape: "rectangle",
      x: "52%", y: "58.5%", x_anchor: "50%", y_anchor: "50%",
      width: `${Math.max(1, Math.round(2 * s))}px`, height: "67%",
      fill_color: "#1E2530",
    },
  ];

  // Jersey # decoration — massive faint texture behind athlete name (left side)
  if (jerseyNumber) {
    titleEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "8%", y: "35%", x_anchor: "0%", y_anchor: "50%",
      font_size: Math.round(280 * s), font_weight: "900",
      fill_color: accentHex, font_family: "Oswald", opacity: 0.15,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Athlete full name — x 8%, y 38%, font_size 88, Oswald bold, white, left-aligned
  titleEls.push({
    type: "text", text: fullName,
    x: "8%", y: "38%", x_anchor: "0%", y_anchor: "50%", width: "44%",
    font_size: Math.round(88 * s), font_weight: "900", fill_color: "#FFFFFF",
    font_family: "Oswald", x_alignment: 0,
    shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
  });

  // Position + Sport — x 8%, y 52%, Montserrat, accentColor, uppercase
  if (subLine) {
    titleEls.push({
      type: "text", text: subLine,
      x: "8%", y: "52%", x_anchor: "0%", y_anchor: "50%", width: "44%",
      font_size: Math.round(42 * s), fill_color: accentHex,
      font_family: "Montserrat", x_alignment: 0, letter_spacing: "8%",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // School — x 8%, y 61%, Montserrat, white
  if (school) {
    titleEls.push({
      type: "text", text: school,
      x: "8%", y: "61%", x_anchor: "0%", y_anchor: "50%", width: "44%",
      font_size: Math.round(38 * s), fill_color: "#FFFFFF",
      font_family: "Montserrat", x_alignment: 0,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Grad year + GPA — x 8%, y 69%, font_size 30, #9CA3AF — only if values exist
  const gradGpaLine = [
    gradYear ? `Class of ${gradYear}` : null,
    showGpa  ? `GPA ${gpa}`           : null,
  ].filter(Boolean).join("  ·  ");
  if (gradGpaLine) {
    titleEls.push({
      type: "text", text: gradGpaLine,
      x: "8%", y: "69%", x_anchor: "0%", y_anchor: "50%", width: "44%",
      font_size: Math.round(30 * s), fill_color: "#9CA3AF",
      font_family: "Montserrat", x_alignment: 0,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Height + Weight — x 8%, y 76%, font_size 30, #9CA3AF — only if values exist
  if (heightWeight) {
    titleEls.push({
      type: "text", text: heightWeight,
      x: "8%", y: "76%", x_anchor: "0%", y_anchor: "50%", width: "44%",
      font_size: Math.round(30 * s), fill_color: "#9CA3AF",
      font_family: "Montserrat", x_alignment: 0,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Email — x 8%, y 84%, font_size 28, accentColor — only if exists
  if (email) {
    titleEls.push({
      type: "text", text: email,
      x: "8%", y: "84%", x_anchor: "0%", y_anchor: "50%", width: "44%",
      font_size: Math.round(28 * s), fill_color: accentHex,
      font_family: "Montserrat", x_alignment: 0,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Phone — x 8%, y 91%, font_size 28, white — only if exists
  if (phone) {
    titleEls.push({
      type: "text", text: phone,
      x: "8%", y: "91%", x_anchor: "0%", y_anchor: "50%", width: "44%",
      font_size: Math.round(28 * s), fill_color: "#FFFFFF",
      font_family: "Montserrat", x_alignment: 0,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Right half: SEASON STATS + up to 4 stats in 2×2 grid
  if (titleCardStats.length > 0) {
    titleEls.push({
      type: "text", text: "SEASON STATS",
      x: "74%", y: "32%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(24 * s), fill_color: accentHex,
      font_family: "Montserrat", x_alignment: 0.5, letter_spacing: "12%",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });

    // 2×2 stat positions: top-left, top-right, bottom-left, bottom-right
    const tcStatPos = [
      { x: "63%", y: "45%" },
      { x: "83%", y: "45%" },
      { x: "63%", y: "65%" },
      { x: "83%", y: "65%" },
    ];

    titleCardStats.forEach(([label, value], idx) => {
      const pos = tcStatPos[idx];
      if (!pos || !value?.trim()) return;
      const labelY = parseFloat(pos.y) + 8;
      // Stat value
      titleEls.push({
        type: "text", text: value,
        x: pos.x, y: pos.y, x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(64 * s), font_weight: "900",
        fill_color: accentHex, font_family: "Oswald", x_alignment: 0.5,
        shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
      });
      // Stat label — 8% below value
      titleEls.push({
        type: "text", text: label.toUpperCase(),
        x: pos.x, y: `${labelY}%`, x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(22 * s), fill_color: "#9CA3AF",
        font_family: "Montserrat", x_alignment: 0.5,
        shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
      });
    });
  }

  // CLIPT wordmark
  titleEls.push({
    type: "text", text: "POWERED BY CLIPT",
    x: "50%", y: "96.3%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(24 * s), font_weight: "700", fill_color: "#334155",
    font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
  });

  elements.push({
    type: "composition", track: 1, time: currentTime, duration: TITLE_DUR,
    animations: [{ time: 0, duration: 0.5, type: "fade", fade: false }],
    elements: titleEls,
  });
  currentTime += TITLE_DUR;

  // ── 2. STATS CARD (5s) — 3×3 grid, one page, max 9 stats ────────────────────
  //
  // x positions: 18%, 50%, 82%
  // y positions for values:  40%, 60%, 80%
  // y positions for labels:  47%, 67%, 87%
  // Stat value: font_size 72, Oswald bold, accentColor
  // Stat label: font_size 26, Montserrat, #9CA3AF, uppercase, letter_spacing 6%
  // Header "SEASON STATS": x 50%, y 14%, font_size 32, letter_spacing 10%, accentColor
  // Athlete name: x 50%, y 24%, font_size 52, Oswald bold, white

  function buildStatsCardEls(): unknown[] {
    // QB passer rating auto-calculation (Quarterback + Football only)
    // Requires: completions, attempts, yards, touchdowns, interceptions — all non-zero
    let displayStats = [...statsEntries];
    if (position === "Quarterback" && sport === "Football") {
      const comp  = parseFloat(statsData.completions   || "");
      const att   = parseFloat(statsData.attempts      || "");
      const yds   = parseFloat(statsData.yards         || "");
      const tds   = parseFloat(statsData.touchdowns    || "");
      const ints  = parseFloat(statsData.interceptions || "");
      const hasAllQBFields =
        !isNaN(comp) && comp > 0 &&
        !isNaN(att)  && att  > 0 &&
        !isNaN(yds)  && yds  >= 0 &&
        !isNaN(tds)  && tds  >= 0 &&
        !isNaN(ints) && ints >= 0;
      if (hasAllQBFields) {
        const a = Math.min(Math.max(((comp / att) - 0.3) / 0.2, 0), 2.375);
        const b = Math.min(Math.max((yds / att - 3) / 4, 0), 2.375);
        const c = Math.min(Math.max((tds / att) / 0.05, 0), 2.375);
        const d = Math.min(Math.max(0.095 - (ints / att) / 0.04, 0), 2.375);
        const passerRating = Math.round(((a + b + c + d) / 6) * 100 * 10) / 10;
        // Remove any existing raw rating field, then append calculated QB RATING
        displayStats = displayStats.filter(([key]) =>
          !["rating", "passer_rating", "passerRating", "qb_rating", "qbRating", "overall_rating", "overallRating"].includes(key)
        );
        displayStats.push(["QB RATING", passerRating.toString()]);
      }
    }

    // Cap at 9 stats (3×3 grid), filter empties
    const statsToShow = displayStats.filter(([, v]) => v?.trim()).slice(0, 9);

    const statPositions = [
      { xPct: 18, yValPct: 40, yLblPct: 47 },
      { xPct: 50, yValPct: 40, yLblPct: 47 },
      { xPct: 82, yValPct: 40, yLblPct: 47 },
      { xPct: 18, yValPct: 60, yLblPct: 67 },
      { xPct: 50, yValPct: 60, yLblPct: 67 },
      { xPct: 82, yValPct: 60, yLblPct: 67 },
      { xPct: 18, yValPct: 80, yLblPct: 87 },
      { xPct: 50, yValPct: 80, yLblPct: 87 },
      { xPct: 82, yValPct: 80, yLblPct: 87 },
    ];
    const els: unknown[] = [
      // Background
      { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
      // Top accent stripe 16px
      { type: "shape", shape: "rectangle", x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%", width: "100%", height: `${Math.round(16 * s)}px`, fill_color: accentHex },
      // Bottom accent stripe 16px
      { type: "shape", shape: "rectangle", x: "0%", y: "100%", x_anchor: "0%", y_anchor: "100%", width: "100%", height: `${Math.round(16 * s)}px`, fill_color: accentHex },
      // "SEASON STATS" header
      { type: "text", text: "SEASON STATS", x: "50%", y: "14%", x_anchor: "50%", y_anchor: "50%", width: "90%", font_size: Math.round(32 * s), font_weight: "700", fill_color: accentHex, font_family: "Montserrat", letter_spacing: "10%", x_alignment: 0.5, shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
      // Athlete name
      { type: "text", text: fullName, x: "50%", y: "24%", x_anchor: "50%", y_anchor: "50%", width: "90%", font_size: Math.round(52 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald", x_alignment: 0.5, shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
      // POWERED BY CLIPT
      { type: "text", text: "POWERED BY CLIPT", x: "50%", y: "94%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(22 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
    ];
    statsToShow.forEach(([label, value], idx) => {
      const pos = statPositions[idx];
      if (!pos) return;
      // Stat value
      els.push({
        type: "text", text: value,
        x: `${pos.xPct}%`, y: `${pos.yValPct}%`,
        x_anchor: "50%", y_anchor: "50%", width: "28%",
        font_family: "Oswald", font_size: Math.round(72 * s), font_weight: "700",
        fill_color: accentHex, x_alignment: 0.5,
        shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
      });
      // Stat label
      els.push({
        type: "text", text: label.toUpperCase(),
        x: `${pos.xPct}%`, y: `${pos.yLblPct}%`,
        x_anchor: "50%", y_anchor: "50%", width: "28%",
        font_family: "Montserrat", font_size: Math.round(26 * s), font_weight: "600",
        fill_color: "#9CA3AF", x_alignment: 0.5, letter_spacing: "6%",
        shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
      });
    });
    return els;
  }

  if (showStatsCard) {
    elements.push({ type: "composition", track: 1, time: currentTime, duration: STATS_DUR, elements: buildStatsCardEls() });
    currentTime += STATS_DUR;
  }

  // ── 3. CLIPS + SPOTLIGHT OVERLAY ─────────────────────────────────────────
  //
  // When spotlightStyle !== "none": each clip is a 3-layer composition:
  //   Layer 1 (track 1): main video
  //   Layer 2 (track 2): freeze frame (first 1.5s, then fades out)
  //   Layer 3 (track 3): animated circle overlay (first 1.5s) at markX/markY
  //
  // When spotlightStyle === "none": flat video or composition (legacy behavior)

  clips.forEach((clip, idx) => {
    // ── Diagnostic log ────────────────────────────────────────────────────────
    console.log(`CLIP ${idx} MARK COORDINATES:`, {
      markX: clip.markX,
      markY: clip.markY,
      clipUrl: clip.url,
      hasCoordinates: clip.markX !== undefined && clip.markY !== undefined,
    });

    const trimStart    = clip.trimStart != null && clip.trimStart > 0 ? clip.trimStart : 0;
    const clipDur      = clip.duration || 10;
    const rawEnd       = clip.trimEnd  != null && clip.trimEnd  > 0 ? clip.trimEnd  : clipDur;
    const trimDuration = Math.max(rawEnd - trimStart, 1);
    const sectionStart = currentTime;
    const videoFit     = isVertical ? "cover" : "contain";

    if (spotlightStyle !== "none") {
      // ── 3-layer spotlight composition ─────────────────────────────────────
      const markXPct = clip.markX ?? 50;
      const markYPct = clip.markY ?? 38;

      const innerEls: unknown[] = [
        // Layer 1 — main video (track 1)
        {
          type:          "video",
          track:         1,
          time:          0,
          source:        clip.url,
          trim_start:    trimStart,
          trim_duration: trimDuration,
          volume:        "0%",
          fit:           videoFit,
          fill_color:    "#000000",
        },
        // Layer 2 — freeze frame (track 2): shows first 1.5s with looped 0.1s clip, then fades
        {
          type:          "video",
          track:         2,
          time:          0,
          duration:      1.5,
          source:        clip.url,
          trim_start:    0,
          trim_duration: 0.1,
          volume:        "0%",
          fit:           videoFit,
          fill_color:    "#000000",
          animations: [
            { time: 1.2, duration: 0.3, type: "fade", fade: false },
          ],
        },
        // Layer 3 — circle overlay composition (track 3): centered at markX/markY
        {
          type:     "composition",
          track:    3,
          time:     0,
          duration: 1.5,
          x:        `${markXPct}%`,
          y:        `${markYPct}%`,
          width:    "9%",
          height:   "14.2%",
          elements: [
            {
              type:         "shape",
              shape:        "ellipse",
              fill_color:   "rgba(0,0,0,0)",
              stroke_color: "#FFFFFF",
              stroke_width: 5,
              width:        "100%",
              height:       "100%",
              x_anchor:     "50%",
              y_anchor:     "50%",
              animations: [
                { time: 0,   duration: 0.4, easing: "ease-out", type: "scale", fade: false, start_scale: "160%", end_scale: "100%" },
                { time: 1.1, duration: 0.4, easing: "ease-in",  type: "fade",  fade: true  },
              ],
            },
          ],
        },
      ];

      // Optional jersey overlay (track 4)
      if (jerseyOverlay && jerseyNumber) {
        innerEls.push({
          type:                 "text",
          track:                4,
          text:                 `#${jerseyNumber}`,
          font_family:          "Oswald",
          font_size:            Math.round(48 * s),
          font_weight:          "700",
          fill_color:           accentHex,
          background_color:     "rgba(0,0,0,0.6)",
          background_x_padding: "3%",
          background_y_padding: "2%",
          x:            "5%",
          y:            "90%",
          x_anchor:     "0%",
          y_anchor:     "50%",
          shadow_color: "rgba(0,0,0,0)",
          shadow_blur:  0,
        });
      }

      const clipEl: Record<string, unknown> = {
        type:     "composition",
        track:    1,
        time:     sectionStart,
        duration: trimDuration,
        elements: innerEls,
      };
      if (idx > 0) clipEl.transition = clipTransition;
      elements.push(clipEl);

    } else {
      // ── Legacy path: no spotlight ─────────────────────────────────────────
      const videoBase: Record<string, unknown> = {
        type:       "video",
        source:     clip.url,
        trim_start: trimStart,
        volume:     "0%",
        fit:        videoFit,
        x_anchor:   "50%",
        y_anchor:   isVertical ? "35%" : "50%",
      };

      const blackBg: Record<string, unknown> = {
        type: "shape", shape: "rectangle", fill_color: "#000000",
        width: "100%", height: "100%", x: "50%", y: "50%",
        x_anchor: "50%", y_anchor: "50%",
      };

      const needsComposition = !isVertical || (jerseyOverlay && jerseyNumber);
      let clipEl: Record<string, unknown>;

      if (needsComposition) {
        const innerEls: unknown[] = [];
        if (!isVertical) innerEls.push(blackBg);
        innerEls.push({ ...videoBase, width: "100%", height: "100%" });
        if (jerseyOverlay && jerseyNumber) {
          innerEls.push({
            type:                 "text",
            text:                 `#${jerseyNumber}`,
            font_family:          "Oswald",
            font_size:            Math.round(48 * s),
            font_weight:          "700",
            fill_color:           accentHex,
            background_color:     "rgba(0,0,0,0.6)",
            background_x_padding: "3%",
            background_y_padding: "2%",
            x:            "5%",
            y:            "90%",
            x_anchor:     "0%",
            y_anchor:     "50%",
            shadow_color: "rgba(0,0,0,0)",
            shadow_blur:  0,
          });
        }
        clipEl = { type: "composition", track: 1, time: sectionStart, duration: trimDuration, elements: innerEls };
      } else {
        clipEl = { ...videoBase, track: 1, time: sectionStart, duration: trimDuration };
      }

      if (idx > 0) clipEl.transition = clipTransition;
      elements.push(clipEl);
    }

    currentTime = sectionStart + trimDuration;
  });

  // ── 4. END CARD (5s) — rebuilt layout ────────────────────────────────────
  //
  // Y positions (all centered, all percentage of frame height):
  //   11%  — "CONTACT ME" heading 32px gray
  //   22%  — athlete full name 96px white Oswald
  //   33%  — jersey # · position · sport combined 40px gray
  //   42%  — school 38px white
  //   51%  — divider 2px accent 40% opacity
  //   60%  — email 34px accentHex
  //   68%  — phone 30px gray
  //   76%  — coach contact 28px gray
  //   87%  — top 3 stats (values 80px, labels 26px)
  //   96%  — "POWERED BY CLIPT" watermark

  const topStats    = statsEntries.slice(0, 3);
  const endStatCols = Math.min(topStats.length, 3);
  const endColX: Record<number, string[]> = {
    0: [],
    1: ["50%"],
    2: ["25%", "75%"],
    3: ["22%", "50%", "78%"],
  };

  // Combined jersey + position line at 33%
  const jerseyPosLine = [
    jerseyNumber ? `#${jerseyNumber}` : null,
    subLine,
  ].filter(Boolean).join("  ·  ");

  const endEls: unknown[] = [
    // Full background
    { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
    // Top accent stripe — 16px
    { type: "shape", shape: "rectangle", x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%", width: "100%", height: `${Math.round(16 * s)}px`, fill_color: accentHex },
    // Bottom accent stripe — 16px
    { type: "shape", shape: "rectangle", x: "0%", y: "100%", x_anchor: "0%", y_anchor: "100%", width: "100%", height: `${Math.round(16 * s)}px`, fill_color: accentHex },
    // "CONTACT ME" — 36px at 11%
    { type: "text", text: "CONTACT ME", x: "50%", y: "11%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(36 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter", letter_spacing: "12%", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
    // Athlete full name — 88px at 20%
    { type: "text", text: fullName, x: "50%", y: "20%", x_anchor: "50%", y_anchor: "50%", width: "90%", font_size: Math.round(88 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
  ];

  // Jersey + position combined at 31%
  if (jerseyPosLine) {
    endEls.push({ type: "text", text: jerseyPosLine, x: "50%", y: "31%", x_anchor: "50%", y_anchor: "50%", width: "90%", font_size: Math.round(40 * s), fill_color: accentHex, font_family: "Oswald", font_weight: "700", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 });
  }

  // School — 40px at 40%
  if (school) {
    endEls.push({ type: "text", text: school, x: "50%", y: "40%", x_anchor: "50%", y_anchor: "50%", width: "85%", font_size: Math.round(40 * s), fill_color: "#FFFFFF", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 });
  }

  // Divider — 50%
  endEls.push({ type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "90%", height: `${Math.max(1, Math.round(2 * s))}px`, fill_color: accentHex, opacity: 0.4 });

  // Email — 48px at 60%
  if (email) {
    endEls.push({ type: "text", text: `\u2709  ${email}`, x: "50%", y: "60%", x_anchor: "50%", y_anchor: "50%", width: "85%", font_size: Math.round(48 * s), fill_color: accentHex, font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 });
  }

  // Phone — 44px at 69%
  if (phone) {
    endEls.push({ type: "text", text: phone, x: "50%", y: "69%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(44 * s), fill_color: "#FFFFFF", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 });
  }

  // Coach contact — 28px at 76%
  if (coachName || coachEmail) {
    const coachLine = `Coach: ${[coachName, coachEmail].filter(Boolean).join("  —  ")}`;
    endEls.push({ type: "text", text: coachLine, x: "50%", y: "76%", x_anchor: "50%", y_anchor: "50%", width: "80%", font_size: Math.round(28 * s), fill_color: "#94a3b8", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 });
  }

  // Stats row — values 80px at 83%, labels 26px at 90%
  if (topStats.length > 0) {
    topStats.forEach(([label, value], i) => {
      const xPos = endColX[endStatCols][i];
      endEls.push(
        { type: "text", text: value, x: xPos, y: "83%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(54 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
        { type: "text", text: label.toUpperCase(), x: xPos, y: "90%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(26 * s), fill_color: "#64748b", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 }
      );
    });
  }

  // "POWERED BY CLIPT" — 22px at 96%
  endEls.push({ type: "text", text: "POWERED BY CLIPT  \u00B7  CLIPTAPP.COM", x: "50%", y: "96%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(22 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 });

  elements.push({ type: "composition", track: 1, time: currentTime, duration: END_DUR, elements: endEls });

  const totalDuration = currentTime + END_DUR;

  // ── 5. MUSIC — root-level audio on track 2 ───────────────────────────────
  //
  // CRITICAL: This element must be a direct child of the root `elements` array.
  // It must NOT be nested inside any composition element.
  //
  // Condition: add audio if musicUrl is set AND music id is not "no-music".
  const shouldAddMusic = !!(
    input.musicUrl &&
    input.musicUrl.length > 0 &&
    input.music !== "no-music" &&
    input.music !== null &&
    input.music !== undefined
  );
  console.log("SHOULD ADD MUSIC:", shouldAddMusic,
    "| musicUrl =", input.musicUrl ?? "null",
    "| music =", input.music ?? "undefined");

  if (shouldAddMusic) {
    elements.push({
      type:           "audio",
      track:          2,
      time:           0,
      source:         input.musicUrl,
      volume:         "40%",
      audio_fade_in:  1,
      audio_fade_out: 3,
    });
    console.log("AUDIO ELEMENT pushed — source:", input.musicUrl?.slice(0, 80));
  }

  return {
    output_format: "mp4",
    codec:         "h264",
    audio_codec:   "aac",
    quality:       100,
    h264_profile:  "high",
    h264_level:    "4.2",
    pixel_format:  "yuv420p",
    width,
    height,
    frame_rate:    60,
    elements,
  };
}

// ── Social 9:16 helper ────────────────────────────────────────────────────────
// Convenience — just call startRender with width:1080, height:1920 directly.
export function buildSocialInput(input: ReelRenderInput): ReelRenderInput {
  return { ...input, width: 1080, height: 1920 };
}
