/**
 * GET /api/process-video/status?jobId=UUID
 *
 * Reads the current state of a processing job from Supabase.
 * Uses direct fetch to the Supabase REST API — avoids the JS client's
 * network issues in Vercel's serverless environment.
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

export const runtime = "nodejs";

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://placeholder.supabase.co" || key === "your-anon-key-here") {
    console.error("[process-video/status] Supabase not configured.");
    return null;
  }
  return { url, key };
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId?.trim()) {
    return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(jobId)) {
    return NextResponse.json({ error: "Invalid jobId format — must be a UUID" }, { status: 400 });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      {
        error: "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        hint: "See SETUP_GUIDE.md for setup instructions.",
      },
      { status: 503 }
    );
  }

  const { url, key } = config;

  try {
    const response = await fetch(
      `${url}/rest/v1/processing_jobs?select=*&id=eq.${jobId}&limit=1`,
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
      console.error(`[process-video/status] Supabase error fetching job ${jobId}:`, response.status, errText);
      return NextResponse.json(
        { error: `Failed to fetch job: HTTP ${response.status}` },
        { status: 500 }
      );
    }

    const rows = await response.json() as Record<string, unknown>[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: `Job ${jobId} not found` }, { status: 404 });
    }

    const job = rows[0];

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
      queuePosition: (job.queue_position as number) ?? 0,
      resultClips:   job.result_clips ?? null,
      errorMessage:  job.error_message ?? null,
      createdAt:     job.created_at,
      updatedAt:     job.updated_at,
    });
  } catch (err) {
    console.error(`[process-video/status] Fetch failed for job ${jobId}:`, err);
    return NextResponse.json(
      { error: `Database request failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
