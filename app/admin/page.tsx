"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SPORTS_CONFIG } from "@/lib/sportsConfig";

// ── Inline Supabase client (browser-side only, no lib/supabase.ts) ──────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Debug: log first 20 chars of URL so we can verify it is being read correctly
console.log("[Admin] NEXT_PUBLIC_SUPABASE_URL (first 20):", process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20) ?? "(not set)");

// ── Types ──────────────────────────────────────────────────────────────────

interface JobRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  jersey_number: number | null;
  sport: string | null;
  status: string;
  created_at: string;
  email: string | null;
  position: string | null;
  school: string | null;
  video_url: string | null;
  source: string | null;
}

interface WaitlistRow {
  id: string;
  email: string | null;
  source: string | null;
  created_at: string;
}

interface SimJob {
  jobId: string;
  status: string;
  jerseyNumber: number;
  firstName: string;
  sport: string;
  elapsed: number;
}

const POSITIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(SPORTS_CONFIG).map(([name, cfg]) => [name, cfg.positions])
);

const STATUS_COLORS: Record<string, string> = {
  queued:      "#94A3B8",
  downloading: "#60A5FA",
  scanning:    "#A78BFA",
  identifying: "#FBBF24",
  building:    "#F97316",
  complete:    "#22C55E",
  failed:      "#EF4444",
};

const STATUS_IDX: Record<string, number> = {
  queued: 0, downloading: 1, scanning: 2, identifying: 3, building: 4, complete: 5, failed: -1,
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return iso; }
}

function fmtElapsed(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94A3B8";
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      {(status === "scanning" || status === "downloading" || status === "identifying" || status === "building") && (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      )}
      {status}
    </span>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────

function SimProgressBar({ status }: { status: string }) {
  const idx = STATUS_IDX[status] ?? 0;
  const steps = ["queued","downloading","scanning","identifying","building","complete"];
  return (
    <div className="flex items-center gap-1 mt-2">
      {steps.map((s, i) => {
        const done = i < idx || status === "complete";
        const active = s === status;
        return (
          <div key={s} className="flex-1 h-1.5 rounded-full transition-all duration-500"
            style={{
              background: done ? "#22C55E" : active ? "#00A3FF" : "rgba(255,255,255,0.07)",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Input Style ────────────────────────────────────────────────────────────

const IS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
  color: "#fff",
  width: "100%",
  padding: "10px 14px",
  fontSize: "13px",
  outline: "none",
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const [jobs,        setJobs]        = useState<JobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError,   setJobsError]   = useState("");

  // ── Waitlist ──────────────────────────────────────────────────────────────
  const [waitlist,        setWaitlist]        = useState<WaitlistRow[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [waitlistError,   setWaitlistError]   = useState("");

  // ── Simulate form ─────────────────────────────────────────────────────────
  const [simFirstName,   setSimFirstName]   = useState("");
  const [simLastName,    setSimLastName]    = useState("");
  const [simJersey,      setSimJersey]      = useState("");
  const [simSport,       setSimSport]       = useState("");
  const [simPosition,    setSimPosition]    = useState("");
  const [simSchool,      setSimSchool]      = useState("");
  const [simEmail,       setSimEmail]       = useState("");
  const [simYtUrl,       setSimYtUrl]       = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [simSubmitting,  setSimSubmitting]  = useState(false);
  const [simError,       setSimError]       = useState("");
  const [simJob,         setSimJob]         = useState<SimJob | null>(null);
  const simPollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const simElapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Review flow test ─────────────────────────────────────────────────────
  const [reviewSport,    setReviewSport]    = useState("Basketball");
  const [reviewPosition, setReviewPosition] = useState("Point Guard");

  // ── API Connections test ──────────────────────────────────────────────────
  interface ConnResult { connected: boolean; message: string }
  const [connTesting,   setConnTesting]   = useState(false);
  const [connResults,   setConnResults]   = useState<{ supabase?: ConnResult; google?: ConnResult } | null>(null);
  // Legacy single-test state (kept to avoid breaking the old handler reference)
  const [apiTestResult,  setApiTestResult]  = useState<{ ok: boolean; message: string } | null>(null);
  const [apiTesting,     setApiTesting]     = useState(false);

  const handleLoadMockReview = () => {
    const sportCfg = SPORTS_CONFIG[reviewSport];
    const playDefs = sportCfg
      ? sportCfg.getClipTypes(reviewPosition).map((c) => ({ playType: c.label, confidence: c.confidence }))
      : [
          { playType: "Highlight Play", confidence: 0.93 },
          { playType: "Big Play",       confidence: 0.89 },
          { playType: "Key Play",       confidence: 0.85 },
          { playType: "Athletic Play",  confidence: 0.81 },
          { playType: "Impact Play",    confidence: 0.77 },
          { playType: "Great Play",     confidence: 0.73 },
          { playType: "Scoring Play",   confidence: 0.70 },
          { playType: "Fast Break",     confidence: 0.67 },
        ];
    let cursor = 45;
    const baseQs = 94;
    const mockClips = playDefs.slice(0, 8).map(({ playType, confidence }, i) => {
      const startTime = cursor;
      const dur = Math.round((4 + Math.random() * 5) * 10) / 10;
      const endTime = Math.round((startTime + dur) * 10) / 10;
      cursor = endTime + 55 + Math.floor(Math.random() * 40);
      const qualityScore = Math.max(30, baseQs - i * 4);
      console.log(`CLIPT AI: [admin mock] clip ${i + 1} → playType="${playType}" confidence=${confidence} quality=${qualityScore} classifiedBy=estimated`);
      return {
        id: `mock-${i + 1}`,
        clipNumber: i + 1,
        playType,
        startTime,
        endTime,
        duration: dur,
        confidenceScore: confidence,
        qualityScore,
        classifiedBy: "estimated" as const,
        jerseyVisible: true,
        aiPicked: true,
        sport: reviewSport,
        jerseyNumber: 23,
        thumbnailUrl: null,
      };
    });
    localStorage.setItem("clipSource", "ai");
    localStorage.setItem("aiGeneratedClips", JSON.stringify(mockClips));
    localStorage.setItem("aiJobMeta", JSON.stringify({ jerseyNumber: 23, firstName: "Marcus", sport: reviewSport, position: reviewPosition }));
    localStorage.setItem("reviewComplete", "false");
    router.push("/review");
  };

  // ── Test all API connections via /api/test-connections ────────────────────
  const handleTestConnections = async () => {
    setConnTesting(true);
    setConnResults(null);
    try {
      const res = await fetch("/api/test-connections");
      const data = await res.json();
      setConnResults({
        supabase: data.supabase,
        google:   data.google,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setConnResults({
        supabase: { connected: false, message: msg },
        google:   { connected: false, message: msg },
      });
    }
    setConnTesting(false);
  };

  // Legacy single Google-API test (kept for backwards compatibility)
  const handleTestGoogleApi = async () => {
    setApiTesting(true);
    setApiTestResult(null);
    try {
      const res = await fetch("/api/classify-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          clips: [{ startTime: 0, endTime: 5, confidence: 0.9 }],
          sport: "Basketball",
          position: "Point Guard",
          _testOnly: true,
        }),
      });
      const data = await res.json();
      if (data.fallback) {
        setApiTestResult({ ok: false, message: `Google API not configured — using fallback. ${data.fallbackReason ?? ""}` });
      } else if (data.error) {
        setApiTestResult({ ok: false, message: data.error });
      } else {
        setApiTestResult({ ok: true, message: `Google Video Intelligence responded. ${data.message ?? ""}` });
      }
    } catch (e) {
      setApiTestResult({ ok: false, message: e instanceof Error ? e.message : "Network error" });
    }
    setApiTesting(false);
  };

  // Clear sim position when sport changes
  useEffect(() => { setSimPosition(""); }, [simSport]);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError("");
    console.log("[Admin] loadJobs: starting fetch");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      console.log("[Admin] loadJobs: URL prefix =", url?.slice(0, 40));
      const res = await fetch(
        `${url}/rest/v1/processing_jobs?select=*&order=created_at.desc&limit=100`,
        { headers: { apikey: key!, Authorization: `Bearer ${key}` }, signal: controller.signal }
      );
      clearTimeout(timeout);
      console.log("[Admin] loadJobs: status =", res.status, "ok =", res.ok);
      const data = await res.json();
      console.log("[Admin] loadJobs: data =", data);
      if (!res.ok) {
        setJobsError(data?.message ?? `HTTP ${res.status}`);
      } else if (!Array.isArray(data)) {
        console.warn("[Admin] loadJobs: not an array:", typeof data, data);
        setJobsError("No data found (unexpected response format)");
      } else {
        setJobs(data);
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === "AbortError") {
        console.error("[Admin] loadJobs: timed out after 8s");
        setJobsError("Request timed out.");
      } else {
        console.error("[Admin] loadJobs: error:", e);
        setJobsError(e?.message ?? "Network error");
      }
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    setWaitlistError("");
    console.log("[Admin] loadWaitlist: starting fetch");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      console.log("[Admin] loadWaitlist: URL prefix =", url?.slice(0, 40));
      const res = await fetch(
        `${url}/rest/v1/waitlist?select=*&order=created_at.desc&limit=200`,
        { headers: { apikey: key!, Authorization: `Bearer ${key}` }, signal: controller.signal }
      );
      clearTimeout(timeout);
      console.log("[Admin] loadWaitlist: status =", res.status, "ok =", res.ok);
      const data = await res.json();
      console.log("[Admin] loadWaitlist: data =", data);
      if (!res.ok) {
        setWaitlistError(data?.message ?? `HTTP ${res.status}`);
      } else if (!Array.isArray(data)) {
        console.warn("[Admin] loadWaitlist: not an array:", typeof data, data);
        setWaitlistError("No data found (unexpected response format)");
      } else {
        setWaitlist(data);
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === "AbortError") {
        console.error("[Admin] loadWaitlist: timed out after 8s");
        setWaitlistError("Request timed out.");
      } else {
        console.error("[Admin] loadWaitlist: error:", e);
        setWaitlistError(e?.message ?? "Network error");
      }
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { loadWaitlist(); }, [loadWaitlist]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simPollRef.current)   clearInterval(simPollRef.current);
      if (simElapsedRef.current) clearInterval(simElapsedRef.current);
    };
  }, []);

  // ── Job actions ──────────────────────────────────────────────────────────

  const markComplete = async (jobId: string) => {
    const { error } = await supabase
      .from("processing_jobs")
      .update({ status: "complete", updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (!error) {
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "complete" } : j));
    }
  };

  const clearAllJobs = async () => {
    if (!confirm("Delete ALL processing jobs? This cannot be undone.")) return;
    const { error } = await supabase
      .from("processing_jobs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
    if (!error) {
      setJobs([]);
    } else {
      alert("Clear failed: " + error.message);
    }
  };

  // ── Simulate submit ──────────────────────────────────────────────────────

  const handleSimSubmit = async () => {
    if (simSubmitting) return;
    const jNum = Number(simJersey);
    if (!simFirstName.trim() || !simLastName.trim() || !simJersey || isNaN(jNum) ||
        !simSport || !simPosition || !simSchool || !simEmail) {
      setSimError("Fill out all fields.");
      return;
    }
    setSimError("");
    setSimSubmitting(true);

    // Stop any existing poll
    if (simPollRef.current) clearInterval(simPollRef.current);
    if (simElapsedRef.current) clearInterval(simElapsedRef.current);

    try {
      // Generate job ID in browser
      const jobId = crypto.randomUUID();

      // Count active jobs for queue position
      const { count } = await supabase
        .from("processing_jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "downloading", "scanning", "identifying", "building"]);
      const queuePosition = (count ?? 0) + 1;

      // Insert job to Supabase directly from browser
      await supabase.from("processing_jobs").insert({
        id:             jobId,
        first_name:     simFirstName.trim(),
        last_name:      simLastName.trim(),
        jersey_number:  jNum,
        jersey_color:   "#FFFFFF",
        position:       simPosition,
        sport:          simSport,
        school:         simSchool.trim(),
        video_url:      simYtUrl,
        source:         "youtube",
        email:          simEmail.trim(),
        status:         "queued",
        queue_position: queuePosition,
      });

      setSimJob({ jobId, status: "queued", jerseyNumber: jNum, firstName: simFirstName.trim(), sport: simSport, elapsed: 0 });

      // Elapsed timer
      simElapsedRef.current = setInterval(() => {
        setSimJob((prev) => prev ? { ...prev, elapsed: prev.elapsed + 1 } : prev);
      }, 1000);

      // Simulate processing stages by updating Supabase directly from browser
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "downloading" }).eq("id", jobId).then(() => {}); }, 1200);
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "scanning"    }).eq("id", jobId).then(() => {}); }, 4000);
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "identifying" }).eq("id", jobId).then(() => {}); }, 7000);
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "building"    }).eq("id", jobId).then(() => {}); }, 9500);
      setTimeout(() => {
        const sportCfg = SPORTS_CONFIG[simSport];
        const playDefs = sportCfg
          ? sportCfg.getClipTypes(simPosition).map((c: { label: string; confidence: number }) => ({ playType: c.label, confidenceScore: c.confidence }))
          : [{ playType: "Highlight Play", confidenceScore: 0.9 }];
        let cursor = 45;
        const mockClips = playDefs.slice(0, 8).map((p: { playType: string; confidenceScore: number }, i: number) => {
          const dur = Math.round((4 + Math.random() * 4.5) * 10) / 10;
          const startTime = cursor;
          const endTime = Math.round((startTime + dur) * 10) / 10;
          cursor = endTime + 60;
          return { id: `ai-clip-${i + 1}`, clipNumber: i + 1, playType: p.playType, startTime, endTime, duration: dur, confidenceScore: p.confidenceScore, jerseyVisible: true, aiPicked: true, sport: simSport, jerseyNumber: jNum, thumbnailUrl: null };
        });
        supabase.from("processing_jobs").update({
          status: "complete", result_clips: mockClips, updated_at: new Date().toISOString(),
        }).eq("id", jobId).then(() => {});
      }, 12000);

      // Poll Supabase directly for status updates (no API route)
      const poll = async () => {
        try {
          const { data: sd } = await supabase
            .from("processing_jobs")
            .select("status, result_clips, error_message")
            .eq("id", jobId)
            .single();
          if (sd?.status) {
            setSimJob((prev) => prev ? { ...prev, status: sd.status } : prev);
            if (sd.status === "complete" || sd.status === "failed") {
              if (simPollRef.current) clearInterval(simPollRef.current);
              if (simElapsedRef.current) clearInterval(simElapsedRef.current);
              loadJobs();
            }
          }
        } catch (pollErr) {
          console.error("[admin] Poll error:", pollErr);
        }
      };
      poll();
      simPollRef.current = setInterval(poll, 3000);
    } catch (e) {
      setSimError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSimSubmitting(false);
    }
  };

  const simPositions = POSITIONS[simSport] ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      <style>{`
        .admin-table th { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #475569; text-transform: uppercase; padding: 10px 16px; }
        .admin-table td { font-size: 13px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.04); }
        .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
        input::placeholder, select option { color: #475569; }
      `}</style>

      {/* ── Header ── */}
      <div className="border-b border-white/[0.06] bg-[#050A14]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-black tracking-wider" style={{ color: "#00A3FF" }}>CLIPT</span>
            <div className="w-px h-5 bg-white/10" />
            <span className="text-sm font-bold text-slate-400">Admin Testing Panel</span>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
              Internal Only
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Not linked from any public page</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Quick Links ── */}
        <section>
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/process"
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #0055EE, #00A3FF)", boxShadow: "0 0 24px rgba(0,120,255,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
              Test AI Processing Flow
            </Link>
            <Link href="/upload"
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="20" height="20" x="2" y="2" rx="2" /><line x1="7" x2="7" y1="2" y2="22" /><line x1="17" x2="17" y1="2" y2="22" /><line x1="2" x2="22" y1="7" y2="7" /><line x1="2" x2="22" y1="12" y2="12" /><line x1="2" x2="22" y1="17" y2="17" /></svg>
              Test Clip Upload Flow
            </Link>
            <Link href="/customize"
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
              Test Customize
            </Link>
            <Link href="/export"
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
              Test Export
            </Link>
            <Link href="/review"
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ background: "#0A1628", border: "1px solid rgba(168,85,247,0.3)", color: "#A855F7" }}>
              Test Review Page
            </Link>
          </div>
        </section>

        {/* ── Simulate AI Processing ── */}
        <section className="rounded-2xl overflow-hidden" style={{ background: "#0A1628", border: "1px solid rgba(0,163,255,0.2)" }}>
          <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Simulate AI Processing</h2>
              <p className="text-slate-500 text-xs mt-0.5">Creates a real job in Supabase and tracks status live — without leaving this page</p>
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(0,163,255,0.12)", color: "#00A3FF", border: "1px solid rgba(0,163,255,0.25)" }}>
              Live Pipeline
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">First Name</label>
                <input value={simFirstName} onChange={(e) => setSimFirstName(e.target.value)} placeholder="Marcus" style={IS} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Last Name</label>
                <input value={simLastName} onChange={(e) => setSimLastName(e.target.value)} placeholder="Johnson" style={IS} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Jersey Number</label>
                <input type="number" min={0} max={99} value={simJersey} onChange={(e) => setSimJersey(e.target.value)} placeholder="23" style={{ ...IS, maxWidth: "100%" }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Sport</label>
                <select value={simSport} onChange={(e) => setSimSport(e.target.value)} style={{ ...IS, appearance: "none" } as React.CSSProperties}>
                  <option value="" disabled hidden>Select sport</option>
                  {Object.entries(SPORTS_CONFIG).map(([name, cfg]) => (
                    <option key={name} value={name} style={{ background: "#0A1628" }}>{cfg.icon} {name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Position</label>
                <select value={simPosition} onChange={(e) => setSimPosition(e.target.value)} disabled={!simSport}
                  style={{ ...IS, appearance: "none", opacity: simSport ? 1 : 0.5 } as React.CSSProperties}>
                  <option value="" disabled hidden>{simSport ? "Select position" : "Select sport first"}</option>
                  {simPositions.map((p) => <option key={p} value={p} style={{ background: "#0A1628" }}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">School</label>
                <input value={simSchool} onChange={(e) => setSimSchool(e.target.value)} placeholder="Westlake HS" style={IS} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Email</label>
                <input type="email" value={simEmail} onChange={(e) => setSimEmail(e.target.value)} placeholder="test@clipt.ai" style={IS} />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs text-slate-400 font-medium block mb-1.5">YouTube URL (test video)</label>
                <input value={simYtUrl} onChange={(e) => setSimYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={IS} />
              </div>
            </div>

            {simError && (
              <div className="mb-4 px-4 py-2.5 rounded-xl text-sm text-red-400"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {simError}
              </div>
            )}

            <button onClick={handleSimSubmit} disabled={simSubmitting}
              className="px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0055EE, #00A3FF)", boxShadow: "0 0 24px rgba(0,120,255,0.3)" }}>
              {simSubmitting ? "Starting..." : "Run Simulation →"}
            </button>

            {/* Live status */}
            {simJob && (
              <div className="mt-6 rounded-xl p-5" style={{ background: "rgba(0,163,255,0.05)", border: "1px solid rgba(0,163,255,0.2)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={simJob.status} />
                    <span className="text-sm font-bold text-white">
                      {simJob.firstName} #{simJob.jerseyNumber} — {simJob.sport}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm font-mono tabular-nums">{fmtElapsed(simJob.elapsed)}</span>
                    {(simJob.status === "complete" || simJob.status === "failed") && (
                      <button
                        onClick={() => {
                          setSimJob(null);
                          if (simPollRef.current) clearInterval(simPollRef.current);
                          if (simElapsedRef.current) clearInterval(simElapsedRef.current);
                        }}
                        className="text-xs text-slate-500 hover:text-white transition-colors">
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
                <SimProgressBar status={simJob.status} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">
                    job ID: <span className="text-slate-400 select-all">{simJob.jobId}</span>
                  </span>
                  {simJob.status === "complete" && (
                    <span className="text-xs text-emerald-400 font-bold">✓ Complete — clips saved to Supabase</span>
                  )}
                  {simJob.status === "failed" && (
                    <span className="text-xs text-red-400 font-bold">✗ Failed — check server logs</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Processing Jobs Table ── */}
        <section className="rounded-2xl overflow-hidden" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-black text-white">Processing Jobs</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {jobs.length} total job{jobs.length !== 1 ? "s" : ""} in Supabase
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadJobs} disabled={jobsLoading}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {jobsLoading ? "Loading..." : "↻ Refresh"}
              </button>
              <button onClick={clearAllJobs}
                className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                Clear All Jobs
              </button>
            </div>
          </div>

          {jobsError ? (
            <div className="px-6 py-6 text-sm text-red-400">{jobsError}</div>
          ) : jobsLoading ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-600 text-sm">No jobs yet. Submit a video from the process page.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full admin-table">
                <thead>
                  <tr>
                    <th className="text-left">ID</th>
                    <th className="text-left">Athlete</th>
                    <th className="text-left">Sport</th>
                    <th className="text-left">Jersey</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <span className="font-mono text-xs text-slate-500 select-all" title={job.id}>
                          {job.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-white">
                          {[job.first_name, job.last_name].filter(Boolean).join(" ") || "—"}
                        </span>
                      </td>
                      <td className="text-slate-300">{job.sport ?? "—"}</td>
                      <td>
                        {job.jersey_number !== null ? (
                          <span className="font-black text-white">#{job.jersey_number}</span>
                        ) : "—"}
                      </td>
                      <td><StatusBadge status={job.status} /></td>
                      <td className="text-slate-400 text-xs">{fmtDate(job.created_at)}</td>
                      <td className="text-right">
                        {job.status !== "complete" && job.status !== "failed" && (
                          <button onClick={() => markComplete(job.id)}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg"
                            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                            Mark Complete
                          </button>
                        )}
                        {job.status === "complete" && (
                          <span className="text-xs text-slate-600">Complete</span>
                        )}
                        {job.status === "failed" && (
                          <button onClick={() => markComplete(job.id)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors">
                            Retry →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Waitlist Table ── */}
        <section className="rounded-2xl overflow-hidden" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-black text-white">Waitlist Signups</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {waitlist.length} subscriber{waitlist.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={loadWaitlist} disabled={waitlistLoading}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {waitlistLoading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {waitlistError ? (
            <div className="px-6 py-6 text-sm text-red-400">{waitlistError}</div>
          ) : waitlistLoading ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm">Loading waitlist...</div>
          ) : waitlist.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-600 text-sm">No waitlist signups yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full admin-table">
                <thead>
                  <tr>
                    <th className="text-left">Email</th>
                    <th className="text-left">Source</th>
                    <th className="text-left">Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium text-white">{row.email ?? "—"}</td>
                      <td>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: row.source?.includes("ai") ? "rgba(0,163,255,0.1)" : "rgba(255,255,255,0.05)",
                            color: row.source?.includes("ai") ? "#00A3FF" : "#94A3B8",
                          }}>
                          {row.source ?? "unknown"}
                        </span>
                      </td>
                      <td className="text-slate-400 text-xs">{fmtDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Supabase Config Status ── */}
        {(!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") && (
          <section className="rounded-2xl p-6" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <h2 className="text-sm font-black text-red-400 uppercase tracking-widest mb-2">Database Not Configured</h2>
            <p className="text-red-300 text-sm leading-relaxed">
              NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.
            </p>
            <p className="text-slate-500 text-xs mt-3">
              Add your real Supabase credentials to <code className="text-slate-400">.env.local</code> (local) or Vercel Environment Variables (production), then redeploy.
            </p>
          </section>
        )}

        {/* ── Test Clip Review Flow ── */}
        <section className="rounded-2xl overflow-hidden" style={{ background: "#0A1628", border: "1px solid rgba(168,85,247,0.25)" }}>
          <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Test Clip Review Flow</h2>
              <p className="text-slate-500 text-xs mt-0.5">Generate mock clips and jump straight to /review — no AI processing needed</p>
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(168,85,247,0.12)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.25)" }}>
              UI Test
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Sport</label>
                <select value={reviewSport} onChange={(e) => { setReviewSport(e.target.value); setReviewPosition(""); }}
                  style={{ ...IS, appearance: "none" } as React.CSSProperties}>
                  {Object.entries(SPORTS_CONFIG).map(([name, cfg]) => (
                    <option key={name} value={name} style={{ background: "#0A1628" }}>{cfg.icon} {name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Position</label>
                <select value={reviewPosition} onChange={(e) => setReviewPosition(e.target.value)}
                  style={{ ...IS, appearance: "none" } as React.CSSProperties}>
                  {(SPORTS_CONFIG[reviewSport]?.positions ?? []).map((p) => (
                    <option key={p} value={p} style={{ background: "#0A1628" }}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={handleLoadMockReview}
              className="px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)", boxShadow: "0 0 24px rgba(168,85,247,0.3)" }}>
              Load Mock Clips into Review →
            </button>
          </div>
        </section>

        {/* ── API Connections ── */}
        <section className="rounded-2xl overflow-hidden" style={{ background: "#0A1628", border: "1px solid rgba(0,163,255,0.2)" }}>
          <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">API Connections</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Verify Supabase and Google Video Intelligence are configured and reachable
              </p>
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(0,163,255,0.1)", color: "#00A3FF", border: "1px solid rgba(0,163,255,0.25)" }}>
              Diagnostics
            </div>
          </div>
          <div className="p-6">
            <button
              onClick={handleTestConnections}
              disabled={connTesting}
              className="px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-50 mb-5"
              style={{ background: "linear-gradient(135deg, #0055EE, #00A3FF)", boxShadow: "0 0 20px rgba(0,120,255,0.25)" }}
            >
              {connTesting ? (
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  Testing Connections...
                </span>
              ) : "Test All Connections"}
            </button>

            {connResults && (
              <div className="flex flex-col gap-3">
                {/* Supabase */}
                <div
                  className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                  style={{
                    background: connResults.supabase?.connected ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${connResults.supabase?.connected ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                  }}
                >
                  <span className="text-lg leading-none mt-0.5" style={{ color: connResults.supabase?.connected ? "#22C55E" : "#EF4444" }}>
                    {connResults.supabase?.connected ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: connResults.supabase?.connected ? "#22C55E" : "#EF4444" }}>
                      Supabase — {connResults.supabase?.connected ? "Connected" : "Not Connected"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{connResults.supabase?.message}</p>
                  </div>
                </div>

                {/* Google Video Intelligence */}
                <div
                  className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                  style={{
                    background: connResults.google?.connected ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${connResults.google?.connected ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                  }}
                >
                  <span className="text-lg leading-none mt-0.5" style={{ color: connResults.google?.connected ? "#22C55E" : "#EF4444" }}>
                    {connResults.google?.connected ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: connResults.google?.connected ? "#22C55E" : "#EF4444" }}>
                      Google Video Intelligence — {connResults.google?.connected ? "Connected" : "Not Connected"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{connResults.google?.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Legacy single test (kept for quick access) */}
            <div className="mt-4 pt-4 border-t border-white/[0.04]">
              <p className="text-xs text-slate-600 mb-2">Quick Google-only test (classify-clips route)</p>
              <div className="flex items-start gap-3 flex-wrap">
                <button onClick={handleTestGoogleApi} disabled={apiTesting}
                  className="px-5 py-2 rounded-lg font-bold text-xs transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22C55E" }}>
                  {apiTesting ? "Testing..." : "Test Google Video Intelligence"}
                </button>
                {apiTestResult && (
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: apiTestResult.ok ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${apiTestResult.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                      color: apiTestResult.ok ? "#22C55E" : "#F87171",
                    }}>
                    {apiTestResult.ok ? "✓ " : "✗ "}{apiTestResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Quick Links — add Review ── */}

        {/* ── Footer ── */}
        <div className="text-center text-slate-700 text-xs pb-4">
          Clipt Admin Panel · {new Date().getFullYear()} · Internal use only · /admin
        </div>

      </div>
    </div>
  );
}
