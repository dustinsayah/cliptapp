/**
 * GET /api/test-connections
 *
 * Checks connectivity status for Supabase and Google Video Intelligence.
 *
 * Supabase: all DB calls happen browser-side — this just verifies env vars are set.
 * Google:   credentials must be server-side, so we test the real connection here.
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
  // ── Supabase: just check env vars (all DB calls happen in the browser) ────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseConfigured =
    !!supabaseUrl && supabaseUrl !== "https://placeholder.supabase.co" &&
    !!supabaseKey && supabaseKey !== "your-anon-key-here";

  const supabaseResult = {
    connected: supabaseConfigured,
    message: supabaseConfigured
      ? "Supabase is configured — browser-side connection active."
      : "Supabase env vars not set. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  };

  // ── Google: server-side credentials, test real connection ─────────────────
  let googleResult: { connected: boolean; message: string };
  try {
    const result = await testGoogleConnection();
    googleResult = { connected: result.success, message: result.message };
  } catch (err) {
    googleResult = {
      connected: false,
      message: `Google connection test threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return NextResponse.json({ supabase: supabaseResult, google: googleResult }, { headers: HEADERS });
}
