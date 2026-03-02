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
  const fullName   = [firstName, lastName].filter(Boolean).join(" ").toUpperCase();
  const subLine    = [position, sport].filter(Boolean).join("  ·  ").toUpperCase();
  const infoLine   = [school, gradYear ? `Class of ${gradYear}` : ""].filter(Boolean).join("  ·  ");
  const heightStr  = heightFt ? `${heightFt}'${heightIn || "0"}"` : "";
  const cityState  = [city, state].filter(Boolean).join(", ");

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
  const titleEls: unknown[] = [
    { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
    { type: "shape", shape: "rectangle", x: "50%", y: "0%",  x_anchor: "50%", y_anchor: "0%",  width: "100%", height: `${Math.round(8 * s)}px`, fill_color: accentHex },
    { type: "shape", shape: "rectangle", x: "0%",  y: "50%", x_anchor: "0%",  y_anchor: "50%", width: `${Math.round(6 * s)}px`, height: "100%", fill_color: accentHex, opacity: 0.4 },
    {
      type: "text", text: fullName,
      x: "6%", y: "30%", x_anchor: "0%", y_anchor: "50%", width: "80%",
      font_size: Math.round(76 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
    },
  ];

  if (jerseyNumber) {
    titleEls.push(
      {
        type: "text", text: `#${jerseyNumber}`,
        x: "90%", y: "35%", x_anchor: "100%", y_anchor: "50%",
        font_size: Math.round(120 * s), font_weight: "900", fill_color: accentHex,
        font_family: "Oswald", opacity: 0.15,
      },
      {
        type: "text", text: `#${jerseyNumber}`,
        x: "6%", y: "43%", x_anchor: "0%", y_anchor: "50%",
        font_size: Math.round(34 * s), font_weight: "700", fill_color: accentHex, font_family: "Oswald",
      }
    );
  }

  if (subLine) {
    titleEls.push({
      type: "text", text: subLine,
      x: "6%", y: jerseyNumber ? "51%" : "43%", x_anchor: "0%", y_anchor: "50%", width: "75%",
      font_size: Math.round(22 * s), font_weight: "600", fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  if (infoLine) {
    titleEls.push({
      type: "text", text: infoLine,
      x: "6%", y: jerseyNumber ? "58%" : "51%", x_anchor: "0%", y_anchor: "50%", width: "75%",
      font_size: Math.round(18 * s), font_weight: "400", fill_color: "#64748b", font_family: "Inter",
    });
  }

  titleEls.push({
    type: "shape", shape: "rectangle",
    x: "6%", y: "64%", x_anchor: "0%", y_anchor: "50%",
    width: "50%", height: `${Math.max(1, Math.round(1 * s))}px`, fill_color: "#1E293B",
  });

  const emailHeight = [email, heightStr && `Height: ${heightStr}`].filter(Boolean).join("   ·   ");
  if (emailHeight) {
    titleEls.push({
      type: "text", text: emailHeight,
      x: "6%", y: "70%", x_anchor: "0%", y_anchor: "50%", width: "75%",
      font_size: Math.round(17 * s), fill_color: accentHex, font_family: "Inter",
    });
  }

  if (clubTeam) {
    titleEls.push({
      type: "text", text: clubTeam,
      x: "6%", y: "77%", x_anchor: "0%", y_anchor: "50%", width: "60%",
      font_size: Math.round(16 * s), fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  const locationPhone = [cityState, phone].filter(Boolean).join("   ·   ");
  if (locationPhone) {
    titleEls.push({
      type: "text", text: locationPhone,
      x: "6%", y: clubTeam ? "83%" : "77%", x_anchor: "0%", y_anchor: "50%", width: "70%",
      font_size: Math.round(15 * s), fill_color: "#64748b", font_family: "Inter",
    });
  }

  titleEls.push({
    type: "text", text: "POWERED BY CLIPT",
    x: "50%", y: "94%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(12 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
  });

  elements.push({ type: "composition", track: 1, time: currentTime, duration: TITLE_DUR, elements: titleEls });
  currentTime += TITLE_DUR;

  // ── 2. STATS CARD (5s) ───────────────────────────────────────────────────
  if (showStatsCard) {
    const cols = Math.min(statsEntries.length, 3);
    const colX: Record<number, string[]> = {
      1: ["50%"],
      2: ["30%", "70%"],
      3: ["20%", "50%", "80%"],
    };
    const rowY: [string, string][] = [["43%", "55%"], ["70%", "82%"]];

    const statCardEls: unknown[] = [
      { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
      { type: "shape", shape: "rectangle", x: "50%", y: "0%",  x_anchor: "50%", y_anchor: "0%",  width: "100%", height: `${Math.round(6 * s)}px`, fill_color: accentHex },
      {
        type: "text", text: "SEASON STATS",
        x: "50%", y: "11%", x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(20 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter",
      },
      {
        type: "text", text: fullName,
        x: "50%", y: "22%", x_anchor: "50%", y_anchor: "50%", width: "85%",
        font_size: Math.round(42 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
      },
      {
        type: "text", text: subLine,
        x: "50%", y: "30%", x_anchor: "50%", y_anchor: "50%", width: "80%",
        font_size: Math.round(16 * s), fill_color: "#64748b", font_family: "Inter",
      },
    ];

    statsEntries.forEach(([label, value], idx) => {
      const col  = idx % cols;
      const row  = Math.min(Math.floor(idx / cols), 1);
      const xPos = colX[cols][col];
      const [vy, ly] = rowY[row];
      statCardEls.push(
        {
          type: "text", text: value,
          x: xPos, y: vy, x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(52 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald",
        },
        {
          type: "text", text: label.toUpperCase(),
          x: xPos, y: ly, x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(14 * s), fill_color: "#64748b", font_family: "Inter",
        }
      );
    });

    statCardEls.push({
      type: "text", text: "POWERED BY CLIPT",
      x: "50%", y: "94%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(12 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
    });

    elements.push({ type: "composition", track: 1, time: currentTime, duration: STATS_DUR, elements: statCardEls });
    currentTime += STATS_DUR;
  }

  // ── 3. CLIPS + SPOTLIGHT OVERLAY + CATEGORY DIVIDERS ─────────────────────
  //
  // Spotlight is NOT a separate freeze-frame composition — it is a text overlay
  // on track 3 covering the first 2 seconds of each clip. This keeps reel length
  // short and avoids Creatomate freeze-frame limitations.
  //
  // Video fit "cover" with y_anchor "35%" biases smart-crop toward the upper
  // portion of the frame (faces, jersey numbers) rather than centering on the
  // ground — works correctly for both landscape and vertical source clips.

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
        { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
        {
          type: "shape", shape: "rectangle",
          x: "0%", y: "50%", x_anchor: "0%", y_anchor: "50%",
          width: `${Math.round(6 * s)}px`, height: "100%", fill_color: accentHex,
        },
        {
          type: "text", text: category.toUpperCase(),
          x: "50%", y: "45%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(60 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
        },
        {
          type: "text", text: "POWERED BY CLIPT",
          x: "50%", y: "88%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(11 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
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
            x:        "5%",
            y:        "90%",
            x_anchor: "0%",
            y_anchor: "50%",
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
    // No separate composition needed — avoids adding dead time to the reel
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
        x:        "50%",
        y:        "88%",
        x_anchor: "50%",
        y_anchor: "50%",
      };
      elements.push(spotEl);
    }

    currentTime += trimDuration;
  });

  // ── 4. END CARD (5s) — full-frame layout, no blank regions ───────────────
  //
  // Pixel positions are specified at 1080p then scaled by `s`.
  // Layout (top→bottom, all centered):
  //   0px   — top accent stripe (12px)
  //   120px — "RECRUITING CONTACT" label
  //   220px — Athlete full name (72px)
  //   310px — Jersey # (56px)
  //   390px — Position · Sport (30px)
  //   440px — School (26px)
  //   485px — City, State — Class of YYYY (22px)
  //   530px — Divider line (2px, accentHex, 40% opacity)
  //   590px — Email (24px)
  //   635px — Phone (22px)   [if provided]
  //   680px — Coach contact (20px)  [if provided]
  //   780px — Stats values (52px)   [top 3 only]
  //   810px — Stats labels (18px)
  //   1020px — "Powered by CLIPT" (16px)
  //   1068px — bottom accent stripe (12px)

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
    // Full background
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
    // "RECRUITING CONTACT" — 120px ÷ 1080 = 11.1%
    {
      type: "text", text: "RECRUITING CONTACT",
      x: "50%", y: "11.1%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(20 * s), font_weight: "700",
      fill_color: "#64748b", font_family: "Inter",
    },
    // Athlete full name — 220px = 20.4%
    {
      type: "text", text: fullName,
      x: "50%", y: "20.4%", x_anchor: "50%", y_anchor: "50%", width: "90%",
      font_size: Math.round(72 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
    },
  ];

  // Jersey # — 310px = 28.7%
  if (jerseyNumber) {
    endEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "28.7%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(56 * s), font_weight: "700", fill_color: accentHex, font_family: "Oswald",
    });
  }

  // Position · Sport — 390px = 36.1%
  if (subLine) {
    endEls.push({
      type: "text", text: subLine,
      x: "50%", y: "36.1%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(30 * s), fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  // School — 440px = 40.7%
  if (school) {
    endEls.push({
      type: "text", text: school,
      x: "50%", y: "40.7%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(26 * s), fill_color: "#FFFFFF", font_family: "Inter",
    });
  }

  // City, State — Class of YYYY — 485px = 44.9%
  if (cityStateGrad) {
    endEls.push({
      type: "text", text: cityStateGrad,
      x: "50%", y: "44.9%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(22 * s), fill_color: "#64748b", font_family: "Inter",
    });
  }

  // Divider line — 530px = 49.1%, full width, 2px, 40% opacity
  endEls.push({
    type: "shape", shape: "rectangle",
    x: "50%", y: "49.1%", x_anchor: "50%", y_anchor: "50%",
    width: "90%", height: `${Math.max(1, Math.round(2 * s))}px`,
    fill_color: accentHex, opacity: 0.4,
  });

  // Email — 590px = 54.6%
  if (email) {
    endEls.push({
      type: "text", text: `\u2709  ${email}`,
      x: "50%", y: "54.6%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(24 * s), fill_color: accentHex, font_family: "Inter",
    });
  }

  // Phone — 635px = 58.8%
  if (phone) {
    endEls.push({
      type: "text", text: phone,
      x: "50%", y: "58.8%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(22 * s), fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  // Coach contact — 680px = 63.0%
  if (coachName || coachEmail) {
    const coachLine = `Coach: ${[coachName, coachEmail].filter(Boolean).join("  —  ")}`;
    endEls.push({
      type: "text", text: coachLine,
      x: "50%", y: "63.0%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(20 * s), fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  // Stats row — values at 780px = 72.2%, labels at 810px = 75.0%
  if (topStats.length > 0) {
    topStats.forEach(([label, value], i) => {
      const xPos = endColX[endStatCols][i];
      endEls.push(
        {
          type: "text", text: value,
          x: xPos, y: "72.2%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(52 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald",
        },
        {
          type: "text", text: label.toUpperCase(),
          x: xPos, y: "75.0%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(18 * s), fill_color: "#64748b", font_family: "Inter",
        }
      );
    });
  }

  // "Powered by CLIPT" — 1020px = 94.4%
  endEls.push({
    type: "text", text: "POWERED BY CLIPT  \u00B7  CLIPTAPP.COM",
    x: "50%", y: "94.4%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(16 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
  });

  elements.push({ type: "composition", track: 1, time: currentTime, duration: END_DUR, elements: endEls });

  const totalDuration = currentTime + END_DUR;

  // ── 5. MUSIC — root-level audio on track 2 ───────────────────────────────
  //
  // CRITICAL: This element must be a direct child of the root `elements` array.
  // It must NOT be nested inside any composition element. Creatomate requires
  // audio to be at the root level to include it in the final render.
  //
  // Condition: add audio if musicUrl is set AND music id is not "no-music".
  const shouldAddMusic = !!musicUrl && music !== "no-music";
  console.log("MUSIC DECISION: shouldAdd =", shouldAddMusic,
    "| musicUrl =", musicUrl ?? "null",
    "| music =", music ?? "undefined");

  if (shouldAddMusic) {
    const audioEl = {
      type:            "audio",
      track:           2,
      source:          musicUrl,
      time:            0,
      duration:        totalDuration,
      trim_start:      0,
      volume:          "35%",
      audio_fade_in:   2,
      audio_fade_out:  3,
    };
    console.log("AUDIO ELEMENT:", JSON.stringify(audioEl));
    elements.push(audioEl);
  }

  return {
    output_format: "mp4",
    codec:         "h264",
    audio_codec:   "aac",
    quality:       95,
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
