/**
 * GET /api/history?email=user@example.com
 *
 * Returns all processing jobs for the given email address, ordered by newest first.
 * Used by the /history page so we can keep Supabase credentials server-side.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://placeholder.supabase.co" || key === "your-anon-key-here") {
    console.error("[api/history] Supabase not configured.");
    return null;
  }
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email?.trim()) {
    return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
  }

  // Basic email format check
  if (!email.includes("@") || !email.includes(".")) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured. See SETUP_GUIDE.md." },
      { status: 503 }
    );
  }

  const { data: jobs, error } = await supabase
    .from("processing_jobs")
    .select("id, first_name, last_name, jersey_number, sport, status, created_at, result_clips, error_message, queue_position")
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[api/history] Supabase error:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch jobs: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ jobs: jobs ?? [] });
}
