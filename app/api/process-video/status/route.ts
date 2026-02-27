/**
 * GET /api/process-video/status?jobId=UUID
 *
 * Reads the current state of a processing job from Supabase.
 * Returns the full job row including result_clips when complete.
 *
 * Response shape:
 * {
 *   id:             string
 *   status:         "queued" | "downloading" | "scanning" | "identifying" | "building" | "complete" | "failed"
 *   firstName:      string
 *   lastName:       string
 *   jerseyNumber:   number
 *   sport:          string
 *   videoUrl:       string
 *   queuePosition:  number  — position in queue (1 = next up, 0 = processing now)
 *   resultClips:    ClipResult[] | null   — populated when status === "complete"
 *   errorMessage:   string | null          — populated when status === "failed"
 *   createdAt:      string
 *   updatedAt:      string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://placeholder.supabase.co" || key === "your-anon-key-here") {
    console.error("[process-video/status] Supabase not configured.");
    return null;
  }
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId?.trim()) {
    return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
  }

  // Basic UUID format validation to prevent injection
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId format — must be a UUID" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        hint: "See SETUP_GUIDE.md for setup instructions.",
      },
      { status: 503 }
    );
  }

  const { data: job, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    console.error(`[process-video/status] Supabase error fetching job ${jobId}:`, error.message);
    return NextResponse.json(
      {
        error: `Failed to fetch job: ${error.message}`,
        supabaseCode: error.code,
      },
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }

  if (!job) {
    return NextResponse.json({ error: `Job ${jobId} not found` }, { status: 404 });
  }

  return NextResponse.json({
    id:            job.id,
    status:        job.status,
    firstName:     job.first_name,
    lastName:      job.last_name,
    jerseyNumber:  job.jersey_number,
    position:      job.position,
    sport:         job.sport,
    school:        job.school,
    videoUrl:      job.video_url,
    source:        job.source,
    email:         job.email,
    queuePosition: job.queue_position ?? 0,
    resultClips:   job.result_clips ?? null,
    errorMessage:  job.error_message ?? null,
    createdAt:     job.created_at,
    updatedAt:     job.updated_at,
  });
}
