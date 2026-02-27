/**
 * GET /api/history?email=user@example.com
 *
 * Returns all processing jobs for the given email address, ordered by newest first.
 * Uses direct fetch to the Supabase REST API — avoids the JS client's
 * network issues in Vercel's serverless environment.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://placeholder.supabase.co" || key === "your-anon-key-here") {
    console.error("[api/history] Supabase not configured.");
    return null;
  }
  return { url, key };
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email?.trim()) {
    return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
  }

  if (!email.includes("@") || !email.includes(".")) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Database not configured. See SETUP_GUIDE.md." },
      { status: 503 }
    );
  }

  const { url, key } = config;
  const cols = "id,first_name,last_name,jersey_number,sport,status,created_at,result_clips,error_message,queue_position";
  const encodedEmail = encodeURIComponent(email.trim().toLowerCase());

  try {
    const response = await fetch(
      `${url}/rest/v1/processing_jobs?select=${cols}&email=eq.${encodedEmail}&order=created_at.desc&limit=50`,
      {
        headers: {
          "apikey":        key,
          "Authorization": `Bearer ${key}`,
          "Content-Type":  "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[api/history] Supabase error:", response.status, errText);
      return NextResponse.json(
        { error: `Failed to fetch jobs: HTTP ${response.status}` },
        { status: 500 }
      );
    }

    const jobs = await response.json();
    return NextResponse.json({ jobs: Array.isArray(jobs) ? jobs : [] });
  } catch (err) {
    console.error("[api/history] Fetch failed:", err);
    return NextResponse.json(
      { error: `Database request failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
