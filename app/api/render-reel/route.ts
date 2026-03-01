import { NextRequest, NextResponse } from "next/server";
import { startRender, isCreatomateConfigured, type ReelRenderInput } from "@/lib/creatomateService";

export const runtime = "nodejs";

// POST /api/render-reel
// Starts a Creatomate server-side render. Returns renderId immediately.
// The client then polls /api/render-reel/status?renderId=... for progress.
export async function POST(req: NextRequest) {
  if (!isCreatomateConfigured()) {
    return NextResponse.json({ error: "CREATOMATE_API_KEY not configured — falling back to browser export" }, { status: 503 });
  }

  let body: { reelInput: ReelRenderInput; jobId?: string; social?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reelInput, social } = body;

  if (!reelInput?.clipUrls || reelInput.clipUrls.length === 0) {
    return NextResponse.json({ error: "No clip URLs provided" }, { status: 400 });
  }

  // Validate that clip URLs are public (not blob://)
  const hasBlobUrls = reelInput.clipUrls.some((u) => u.startsWith("blob:"));
  if (hasBlobUrls) {
    return NextResponse.json(
      { error: "Clip URLs must be publicly accessible HTTPS URLs, not blob: URLs. Upload clips to Cloudinary first." },
      { status: 400 }
    );
  }

  // Optionally use social 9:16 dimensions
  const input: ReelRenderInput = social
    ? { ...reelInput, width: 1080, height: 1920 }
    : { ...reelInput, width: reelInput.width ?? 1920, height: reelInput.height ?? 1080 };

  try {
    const renderId = await startRender(input);
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
