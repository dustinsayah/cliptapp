import { NextRequest, NextResponse } from "next/server";
import { startRender, isCreatomateConfigured, type ReelRenderInput, type ClipInput } from "@/lib/creatomateService";

export const runtime = "nodejs";

// POST /api/render-reel
// Starts a Creatomate server-side render. Returns renderId immediately.
// The client then polls /api/render-reel/status?renderId=... for progress.
//
// Accepts two body formats:
//   New: { clips[], titleCard{}, stats{}, settings{}, social?, jobId? }
//   Legacy: { reelInput: ReelRenderInput, social?, jobId? }
export async function POST(req: NextRequest) {
  if (!isCreatomateConfigured()) {
    return NextResponse.json(
      { error: "CREATOMATE_API_KEY not configured — falling back to browser export" },
      { status: 503 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  console.log("[render-reel] Request received:", {
    format: body.clips ? "new" : "legacy",
    clipCount: body.clips?.length ?? body.reelInput?.clipUrls?.length ?? body.reelInput?.clips?.length ?? 0,
    bodySize: JSON.stringify(body).length,
  });

  let reelInput: ReelRenderInput;
  const social: boolean = body.social === true || body.aspectRatio === "9:16";
  console.log("[render-reel] social:", social, "| exportType:", body.exportType, "| aspectRatio:", body.aspectRatio);

  if (body.clips) {
    // ── New structured format ─────────────────────────────────────────────────
    const { clips, titleCard = {}, stats = {}, settings = {} } = body;

    console.log("[render-reel] New format payload:", JSON.stringify({
      clipCount: clips?.length,
      clips: clips?.map((c: ClipInput) => ({ url: c.url?.slice(0, 60), trimStart: c.trimStart, trimEnd: c.trimEnd, duration: c.duration })),
      titleCard,
      stats,
      settings,
    }, null, 2));
    console.log("CLIPS WITH MARKS:", clips?.map((c: ClipInput) => ({
      url: c.url?.slice(0, 60),
      markX: c.markX,
      markY: c.markY,
    })));

    if (!Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json({ error: "No clips provided" }, { status: 400 });
    }

    // Validate all clip URLs are public HTTPS (not blob:)
    const badUrls = clips.filter((c: ClipInput) => !c.url || c.url.startsWith("blob:"));
    if (badUrls.length > 0) {
      return NextResponse.json(
        { error: "All clip URLs must be public HTTPS URLs. Upload clips to Cloudinary first." },
        { status: 400 }
      );
    }

    const music    = settings.music    ?? body.music    ?? null;
    const musicUrl = settings.musicUrl ?? body.musicUrl ?? null;
    const musicName = settings.musicName ?? body.musicName ?? null;
    console.log("[render-reel] API RECEIVED MUSIC:", { music, musicUrl: musicUrl?.slice(0, 80) ?? null, musicName });

    reelInput = {
      // Athlete identity
      firstName:    titleCard.firstName    || "",
      lastName:     titleCard.lastName     || "",
      jerseyNumber: titleCard.jerseyNumber || "",
      sport:        titleCard.sport        || "",
      school:       titleCard.school       || "",
      position:     titleCard.position     || "",
      gradYear:     titleCard.gradYear     || "",
      email:        titleCard.email        || "",
      phone:        titleCard.phone        || "",
      heightFt:     titleCard.heightFt     || "",
      heightIn:     titleCard.heightIn     || "",
      weight:       titleCard.weight       || "",
      gpa:          titleCard.gpa          || "",
      clubTeam:     titleCard.clubTeam     || "",
      location:     titleCard.location     || "",
      coachName:    titleCard.coachName    || "",
      coachEmail:   titleCard.coachEmail   || "",
      statsData:    stats || {},
      clips: clips.map((c: ClipInput) => ({
        url:           c.url,
        duration:      c.duration      ?? undefined,
        trimStart:     c.trimStart     ?? 0,
        trimEnd:       c.trimEnd       ?? undefined,
        skillCategory: c.skillCategory ?? undefined,
        markX:         c.markX        ?? undefined,
        markY:         c.markY        ?? undefined,
      })),
      music:           music    || undefined,
      musicUrl:        musicUrl || undefined,
      musicName:       musicName || undefined,
      accentHex:       settings.colorAccent    || "#00A3FF",
      transitionStyle: settings.transition     || "Hard Cut",
      jerseyOverlay:   settings.jerseyOverlay  !== false,
      statsEnabled:    settings.statsEnabled   !== false,
      spotlightStyle:  (settings.spotlightStyle as "arrow" | "circle" | "none") || "none",
      exportType:      social ? "social" : "coach",
      width:  social ? 1080 : 1920,
      height: social ? 1920 : 1080,
    };

  } else if (body.reelInput) {
    // ── Legacy format (admin test panel, backward compat) ─────────────────────
    const { reelInput: ri, social: legacySocial } = body;
    const isSocial = legacySocial === true || social;

    console.log("[render-reel] Legacy format payload:", JSON.stringify({
      clipUrls: ri?.clipUrls?.map((u: string) => u?.slice(0, 60)),
      clips: ri?.clips?.length,
      firstName: ri?.firstName,
      musicUrl: ri?.musicUrl,
    }, null, 2));

    if (!ri) {
      return NextResponse.json({ error: "Missing reelInput" }, { status: 400 });
    }

    // Validate clip URLs
    const urlsToCheck: string[] = [
      ...(ri.clips?.map((c: ClipInput) => c.url) ?? []),
      ...(ri.clipUrls ?? []),
    ];
    if (urlsToCheck.length === 0) {
      return NextResponse.json({ error: "No clip URLs provided" }, { status: 400 });
    }
    const hasBlobUrls = urlsToCheck.some((u: string) => u?.startsWith("blob:"));
    if (hasBlobUrls) {
      return NextResponse.json(
        { error: "Clip URLs must be publicly accessible HTTPS URLs, not blob: URLs." },
        { status: 400 }
      );
    }

    reelInput = {
      ...ri,
      width:  isSocial ? 1080 : (ri.width  ?? 1920),
      height: isSocial ? 1920 : (ri.height ?? 1080),
    };

  } else {
    return NextResponse.json({ error: "Invalid request body — missing clips or reelInput" }, { status: 400 });
  }

  try {
    console.log("[render-reel] REEL INPUT MUSIC:", {
      music: reelInput.music,
      musicUrl: reelInput.musicUrl,
      musicName: reelInput.musicName,
    });
    console.log("[render-reel] Calling startRender with", {
      clipCount: reelInput.clips?.length ?? reelInput.clipUrls?.length,
      hasMusic: !!reelInput.musicUrl,
      dimensions: `${reelInput.width}x${reelInput.height}`,
      transition: reelInput.transitionStyle,
      jerseyOverlay: reelInput.jerseyOverlay,
      statsEnabled: reelInput.statsEnabled,
    });

    const renderId = await startRender(reelInput);

    console.log("[render-reel] Render started successfully:", renderId);
    return NextResponse.json({ renderId, status: "started" });

  } catch (err) {
    console.error("[render-reel] startRender error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render start failed" },
      { status: 500 }
    );
  }
}

// GET /api/render-reel — health check / config check
export async function GET() {
  return NextResponse.json({
    configured: isCreatomateConfigured(),
    service: "creatomate",
  });
}
