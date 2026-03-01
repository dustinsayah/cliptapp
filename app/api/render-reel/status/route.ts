import { NextRequest, NextResponse } from "next/server";
import { getRenderStatus, isCreatomateConfigured } from "@/lib/creatomateService";

export const runtime = "nodejs";

// GET /api/render-reel/status?renderId=xxx
// Returns current render status from Creatomate.
// Poll this every 3–5 seconds until status is "succeeded" or "failed".
export async function GET(req: NextRequest) {
  if (!isCreatomateConfigured()) {
    return NextResponse.json({ error: "CREATOMATE_API_KEY not configured" }, { status: 503 });
  }

  const renderId = req.nextUrl.searchParams.get("renderId");
  if (!renderId) {
    return NextResponse.json({ error: "renderId is required" }, { status: 400 });
  }

  try {
    const status = await getRenderStatus(renderId);
    return NextResponse.json(status);
  } catch (err) {
    console.error("[render-reel/status] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status fetch failed" },
      { status: 500 }
    );
  }
}
