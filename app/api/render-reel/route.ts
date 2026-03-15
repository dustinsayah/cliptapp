import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/render-reel
// Proxies to the Remotion render server (Railway).
// Returns {jobId} immediately — client polls /api/render-reel/status?jobId=...
export async function POST(req: NextRequest) {
  const RENDER_SERVER = process.env.RENDER_SERVER_URL;
  if (!RENDER_SERVER) {
    return NextResponse.json(
      { error: "RENDER_SERVER_URL not configured" },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Resolve athlete name ──────────────────────────────────────────────────
  // cliptSettings stores as titleCard.firstName + titleCard.lastName
  const tc = body.titleCard ?? {};
  const firstName = tc.firstName || body.firstName || "ATHLETE";
  const lastName  = tc.lastName  || body.lastName  || "";

  // ── Resolve stats ─────────────────────────────────────────────────────────
  const statsData = body.stats || body.statsData || {};

  // ── Resolve height ────────────────────────────────────────────────────────
  let heightFt = tc.heightFt || body.heightFt || "";
  let heightIn = tc.heightIn || body.heightIn || "";
  if (body.height && !heightFt) {
    const m = String(body.height).match(/(\d+)'(\d+)/);
    if (m) { heightFt = m[1]; heightIn = m[2]; }
  }

  // ── Resolve music ─────────────────────────────────────────────────────────
  const settings = body.settings ?? {};
  const musicId  = settings.music    ?? body.music    ?? null;
  const musicUrl = settings.musicUrl ?? body.musicUrl ?? null;

  // ── Resolve dimensions ────────────────────────────────────────────────────
  const isSocial   = body.social === true || body.aspectRatio === "9:16";
  const exportType = isSocial ? "social" : "coach";
  const width      = isSocial ? 1080 : 1920;
  const height     = isSocial ? 1920 : 1080;

  const payload = {
    firstName,
    lastName,
    jerseyNumber: tc.jerseyNumber || body.jerseyNumber || "",
    sport:        tc.sport        || body.sport        || "",
    school:       tc.school       || body.school       || "",
    position:     tc.position     || body.position     || "",
    gradYear:     tc.gradYear     || body.gradYear     || "",
    email:        tc.email        || body.email        || "",
    phone:        tc.phone        || body.phone        || "",
    heightFt,
    heightIn,
    weight:       tc.weight       || body.weight       || "",
    gpa:          tc.gpa          || body.gpa          || "",
    coachName:    tc.coachName    || body.coachName    || "",
    coachEmail:   tc.coachEmail   || body.coachEmail   || "",
    statsData,
    clips:         body.clips || [],
    musicUrl:      musicUrl || null,
    music:         musicId  || null,
    accentHex:     settings.colorAccent || body.accentHex || body.colorAccent || "#00A3FF",
    width,
    height,
    spotlightStyle: (settings.spotlightStyle || body.spotlightStyle || "none") as "circle" | "none",
    exportType,
  };

  console.log("[render-reel] Forwarding to render server:", {
    firstName:    payload.firstName,
    lastName:     payload.lastName,
    jerseyNumber: payload.jerseyNumber,
    position:     payload.position,
    sport:        payload.sport,
    school:       payload.school,
    email:        payload.email,
    statsKeys:    Object.keys(payload.statsData),
    clipCount:    payload.clips.length,
    dimensions:   `${payload.width}x${payload.height}`,
    spotlightStyle: payload.spotlightStyle,
    music:        payload.music,
    hasMusicUrl:  !!payload.musicUrl,
  });

  try {
    const response = await fetch(`${RENDER_SERVER}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error("[render-reel] Render server unreachable:", err);
    return NextResponse.json(
      { error: "Render server unreachable" },
      { status: 502 }
    );
  }
}

// GET /api/render-reel — health / config check
export async function GET() {
  const configured = !!(process.env.RENDER_SERVER_URL);
  return NextResponse.json({ configured, service: "remotion" });
}
