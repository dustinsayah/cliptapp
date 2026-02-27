/**
 * GET /api/process-video/status?jobId=UUID
 *
 * Reads the current state of a processing job from the in-memory jobStatusMap.
 * The browser polls this route every few seconds, then writes the final
 * result back to Supabase directly when processing is complete.
 *
 * Response shape:
 * {
 *   id:            string
 *   status:        "queued" | "downloading" | "scanning" | "identifying" | "building" | "complete" | "failed"
 *   queuePosition: number  — position in queue (1 = next up, 0 = processing now)
 *   resultClips:   ClipResult[] | null  — populated when status === "complete"
 *   errorMessage:  string | null        — populated when status === "failed"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { jobStatusMap } from "@/lib/videoProcessor";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId?.trim()) {
    return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId format — must be a UUID" }, { status: 400 });
  }

  const jobStatus = jobStatusMap.get(jobId);
  if (!jobStatus) {
    return NextResponse.json({ error: `Job ${jobId} not found` }, { status: 404 });
  }

  return NextResponse.json({
    id:            jobId,
    status:        jobStatus.status,
    queuePosition: jobStatus.queuePosition ?? 0,
    resultClips:   jobStatus.resultClips  ?? null,
    errorMessage:  jobStatus.errorMessage ?? null,
  });
}
