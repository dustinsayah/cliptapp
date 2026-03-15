import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/render-reel/status?jobId=xxx
// Proxies to the Remotion render server status endpoint.
// Returns: {status: 'rendering:45'} | {status: 'succeeded', url: '...'} | {status: 'failed', error: '...'}
export async function GET(req: NextRequest) {
  const RENDER_SERVER = process.env.RENDER_SERVER_URL;
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!RENDER_SERVER) {
    return NextResponse.json({ error: "RENDER_SERVER_URL not configured" }, { status: 500 });
  }
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${RENDER_SERVER}/status/${jobId}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error("[render-reel/status] Render server unreachable:", err);
    return NextResponse.json(
      { error: "Render server unreachable" },
      { status: 502 }
    );
  }
}
