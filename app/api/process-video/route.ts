/**
 * POST /api/process-video
 *
 * Creates a processing job in Supabase and kicks off the AI pipeline
 * in the background. Returns the jobId immediately so the client can poll.
 *
 * Body: {
 *   videoUrl:     string  — YouTube URL or direct video URL
 *   firstName:    string
 *   lastName:     string
 *   jerseyNumber: number
 *   position:     string
 *   sport:        string
 *   school:       string
 *   email:        string
 * }
 *
 * Response: { jobId: string, status: "queued" }
 *
 * ⚠️  PRODUCTION NOTE: The fire-and-forget pattern used here only works on
 * long-running Node.js servers. On serverless (Vercel), use a proper queue
 * like BullMQ, Inngest, or Trigger.dev — the process terminates on response.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { processVideo, ProcessingJob } from "@/lib/videoProcessor";
import { isValidYouTubeUrl } from "@/lib/youtubeUtils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Validation ──────────────────────────────────────────────────────────
  const {
    videoUrl,
    firstName,
    lastName,
    jerseyNumber,
    position,
    sport,
    school,
    email,
  } = body as {
    videoUrl?: string;
    firstName?: string;
    lastName?: string;
    jerseyNumber?: number | string;
    position?: string;
    sport?: string;
    school?: string;
    email?: string;
  };

  const missing: string[] = [];
  if (!videoUrl?.trim()) missing.push("videoUrl");
  if (!firstName?.trim()) missing.push("firstName");
  if (!lastName?.trim()) missing.push("lastName");
  if (jerseyNumber === undefined || jerseyNumber === null || jerseyNumber === "")
    missing.push("jerseyNumber");
  if (!position?.trim()) missing.push("position");
  if (!sport?.trim()) missing.push("sport");
  if (!school?.trim()) missing.push("school");
  if (!email?.trim()) missing.push("email");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const jerseyNum = Number(jerseyNumber);
  if (!Number.isInteger(jerseyNum) || jerseyNum < 0 || jerseyNum > 99) {
    return NextResponse.json(
      { error: "jerseyNumber must be an integer between 0 and 99" },
      { status: 400 }
    );
  }

  const urlStr = videoUrl!.trim();
  const source = isValidYouTubeUrl(urlStr) ? "youtube" : "upload";

  if (source !== "youtube" && !urlStr.startsWith("http")) {
    return NextResponse.json(
      { error: "videoUrl must be a valid YouTube URL or direct video URL" },
      { status: 400 }
    );
  }

  // ── Create job in Supabase ───────────────────────────────────────────────
  const { data: jobRow, error: insertError } = await supabase
    .from("processing_jobs")
    .insert({
      first_name: firstName!.trim(),
      last_name: lastName!.trim(),
      jersey_number: jerseyNum,
      position: position!.trim(),
      sport: sport!.trim(),
      school: school!.trim(),
      video_url: urlStr,
      source,
      email: email!.trim(),
      status: "queued",
    })
    .select("id")
    .single();

  if (insertError || !jobRow) {
    console.error("[process-video] Failed to create job:", insertError);
    return NextResponse.json(
      { error: "Failed to create processing job. Check Supabase configuration." },
      { status: 500 }
    );
  }

  const jobId: string = jobRow.id;
  console.log(`[process-video] Created job ${jobId} for ${firstName} ${lastName} #${jerseyNum}`);

  // ── Fire-and-forget processing pipeline ─────────────────────────────────
  const job: ProcessingJob = {
    id: jobId,
    firstName: firstName!.trim(),
    lastName: lastName!.trim(),
    jerseyNumber: jerseyNum,
    position: position!.trim(),
    sport: sport!.trim(),
    school: school!.trim(),
    videoUrl: urlStr,
    source: source as "youtube" | "upload",
    email: email!.trim(),
    status: "queued",
  };

  // Intentionally not awaited — returns immediately so client can poll
  processVideo(job).catch((err) => {
    console.error(`[process-video] Unhandled error in job ${jobId}:`, err);
  });

  return NextResponse.json({ jobId, status: "queued" }, { status: 201 });
}
