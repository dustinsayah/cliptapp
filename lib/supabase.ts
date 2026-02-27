/**
 * REQUIRED DATABASE TABLES
 * Run the SQL below in your Supabase SQL editor:
 * Dashboard → SQL Editor → New query → paste → Run
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CREATE TABLE processing_jobs (
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
 *   email           TEXT
 * );
 *
 * CREATE OR REPLACE FUNCTION update_updated_at_column()
 * RETURNS TRIGGER AS $$
 * BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
 * $$ language 'plpgsql';
 *
 * CREATE TRIGGER update_processing_jobs_updated_at
 *   BEFORE UPDATE ON processing_jobs
 *   FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
 *
 * ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow public insert"    ON processing_jobs FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Allow public select"    ON processing_jobs FOR SELECT USING (true);
 * CREATE POLICY "Allow public update"    ON processing_jobs FOR UPDATE USING (true);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CREATE TABLE waitlist (
 *   id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   email      TEXT        UNIQUE,
 *   source     TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow public insert" ON waitlist FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Allow public select" ON waitlist FOR SELECT USING (true);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PLACEHOLDER_URLS = ["https://placeholder.supabase.co", ""];
const PLACEHOLDER_KEYS = ["your-anon-key-here", "placeholder-key", ""];

/** True when real (non-placeholder) credentials are present */
export const isConfigured =
  !!supabaseUrl &&
  !!supabaseKey &&
  !PLACEHOLDER_URLS.includes(supabaseUrl) &&
  !PLACEHOLDER_KEYS.includes(supabaseKey);

/** Human-readable explanation of what's missing — empty string when configured */
export const configError: string = (() => {
  if (!supabaseUrl || PLACEHOLDER_URLS.includes(supabaseUrl ?? "")) {
    return "NEXT_PUBLIC_SUPABASE_URL is missing or still set to the placeholder value.";
  }
  if (!supabaseKey || PLACEHOLDER_KEYS.includes(supabaseKey ?? "")) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still set to 'your-anon-key-here'. Get it from Supabase Dashboard → Project Settings → API → anon public key.";
  }
  return "";
})();

if (!isConfigured) {
  console.warn("[Clipt] ⚠️  Supabase not configured —", configError);
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseKey ?? "placeholder-key"
);

// ── Waitlist helper ────────────────────────────────────────────────────────

export type WaitlistSource =
  | "homepage"
  | "start_page_modal"
  | "process_page"
  | "nav_ai_click";

export interface WaitlistResult {
  success: boolean;
  alreadyExists: boolean;
  error?: string;
}

/**
 * Inserts an email into the waitlist table.
 * - If the email already exists (code 23505), returns { success: true, alreadyExists: true }
 * - If Supabase is not configured, returns { success: false } with an error message.
 * - Logs the full Supabase response to the console for debugging.
 */
export async function saveToWaitlist(
  email: string,
  source: WaitlistSource
): Promise<WaitlistResult> {
  if (!isConfigured) {
    console.warn("[Clipt] Supabase not configured — waitlist insert skipped.");
    return { success: false, alreadyExists: false, error: "Supabase not configured." };
  }

  const response = await supabase
    .from("waitlist")
    .insert({ email: email.trim().toLowerCase(), source });

  console.log("[Clipt] Supabase waitlist response:", response);

  if (response.error) {
    const { code, message } = response.error;
    if (
      code === "23505" ||
      message?.toLowerCase().includes("duplicate") ||
      message?.toLowerCase().includes("unique")
    ) {
      return { success: true, alreadyExists: true };
    }
    return { success: false, alreadyExists: false, error: message };
  }

  return { success: true, alreadyExists: false };
}

// ── Types ──────────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ProcessingJobRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  jersey_number: number | null;
  position: string | null;
  sport: string | null;
  school: string | null;
  video_url: string | null;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  result_clips: Json | null;
  error_message: string | null;
  email: string | null;
}
