/**
 * GET /api/test-connections
 *
 * Tests connectivity to both Supabase and Google Video Intelligence.
 * Used by the admin panel "API Connections" section.
 *
 * Response:
 *   {
 *     supabase: { connected: boolean, message: string },
 *     google:   { connected: boolean, message: string }
 *   }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { testGoogleConnection } from "@/lib/googleVideoIntelligence";

export const runtime = "nodejs";
export const maxDuration = 30;

// Shared response headers — prevent Vercel/CDN from caching test results
const HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    // ── Test Supabase ──────────────────────────────────────────────────────────
    const supabaseResult = await testSupabase();

    // ── Test Google Video Intelligence ────────────────────────────────────────
    const googleResult = await testGoogle();

    return NextResponse.json(
      { supabase: supabaseResult, google: googleResult },
      { headers: HEADERS }
    );
  } catch (err) {
    // Top-level safety net — should never reach here but prevents a blank 500
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        supabase: { connected: false, message: `Unhandled error: ${message}` },
        google:   { connected: false, message: `Unhandled error: ${message}` },
      },
      { status: 500, headers: HEADERS }
    );
  }
}

// ── Supabase test ──────────────────────────────────────────────────────────────

async function testSupabase(): Promise<{ connected: boolean; message: string }> {
  // Check env vars first — fail fast with a clear message
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.trim() === "") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_URL is not set." };
  }
  if (!key || key.trim() === "") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set." };
  }

  // Reject placeholder values left over from .env.local template
  if (url === "https://placeholder.supabase.co") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_URL is still the placeholder value." };
  }
  if (key === "your-anon-key-here") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is still the placeholder value." };
  }

  try {
    // Create client fresh inside the handler — avoids any module-level init issues
    const supabase = createClient(url, key);

    // Minimal read — no .maybeSingle() to avoid PGRST116 confusion
    const { data, error } = await supabase
      .from("waitlist")
      .select("id")
      .limit(1);

    if (error) {
      return {
        connected: false,
        message: `Supabase query error: ${error.message} (code: ${error.code})`,
      };
    }

    const count = Array.isArray(data) ? data.length : 0;
    return {
      connected: true,
      message: `Supabase connected. ${count === 0 ? "Waitlist table is empty." : `${count} row(s) found.`}`,
    };
  } catch (err) {
    return {
      connected: false,
      message: `Supabase connection failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Google test ────────────────────────────────────────────────────────────────

async function testGoogle(): Promise<{ connected: boolean; message: string }> {
  try {
    const result = await testGoogleConnection();
    return { connected: result.success, message: result.message };
  } catch (err) {
    return {
      connected: false,
      message: `Google connection test threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
