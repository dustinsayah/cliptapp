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
  skillCategory?: string; // e.g. "Scoring", "Defensive", "Transition" — for divider cards
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
  city?: string;
  state?: string;

  // Recruiting contact
  coachName?: string;
  coachEmail?: string;

  // Stats
  statsData?: Record<string, string>;

  // Clips — prefer clips[] (has trim + category data), fall back to clipUrls[]
  clips?: ClipInput[];
  clipUrls?: string[];  // legacy — treated as clips with no trim data

  // Audio / style
  musicUrl?: string;
  music?: string;      // track identifier — "no-music" skips audio even if musicUrl set
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
    city         = "",
    state        = "",
    coachName    = "",
    coachEmail   = "",
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
  const cityState = [city, state].filter(Boolean).join(", ");

  const statsEntries = Object.entries(statsData)
    .filter(([, v]) => v?.trim())
    .slice(0, 6);
  const showStatsCard = statsEnabled !== false && statsEntries.length > 0;

  // ── Duration constants (seconds) ─────────────────────────────────────────
  const TITLE_DUR   = 6;
  const STATS_DUR   = 5;
  const END_DUR     = 5;
  const DIVIDER_DUR = 1.5;

  // ── Sport max duration warning ────────────────────────────────────────────
  const SPORT_MAX: Record<string, number> = { Basketball: 240, Football: 300, Lacrosse: 240 };
  const maxDur = SPORT_MAX[sport] ?? 300;
  const estimatedClipDur = clips.reduce((sum, c) => {
    const cs = c.trimStart ?? 0;
    const ce = c.trimEnd ?? (c.duration ?? 10);
    return sum + Math.max(ce - cs, 1);
  }, 0);
  const estimatedTotal = TITLE_DUR + (showStatsCard ? STATS_DUR : 0) + estimatedClipDur + END_DUR;
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
    // Top accent stripe — 14px
    {
      type: "shape", shape: "rectangle",
      x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%",
      width: "100%", height: `${Math.round(14 * s)}px`, fill_color: accentHex,
    },
  ];

  // Watermark texture — sport name in huge faint text as background pattern
  if (sport) {
    titleEls.push({
      type: "text", text: sport.toUpperCase(),
      x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(400 * s), font_weight: "900",
      fill_color: "#FFFFFF", font_family: "Oswald", opacity: 0.04,
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Video title line — 28px at y 80 (7.4%)
  if (videoTitleText) {
    titleEls.push({
      type: "text", text: videoTitleText,
      x: "50%", y: "7.4%", x_anchor: "50%", y_anchor: "50%", width: "90%",
      font_size: Math.round(28 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Athlete full name — 96px at y 200 (18.5%)
  titleEls.push({
    type: "text", text: fullName,
    x: "50%", y: "18.5%", x_anchor: "50%", y_anchor: "50%", width: "90%",
    font_size: Math.round(96 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
    shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
  });

  // Jersey number — 112px at y 320 (29.6%)
  if (jerseyNumber) {
    titleEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "29.6%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(112 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Divider line — y 400 (37.0%)
  titleEls.push({
    type: "shape", shape: "rectangle",
    x: "50%", y: "37.0%", x_anchor: "50%", y_anchor: "50%",
    width: "80%", height: `${Math.max(1, Math.round(2 * s))}px`,
    fill_color: accentHex, opacity: 0.3,
  });

  // Position · sport — 42px at y 460 (42.6%)
  if (subLine) {
    titleEls.push({
      type: "text", text: subLine,
      x: "50%", y: "42.6%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(42 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // School name — 36px at y 520 (48.1%)
  if (school) {
    titleEls.push({
      type: "text", text: school,
      x: "50%", y: "48.1%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(36 * s), fill_color: "#FFFFFF", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Club team — 32px at y 570 (52.8%)
  if (clubTeam) {
    titleEls.push({
      type: "text", text: clubTeam,
      x: "50%", y: "52.8%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(32 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // City, state — 30px at y 615 (56.9%)
  if (cityState) {
    titleEls.push({
      type: "text", text: cityState,
      x: "50%", y: "56.9%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(30 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Divider line — y 660 (61.1%)
  titleEls.push({
    type: "shape", shape: "rectangle",
    x: "50%", y: "61.1%", x_anchor: "50%", y_anchor: "50%",
    width: "80%", height: `${Math.max(1, Math.round(2 * s))}px`,
    fill_color: accentHex, opacity: 0.3,
  });

  // Height & weight — 30px at y 710 (65.7%)
  if (heightWeight) {
    titleEls.push({
      type: "text", text: heightWeight,
      x: "50%", y: "65.7%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(30 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // GPA — 30px at y 755 (69.9%) — only if >= 3.0
  if (showGpa) {
    titleEls.push({
      type: "text", text: `GPA ${gpa}`,
      x: "50%", y: "69.9%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(30 * s), fill_color: "#FFFFFF", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Email — 28px at y 800 (74.1%)
  if (email) {
    titleEls.push({
      type: "text", text: email,
      x: "50%", y: "74.1%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(28 * s), fill_color: accentHex, font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Phone — 26px at y 840 (77.8%)
  if (phone) {
    titleEls.push({
      type: "text", text: phone,
      x: "50%", y: "77.8%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(26 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Coach contact — 24px at y 880 (81.5%)
  if (coachName || coachEmail) {
    const coachLine = `Coach: ${[coachName, coachEmail].filter(Boolean).join("  —  ")}`;
    titleEls.push({
      type: "text", text: coachLine,
      x: "50%", y: "81.5%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(24 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // CLIPT wordmark — 20px at y 1040 (96.3%)
  titleEls.push({
    type: "text", text: "POWERED BY CLIPT",
    x: "50%", y: "96.3%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(20 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
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

  if (showStatsCard) {
    const statCardEls: unknown[] = [
      // Full background — #050A14 exact
      {
        type: "shape", shape: "rectangle",
        x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
        width: "100%", height: "100%", fill_color: "#050A14",
      },
      // Top accent stripe — 14px
      {
        type: "shape", shape: "rectangle",
        x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%",
        width: "100%", height: `${Math.round(14 * s)}px`, fill_color: accentHex,
      },
      // Bottom accent stripe — 6px at y 1074 (99.4%)
      {
        type: "shape", shape: "rectangle",
        x: "0%", y: "99.4%", x_anchor: "0%", y_anchor: "100%",
        width: "100%", height: `${Math.round(6 * s)}px`, fill_color: accentHex,
      },
      // "SEASON STATS" header — 36px at y 60 (5.6%)
      {
        type: "text", text: "SEASON STATS",
        x: "50%", y: "5.6%", x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(36 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter",
        shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
      },
      // Athlete name — 72px at y 160 (14.8%)
      {
        type: "text", text: fullName,
        x: "50%", y: "14.8%", x_anchor: "50%", y_anchor: "50%", width: "90%",
        font_size: Math.round(72 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
        shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
      },
      // Position · sport — 38px at y 230 (21.3%)
      {
        type: "text", text: subLine,
        x: "50%", y: "21.3%", x_anchor: "50%", y_anchor: "50%", width: "80%",
        font_size: Math.round(38 * s), fill_color: "#64748b", font_family: "Inter",
        shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
      },
      // Divider — 2px accent 30% opacity at y 290 (26.9%)
      {
        type: "shape", shape: "rectangle",
        x: "50%", y: "26.9%", x_anchor: "50%", y_anchor: "50%",
        width: "90%", height: `${Math.max(1, Math.round(2 * s))}px`,
        fill_color: accentHex, opacity: 0.3,
      },
    ];

    // Stats grid — fixed 3-column layout
    const gridCols  = ["22%", "50%", "78%"];
    const rowValueY = ["38.9%", "59.3%"];
    const rowLabelY = ["47.2%", "67.6%"];

    statsEntries.forEach(([label, value], idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      if (row > 1) return; // max 6 stats (2 rows × 3 cols)
      statCardEls.push(
        {
          type: "text", text: value,
          x: gridCols[col], y: rowValueY[row], x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(96 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald",
          shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
        },
        {
          type: "text", text: label.toUpperCase(),
          x: gridCols[col], y: rowLabelY[row], x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(28 * s), fill_color: "#64748b", font_family: "Inter",
          shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
        }
      );
    });

    // "POWERED BY CLIPT" — 22px at y 980 (90.7%)
    statCardEls.push({
      type: "text", text: "POWERED BY CLIPT",
      x: "50%", y: "90.7%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(22 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });

    elements.push({ type: "composition", track: 1, time: currentTime, duration: STATS_DUR, elements: statCardEls });
    currentTime += STATS_DUR;
  }

  // ── 3. CLIPS + SPOTLIGHT OVERLAY + CATEGORY DIVIDERS ─────────────────────
  //
  // Spotlight is a text overlay on track 3 covering the first 2s of each clip.
  // No separate freeze-frame composition — reel length stays short.
  //
  // Video fit "cover" + y_anchor "35%" biases smart-crop toward upper frame
  // (faces, jersey numbers) for both landscape and vertical source clips.

  let prevCategory: string | undefined = undefined;

  clips.forEach((clip, idx) => {
    const trimStart    = clip.trimStart != null && clip.trimStart > 0 ? clip.trimStart : 0;
    const clipDur      = clip.duration || 10;
    const rawEnd       = clip.trimEnd  != null && clip.trimEnd  > 0 ? clip.trimEnd  : clipDur;
    const trimDuration = Math.max(rawEnd - trimStart, 1);
    const category     = clip.skillCategory;

    // Category divider between clips of different categories
    if (idx > 0 && category && prevCategory && category !== prevCategory) {
      const divEls: unknown[] = [
        {
          type: "shape", shape: "rectangle",
          x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
          width: "100%", height: "100%", fill_color: "#050A14",
        },
        {
          type: "shape", shape: "rectangle",
          x: "0%", y: "50%", x_anchor: "0%", y_anchor: "50%",
          width: `${Math.round(6 * s)}px`, height: "100%", fill_color: accentHex,
        },
        {
          type: "text", text: category.toUpperCase(),
          x: "50%", y: "45%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(60 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
          shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
        },
        {
          type: "text", text: "POWERED BY CLIPT",
          x: "50%", y: "88%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(11 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
          shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
        },
      ];
      elements.push({ type: "composition", track: 1, time: currentTime, duration: DIVIDER_DUR, elements: divEls });
      currentTime += DIVIDER_DUR;
    }
    prevCategory = category;

    const clipStartTime = currentTime;

    // Video element — cover fill, crop biased to upper 35% to keep faces in frame
    const videoBase: Record<string, unknown> = {
      type:       "video",
      source:     clip.url,
      trim_start: trimStart,
      volume:     "0%",
      fit:        "cover",
      x_anchor:   "50%",
      y_anchor:   "35%",
    };

    let clipEl: Record<string, unknown>;

    if (jerseyOverlay && jerseyNumber) {
      // Wrap in composition so jersey text overlays the video
      clipEl = {
        type:     "composition",
        track:    1,
        time:     clipStartTime,
        duration: trimDuration,
        elements: [
          { ...videoBase, width: "100%", height: "100%" },
          {
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
          },
        ],
      };
    } else {
      clipEl = {
        ...videoBase,
        track:    1,
        time:     clipStartTime,
        duration: trimDuration,
      };
    }

    if (idx > 0) {
      clipEl.transition = clipTransition;
    }

    elements.push(clipEl);

    // Spotlight text overlay — track 3, first 2s of this clip only
    if (spotlightStyle !== "none" && trimDuration >= 2) {
      const spotlightLabel = (lastName || firstName).toUpperCase();
      const spotlightText  = spotlightStyle === "arrow"
        ? `▼  ${spotlightLabel}`
        : spotlightLabel;

      const spotEl: Record<string, unknown> = {
        type:                 "text",
        track:                3,
        time:                 clipStartTime,
        duration:             2,
        text:                 spotlightText,
        font_family:          "Oswald",
        font_size:            Math.round(36 * s),
        font_weight:          "700",
        fill_color:           accentHex,
        background_color:     "rgba(0,0,0,0.7)",
        background_x_padding: "3%",
        background_y_padding: "2%",
        x:            "50%",
        y:            "88%",
        x_anchor:     "50%",
        y_anchor:     "50%",
        shadow_color: "rgba(0,0,0,0)",
        shadow_blur:  0,
      };
      elements.push(spotEl);
    }

    currentTime += trimDuration;
  });

  // ── 4. END CARD (5s) — full-frame layout, no blank regions ───────────────
  //
  // Pixel positions ÷ 1080 = percentage. Layout (all centered):
  //   0px    — top accent stripe 12px
  //   120px  — "RECRUITING CONTACT" 32px gray (11.1%)
  //   220px  — athlete full name 96px white Oswald (20.4%)
  //   310px  — jersey # 80px accentHex Oswald (28.7%)
  //   390px  — position · sport 42px gray (36.1%)
  //   440px  — school 38px white (40.7%)
  //   485px  — city, state — class of year 32px gray (44.9%)
  //   530px  — divider 2px accentHex 40% opacity (49.1%)
  //   590px  — email 34px accentHex (54.6%)
  //   635px  — phone 30px gray (58.8%)
  //   680px  — coach contact 28px gray (63.0%)
  //   780px  — stats values 80px accentHex Oswald (72.2%)
  //   810px  — stats labels 26px gray (75.0%)
  //   1020px — "POWERED BY CLIPT" 22px gray (94.4%)
  //   1068px — bottom accent stripe 12px

  const topStats    = statsEntries.slice(0, 3);
  const endStatCols = Math.min(topStats.length, 3);
  const endColX: Record<number, string[]> = {
    0: [],
    1: ["50%"],
    2: ["25%", "75%"],
    3: ["25%", "50%", "75%"],
  };

  const cityStateGrad = [
    cityState,
    gradYear ? `Class of ${gradYear}` : "",
  ].filter(Boolean).join("  —  ");

  const endEls: unknown[] = [
    // Full background — #050A14 exact
    {
      type: "shape", shape: "rectangle",
      x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
      width: "100%", height: "100%", fill_color: "#050A14",
    },
    // Top accent stripe — 12px
    {
      type: "shape", shape: "rectangle",
      x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%",
      width: "100%", height: `${Math.round(12 * s)}px`, fill_color: accentHex,
    },
    // Bottom accent stripe — 12px
    {
      type: "shape", shape: "rectangle",
      x: "0%", y: "100%", x_anchor: "0%", y_anchor: "100%",
      width: "100%", height: `${Math.round(12 * s)}px`, fill_color: accentHex,
    },
    // "RECRUITING CONTACT" — 32px at 11.1%
    {
      type: "text", text: "RECRUITING CONTACT",
      x: "50%", y: "11.1%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(32 * s), font_weight: "700",
      fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    },
    // Athlete full name — 96px at 20.4%
    {
      type: "text", text: fullName,
      x: "50%", y: "20.4%", x_anchor: "50%", y_anchor: "50%", width: "90%",
      font_size: Math.round(96 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    },
  ];

  // Jersey # — 80px at 28.7%
  if (jerseyNumber) {
    endEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "28.7%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(80 * s), font_weight: "700", fill_color: accentHex, font_family: "Oswald",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Position · sport — 42px at 36.1%
  if (subLine) {
    endEls.push({
      type: "text", text: subLine,
      x: "50%", y: "36.1%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(42 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // School — 38px at 40.7%
  if (school) {
    endEls.push({
      type: "text", text: school,
      x: "50%", y: "40.7%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(38 * s), fill_color: "#FFFFFF", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // City, State — Class of YYYY — 32px at 44.9%
  if (cityStateGrad) {
    endEls.push({
      type: "text", text: cityStateGrad,
      x: "50%", y: "44.9%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(32 * s), fill_color: "#64748b", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Divider line — 530px = 49.1%, 2px, 40% opacity
  endEls.push({
    type: "shape", shape: "rectangle",
    x: "50%", y: "49.1%", x_anchor: "50%", y_anchor: "50%",
    width: "90%", height: `${Math.max(1, Math.round(2 * s))}px`,
    fill_color: accentHex, opacity: 0.4,
  });

  // Email — 34px at 54.6%
  if (email) {
    endEls.push({
      type: "text", text: `\u2709  ${email}`,
      x: "50%", y: "54.6%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(34 * s), fill_color: accentHex, font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Phone — 30px at 58.8%
  if (phone) {
    endEls.push({
      type: "text", text: phone,
      x: "50%", y: "58.8%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(30 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Coach contact — 28px at 63.0%
  if (coachName || coachEmail) {
    const coachLine = `Coach: ${[coachName, coachEmail].filter(Boolean).join("  —  ")}`;
    endEls.push({
      type: "text", text: coachLine,
      x: "50%", y: "63.0%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(28 * s), fill_color: "#94a3b8", font_family: "Inter",
      shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
    });
  }

  // Stats row — values 80px at 72.2%, labels 26px at 75.0%
  if (topStats.length > 0) {
    topStats.forEach(([label, value], i) => {
      const xPos = endColX[endStatCols][i];
      endEls.push(
        {
          type: "text", text: value,
          x: xPos, y: "72.2%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(80 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald",
          shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
        },
        {
          type: "text", text: label.toUpperCase(),
          x: xPos, y: "75.0%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(26 * s), fill_color: "#64748b", font_family: "Inter",
          shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
        }
      );
    });
  }

  // "POWERED BY CLIPT" — 22px at 94.4%
  endEls.push({
    type: "text", text: "POWERED BY CLIPT  \u00B7  CLIPTAPP.COM",
    x: "50%", y: "94.4%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(22 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
    shadow_color: "rgba(0,0,0,0)", shadow_blur: 0,
  });

  elements.push({ type: "composition", track: 1, time: currentTime, duration: END_DUR, elements: endEls });

  const totalDuration = currentTime + END_DUR;

  // ── 5. MUSIC — root-level audio on track 2 ───────────────────────────────
  //
  // CRITICAL: This element must be a direct child of the root `elements` array.
  // It must NOT be nested inside any composition element.
  //
  // Condition: add audio if musicUrl is set AND music id is not "no-music".
  const shouldAddMusic = !!musicUrl && music !== "no-music";
  console.log("MUSIC DECISION: shouldAdd =", shouldAddMusic,
    "| musicUrl =", musicUrl ?? "null",
    "| music =", music ?? "undefined");

  if (shouldAddMusic) {
    const audioEl = {
      type:           "audio",
      track:          2,
      source:         musicUrl,
      time:           0,
      duration:       totalDuration,
      trim_start:     0,
      volume:         "35%",
      audio_fade_in:  2,
      audio_fade_out: 3,
    };
    console.log("AUDIO ELEMENT:", JSON.stringify(audioEl));
    elements.push(audioEl);
  }

  return {
    output_format: "mp4",
    codec:         "h264",
    audio_codec:   "aac",
    quality:       100,
    width,
    height,
    frame_rate:    30,
    elements,
  };
}

// ── Social 9:16 helper ────────────────────────────────────────────────────────
// Convenience — just call startRender with width:1080, height:1920 directly.
export function buildSocialInput(input: ReelRenderInput): ReelRenderInput {
  return { ...input, width: 1080, height: 1920 };
}
