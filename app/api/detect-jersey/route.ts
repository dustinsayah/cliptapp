import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Env var in this project is JERSEY_DETECTION_API_URL (set in Vercel + .env.local)
const UPSTREAM_URL = process.env.JERSEY_DETECTION_API_URL;

export async function POST(request: NextRequest) {
  if (!UPSTREAM_URL) {
    return NextResponse.json(
      { error: "Missing JERSEY_DETECTION_API_URL" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);

  try {
    const upstream = await fetch(`${UPSTREAM_URL}/detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await upstream.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: "Upstream returned a non-JSON response", raw: text };
    }

    return NextResponse.json(data, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("aborted"));

    return NextResponse.json(
      {
        error: isAbort
          ? "Detection request timed out while waiting for the upstream API"
          : "Failed to reach detection API",
      },
      { status: 504 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
