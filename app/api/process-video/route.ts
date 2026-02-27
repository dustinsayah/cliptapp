/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SUPABASE SETUP SQL — run ALL of this in Supabase SQL Editor before deploying
 * Dashboard → SQL Editor → New query → paste → Run
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * -- Core tables (run first if not already created)
 * CREATE TABLE IF NOT EXISTS processing_jobs (
 *   id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   first_name      TEXT,
 *   last_name       TEXT,
 *   jersey_number   INTEGER,
 *   position        TEXT,
 *   sport           TEXT,
 *   school          TEXT,
 *   video_url       TEXT,
 *   source          TEXT        DEFAULT 'youtube',
 *   status          TEXT        DEFAULT 'queued',
 *   created_at      TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at      TIMESTAMPTZ DEFAULT NOW(),
 *   result_clips    JSONB,
 *   error_message   TEXT,
 *   email           TEXT,
 *   queue_position  INTEGER     DEFAULT 0
 * );
 *
 * CREATE TABLE IF NOT EXISTS waitlist (
 *   id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   email      TEXT        UNIQUE,
 *   source     TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Add queue_position to existing tables (safe to run even if column already exists)
 * ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS queue_position INTEGER DEFAULT 0;
 *
 * -- Auto-update updated_at on row change
 * CREATE OR REPLACE FUNCTION update_updated_at_column()
 * RETURNS TRIGGER AS $$
 * BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
 * $$ language 'plpgsql';
 *
 * CREATE TRIGGER update_processing_jobs_updated_at
 *   BEFORE UPDATE ON processing_jobs
 *   FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
 *
 * -- Row level security
 * ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow public insert"    ON processing_jobs FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Allow public select"    ON processing_jobs FOR SELECT USING (true);
 * CREATE POLICY "Allow public update"    ON processing_jobs FOR UPDATE USING (true);
 *
 * ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow public insert" ON waitlist FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Allow public select" ON waitlist FOR SELECT USING (true);
 *
 * -- Enable Realtime (so polling can eventually be replaced with subscriptions)
 * ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
 * ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/process-video
 *
 * Creates a processing job in Supabase and kicks off the AI pipeline
 * in the background. Returns the jobId immediately so the client can poll.
 *
 * GET /api/process-video
 * Health check — returns { ok: true, timestamp, env: { supabase: boolean } }
 *
 * ⚠️  PRODUCTION NOTE: The fire-and-forget pattern used here only works on
 * long-running Node.js servers. On serverless (Vercel), use a proper queue
 * like BullMQ, Inngest, or Trigger.dev — the process terminates on response.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processVideo, ProcessingJob } from "@/lib/videoProcessor";
import { isValidYouTubeUrl } from "@/lib/youtubeUtils";

export const runtime = "nodejs";

// ── Inline Supabase client (server-side only, not shared with browser) ────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "https://placeholder.supabase.co" || key === "your-anon-key-here") {
    console.error("[process-video] Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    return null;
  }
  return createClient(url, key);
}

// ── In-memory rate limiting (3 submissions per hour per IP) ──────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: string } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: "60 minutes" };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / 60000);
    return { allowed: false, remaining: 0, resetIn: `${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}` };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: "60 minutes" };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── GET — health check ────────────────────────────────────────────────────────
export async function GET() {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your-anon-key-here";

  const resendConfigured = !!process.env.RESEND_API_KEY;

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    route: "POST /api/process-video",
    env: {
      supabase: supabaseConfigured,
      resend: resendConfigured,
    },
  });
}

// ── POST — create job ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    console.warn(`[process-video] Rate limit exceeded for IP ${ip}`);
    return NextResponse.json(
      {
        error: `Too many requests. Please wait ${rateCheck.resetIn} before submitting another video.`,
        rateLimited: true,
      },
      { status: 429 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    console.error("[process-video] Failed to parse request body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Validate fields ───────────────────────────────────────────────────────
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
  if (!videoUrl?.trim())    missing.push("videoUrl");
  if (!firstName?.trim())   missing.push("firstName");
  if (!lastName?.trim())    missing.push("lastName");
  if (jerseyNumber === undefined || jerseyNumber === null || jerseyNumber === "") missing.push("jerseyNumber");
  if (!position?.trim())    missing.push("position");
  if (!sport?.trim())       missing.push("sport");
  if (!school?.trim())      missing.push("school");
  if (!email?.trim())       missing.push("email");

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
      { error: "videoUrl must be a valid YouTube URL or direct video URL starting with http" },
      { status: 400 }
    );
  }

  // ── Supabase client ───────────────────────────────────────────────────────
  const supabase = getSupabase();
  if (!supabase) {
    console.error("[process-video] Cannot create job: Supabase not configured");
    return NextResponse.json(
      {
        error: "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.",
        hint: "See SETUP_GUIDE.md for step-by-step instructions.",
      },
      { status: 503 }
    );
  }

  // ── Calculate queue position ──────────────────────────────────────────────
  let queuePosition = 1;
  const { count, error: countError } = await supabase
    .from("processing_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "downloading", "scanning", "identifying", "building"]);

  if (countError) {
    console.error("[process-video] Failed to count active jobs:", countError.message);
  } else {
    queuePosition = (count ?? 0) + 1;
  }

  // ── Create job in Supabase ────────────────────────────────────────────────
  const { data: jobRow, error: insertError } = await supabase
    .from("processing_jobs")
    .insert({
      first_name:     firstName!.trim(),
      last_name:      lastName!.trim(),
      jersey_number:  jerseyNum,
      position:       position!.trim(),
      sport:          sport!.trim(),
      school:         school!.trim(),
      video_url:      urlStr,
      source,
      email:          email!.trim(),
      status:         "queued",
      queue_position: queuePosition,
    })
    .select("id")
    .single();

  if (insertError || !jobRow) {
    console.error("[process-video] Failed to insert job into Supabase:", insertError?.message ?? "No row returned");
    console.error("[process-video] Supabase error details:", JSON.stringify(insertError));
    return NextResponse.json(
      {
        error: `Failed to create processing job: ${insertError?.message ?? "Unknown database error"}`,
        hint: "Check that your Supabase project is running and the processing_jobs table exists. See SETUP_GUIDE.md.",
        supabaseError: insertError?.message,
        supabaseCode: insertError?.code,
      },
      { status: 500 }
    );
  }

  const jobId: string = jobRow.id;
  console.log(`[process-video] Created job ${jobId} for ${firstName} ${lastName} #${jerseyNum} — queue position ${queuePosition}`);

  // ── Fire-and-forget processing pipeline ──────────────────────────────────
  const job: ProcessingJob = {
    id: jobId,
    firstName: firstName!.trim(),
    lastName:  lastName!.trim(),
    jerseyNumber: jerseyNum,
    position:  position!.trim(),
    sport:     sport!.trim(),
    school:    school!.trim(),
    videoUrl:  urlStr,
    source:    source as "youtube" | "upload",
    email:     email!.trim(),
    status:    "queued",
  };

  // Intentionally not awaited — returns immediately so client can poll
  processVideo(job).catch((err) => {
    console.error(`[process-video] Unhandled error in job ${jobId}:`, err);
  });

  return NextResponse.json({ jobId, status: "queued", queuePosition }, { status: 201 });
}
