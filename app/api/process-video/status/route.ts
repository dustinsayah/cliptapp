/**
 * GET /api/process-video/status?jobId=UUID
 *
 * Reads the current state of a processing job from Supabase.
 * Returns the full job row including result_clips when complete.
 *
 * Response shape:
 * {
 *   id:            string
 *   status:        "queued" | "downloading" | "scanning" | "identifying" | "building" | "complete" | "failed"
 *   firstName:     string
 *   lastName:      string
 *   jerseyNumber:  number
 *   sport:         string
 *   videoUrl:      string
 *   resultClips:   ClipResult[] | null   — populated when status === "complete"
 *   errorMessage:  string | null          — populated when status === "failed"
 *   createdAt:     string
 *   updatedAt:     string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId?.trim()) {
    return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
  }

  // Basic UUID format validation to prevent injection
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId format" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    firstName: job.first_name,
    lastName: job.last_name,
    jerseyNumber: job.jersey_number,
    position: job.position,
    sport: job.sport,
    school: job.school,
    videoUrl: job.video_url,
    source: job.source,
    email: job.email,
    resultClips: job.result_clips ?? null,
    errorMessage: job.error_message ?? null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  });
}
