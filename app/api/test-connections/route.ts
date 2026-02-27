/**
 * GET /api/test-connections
 *
 * Tests connectivity to both Supabase and Google Video Intelligence.
 * Uses direct fetch to the Supabase REST API — avoids the JS client's
 * network issues in Vercel's serverless environment.
 *
 * Response:
 *   {
 *     supabase: { connected: boolean, message: string },
 *     google:   { connected: boolean, message: string }
 *   }
 */

import { NextResponse } from "next/server";
import { testGoogleConnection } from "@/lib/googleVideoIntelligence";

export const runtime = "nodejs";
export const maxDuration = 30;

const HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const supabaseResult = await testSupabase();
    const googleResult   = await testGoogle();

    return NextResponse.json(
      { supabase: supabaseResult, google: googleResult },
      { headers: HEADERS }
    );
  } catch (err) {
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

// ── Supabase test — direct REST fetch (no JS client) ──────────────────────────

async function testSupabase(): Promise<{ connected: boolean; message: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.trim() === "") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_URL is not set." };
  }
  if (!key || key.trim() === "") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set." };
  }
  if (url === "https://placeholder.supabase.co") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_URL is still the placeholder value." };
  }
  if (key === "your-anon-key-here") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is still the placeholder value." };
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/waitlist?select=id&limit=1`,
      {
        headers: {
          "apikey":        key,
          "Authorization": `Bearer ${key}`,
          "Content-Type":  "application/json",
        },
        cache: "no-store",
      }
    );

    // 200 = rows returned, 406 = table exists but no rows matched — both prove connection works
    if (response.ok || response.status === 406) {
      return { connected: true, message: "Supabase connected successfully." };
    }

    const body = await response.text().catch(() => "");
    return {
      connected: false,
      message: `Supabase returned HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    };
  } catch (err) {
    return {
      connected: false,
      message: `Supabase fetch failed: ${err instanceof Error ? err.message : String(err)}`,
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
