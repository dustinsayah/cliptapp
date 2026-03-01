// ── Creatomate server-side video rendering service ─────────────────────────────
// Required env vars:
//   CREATOMATE_API_KEY  — your Creatomate API key from https://app.creatomate.com/settings/api
//
// Creatomate renders real MP4 files on their servers — supports music baked in on
// every device including iPhone, no browser MediaRecorder required.
//
// REST API docs: https://creatomate.com/docs/rest-api

const CREATOMATE_API = "https://api.creatomate.com/v1";

export interface ReelRenderInput {
  firstName?: string;
  jerseyNumber?: string;
  sport?: string;
  school?: string;
  position?: string;
  gradYear?: string;
  email?: string;
  coachName?: string;
  coachEmail?: string;
  statsData?: Record<string, string>;
  // Must be publicly accessible HTTPS URLs (Cloudinary, etc.)
  clipUrls: string[];
  musicUrl?: string;
  accentHex?: string;
  // Dimensions — defaults to 1920×1080
  width?: number;
  height?: number;
  transitionStyle?: string;
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
// Poll getRenderStatus(renderId) to track progress.
export async function startRender(input: ReelRenderInput): Promise<string> {
  if (!process.env.CREATOMATE_API_KEY) {
    throw new Error("CREATOMATE_API_KEY not configured");
  }

  const source = buildReelSource(input);

  const response = await fetch(`${CREATOMATE_API}/renders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
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
  return data[0].id;
}

// Fetches current render status. Poll every 3–5 seconds until status is "succeeded" or "failed".
export async function getRenderStatus(renderId: string): Promise<RenderStatus> {
  if (!process.env.CREATOMATE_API_KEY) {
    throw new Error("CREATOMATE_API_KEY not configured");
  }

  const response = await fetch(`${CREATOMATE_API}/renders/${renderId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Creatomate status fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.status,
    url: data.url ?? null,
    error_message: data.error_message ?? null,
  };
}

// ── Composition Builder ───────────────────────────────────────────────────────

function buildReelSource(input: ReelRenderInput): Record<string, unknown> {
  const {
    firstName = "ATHLETE",
    jerseyNumber = "",
    sport = "",
    school = "",
    position = "",
    gradYear = "",
    email = "",
    coachName = "",
    coachEmail = "",
    statsData = {},
    clipUrls,
    musicUrl,
    accentHex = "#00A3FF",
    width = 1920,
    height = 1080,
    transitionStyle = "Hard Cut",
  } = input;

  const s = height / 1080;
  const nameLine = (firstName || "ATHLETE").toUpperCase();
  const subLine = [position, sport].filter(Boolean).join("  ·  ").toUpperCase();
  const infoLine = [school, gradYear ? `Class of ${gradYear}` : ""].filter(Boolean).join("  ·  ");
  const statsEntries = Object.entries(statsData).filter(([, v]) => v?.trim()).slice(0, 6);

  const elements: unknown[] = [];

  // ── Title Card (4s) ────────────────────────────────────────────────────────
  const titleEls: unknown[] = [
    // Background
    { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
    // Top accent stripe
    { type: "shape", shape: "rectangle", x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%", width: "100%", height: Math.round(8 * s), fill_color: accentHex },
    // Bottom accent stripe
    { type: "shape", shape: "rectangle", x: "0%", y: "100%", x_anchor: "0%", y_anchor: "100%", width: "100%", height: Math.round(8 * s), fill_color: accentHex },
    // Player name
    {
      type: "text", text: nameLine,
      x: "50%", y: "42%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(80 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Montserrat",
    },
  ];

  if (jerseyNumber) {
    titleEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "55%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(46 * s), font_weight: "700", fill_color: accentHex, font_family: "Montserrat",
    });
  }
  if (subLine) {
    titleEls.push({
      type: "text", text: subLine,
      x: "50%", y: jerseyNumber ? "63%" : "58%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(24 * s), font_weight: "600", fill_color: "#94a3b8", font_family: "Inter",
    });
  }
  if (infoLine) {
    titleEls.push({
      type: "text", text: infoLine,
      x: "50%", y: jerseyNumber ? "69%" : "64%", x_anchor: "50%", y_anchor: "50%", width: "80%",
      font_size: Math.round(18 * s), font_weight: "400", fill_color: "#64748b", font_family: "Inter",
    });
  }
  if (email) {
    titleEls.push({
      type: "text", text: email,
      x: "50%", y: "83%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(16 * s), fill_color: accentHex, font_family: "Inter",
    });
  }
  titleEls.push({
    type: "text", text: "POWERED BY CLIPT",
    x: "50%", y: "95%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(12 * s), font_weight: "700", fill_color: "#475569", font_family: "Inter",
  });

  elements.push({ type: "composition", track: 1, duration: 4, elements: titleEls });

  // ── Stats Card (4s) — only when stats exist ────────────────────────────────
  if (statsEntries.length > 0) {
    const statCardEls: unknown[] = [
      { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
      { type: "shape", shape: "rectangle", x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%", width: "100%", height: Math.round(6 * s), fill_color: accentHex },
      {
        type: "text", text: "SEASON STATS",
        x: "50%", y: "13%", x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(22 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter",
      },
      {
        type: "text", text: nameLine,
        x: "50%", y: "22%", x_anchor: "50%", y_anchor: "50%", width: "85%",
        font_size: Math.round(44 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Montserrat",
      },
    ];

    const cols = Math.min(statsEntries.length, 3);
    const cw = Math.round(240 * s);
    const ch = Math.round(165 * s);
    const gx = Math.round(24 * s);
    const totalW = cols * cw + (cols - 1) * gx;
    const startX = (width - totalW) / 2;
    const startY = height * 0.35;

    statsEntries.forEach(([label, value], idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const bx = startX + col * (cw + gx) + cw / 2;
      const by = startY + row * (ch + Math.round(20 * s)) + ch / 2;
      statCardEls.push(
        { type: "shape", shape: "rectangle", x: bx, y: by, x_anchor: "50%", y_anchor: "50%", width: cw, height: ch, fill_color: "#0A1628" },
        {
          type: "text", text: value,
          x: bx, y: by - ch * 0.1, x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(50 * s), font_weight: "900", fill_color: accentHex, font_family: "Montserrat",
        },
        {
          type: "text", text: label.toUpperCase(),
          x: bx, y: by + ch * 0.32, x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(16 * s), fill_color: "#64748b", font_family: "Inter",
        }
      );
    });

    statCardEls.push({
      type: "text", text: "POWERED BY CLIPT",
      x: "50%", y: "95%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(12 * s), font_weight: "700", fill_color: "#475569", font_family: "Inter",
    });

    elements.push({ type: "composition", track: 1, duration: 4, elements: statCardEls });
  }

  // ── Clip elements ──────────────────────────────────────────────────────────
  const useFade = transitionStyle !== "Hard Cut";
  clipUrls.forEach((url) => {
    const clipEl: Record<string, unknown> = {
      type: "video",
      track: 1,
      source: url,
      volume: "0%",
      fit: "cover",
    };
    if (useFade) {
      clipEl.transitions = [{ type: "fade", duration: 0.4 }];
    }
    elements.push(clipEl);
  });

  // ── End Card (5s) ──────────────────────────────────────────────────────────
  const topStats = statsEntries.slice(0, 3);
  const endEls: unknown[] = [
    { type: "shape", shape: "rectangle", x: "50%", y: "50%", x_anchor: "50%", y_anchor: "50%", width: "100%", height: "100%", fill_color: "#050A14" },
    { type: "shape", shape: "rectangle", x: "0%", y: "0%", x_anchor: "0%", y_anchor: "0%", width: "100%", height: Math.round(8 * s), fill_color: accentHex },
    { type: "shape", shape: "rectangle", x: "0%", y: "100%", x_anchor: "0%", y_anchor: "100%", width: "100%", height: Math.round(8 * s), fill_color: accentHex },
    {
      type: "text", text: "CONTACT ME",
      x: "50%", y: "13%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(20 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter",
    },
    // Divider line under heading
    { type: "shape", shape: "rectangle", x: "50%", y: "17%", x_anchor: "50%", y_anchor: "50%", width: "32%", height: 2, fill_color: accentHex },
    // Athlete name — 72px bold
    {
      type: "text", text: nameLine,
      x: "50%", y: "30%", x_anchor: "50%", y_anchor: "50%", width: "85%",
      font_size: Math.round(72 * s), font_weight: "900", fill_color: "#FFFFFF", font_family: "Montserrat",
    },
  ];

  if (jerseyNumber) {
    endEls.push({
      type: "text", text: `#${jerseyNumber}`,
      x: "50%", y: "42%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(52 * s), font_weight: "700", fill_color: accentHex, font_family: "Montserrat",
    });
  }
  if (subLine) {
    endEls.push({
      type: "text", text: subLine,
      x: "50%", y: jerseyNumber ? "50%" : "44%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(26 * s), fill_color: "#94a3b8", font_family: "Inter",
    });
  }
  if (infoLine) {
    endEls.push({
      type: "text", text: infoLine,
      x: "50%", y: jerseyNumber ? "56%" : "51%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(20 * s), fill_color: "#64748b", font_family: "Inter",
    });
  }

  // Divider above stats
  endEls.push({ type: "shape", shape: "rectangle", x: "50%", y: "62%", x_anchor: "50%", y_anchor: "50%", width: "70%", height: 1, fill_color: "#334155" });

  // Top 3 stats in cards — 48px values
  if (topStats.length > 0) {
    const statW = Math.round(170 * s);
    const statH = Math.round(95 * s);
    const statGx = Math.round(28 * s);
    const totalW2 = topStats.length * statW + (topStats.length - 1) * statGx;
    const startX2 = (width - totalW2) / 2;
    const sy = height * 0.66;

    topStats.forEach(([label, value], i) => {
      const bx = startX2 + i * (statW + statGx) + statW / 2;
      const by = sy + statH / 2;
      endEls.push(
        { type: "shape", shape: "rectangle", x: bx, y: by, x_anchor: "50%", y_anchor: "50%", width: statW, height: statH, fill_color: "#0A1628" },
        {
          type: "text", text: value,
          x: bx, y: by - statH * 0.1, x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(44 * s), font_weight: "900", fill_color: accentHex, font_family: "Montserrat",
        },
        {
          type: "text", text: label.toUpperCase(),
          x: bx, y: by + statH * 0.32, x_anchor: "50%", y_anchor: "50%",
          font_size: Math.round(14 * s), fill_color: "#64748b", font_family: "Inter",
        }
      );
    });
  }

  if (email) {
    endEls.push({
      type: "text", text: email,
      x: "50%", y: "81%", x_anchor: "50%", y_anchor: "50%",
      font_size: Math.round(20 * s), fill_color: "#00A3FF", font_family: "Inter",
    });
  }
  if (coachName || coachEmail) {
    const coachLine = [coachName, coachEmail].filter(Boolean).join("  ·  ");
    endEls.push(
      {
        type: "text", text: "RECRUITING CONTACT",
        x: "50%", y: "87%", x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(12 * s), font_weight: "700", fill_color: accentHex, font_family: "Inter",
      },
      {
        type: "text", text: coachLine,
        x: "50%", y: "91%", x_anchor: "50%", y_anchor: "50%",
        font_size: Math.round(16 * s), fill_color: "#94a3b8", font_family: "Inter",
      }
    );
  }

  endEls.push({
    type: "text", text: "POWERED BY CLIPT  ·  CLIPTAPP.COM",
    x: "50%", y: "96%", x_anchor: "50%", y_anchor: "50%",
    font_size: Math.round(12 * s), font_weight: "700", fill_color: "#475569", font_family: "Inter",
  });

  elements.push({ type: "composition", track: 1, duration: 5, elements: endEls });

  // ── Music overlay (track 2, spans full duration) ───────────────────────────
  if (musicUrl) {
    elements.push({
      type: "audio",
      track: 2,
      source: musicUrl,
      volume: "40%",
      audio_fade_in: 2,
      audio_fade_out: 3,
    });
  }

  return {
    output_format: "mp4",
    width,
    height,
    frame_rate: 30,
    elements,
  };
}

// ── Social 9:16 version (1080×1920) ──────────────────────────────────────────
// Builds the same composition but portrait. Just call startRender with width:1080, height:1920.
export function buildSocialInput(input: ReelRenderInput): ReelRenderInput {
  return { ...input, width: 1080, height: 1920 };
}
