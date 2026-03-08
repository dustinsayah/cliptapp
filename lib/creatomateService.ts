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
  spotlightStyle?: "circle" | "none"; // text overlay on first 2s of each clip
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

  // Log first clip composition to verify circle is included
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstClipComp = (source.elements as any[])?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el: any) => el.type === "composition" && el.elements?.some((e: any) => e.type === "video")
  );
  console.log("CREATOMATE SOURCE FIRST CLIP:", JSON.stringify(firstClipComp, null, 2));

  console.log("FULL SOURCE BEING SENT TO CREATOMATE:", JSON.stringify(source, null, 2));

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
  console.log("INPUT CLIPS TO CREATOMATE:", input.clips?.map(c => ({
    url: c.url?.slice(-30),
    markX: c.markX,
    markY: c.markY,
    type: typeof c.markX,
  })));
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
  const isSocial   = isVertical; // social = vertical (9:16) format
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
  ].filter(Boolean).join("  ·  ");

  const gpaNum  = parseFloat(gpa || "");
  const showGpa = gpa && !isNaN(gpaNum) && gpaNum >= 3.0;

  const gradGpaLine = [
    gradYear ? `Class of ${gradYear}` : null,
    showGpa  ? `GPA ${gpa}`           : null,
  ].filter(Boolean).join("  ·  ");

  // Up to 4 stats shown on right side of title card (convert to {label, value} objects)
  const titleCardStats = statsEntries.slice(0, 4).map(([label, value]) => ({ label, value }));

  const titleCard = {
    type: "composition",
    track: 1,
    time: currentTime,
    duration: TITLE_DUR,
    elements: [
      // Background
      {
        type: "shape",
        shape: "rectangle",
        track: 1,
        width: "100%",
        height: "100%",
        x: "50%",
        y: "50%",
        fill_color: "#050A14",
      },
      // Top accent bar
      {
        type: "shape",
        shape: "rectangle",
        track: 2,
        width: "100%",
        height: 20,
        x: "50%",
        y: 10,
        fill_color: accentHex,
      },
      // Bottom accent bar
      {
        type: "shape",
        shape: "rectangle",
        track: 3,
        width: "100%",
        height: 20,
        x: "50%",
        y: isVertical ? 1910 : 1070,
        fill_color: accentHex,
      },
      // Jersey number background watermark
      ...(jerseyNumber ? [{
        type: "text",
        track: 4,
        text: `#${jerseyNumber}`,
        x: "8%",
        y: "35%",
        font_family: "Oswald",
        font_size: 280,
        font_weight: "700",
        fill_color: accentHex,
        opacity: 0.12,
        x_anchor: "0%",
        y_anchor: "50%",
      }] : []),
      // Athlete name
      {
        type: "text",
        track: 5,
        text: fullName,
        x: "8%",
        y: "38%",
        width: "42%",
        font_family: "Oswald",
        font_size: 80,
        font_weight: "700",
        fill_color: "#FFFFFF",
        x_anchor: "0%",
        y_anchor: "50%",
      },
      // Position + Sport
      {
        type: "text",
        track: 6,
        text: [position, sport].filter(Boolean).join(" · ").toUpperCase(),
        x: "8%",
        y: "52%",
        width: "42%",
        font_family: "Montserrat",
        font_size: 38,
        font_weight: "600",
        fill_color: accentHex,
        letter_spacing: "8%",
        x_anchor: "0%",
        y_anchor: "50%",
      },
      // School
      ...(school ? [{
        type: "text",
        track: 7,
        text: school,
        x: "8%",
        y: "61%",
        width: "42%",
        font_family: "Montserrat",
        font_size: 34,
        font_weight: "500",
        fill_color: "#FFFFFF",
        x_anchor: "0%",
        y_anchor: "50%",
      }] : []),
      // Grad year + GPA
      ...(gradGpaLine ? [{
        type: "text",
        track: 8,
        text: gradGpaLine,
        x: "8%",
        y: "69%",
        width: "42%",
        font_family: "Montserrat",
        font_size: 28,
        fill_color: "#9CA3AF",
        x_anchor: "0%",
        y_anchor: "50%",
      }] : []),
      // Height + Weight
      ...(heightWeight ? [{
        type: "text",
        track: 9,
        text: heightWeight,
        x: "8%",
        y: "76%",
        width: "42%",
        font_family: "Montserrat",
        font_size: 28,
        fill_color: "#9CA3AF",
        x_anchor: "0%",
        y_anchor: "50%",
      }] : []),
      // Email
      ...(email ? [{
        type: "text",
        track: 10,
        text: email,
        x: "8%",
        y: "84%",
        width: "42%",
        font_family: "Montserrat",
        font_size: 26,
        fill_color: accentHex,
        x_anchor: "0%",
        y_anchor: "50%",
      }] : []),
      // Phone
      ...(phone ? [{
        type: "text",
        track: 11,
        text: phone,
        x: "8%",
        y: "91%",
        width: "42%",
        font_family: "Montserrat",
        font_size: 26,
        fill_color: "#FFFFFF",
        x_anchor: "0%",
        y_anchor: "50%",
      }] : []),
      // Vertical divider line
      {
        type: "shape",
        shape: "rectangle",
        track: 12,
        width: 2,
        height: "67%",
        x: "52%",
        y: "58%",
        fill_color: "#1E2530",
      },
      // SEASON STATS label
      {
        type: "text",
        track: 13,
        text: "SEASON STATS",
        x: "74%",
        y: "32%",
        font_family: "Montserrat",
        font_size: 22,
        font_weight: "600",
        fill_color: accentHex,
        letter_spacing: "12%",
        x_anchor: "50%",
        y_anchor: "50%",
      },
      // 4 stats in 2x2 grid — only show stats that exist
      ...titleCardStats.flatMap((stat, i) => {
        const positions = [
          { x: "63%", y: "45%" },
          { x: "83%", y: "45%" },
          { x: "63%", y: "65%" },
          { x: "83%", y: "65%" },
        ];
        const pos = positions[i];
        if (!pos || !stat.value) return [];
        return [
          {
            type: "text",
            track: 14 + (i * 2),
            text: stat.value,
            x: pos.x,
            y: pos.y,
            font_family: "Oswald",
            font_size: 60,
            font_weight: "700",
            fill_color: accentHex,
            x_anchor: "50%",
            y_anchor: "50%",
          },
          {
            type: "text",
            track: 15 + (i * 2),
            text: stat.label.toUpperCase(),
            x: pos.x,
            y: `${parseFloat(pos.y) + 8}%`,
            font_family: "Montserrat",
            font_size: 20,
            font_weight: "600",
            fill_color: "#9CA3AF",
            letter_spacing: "6%",
            x_anchor: "50%",
            y_anchor: "0%",
          },
        ];
      }),
      // CLIPT watermark
      {
        type: "text",
        track: 23,
        text: "POWERED BY CLIPT",
        x: "50%",
        y: "96.3%",
        font_family: "Inter",
        font_size: 22,
        font_weight: "700",
        fill_color: "#334155",
        x_anchor: "50%",
        y_anchor: "50%",
      },
    ],
    animations: [
      { time: 0, duration: 0.5, type: "fade", fade: true },
    ],
  };

  elements.push(titleCard);
  currentTime += TITLE_DUR;

  // ── 2. STATS CARD (5s) — 3×3 grid, one page, max 9 stats ────────────────────
  //
  // x positions: 18%, 50%, 82%
  // y positions for values:  40%, 60%, 80%
  // y positions for labels:  47%, 67%, 87%

  if (showStatsCard) {
    const validStats = statsEntries
      .filter(([, v]) => v && v !== "0")
      .slice(0, 9)
      .map(([label, value]) => ({ label, value }));

    const statPositions = [
      { x: "18%", y: "40%" }, { x: "50%", y: "40%" }, { x: "82%", y: "40%" },
      { x: "18%", y: "60%" }, { x: "50%", y: "60%" }, { x: "82%", y: "60%" },
      { x: "18%", y: "80%" }, { x: "50%", y: "80%" }, { x: "82%", y: "80%" },
    ];

    const statsCard = {
      type: "composition",
      track: 1,
      time: currentTime,
      duration: STATS_DUR,
      elements: [
        // Background
        {
          type: "shape",
          shape: "rectangle",
          track: 1,
          width: "100%",
          height: "100%",
          x: "50%",
          y: "50%",
          fill_color: "#050A14",
        },
        // Top accent bar
        {
          type: "shape",
          shape: "rectangle",
          track: 2,
          width: "100%",
          height: 16,
          x: "50%",
          y: 8,
          fill_color: accentHex,
        },
        // Bottom accent bar
        {
          type: "shape",
          shape: "rectangle",
          track: 3,
          width: "100%",
          height: 16,
          x: "50%",
          y: isVertical ? 1912 : 1072,
          fill_color: accentHex,
        },
        // SEASON STATS header
        {
          type: "text",
          track: 4,
          text: "SEASON STATS",
          x: "50%",
          y: "14%",
          font_family: "Montserrat",
          font_size: 28,
          font_weight: "700",
          fill_color: accentHex,
          letter_spacing: "10%",
          x_anchor: "50%",
          y_anchor: "50%",
        },
        // Athlete name
        {
          type: "text",
          track: 5,
          text: fullName,
          x: "50%",
          y: "24%",
          font_family: "Oswald",
          font_size: 48,
          font_weight: "700",
          fill_color: "#FFFFFF",
          x_anchor: "50%",
          y_anchor: "50%",
        },
        // Stats grid
        ...validStats.flatMap((stat, i) => {
          const pos = statPositions[i];
          if (!pos) return [];
          return [
            {
              type: "text",
              track: 6 + (i * 2),
              text: stat.value,
              x: pos.x,
              y: pos.y,
              font_family: "Oswald",
              font_size: 72,
              font_weight: "700",
              fill_color: accentHex,
              x_anchor: "50%",
              y_anchor: "50%",
            },
            {
              type: "text",
              track: 7 + (i * 2),
              text: stat.label.toUpperCase(),
              x: pos.x,
              y: `${parseFloat(pos.y) + 7}%`,
              font_family: "Montserrat",
              font_size: 22,
              font_weight: "600",
              fill_color: "#9CA3AF",
              letter_spacing: "6%",
              x_anchor: "50%",
              y_anchor: "0%",
            },
          ];
        }),
        // POWERED BY CLIPT
        {
          type: "text",
          track: 25,
          text: "POWERED BY CLIPT",
          x: "50%",
          y: "94%",
          font_family: "Inter",
          font_size: 22,
          font_weight: "700",
          fill_color: "#334155",
          x_anchor: "50%",
          y_anchor: "50%",
        },
      ],
    };

    elements.push(statsCard);
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
    const trimStart    = clip.trimStart != null && clip.trimStart > 0 ? clip.trimStart : 0;
    const clipDur      = clip.duration || 10;
    const rawEnd       = clip.trimEnd  != null && clip.trimEnd  > 0 ? clip.trimEnd  : clipDur;
    const trimDuration = Math.max(rawEnd - trimStart, 1);
    const sectionStart = currentTime;
    const videoFit     = isSocial ? "cover" : "contain";

    if (spotlightStyle !== "none") {
      // ── Spotlight composition — video and freeze frame ONLY ────────────────
      const markX = typeof clip.markX === "number" ? clip.markX : 50;
      const markY = typeof clip.markY === "number" ? clip.markY : 38;

      console.log(`CLIP ${idx} at timeline time ${sectionStart}, circle at x:${markX}% y:${markY}%`);

      const innerEls: unknown[] = [
        // Layer 1 — main video
        {
          type:       "video",
          track:      1,
          time:       0,
          source:     clip.url,
          trim_start: trimStart,
          volume:     "100%",
          fit:        videoFit,
          fill_color: "#000000",
        },
        // Layer 2 — freeze frame (short clip looped for 1.5s to look frozen)
        {
          type:       "video",
          track:      2,
          time:       0,
          duration:   1.5,
          source:     clip.url,
          trim_start: 0,
          trim_end:   0.1,
          volume:     "0%",
          fit:        videoFit,
          fill_color: "#000000",
          animations: [
            { time: 1.2, duration: 0.3, easing: "ease-in", type: "fade", fade: false },
          ],
        },
      ];

      const clipEl: Record<string, unknown> = {
        type:     "composition",
        track:    1,
        time:     sectionStart,
        duration: trimDuration,
        elements: innerEls,
      };
      if (idx > 0) clipEl.transition = clipTransition;
      elements.push(clipEl);

      // Circle — ROOT LEVEL element timed to match this clip
      console.log("CIRCLE IS ROOT LEVEL:", {
        clipIndex: idx,
        time: sectionStart,
        x: markX,
        y: markY,
        track: 5,
      });
      elements.push({
        type:         "shape",
        track:        5,
        time:         sectionStart,
        duration:     1.2,
        shape:        "ellipse",
        x:            `${markX}%`,
        y:            `${markY}%`,
        width:        "8%",
        height:       "14.22%",
        x_anchor:     0.5,
        y_anchor:     0.5,
        fill_color:   "rgba(0,0,0,0)",
        stroke_color: "#FFFFFF",
        stroke_width: 4,
        animations: [
          {
            time:        0,
            duration:    0.3,
            easing:      "ease-out",
            type:        "scale",
            fade:        false,
            start_scale: "150%",
            end_scale:   "100%",
          },
          {
            time:     0.9,
            duration: 0.3,
            easing:   "ease-in",
            type:     "fade",
            fade:     true,
          },
        ],
      });

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
