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
    .slice(0, 12); // up to 12 stats across 2 slides
  const showStatsCard = statsEnabled !== false && statsEntries.length > 0;
  const statsSlide1 = statsEntries.slice(0, 6);
  const statsSlide2 = statsEntries.length > 6 ? statsEntries.slice(6, 12) : [];

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
  const statsSlideDur  = showStatsCard ? (statsSlide2.length > 0 ? STATS_DUR * 2 : STATS_DUR) : 0;
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

  // ── 1. TITLE CARD (6s) ───────────────────────────────────────────────────
  //
  // All elements centered. Pixel y positions ÷ 1080 = percentage:
  //   0px    — top accent stripe 14px
  //   80px   — video title line 28px gray (7.4%)
  //   200px  — athlete full name 96px white Oswald (18.5%)
  //   320px  — jersey number 112px accentHex Oswald (29.6%)
  //   400px  — thin divider accent line (37.0%)
  //   460px  — position · sport 42px gray Inter (42.6%)
  //   520px  — school 36px white Inter (48.1%)
  //   570px  — club team 32px gray Inter (52.8%)
  //   615px  — city, state 30px gray Inter (56.9%)
  //   660px  — thin divider accent line (61.1%)
  //   710px  — height & weight 30px gray Inter (65.7%)
  //   755px  — GPA 30px white Inter (69.9%) — only if >= 3.0
  //   800px  — email 28px accentHex Inter (74.1%)
  //   840px  — phone 26px gray Inter (77.8%)
  //   880px  — coach contact 24px gray Inter (81.5%)
  //   1040px — CLIPT wordmark 20px gray Inter (96.3%)

  const videoTitleText = [
    [firstName, lastName].filter(Boolean).join(" "),
    sport ? `${sport} Recruiting Video` : null,
    gradYear ? `Class of ${gradYear}` : null,
  ].filter(Boolean).join(" — ");

  const heightWeight = [
    heightFt ? `${heightFt}'${heightIn || "0"}"` : null,
    weight   ? `${weight} lbs`                   : null,
  ].filter(Boolean).join(" — ");

  const gpaNum  = parseFloat(gpa || "");
  const showGpa = gpa && !isNaN(gpaNum) && gpaNum >= 3.0;

  const titleEls: unknown[] = [
    // Full background — #050A14 exact
    {
      type: "shape", shape: "rectangle",
      x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
      width: "100%", height: "100%", fill_color: "#050A14",
    },
    // Top accent stripe — 16px
    {
      type: "shape", shape: "rectangle",
      x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%",
      width: "100%", height: `${Math.round(16 * s)}px`, fill_color: accentHex,
    },
    // Bottom accent stripe — 16px
    {
      type: "shape", shape: "rectangle",
      x: "0%", y: "100%", x_anchor: "0%", y_anchor: "100%",
      width: "100%", height: `${Math.round(16 * s)}px`, fill_color: accentHex,
    },
  ];

  // Watermark texture — jersey number as huge faint background; fall back to sport text
  if (jerseyNumber) {
    titleEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(600 * s), font_weight: "900",
      fill_color: "#FFFFFF", font_family: "Oswald", opacity: 0.03,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  } else if (sport) {
    titleEls.push({
      type: "text", text: sport.toUpperCase(),
      x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(500 * s), font_weight: "900",
      fill_color: "#FFFFFF", font_family: "Oswald", opacity: 0.03,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Video title line — 34px at y 7.4% (+20% from 28px)
  if (videoTitleText) {
    titleEls.push({
      type: "text", text: videoTitleText,
      x: "50%", y: "7.4%", x_anchor: "50%", y_anchor: "50%", width: "90%",
      font_size: Math.round(34 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Achievement — 28px at y 11.5% (NEW)
  if (achievement) {
    titleEls.push({
      type: "text", text: achievement,
      x: "50%", y: "11.5%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(28 * s), fill_color: accentHex, font_family: "Inter", font_weight: "700",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Athlete full name — 90px at y 18.5%
  titleEls.push({
    type: "text", text: fullName,
    x: "50%", y: "18.5%", x_anchor: "50%", y_anchor: "50%", width: "90%",
    font_size: Math.round(90 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
    letter_spacing: "2%",
    shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
  });

  // Jersey number — 134px at y 29.6% (+20% from 112px)
  if (jerseyNumber) {
    titleEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "29.6%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(134 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Divider line — y 37.0%
  titleEls.push({
    type: "shape", shape: "rectangle",
    x: "50%", y: "37.0%", x_anchor: "50%", y_anchor: "50%",
    width: "80%", height: `${Math.max(1, Math.round(2 * s))}px`,
    fill_color: accentHex, opacity: 0.3,
  });

  // Position · sport — 52px at y 42.6%
  if (subLine) {
    titleEls.push({
      type: "text", text: subLine,
      x: "50%", y: "42.6%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(52 * s), fill_color: "#94a3b8", font_family: "Inter",
      letter_spacing: "8%",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // School name — 44px at y 48.1%
  if (school) {
    titleEls.push({
      type: "text", text: school,
      x: "50%", y: "48.1%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(44 * s), fill_color: "#FFFFFF", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Club team — 38px at y 52.8% (+20% from 32px)
  if (clubTeam) {
    titleEls.push({
      type: "text", text: clubTeam,
      x: "50%", y: "52.8%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(38 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Location — 36px at y 56.9%
  if (locationStr) {
    titleEls.push({
      type: "text", text: locationStr,
      x: "50%", y: "56.9%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(36 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Hometown — 34px at y 59.5% (only if different from locationStr)
  if (hometown && hometown !== locationStr) {
    titleEls.push({
      type: "text", text: hometown,
      x: "50%", y: "59.5%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(34 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Divider line — y 61.1%
  titleEls.push({
    type: "shape", shape: "rectangle",
    x: "50%", y: "61.1%", x_anchor: "50%", y_anchor: "50%",
    width: "80%", height: `${Math.max(1, Math.round(2 * s))}px`,
    fill_color: accentHex, opacity: 0.3,
  });

  // Height & weight — 36px at y 65.7% (+20% from 30px)
  if (heightWeight) {
    titleEls.push({
      type: "text", text: heightWeight,
      x: "50%", y: "65.7%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(36 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // GPA — 36px at y 69.9% — only if >= 3.0
  if (showGpa) {
    titleEls.push({
      type: "text", text: `GPA ${gpa}`,
      x: "50%", y: "69.9%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(36 * s), fill_color: "#FFFFFF", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Email — 34px at y 74.1% (+20% from 28px)
  if (email) {
    titleEls.push({
      type: "text", text: email,
      x: "50%", y: "74.1%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(34 * s), fill_color: accentHex, font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Social handle — 31px at y 77.0% (NEW)
  if (socialHandle) {
    titleEls.push({
      type: "text", text: socialHandle,
      x: "50%", y: "77.0%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(31 * s), fill_color: accentHex, font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Phone — 31px at y 79.8% (+20% from 26px)
  if (phone) {
    titleEls.push({
      type: "text", text: phone,
      x: "50%", y: "79.8%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(31 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Coach contact — 29px at y 83.0% (+20% from 24px)
  if (coachName || coachEmail) {
    const coachLine = `Coach: ${[coachName, coachEmail].filter(Boolean).join("  —  ")}`;
    titleEls.push({
      type: "text", text: coachLine,
      x: "50%", y: "83.0%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(29 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // CLIPT wordmark — 24px at y 96.3% (+20% from 20px)
  titleEls.push({
    type: "text", text: "POWERED BY CLIPT",
    x: "50%", y: "96.3%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(24 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
    shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
  });

  elements.push({ type: "composition", track: 1, time: currentTime, duration: TITLE_DUR, elements: titleEls });
  currentTime += TITLE_DUR;

  // ── 2. STATS CARD (5s) ───────────────────────────────────────────────────
  //
  // Layout (all centered):
  //   0px    — top accent stripe 14px
  //   60px   — "SEASON STATS" 36px accentHex (5.6%)
  //   160px  — athlete name 72px Oswald bold white (14.8%)
  //   230px  — position · sport 38px gray (21.3%)
  //   290px  — thin divider 2px accent 30% opacity (26.9%)
  //   Stats grid — 2 rows × 3 cols fixed at x 22%/50%/78%:
  //     Row 1 value: 38.9% (420px), Row 1 label: 47.2% (510px)
  //     Row 2 value: 59.3% (640px), Row 2 label: 67.6% (730px)
  //     Values: 96px Oswald bold accentHex
  //     Labels: 28px Inter gray
  //   980px  — "POWERED BY CLIPT" 22px gray (90.7%)
  //   1074px — bottom accent stripe 6px (99.4%)

  // Helper to build one stat slide composition
  function buildStatSlide(slideEntries: [string, string][]): unknown[] {
    const els: unknown[] = [
      { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
      { type: "shape", shape: "rectangle", x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%", width: "100%", height: `${Math.round(14 * s)}px`, fill_color: accentHex },
      { type: "shape", shape: "rectangle", x: "0%", y: "99.4%", x_anchor: "0%", y_anchor: "100%", width: "100%", height: `${Math.round(6 * s)}px`, fill_color: accentHex },
      { type: "text", text: "SEASON STATS", x: "50%", y: "5.6%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(36 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
      { type: "text", text: fullName, x: "50%", y: "14.8%", x_anchor: "50%", y_anchor: "50%", width: "90%", font_size: Math.round(72 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
      { type: "text", text: subLine, x: "50%", y: "21.3%", x_anchor: "50%", y_anchor: "50%", width: "80%", font_size: Math.round(38 * s), fill_color: "#64748b", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
      { type: "shape", shape: "rectangle", x: "50%", y: "26.9%", x_anchor: "50%", y_anchor: "50%", width: "90%", height: `${Math.max(1, Math.round(2 * s))}px`, fill_color: accentHex, opacity: 0.3 },
    ];
    const gridCols  = ["22%", "50%", "78%"];
    const rowValueY = ["38.9%", "59.3%"];
    const rowLabelY = ["47.2%", "67.6%"];
    slideEntries.forEach(([label, value], idx) => {
      const col = idx % 3, row = Math.floor(idx / 3);
      if (row > 1) return;
      els.push(
        { type: "text", text: value, x: gridCols[col], y: rowValueY[row], x_anchor: "50%", y_anchor: "50%", font_size: Math.round(96 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 },
        { type: "text", text: label.toUpperCase(), x: gridCols[col], y: rowLabelY[row], x_anchor: "50%", y_anchor: "50%", font_size: Math.round(28 * s), fill_color: "#64748b", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 }
      );
    });
    els.push({ type: "text", text: "POWERED BY CLIPT", x: "50%", y: "90.7%", x_anchor: "50%", y_anchor: "50%", font_size: Math.round(22 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter", shadow_color: "rgba(0,0,0,0)", shadow_blur: 0 });
    return els;
  }

  if (showStatsCard) {
    elements.push({ type: "composition", track: 1, time: currentTime, duration: STATS_DUR, elements: buildStatSlide(statsSlide1) });
    currentTime += STATS_DUR;
    // Second slide for 7+ stats
    if (statsSlide2.length > 0) {
      elements.push({ type: "composition", track: 1, time: currentTime, duration: STATS_DUR, elements: buildStatSlide(statsSlide2) });
      currentTime += STATS_DUR;
    }
  }

  // ── 3. CLIPS + SPOTLIGHT OVERLAY ─────────────────────────────────────────
  //
  // Spotlight = circle shape + name text on track 3 for first 1.5s of each clip.
  // Position driven by clip.markX / clip.markY (0–100%, default 50/40).
  //
  // Video fit "contain" for landscape (letterbox), "cover" for vertical social.

  clips.forEach((clip, idx) => {
    const trimStart    = clip.trimStart != null && clip.trimStart > 0 ? clip.trimStart : 0;
    const clipDur      = clip.duration || 10;
    const rawEnd       = clip.trimEnd  != null && clip.trimEnd  > 0 ? clip.trimEnd  : clipDur;
    const trimDuration = Math.max(rawEnd - trimStart, 1);

    const sectionStart = currentTime;

    // Landscape: fit "contain" so vertical source clips letterbox with black bars.
    // Vertical social 9:16: fit "cover" so vertical clips fill the frame perfectly.
    const videoFit   = isVertical ? "cover"  : "contain";
    const videoYAnch = isVertical ? "35%"    : "50%";

    const videoBase: Record<string, unknown> = {
      type:       "video",
      source:     clip.url,
      trim_start: trimStart,
      volume:     "0%",
      fit:        videoFit,
      x_anchor:   "50%",
      y_anchor:   videoYAnch,
    };

    // Black letterbox bars — always fill the composition background for landscape.
    const blackBg: Record<string, unknown> = {
      type:       "shape",
      shape:      "rectangle",
      fill_color: "#000000",
      width:      "100%",
      height:     "100%",
      x:          "50%",
      y:          "50%",
      x_anchor:   "50%",
      y_anchor:   "50%",
    };

    // ── Helper: build clip composition elements ──────────────────────────────
    function buildClipInnerEls(): unknown[] {
      const vid = { ...videoBase, width: "100%", height: "100%" };
      const innerEls: unknown[] = [];
      if (!isVertical) innerEls.push(blackBg);
      innerEls.push(vid);
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
      return innerEls;
    }

    // ── CLIP ──────────────────────────────────────────────────────────────────
    let clipEl: Record<string, unknown>;
    if (isVertical && !(jerseyOverlay && jerseyNumber)) {
      clipEl = {
        ...videoBase,
        track:    1,
        time:     sectionStart,
        duration: trimDuration,
      };
    } else {
      clipEl = {
        type:     "composition",
        track:    1,
        time:     sectionStart,
        duration: trimDuration,
        elements: buildClipInnerEls(),
      };
    }

    if (idx > 0) clipEl.transition = clipTransition;
    elements.push(clipEl);

    // ── SPOTLIGHT OVERLAY (track 3) ────────────────────────────────────────
    // Animated circle: scale 150%→100% on entry, fade out at 0.9s.
    if (spotlightStyle !== "none") {
      const markXPct   = clip.markX ?? 50;
      const markYPct   = clip.markY ?? 38;
      const circleSize = Math.round(130 * s);

      elements.push({
        type:         "shape",
        shape:        "ellipse",
        track:        3,
        time:         sectionStart,
        duration:     1.2,
        x:            `${markXPct}%`,
        y:            `${markYPct}%`,
        x_anchor:     "50%",
        y_anchor:     "50%",
        width:        `${circleSize}px`,
        height:       `${circleSize}px`,
        fill_color:   "rgba(0,0,0,0)",
        stroke_color: "#FFFFFF",
        stroke_width: Math.round(4 * s),
        shadow_color: "rgba(0,0,0,0.8)",
        shadow_blur:  16,
        animations: [
          { time: 0,   duration: 0.35, easing: "ease-out", type: "scale",   start_scale: "150%", end_scale: "100%" },
          { time: 0.9, duration: 0.30, easing: "ease-in",  type: "opacity", start_opacity: "100%", end_opacity: "0%" },
        ],
      });
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

  const topStats    = statsSlide1.slice(0, 3);
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
