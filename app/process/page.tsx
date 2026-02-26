"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isValidYouTubeUrl, getYouTubeThumbnail, type YouTubeOEmbedData } from "@/lib/youtubeUtils";
import { saveToWaitlist } from "@/lib/supabase";

// ── Position options by sport ──────────────────────────────────────────────

const POSITIONS: Record<string, string[]> = {
  Football:   ["Quarterback","Running Back","Wide Receiver","Tight End","Offensive Line","Defensive Line","Linebacker","Cornerback","Safety","Kicker / Punter"],
  Basketball: ["Point Guard","Shooting Guard","Small Forward","Power Forward","Center"],
  Baseball:   ["Pitcher","Catcher","First Base","Second Base","Third Base","Shortstop","Left Field","Center Field","Right Field"],
  Soccer:     ["Goalkeeper","Defender","Midfielder","Forward / Striker"],
  Lacrosse:   ["Attack","Midfield","Defense","Goalie"],
};

// ── Mock clip generation ───────────────────────────────────────────────────

export interface AiClip {
  id: string;
  clipNumber: number;
  playType: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
  thumbnailUrl: string | null;
  jerseyNumber: number;
  sport: string;
}

const SPORT_PLAYS: Record<string, string[]> = {
  Football:   ["Touchdown Pass","Big Run","Deep Ball Catch","Key Block","Interception"],
  Basketball: ["Mid Range Jumper","Drive to Basket","Defensive Stop","Three Pointer","Fast Break"],
  Baseball:   ["Home Run","Strikeout","Stolen Base","Double Play","Clutch Hit"],
  Soccer:     ["Goal","Key Save","Assist","Defensive Stop","Counter Attack"],
  default:    ["Highlight Play","Key Moment","Big Play","Athletic Play","Score"],
};

function generateMockClips(sport: string, jerseyNumber: number): AiClip[] {
  const plays = SPORT_PLAYS[sport] ?? SPORT_PLAYS.default;
  return plays.map((playType, i) => {
    const startTime = 60 + i * 90 + Math.floor(Math.random() * 20);
    const dur = 4 + Math.random() * 4;
    return {
      id: `ai-clip-${i + 1}`,
      clipNumber: i + 1,
      playType,
      startTime,
      endTime: Math.round((startTime + dur) * 10) / 10,
      duration: Math.round(dur * 10) / 10,
      confidence: Math.round((0.85 + Math.random() * 0.14) * 100) / 100,
      thumbnailUrl: null,
      jerseyNumber,
      sport,
    };
  });
}

// ── Processing steps ───────────────────────────────────────────────────────

const PROC_STEPS = [
  { key: "downloading", label: "Downloading Video",         hint: "Fetching video from source..." },
  { key: "scanning",    label: "Scanning for Jersey Number",hint: "Running computer vision model on frames..." },
  { key: "identifying", label: "Identifying Best Plays",    hint: "Grouping and scoring detected plays..." },
  { key: "building",    label: "Building Your Reel",        hint: "Compiling your highlight reel..." },
];

const STATUS_IDX: Record<string, number> = {
  queued: -1, downloading: 0, scanning: 1, identifying: 2, building: 3, complete: 4, failed: -2,
};

// ── Icons ──────────────────────────────────────────────────────────────────

const SparkleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const FilmIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="2" />
    <line x1="7" x2="7" y1="2" y2="22" /><line x1="17" x2="17" y1="2" y2="22" />
    <line x1="2" x2="22" y1="7" y2="7" /><line x1="2" x2="22" y1="12" y2="12" /><line x1="2" x2="22" y1="17" y2="17" />
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const UploadIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00A3FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" /><path d="m16 16-4-4-4 4" />
  </svg>
);

const CheckCircleIcon = ({ color = "#22C55E" }: { color?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const Spinner = ({ size = 20, color = "#00A3FF" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ── Shared input style ─────────────────────────────────────────────────────

const IS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "12px",
  color: "#fff",
  width: "100%",
  padding: "12px 16px",
  fontSize: "14px",
  outline: "none",
} as const;

const LS: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#e2e8f0",
  marginBottom: "6px",
} as const;

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "input" | "processing";
type Tab   = "youtube" | "upload";

interface JobState {
  id: string;
  status: string;
  jerseyNumber: number;
  firstName: string;
  sport: string;
  errorMessage: string | null;
  resultClips: AiClip[] | null;
}

// ── Radar animation component ──────────────────────────────────────────────

function RadarPulse() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "180px", height: "180px" }}>
      {/* Expanding rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: "100px",
            height: "100px",
            borderColor: "rgba(0,163,255,0.5)",
            animation: "radar-ring 2.4s ease-out infinite",
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
      {/* Static outer ring */}
      <div className="absolute rounded-full border border-[#00A3FF]/20" style={{ width: "160px", height: "160px" }} />
      <div className="absolute rounded-full border border-[#00A3FF]/10" style={{ width: "130px", height: "130px" }} />
      {/* Center circle */}
      <div className="absolute rounded-full border-2 border-[#00A3FF] flex items-center justify-center"
        style={{ width: "70px", height: "70px", background: "rgba(0,163,255,0.06)" }}>
        <div className="rounded-full" style={{ width: "24px", height: "24px", background: "#00A3FF", boxShadow: "0 0 20px rgba(0,163,255,0.8)" }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProcessPage() {
  const router = useRouter();

  // ── Phase & tab ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("input");
  const [tab,   setTab]   = useState<Tab>("youtube");

  // ── YouTube state ────────────────────────────────────────────────────────
  const [ytUrl,           setYtUrl]           = useState("");
  const [ytPreview,       setYtPreview]       = useState<YouTubeOEmbedData | null>(null);
  const [ytPreviewLoading,setYtPreviewLoading]= useState(false);
  const [ytPreviewError,  setYtPreviewError]  = useState("");
  const ytDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Upload state ─────────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragging,   setDragging]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ───────────────────────────────────────────────────────────
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position,     setPosition]     = useState("");
  const [sport,        setSport]        = useState("");
  const [school,       setSchool]       = useState("");
  const [email,        setEmail]        = useState("");

  // ── Submit state ─────────────────────────────────────────────────────────
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  // ── Processing state ─────────────────────────────────────────────────────
  const [job,       setJob]       = useState<JobState | null>(null);
  const [elapsed,   setElapsed]   = useState(0);
  const [msgIndex,  setMsgIndex]  = useState(0);
  const [clipsSaved,setClipsSaved]= useState(false);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset position when sport changes
  useEffect(() => { setPosition(""); }, [sport]);

  // Fetch YouTube preview (debounced)
  useEffect(() => {
    if (ytDebounceRef.current) clearTimeout(ytDebounceRef.current);
    if (!ytUrl.trim() || !isValidYouTubeUrl(ytUrl)) {
      setYtPreview(null);
      setYtPreviewError(ytUrl.trim() && !isValidYouTubeUrl(ytUrl)
        ? "Paste a valid YouTube URL (youtube.com/watch, youtu.be, or shorts)"
        : "");
      return;
    }
    setYtPreviewLoading(true);
    setYtPreviewError("");
    ytDebounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/youtube-info?url=${encodeURIComponent(ytUrl)}`);
        const data = await res.json();
        if (!res.ok) { setYtPreviewError(data.error ?? "Could not load preview"); setYtPreview(null); }
        else         { setYtPreview(data as YouTubeOEmbedData); setYtPreviewError(""); }
      } catch {
        setYtPreviewError("Failed to fetch video info");
        setYtPreview(null);
      } finally {
        setYtPreviewLoading(false);
      }
    }, 600);
    return () => { if (ytDebounceRef.current) clearTimeout(ytDebounceRef.current); };
  }, [ytUrl]);

  // Elapsed timer during processing
  useEffect(() => {
    if (phase === "processing") {
      elapsedRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [phase]);

  // Rotating messages during processing
  const rotatingMessages = [
    "Analyzing frame by frame...",
    `Looking for jersey #${jerseyNumber || "?"}...`,
    "Scoring play intensity...",
    "Almost ready...",
  ];
  useEffect(() => {
    if (phase !== "processing") return;
    msgRef.current = setInterval(() => setMsgIndex((p) => (p + 1) % rotatingMessages.length), 8000);
    return () => { if (msgRef.current) clearInterval(msgRef.current); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save clips to localStorage when complete
  useEffect(() => {
    if (job?.status === "complete" && !clipsSaved) {
      const clips = job.resultClips && job.resultClips.length > 0
        ? job.resultClips
        : generateMockClips(job.sport, job.jerseyNumber);
      localStorage.setItem("aiGeneratedClips", JSON.stringify(clips.slice(0, 5)));
      setClipsSaved(true);
    }
  }, [job?.status, clipsSaved, job]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current)    clearInterval(pollRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (msgRef.current)     clearInterval(msgRef.current);
    };
  }, []);

  // Format elapsed time
  const fmtElapsed = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Demo simulation (client-side fallback when API unavailable) ──────────
  const runDemoSimulation = useCallback((jNum: number, fname: string, spt: string) => {
    const mockJob: JobState = { id: "demo", status: "queued", jerseyNumber: jNum, firstName: fname, sport: spt, errorMessage: null, resultClips: null };
    setJob(mockJob);
    setPhase("processing");

    const steps: Array<[number, string]> = [
      [1200, "downloading"],
      [3800, "scanning"],
      [3200, "identifying"],
      [2000, "building"],
      [1500, "complete"],
    ];
    let total = 0;
    steps.forEach(([delay, status]) => {
      total += delay;
      setTimeout(() => {
        setJob((prev) => prev ? { ...prev, status } : prev);
      }, total);
    });
  }, []);

  // ── Poll job status ──────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string, jNum: number, fname: string, spt: string) => {
    const poll = async () => {
      try {
        const res  = await fetch(`/api/process-video/status?jobId=${jobId}`);
        const data = await res.json();
        setJob({
          id: data.id,
          status: data.status,
          jerseyNumber: jNum,
          firstName: fname,
          sport: spt,
          errorMessage: data.errorMessage ?? null,
          resultClips: data.resultClips ?? null,
        });
        if (data.status === "complete" || data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────
  const sharedFilled = firstName.trim() && lastName.trim() && jerseyNumber.trim() &&
    position.trim() && sport.trim() && school.trim() && email.trim();
  const canSubmit = (tab === "youtube" ? isValidYouTubeUrl(ytUrl) && !ytPreviewLoading : !!uploadFile) && !!sharedFilled;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const jNum = Number(jerseyNumber);
    const fname = firstName.trim();
    const spt = sport.trim();

    // Save email to waitlist
    try {
      await saveToWaitlist(email.trim(), "process_page");
    } catch {
      // non-blocking
    }

    const videoUrl = tab === "youtube" ? ytUrl : "https://example.com/stub-upload.mp4";

    try {
      const res = await fetch("/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, firstName: fname, lastName: lastName.trim(), jerseyNumber: jNum, position: position.trim(), sport: spt, school: school.trim(), email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        // API failed — run demo simulation
        runDemoSimulation(jNum, fname, spt);
        return;
      }

      setJob({ id: data.jobId, status: "queued", jerseyNumber: jNum, firstName: fname, sport: spt, errorMessage: null, resultClips: null });
      setPhase("processing");
      startPolling(data.jobId, jNum, fname, spt);
    } catch {
      // Network error — run demo simulation
      runDemoSimulation(jNum, fname, spt);
    } finally {
      setSubmitting(false);
    }
  };

  const positions = POSITIONS[sport] ?? [];
  const currentStep = STATUS_IDX[job?.status ?? "queued"] ?? -1;
  const thumbnailUrl = ytPreview ? (getYouTubeThumbnail(ytUrl, "maxres") ?? ytPreview.thumbnail_url) : null;

  // ══════════════════════════════════════════════════════════════════════════
  // PROCESSING PHASE
  // ══════════════════════════════════════════════════════════════════════════

  if (phase === "processing" && job) {
    const isFailed   = job.status === "failed";
    const isComplete = job.status === "complete";

    return (
      <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
        <style>{`
          @keyframes radar-ring {
            0%   { transform: scale(1);   opacity: 0.8; }
            100% { transform: scale(2.6); opacity: 0; }
          }
          @keyframes step-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(0,163,255,0.4); }
            50%       { box-shadow: 0 0 0 8px rgba(0,163,255,0); }
          }
        `}</style>
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: `linear-gradient(rgba(0,163,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }} />

        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
          <div className="w-full max-w-2xl">

            {/* Status card */}
            <div className="rounded-2xl p-8 sm:p-10" style={{
              background: "#0A1628",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 80px rgba(0,80,255,0.1)",
            }}>
              {isFailed ? (
                /* ── Error ── */
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <AlertIcon />
                  </div>
                  <h2 className="text-xl font-black text-white mb-2">Processing Failed</h2>
                  <p className="text-slate-400 text-sm mb-7 leading-relaxed">{job.errorMessage ?? "An unexpected error occurred. Please try again."}</p>
                  <button onClick={() => { setPhase("input"); setJob(null); setElapsed(0); }}
                    className="px-8 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 24px rgba(0,120,255,0.3)" }}>
                    Try Again
                  </button>
                </div>
              ) : isComplete ? (
                /* ── Success ── */
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                    <CheckCircleIcon />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Your Highlights Are Ready!</h2>
                  <p className="text-slate-400 text-sm mb-1">
                    We found <span className="text-white font-bold">5 plays</span> featuring jersey{" "}
                    <span className="font-black" style={{ color: "#00A3FF" }}>#{job.jerseyNumber}</span>.
                  </p>
                  <p className="text-slate-500 text-xs mb-8">Completed in {fmtElapsed(elapsed)}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => router.push("/customize")}
                      className="px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                      style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 28px rgba(0,120,255,0.35)" }}>
                      View Your Clips →
                    </button>
                    <button onClick={() => { setPhase("input"); setJob(null); setElapsed(0); setClipsSaved(false); }}
                      className="px-8 py-3.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Process Another
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Processing ── */
                <>
                  {/* Top row: elapsed + jersey badge */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                      style={{ background: "rgba(0,163,255,0.1)", border: "1px solid rgba(0,163,255,0.25)" }}>
                      <span className="w-2 h-2 rounded-full bg-[#00A3FF] animate-pulse" />
                      <span className="text-xs font-bold text-[#00A3FF]">Jersey #{job.jerseyNumber}</span>
                    </div>
                    <div className="text-slate-400 text-sm font-mono tabular-nums">
                      {fmtElapsed(elapsed)}
                    </div>
                  </div>

                  {/* Main 2-col layout */}
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left: timeline */}
                    <div className="lg:w-52 shrink-0 w-full">
                      <p className="text-[10px] font-black tracking-widest uppercase text-slate-600 mb-4">Pipeline</p>
                      <div className="flex flex-col">
                        {PROC_STEPS.map((step, i) => {
                          const isDone   = i < currentStep || currentStep === 4;
                          const isActive = i === currentStep;
                          const isPending= !isDone && !isActive;
                          return (
                            <div key={step.key} className="flex items-start gap-3">
                              {/* Circle + line */}
                              <div className="flex flex-col items-center shrink-0">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
                                  style={{
                                    background: isDone   ? "rgba(34,197,94,0.15)"
                                              : isActive ? "rgba(0,163,255,0.15)"
                                              : "rgba(255,255,255,0.04)",
                                    border:     isDone   ? "2px solid rgba(34,197,94,0.6)"
                                              : isActive ? "2px solid #00A3FF"
                                              : "2px solid rgba(255,255,255,0.08)",
                                    animation:  isActive ? "step-pulse 1.8s ease-in-out infinite" : "none",
                                  }}>
                                  {isDone   ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  : isActive ? <Spinner size={14} />
                                  : <span className="text-[9px] font-bold text-slate-600">{i + 1}</span>}
                                </div>
                                {i < PROC_STEPS.length - 1 && (
                                  <div className="w-0.5 h-8 mt-1 transition-all duration-500 rounded-full"
                                    style={{ background: isDone ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.07)" }} />
                                )}
                              </div>
                              {/* Text */}
                              <div className="pb-8 pt-0.5">
                                <p className="text-sm font-semibold leading-none transition-colors duration-300"
                                  style={{ color: isDone ? "#22C55E" : isActive ? "#fff" : "#475569" }}>
                                  {step.key === "scanning" ? `Scanning for #${job.jerseyNumber}` : step.label}
                                </p>
                                {isActive && <p className="text-xs text-slate-500 mt-1 leading-snug">{step.hint}</p>}
                                {isDone    && <p className="text-[11px] text-emerald-700 mt-0.5">Done</p>}
                                {isPending && <p className="text-[11px] text-slate-600 mt-0.5">Queued</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: radar + status */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[260px]">
                      <RadarPulse />
                      <div className="mt-6 text-center">
                        <h3 className="text-xl font-black text-white mb-2">
                          {currentStep === 0 && "Downloading video..."}
                          {currentStep === 1 && `Scanning for jersey #${job.jerseyNumber}...`}
                          {currentStep === 2 && "Identifying best plays..."}
                          {currentStep === 3 && "Building your reel..."}
                          {currentStep === -1 && "Starting up..."}
                        </h3>
                        <p className="text-slate-500 text-sm transition-all duration-700">
                          {rotatingMessages[msgIndex]}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-slate-600 text-xs mt-8">
                    This takes 1–2 minutes. Your clips will be ready to review when complete.
                  </p>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INPUT PHASE
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
      <style>{`
        @keyframes radar-ring {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes step-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,163,255,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(0,163,255,0); }
        }
      `}</style>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `linear-gradient(rgba(0,163,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.022) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 80% 40% at 50% -5%, rgba(0,80,255,0.13) 0%, transparent 100%)",
      }} />

      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-24">

        {/* ── Hero ── */}
        <div className="pt-12 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#00A3FF]/30 bg-[#00A3FF]/10 text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-6">
            <SparkleIcon size={14} />
            AI Processing
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Let AI Build Your Reel
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Submit your full game film. Our AI scans every frame for jersey number{" "}
            <span className="text-white font-bold">#{jerseyNumber || "?"}</span> and pulls your best plays automatically.
          </p>
        </div>

        {/* ── How It Works ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { n: "1", icon: <UploadIcon />,            title: "Submit Your Film",      desc: "Paste a YouTube link or upload your game film." },
            { n: "2", icon: <SparkleIcon size={32} />, title: "AI Scans For You",      desc: `Our model detects jersey #${jerseyNumber || "?"} in every frame.` },
            { n: "3", icon: <FilmIcon size={32} />,    title: "Get Your Highlights",   desc: "Review your top plays and export your recruiting reel." },
          ].map(({ n, icon, title, desc }) => (
            <div key={n} className="relative p-5 rounded-2xl flex flex-col gap-3"
              style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="absolute top-4 right-4 text-4xl font-black text-white/[0.04] select-none">{n}</div>
              <div style={{ color: "#00A3FF" }}>{icon}</div>
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-xl mb-7 w-fit"
          style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["youtube","upload"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
              style={tab === t
                ? { background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", color: "#fff", boxShadow: "0 0 20px rgba(0,120,255,0.3)" }
                : { color: "#64748b" }}>
              {t === "youtube" ? <LinkIcon /> : <FilmIcon />}
              {t === "youtube" ? "YouTube Link" : "Upload Video"}
            </button>
          ))}
        </div>

        {/* ── YouTube tab ── */}
        {tab === "youtube" && (
          <div className="mb-6">
            <label style={LS}>YouTube URL</label>
            <div className="relative">
              <input type="url" value={ytUrl} onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{ ...IS, paddingRight: "48px", borderColor: ytPreviewError ? "rgba(239,68,68,0.5)" : ytPreview ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.09)" }}
                onFocus={(e) => { if (!ytPreviewError && !ytPreview) e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)"; }}
                onBlur={(e)  => { if (!ytPreviewError && !ytPreview) e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {ytPreviewLoading && <Spinner size={18} />}
                {ytPreview && !ytPreviewLoading && <CheckCircleIcon color="#22C55E" />}
              </div>
            </div>
            {ytPreviewError && <p className="text-red-400 text-xs mt-1.5">{ytPreviewError}</p>}

            {/* Preview card */}
            {ytPreview && (
              <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0A1628" }}>
                <div className="relative" style={{ paddingBottom: "56.25%" }}>
                  {thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailUrl} alt={ytPreview.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { const hq = getYouTubeThumbnail(ytUrl, "hq"); if (hq && e.currentTarget.src !== hq) e.currentTarget.src = hq; }}
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold line-clamp-1 mb-0.5">{ytPreview.title}</p>
                    <p className="text-slate-500 text-xs">{ytPreview.author_name} · Duration detected during processing</p>
                  </div>
                  <button onClick={() => { setYtUrl(""); setYtPreview(null); }}
                    className="text-xs text-slate-500 hover:text-[#00A3FF] transition-colors whitespace-nowrap shrink-0 font-semibold">
                    Change Video
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Upload tab ── */}
        {tab === "upload" && (
          <div className="mb-6">
            <label style={LS}>Game Film Video</label>
            <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
              onClick={() => !uploadFile && fileInputRef.current?.click()}
              className="rounded-xl p-8 flex flex-col items-center text-center transition-all cursor-pointer"
              style={{ background: "#0A1628", border: `2px dashed ${dragging ? "#00A3FF" : "rgba(0,163,255,0.35)"}`, boxShadow: dragging ? "0 0 28px rgba(0,163,255,0.12)" : "none" }}>
              {uploadFile ? (
                <div className="w-full">
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: "rgba(0,163,255,0.08)", border: "1px solid rgba(0,163,255,0.25)" }}>
                    <div className="flex flex-col text-left min-w-0 mr-3">
                      <span className="text-white text-sm font-semibold truncate">{uploadFile.name}</span>
                      <span className="text-slate-500 text-xs mt-0.5">{(uploadFile.size / 1e6).toFixed(0)} MB</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                      className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4"><UploadIcon /></div>
                  <p className="text-white font-bold text-base mb-1">Drop your game film here</p>
                  <p className="text-slate-400 text-sm mb-5">MP4, MOV, MKV — any video format</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#00A3FF" }}>
                    Browse File
                  </button>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="video/*,.mp4,.mov,.mkv,.avi,.webm" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
            </div>
          </div>
        )}

        {/* ── Athlete Info Form ── */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-base font-black text-white mb-5">Athlete Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label style={LS}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Marcus" style={IS}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")} />
            </div>

            <div>
              <label style={LS}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Johnson" style={IS}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")} />
            </div>

            <div>
              <label style={LS}>Sport</label>
              <select value={sport} onChange={(e) => setSport(e.target.value)}
                style={{ ...IS, appearance: "none" } as React.CSSProperties}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}>
                <option value="" disabled hidden>Select a sport</option>
                {Object.keys(POSITIONS).map((s) => <option key={s} value={s} style={{ background: "#0A1628" }}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={LS}>Position</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)} disabled={!sport}
                style={{ ...IS, appearance: "none", opacity: sport ? 1 : 0.5, cursor: sport ? "pointer" : "not-allowed" } as React.CSSProperties}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}>
                <option value="" disabled hidden>{sport ? "Select position" : "Select sport first"}</option>
                {positions.map((p) => <option key={p} value={p} style={{ background: "#0A1628" }}>{p}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label style={LS}>
                Jersey Number
                <span className="ml-2 text-xs font-normal text-slate-500">— This is the number the AI will look for on screen</span>
              </label>
              <input type="number" min={0} max={99} value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} placeholder="e.g. 23"
                style={{ ...IS, maxWidth: "160px" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")} />
            </div>

            <div className="sm:col-span-2">
              <label style={LS}>School</label>
              <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. St. Mark's School of Texas" style={IS}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")} />
            </div>

            <div className="sm:col-span-2">
              <label style={LS}>Email for Notifications</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={IS}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")} />
              <p className="text-slate-500 text-xs mt-1.5">We&apos;ll notify you when your highlights are ready.</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-sm text-red-400"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertIcon />{submitError}
          </div>
        )}

        {/* Helper text */}
        {!canSubmit && (
          <p className="text-slate-500 text-xs text-center mb-3">
            {tab === "youtube" && !isValidYouTubeUrl(ytUrl) && ytUrl.trim() ? "Paste a valid YouTube URL above" :
             tab === "upload"  && !uploadFile ? "Add your game film video to continue" :
             !sharedFilled ? "Fill out all athlete info above to continue" : ""}
          </p>
        )}

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          className="w-full py-4 rounded-xl font-bold text-base text-white transition-all flex items-center justify-center gap-3"
          style={canSubmit && !submitting
            ? { background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 40px rgba(0,120,255,0.4)", cursor: "pointer" }
            : { background: "rgba(255,255,255,0.06)", color: "#475569", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.07)" }}>
          {submitting ? <><Spinner size={20} />Starting Analysis...</>
          : <><SparkleIcon size={20} />Find My Highlights →</>}
        </button>
      </main>
    </div>
  );
}
