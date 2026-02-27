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

export async function GET() {
  // ── Test Supabase ─────────────────────────────────────────────────────────
  const supabaseResult = await (async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const PLACEHOLDER_URL = "https://placeholder.supabase.co";
    const PLACEHOLDER_KEY = "your-anon-key-here";

    if (!url || url === PLACEHOLDER_URL) {
      return {
        connected: false,
        message: "NEXT_PUBLIC_SUPABASE_URL is not configured.",
      };
    }
    if (!key || key === PLACEHOLDER_KEY) {
      return {
        connected: false,
        message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.",
      };
    }

    try {
      const client = createClient(url, key);
      // Try a minimal read — just 1 row from waitlist; fails gracefully if table doesn't exist
      const { error } = await client
        .from("waitlist")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error) {
        // "PGRST116" = no rows returned — that's fine, the connection works
        if (error.code === "PGRST116") {
          return { connected: true, message: "Supabase connected (waitlist table empty)." };
        }
        return {
          connected: false,
          message: `Supabase query error: ${error.message} (code: ${error.code})`,
        };
      }

      return { connected: true, message: "Supabase connected successfully." };
    } catch (err) {
      return {
        connected: false,
        message: `Supabase connection failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  })();

  // ── Test Google Video Intelligence ────────────────────────────────────────
  const googleResult = await testGoogleConnection();

  return NextResponse.json({
    supabase: supabaseResult,
    google: {
      connected: googleResult.success,
      message: googleResult.message,
    },
  });
}
