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
  accentHex?: string;

  // Dimensions
  width?: number;
  height?: number;

  // Overlay options
  transitionStyle?: string;
  jerseyOverlay?: boolean;   // show jersey # lower-third on all clips
  statsEnabled?: boolean;    // include season stats card

  // New creative options
  spotlightStyle?: "arrow" | "circle" | "none"; // 2s card before each clip
  exportType?: "coach" | "social";               // informational; dimensions driven by width/height
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
    accentHex    = "#00A3FF",
    width        = 1920,
    height       = 1080,
    transitionStyle = "Hard Cut",
    jerseyOverlay   = false,
    statsEnabled    = true,
    spotlightStyle  = "none",
  } = input;

  const s = height / 1080; // scale factor — all pixel sizes are 1080p references

  // Normalize clip list — prefer clips[] (has trim + category data), fall back to clipUrls[]
  const clips: ClipInput[] =
    rawClips && rawClips.length > 0
      ? rawClips
      : (clipUrls || []).map(url => ({ url }));

  if (clips.length === 0) throw new Error("No clips provided to buildReelSource");

  const fullName  = [firstName, lastName].filter(Boolean).join(" ").toUpperCase();
  const subLine   = [position, sport].filter(Boolean).join("  ·  ").toUpperCase();
  const infoLine  = [school, gradYear ? `Class of ${gradYear}` : ""].filter(Boolean).join("  ·  ");
  const heightStr = heightFt ? `${heightFt}'${heightIn || "0"}"` : "";
  const cityState = [city, state].filter(Boolean).join(", ");

  const statsEntries = Object.entries(statsData)
    .filter(([, v]) => v?.trim())
    .slice(0, 6);
  const showStatsCard = statsEnabled !== false && statsEntries.length > 0;

  // Duration constants (seconds)
  const TITLE_DUR     = 6;    // upgraded from 4s
  const STATS_DUR     = 5;    // upgraded from 4s
  const END_DUR       = 5;
  const SPOTLIGHT_DUR = 2;    // before each clip (if spotlightStyle !== "none")
  const DIVIDER_DUR   = 1.5;  // between clips of different skill categories

  // Transition map
  const transitionMap: Record<string, Record<string, unknown>> = {
    "Fade to Black": { type: "fade",      duration: 0.5, color: "#000000" },
    "Crossfade":     { type: "crossfade", duration: 0.4 },
    "Flash Cut":     { type: "fade",      duration: 0.2, color: "#FFFFFF" },
    "Hard Cut":      { type: "fade",      duration: 0.1, color: "#000000" },
  };
  const clipTransition = transitionMap[transitionStyle] ?? { type: "fade", duration: 0.1, color: "#000000" };

  const elements: unknown[] = [];
  let currentTime = 0;

  // ── 1. TITLE CARD (6s) — ESPN-style, all athlete info ─────────────────────
  const titleEls: unknown[] = [
    // Background
    { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
    // Top accent stripe (8px at 1080p)
    { type: "shape", shape: "rectangle", x: "50%", y: "0%", x_anchor: "50%", y_anchor: "0%", width: "100%", height: Math.round(8 * s), fill_color: accentHex },
    // Left accent stripe
    { type: "shape", shape: "rectangle", x: "0%", y: "50%", x_anchor: "0%", y_anchor: "50%", width: Math.round(6 * s), height: "100%", fill_color: accentHex, opacity: 0.4 },
    // Athlete full name — large
    {
      type: "text", text: fullName,
      x: "6%", y: "30%", x_anchor: "0%", y_anchor: "50%", width: "80%",
      font_size: Math.round(76 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
    },
  ];

  // Jersey # — right side, large watermark
  if (jerseyNumber) {
    titleEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "90%", y: "35%", x_anchor: "100%", y_anchor: "50%",
      font_size: Math.round(120 * s), font_weight: "900", fill_color: accentHex,
      font_family: "Oswald", opacity: 0.15,
    });
    titleEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "6%", y: "43%", x_anchor: "0%", y_anchor: "50%",
      font_size: Math.round(34 * s), font_weight: "700", fill_color: accentHex, font_family: "Oswald",
    });
  }

  // Position · Sport
  if (subLine) {
    titleEls.push({
      type: "text", text: subLine,
      x: "6%", y: jerseyNumber ? "51%" : "43%", x_anchor: "0%", y_anchor: "50%", width: "75%",
      font_size: Math.round(22 * s), font_weight: "600", fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  // School · Grad year
  if (infoLine) {
    titleEls.push({
      type: "text", text: infoLine,
      x: "6%", y: jerseyNumber ? "58%" : "51%", x_anchor: "0%", y_anchor: "50%", width: "75%",
      font_size: Math.round(18 * s), font_weight: "400", fill_color: "#64748b", font_family: "Inter",
    });
  }

  // Divider line
  titleEls.push({
    type: "shape", shape: "rectangle",
    x: "6%", y: "64%", x_anchor: "0%", y_anchor: "50%",
    width: "50%", height: Math.round(1 * s), fill_color: "#1E293B",
  });

  // Email + height on same row
  const emailHeight = [email, heightStr && `Height: ${heightStr}`].filter(Boolean).join("   ·   ");
  if (emailHeight) {
    titleEls.push({
      type: "text", text: emailHeight,
      x: "6%", y: "70%", x_anchor: "0%", y_anchor: "50%", width: "75%",
      font_size: Math.round(17 * s), fill_color: accentHex, font_family: "Inter",
    });
  }

  // Club team
  if (clubTeam) {
    titleEls.push({
      type: "text", text: clubTeam,
      x: "6%", y: "77%", x_anchor: "0%", y_anchor: "50%", width: "60%",
      font_size: Math.round(16 * s), fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  // City, State | Phone
  const locationPhone = [cityState, phone].filter(Boolean).join("   ·   ");
  if (locationPhone) {
    titleEls.push({
      type: "text", text: locationPhone,
      x: "6%", y: clubTeam ? "83%" : "77%", x_anchor: "0%", y_anchor: "50%", width: "70%",
      font_size: Math.round(15 * s), fill_color: "#64748b", font_family: "Inter",
    });
  }

  // CLIPT watermark
  titleEls.push({
    type: "text", text: "POWERED BY CLIPT",
    x: "50%", y: "94%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(12 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
  });

  elements.push({ type: "composition", track: 1, time: currentTime, duration: TITLE_DUR, elements: titleEls });
  currentTime += TITLE_DUR;

  // ── 2. STATS CARD (5s) ────────────────────────────────────────────────────
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
      { type: "shape", shape: "rectangle", x: "50%", y: "0%", x_anchor: "50%", y_anchor: "0%", width: "100%", height: Math.round(6 * s), fill_color: accentHex },
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
      const col = idx % cols;
      const row = Math.min(Math.floor(idx / cols), 1);
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

  // ── 3. CLIPS with spotlight + category dividers ───────────────────────────
  let prevCategory: string | undefined = undefined;

  clips.forEach((clip, idx) => {
    const trimStart   = clip.trimStart != null && clip.trimStart > 0 ? clip.trimStart : 0;
    const clipDur     = clip.duration || 10;
    const rawEnd      = clip.trimEnd != null && clip.trimEnd > 0 ? clip.trimEnd : clipDur;
    const trimDuration = Math.max(rawEnd - trimStart, 1);
    const category    = clip.skillCategory;

    // ── Skill category divider (1.5s) — between clips of different categories ──
    if (idx > 0 && category && prevCategory && category !== prevCategory) {
      const divEls: unknown[] = [
        { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
        {
          type: "shape", shape: "rectangle",
          x: "0%", y: "50%", x_anchor: "0%", y_anchor: "50%",
          width: Math.round(6 * s), height: "100%", fill_color: accentHex,
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

    // ── Spotlight (2s) before each clip ──────────────────────────────────────
    if (spotlightStyle !== "none") {
      const spotEls: unknown[] = [
        { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
        {
          type: "text", text: fullName,
          x: "50%", y: spotlightStyle === "arrow" ? "38%" : "40%", x_anchor: "50%", y_anchor: "50%", width: "85%",
          font_size: Math.round(64 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
        },
      ];

      if (jerseyNumber) {
        spotEls.push({
          type: "text", text: `#${jerseyNumber}`,
          x: "50%", y: spotlightStyle === "arrow" ? "52%" : "54%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(42 * s), font_weight: "700", fill_color: accentHex, font_family: "Oswald",
        });
      }

      if (spotlightStyle === "arrow") {
        spotEls.push({
          type: "text", text: "▼",
          x: "50%", y: "68%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(36 * s), fill_color: accentHex, font_family: "Inter",
        });
      } else if (spotlightStyle === "circle") {
        // Outer circle ring (simulated with large circle + inner dark fill)
        spotEls.push(
          {
            type: "shape", shape: "circle",
            x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
            width: Math.round(380 * s), height: Math.round(380 * s),
            fill_color: accentHex, opacity: 0.15,
          },
          {
            type: "shape", shape: "circle",
            x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
            width: Math.round(360 * s), height: Math.round(360 * s),
            fill_color: "#050A14",
          }
        );
      }

      elements.push({ type: "composition", track: 1, time: currentTime, duration: SPOTLIGHT_DUR, elements: spotEls });
      currentTime += SPOTLIGHT_DUR;
    }

    // ── Clip (with optional jersey lower-third) ───────────────────────────────
    const videoInner: Record<string, unknown> = {
      type:       "video",
      source:     clip.url,
      trim_start: trimStart,
      volume:     "0%",
      fit:        "cover",
    };

    let trackEl: Record<string, unknown>;

    if (jerseyOverlay && jerseyNumber) {
      // Wrap in composition so the jersey text overlays the video
      trackEl = {
        type:     "composition",
        track:    1,
        time:     currentTime,
        duration: trimDuration,
        elements: [
          { ...videoInner, width: "100%", height: "100%" },
          {
            type:               "text",
            text:               `#${jerseyNumber}`,
            font_family:        "Oswald",
            font_size:          Math.round(48 * s),
            font_weight:        "700",
            fill_color:         accentHex,
            background_color:   "rgba(0,0,0,0.6)",
            background_x_padding: "10px",
            background_y_padding: "6px",
            x:        "5%",
            y:        "90%",
            x_anchor: "0%",
            y_anchor: "50%",
          },
        ],
      };
    } else {
      trackEl = {
        ...videoInner,
        track:    1,
        time:     currentTime,
        duration: trimDuration,
      };
    }

    // Add transition on all clips except the first
    if (idx > 0) {
      trackEl.transition = clipTransition;
    }

    elements.push(trackEl);
    currentTime += trimDuration;
  });

  // ── 4. END CARD (5s) — full contact information ────────────────────────────
  const topStats     = statsEntries.slice(0, 3);
  const endStatCols  = Math.min(topStats.length, 3);
  const endColX: Record<number, string[]> = {
    0: [],
    1: ["50%"],
    2: ["30%", "70%"],
    3: ["20%", "50%", "80%"],
  };

  const endEls: unknown[] = [
    { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
    // Top accent stripe
    { type: "shape", shape: "rectangle", x: "50%", y: "0%",   x_anchor: "50%", y_anchor: "0%",   width: "100%", height: Math.round(10 * s), fill_color: accentHex },
    // Bottom accent stripe
    { type: "shape", shape: "rectangle", x: "50%", y: "100%", x_anchor: "50%", y_anchor: "100%", width: "100%", height: Math.round(10 * s), fill_color: accentHex },
    // "CONTACT ME"
    {
      type: "text", text: "CONTACT ME",
      x: "50%", y: "11%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(26 * s), font_weight: "700", fill_color: "#94a3b8", font_family: "Inter",
    },
    // Athlete full name
    {
      type: "text", text: fullName,
      x: "50%", y: "20%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(70 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Oswald",
    },
  ];

  // Jersey # under name
  if (jerseyNumber) {
    endEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "30%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(50 * s), font_weight: "700", fill_color: accentHex, font_family: "Oswald",
    });
  }

  // Divider
  endEls.push({
    type: "shape", shape: "rectangle",
    x: "50%", y: "37%", x_anchor: "50%", y_anchor: "50%",
    width: "60%", height: Math.round(2 * s), fill_color: "#1E293B",
  });

  // Position · Sport
  if (subLine) {
    endEls.push({
      type: "text", text: subLine,
      x: "50%", y: "43%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(28 * s), fill_color: "#94a3b8", font_family: "Inter",
    });
  }

  // School · Grad year
  if (infoLine) {
    endEls.push({
      type: "text", text: infoLine,
      x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(24 * s), fill_color: "#FFFFFF", font_family: "Inter",
    });
  }

  // Top 3 stats — y=60% values, y=68% labels
  if (topStats.length > 0) {
    topStats.forEach(([label, value], i) => {
      const xPos = endColX[endStatCols][i];
      endEls.push(
        {
          type: "text", text: value,
          x: xPos, y: "60%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(50 * s), font_weight: "900", fill_color: accentHex, font_family: "Oswald",
        },
        {
          type: "text", text: label.toUpperCase(),
          x: xPos, y: "68%", x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(14 * s), fill_color: "#64748b", font_family: "Inter",
        }
      );
    });
  }

  // Email + phone
  const contactLine = [email, phone].filter(Boolean).join("   ·   ");
  if (contactLine) {
    endEls.push({
      type: "text", text: contactLine,
      x: "50%", y: "75%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(22 * s), fill_color: accentHex, font_family: "Inter",
    });
  }

  // Coach recruiting contact
  if (coachName || coachEmail) {
    const coachLine = [coachName, coachEmail].filter(Boolean).join("  ·  ");
    endEls.push(
      {
        type: "text", text: "RECRUITING CONTACT",
        x: "50%", y: "82%", x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(13 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter",
      },
      {
        type: "text", text: coachLine,
        x: "50%", y: "87%", x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(18 * s), fill_color: "#94a3b8", font_family: "Inter",
      }
    );
  }

  // CLIPT watermark
  endEls.push({
    type: "text", text: "POWERED BY CLIPT  ·  CLIPTAPP.COM",
    x: "50%", y: "94%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(14 * s), font_weight: "700", fill_color: "#334155", font_family: "Inter",
  });

  elements.push({ type: "composition", track: 1, time: currentTime, duration: END_DUR, elements: endEls });

  const totalDuration = currentTime + END_DUR;

  // ── 5. MUSIC (track 2 — AAC; full duration) ───────────────────────────────
  // Only add music when musicUrl is provided.
  // The export page only sends musicUrl for social (9:16) reels.
  if (musicUrl) {
    elements.push({
      type:            "audio",
      track:           2,
      source:          musicUrl,
      time:            0,
      duration:        totalDuration,
      trim_start:      0,
      volume:          "35%",
      audio_fade_in:   2,
      audio_fade_out:  3,
    });
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
