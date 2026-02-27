/**
 * GET /api/test-connections
 *
 * Tests connectivity to both Supabase and Google Video Intelligence.
 * Uses direct fetch to the Supabase REST API — avoids the JS client's
 * network issues in Vercel's serverless environment.
 *
 * Response:
 *   {
 *     supabase: { connected: boolean, message: string, diagnostics: object },
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

// ── Supabase test — direct REST fetch with full diagnostics ───────────────────

async function testSupabase(): Promise<{ connected: boolean; message: string; diagnostics: Record<string, unknown> }> {
  const diag: Record<string, unknown> = {};

  // ── Step 1: Check env vars ─────────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  diag.urlExists      = !!url;
  diag.urlFirst30     = url ? url.slice(0, 30) : "(not set)";
  diag.keyExists      = !!key;
  diag.keyLength      = key ? key.length : 0;
  diag.nodeVersion    = process.version;
  diag.platform       = process.platform;

  console.log("[test-connections] Supabase diagnostics — step 1: env vars");
  console.log("[test-connections]   urlExists:", diag.urlExists);
  console.log("[test-connections]   urlFirst30:", diag.urlFirst30);
  console.log("[test-connections]   keyExists:", diag.keyExists);
  console.log("[test-connections]   keyLength:", diag.keyLength);
  console.log("[test-connections]   nodeVersion:", diag.nodeVersion);

  if (!url || url.trim() === "") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_URL is not set.", diagnostics: diag };
  }
  if (!key || key.trim() === "") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.", diagnostics: diag };
  }
  if (url === "https://placeholder.supabase.co") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_URL is still the placeholder value.", diagnostics: diag };
  }
  if (key === "your-anon-key-here") {
    return { connected: false, message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is still the placeholder value.", diagnostics: diag };
  }

  // ── Step 2: Basic DNS/connectivity test — bare domain, no path, no auth ────
  const bareUrl = url.replace(/\/$/, "");
  diag.bareUrl = bareUrl;
  console.log("[test-connections] Supabase diagnostics — step 2: bare domain fetch");
  console.log("[test-connections]   fetching:", bareUrl);

  try {
    const bareResponse = await fetch(bareUrl, { cache: "no-store" });
    diag.bareStatus     = bareResponse.status;
    diag.bareStatusText = bareResponse.statusText;
    diag.bareOk         = bareResponse.ok;
    console.log("[test-connections]   bare status:", diag.bareStatus, diag.bareStatusText);
  } catch (bareErr) {
    const e = bareErr instanceof Error ? bareErr : new Error(String(bareErr));
    diag.bareError        = e.message;
    diag.bareErrorName    = e.name;
    diag.bareErrorStack   = e.stack?.split("\n").slice(0, 5).join(" | ");
    console.log("[test-connections]   bare fetch THREW:", e.name, e.message);
    console.log("[test-connections]   bare stack:", diag.bareErrorStack);
  }

  // ── Step 3: REST API fetch with auth headers ────────────────────────────────
  const restUrl = `${bareUrl}/rest/v1/waitlist?select=id&limit=1`;
  diag.restUrl = restUrl;
  console.log("[test-connections] Supabase diagnostics — step 3: REST API fetch");
  console.log("[test-connections]   fetching:", restUrl);

  try {
    const response = await fetch(restUrl, {
      headers: {
        "apikey":        key,
        "Authorization": `Bearer ${key}`,
        "Content-Type":  "application/json",
      },
      cache: "no-store",
    });

    diag.restStatus     = response.status;
    diag.restStatusText = response.statusText;
    diag.restOk         = response.ok;

    console.log("[test-connections]   REST status:", diag.restStatus, diag.restStatusText);

    // 200 = rows returned, 406 = table exists but no rows — both prove the connection works
    if (response.ok || response.status === 406) {
      diag.result = "connected";
      console.log("[test-connections]   result: CONNECTED");
      return { connected: true, message: "Supabase connected successfully.", diagnostics: diag };
    }

    const body = await response.text().catch(() => "");
    diag.restBody = body.slice(0, 300);
    console.log("[test-connections]   REST body:", diag.restBody);

    return {
      connected: false,
      message: `Supabase returned HTTP ${response.status}: ${body.slice(0, 200)}`,
      diagnostics: diag,
    };
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    diag.restError      = e.message;
    diag.restErrorName  = e.name;
    diag.restErrorStack = e.stack?.split("\n").slice(0, 5).join(" | ");

    console.log("[test-connections]   REST fetch THREW:", e.name, e.message);
    console.log("[test-connections]   REST stack:", diag.restErrorStack);

    return {
      connected: false,
      message: `Supabase fetch failed [${e.name}]: ${e.message}`,
      diagnostics: diag,
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
