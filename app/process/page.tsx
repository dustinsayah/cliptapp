"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isValidYouTubeUrl, getYouTubeThumbnail, type YouTubeOEmbedData } from "@/lib/youtubeUtils";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { SPORTS_CONFIG } from "@/lib/sportsConfig";

// ── Position options by sport — derived from SPORTS_CONFIG ────────────────

const POSITIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(SPORTS_CONFIG).map(([name, cfg]) => [name, cfg.positions])
);

const GRAD_YEARS = ["2025","2026","2027","2028","2029","2030"];

// ── Accepted video formats ─────────────────────────────────────────────────

const ACCEPTED_FORMATS = ["video/mp4","video/quicktime","video/x-msvideo","video/x-matroska","video/webm"];
const ACCEPTED_EXTENSIONS = [".mp4",".mov",".avi",".mkv",".webm"];

function getEstimatedTime(bytes: number): string {
  const mb = bytes / 1e6;
  if (mb < 500)  return "~2 minutes";
  if (mb < 1000) return "~5 minutes";
  return "~10 minutes";
}

function isAcceptedFormat(file: File): boolean {
  if (ACCEPTED_FORMATS.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

// ── Quality score helper ───────────────────────────────────────────────────

export function computeQualityScore(playType: string, confidenceScore: number, duration: number): number {
  const confPts = Math.round(confidenceScore * 40);
  const SCORING   = ["Goal","Home Run","Touchdown","Scoring Play","Score","Point"];
  const ASSIST    = ["Assist","Completion","RBI"];
  const DEFENSIVE = ["Defensive Play","Block","Tackle/Sack","Interception","Save","Ground Ball","Strikeout"];
  const HUSTLE    = ["Steal","Rebound","Stolen Base","Fast Break"];
  const typePts =
    SCORING.some((t) => playType.includes(t))   ? 30 :
    ASSIST.some((t) => playType.includes(t))    ? 25 :
    DEFENSIVE.some((t) => playType.includes(t)) ? 25 :
    HUSTLE.some((t) => playType.includes(t))    ? 15 : 10;
  const durPts =
    duration >= 4 && duration <= 12 ? 20 :
    duration > 12 && duration <= 20 ? 15 :
    duration < 4 ? 5 : 10;
  return Math.min(100, confPts + typePts + durPts);
}

// ── Mock clip generation ───────────────────────────────────────────────────

export interface AiClip {
  id: string;
  clipNumber: number;
  playType: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidenceScore: number;
  qualityScore: number;
  jerseyVisible: boolean;
  aiPicked: boolean;
  sport: string;
  jerseyNumber: number;
  thumbnailUrl: string | null;
}

function generateMockClips(sport: string, jerseyNumber: number, position?: string): AiClip[] {
  const sportCfg = SPORTS_CONFIG[sport];
  const playDefs = sportCfg
    ? sportCfg.getClipTypes(position ?? "").map((c) => ({ playType: c.label, confidenceScore: c.confidence }))
    : [
        { playType: "Highlight Play", confidenceScore: 0.93 },
        { playType: "Big Play",       confidenceScore: 0.90 },
        { playType: "Key Play",       confidenceScore: 0.87 },
        { playType: "Athletic Play",  confidenceScore: 0.84 },
        { playType: "Score",          confidenceScore: 0.81 },
        { playType: "Impact Play",    confidenceScore: 0.78 },
      ];

  let cursor = 45 + Math.floor(Math.random() * 30);
  return playDefs.map(({ playType, confidenceScore }, i) => {
    const startTime = cursor;
    const dur = Math.round((4 + Math.random() * 4.5) * 10) / 10;
    const endTime = Math.round((startTime + dur) * 10) / 10;
    cursor = endTime + 60 + Math.floor(Math.random() * 45);
    return {
      id: `ai-clip-${i + 1}`,
      clipNumber: i + 1,
      playType,
      startTime,
      endTime,
      duration: dur,
      confidenceScore,
      qualityScore: computeQualityScore(playType, confidenceScore, dur),
      jerseyVisible: true,
      aiPicked: true,
      sport,
      jerseyNumber,
      thumbnailUrl: null,
    };
  });
}

// ── Processing steps ───────────────────────────────────────────────────────

const PROC_STEPS = [
  { key: "downloading", label: "Video Downloaded",       hint: "Fetching video from source..." },
  { key: "scanning",    label: "Scanning frames for #",  hint: "Running computer vision model on frames..." },
  { key: "identifying", label: "Ranking best plays",     hint: "Grouping and scoring detected plays..." },
  { key: "building",    label: "Building your reel",     hint: "Compiling your highlight reel..." },
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

const CheckCircleIcon = ({ color = "#22C55E", size = 22 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const XBigIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

// ── Shared input style ─────────────────────────────────────────────────────

const IS: React.CSSProperties = {
  background:   "rgba(255,255,255,0.04)",
  border:       "1px solid rgba(255,255,255,0.09)",
  borderRadius: "12px",
  color:        "#fff",
  width:        "100%",
  padding:      "12px 16px",
  fontSize:     "14px",
  outline:      "none",
} as const;

const LS: React.CSSProperties = {
  display:      "block",
  fontSize:     "13px",
  fontWeight:   600,
  color:        "#e2e8f0",
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
  position: string;
  errorMessage: string | null;
  resultClips: AiClip[] | null;
  queuePosition: number;
}

// ── Radar animation component ──────────────────────────────────────────────

function RadarPulse() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: "clamp(120px, 40vw, 180px)", height: "clamp(120px, 40vw, 180px)" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width:  "clamp(67px, 22vw, 100px)",
            height: "clamp(67px, 22vw, 100px)",
            borderColor: "rgba(0,163,255,0.5)",
            animation: "radar-ring 2.4s ease-out infinite",
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
      <div className="absolute rounded-full border border-[#00A3FF]/20" style={{ width: "clamp(107px, 35vw, 160px)", height: "clamp(107px, 35vw, 160px)" }} />
      <div className="absolute rounded-full border border-[#00A3FF]/10" style={{ width: "clamp(87px, 28vw, 130px)", height: "clamp(87px, 28vw, 130px)" }} />
      <div className="absolute rounded-full border-2 border-[#00A3FF] flex items-center justify-center"
        style={{ width: "clamp(47px, 15vw, 70px)", height: "clamp(47px, 15vw, 70px)", background: "rgba(0,163,255,0.06)" }}>
        <div className="rounded-full" style={{ width: "clamp(16px, 5vw, 24px)", height: "clamp(16px, 5vw, 24px)", background: "#00A3FF", boxShadow: "0 0 20px rgba(0,163,255,0.8)" }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProcessPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("input");
  const [tab,   setTab]   = useState<Tab>("youtube");

  // YouTube state
  const [ytUrl,            setYtUrl]            = useState("");
  const [ytPreview,        setYtPreview]        = useState<YouTubeOEmbedData | null>(null);
  const [ytPreviewLoading, setYtPreviewLoading] = useState(false);
  const [ytPreviewError,   setYtPreviewError]   = useState("");
  const ytDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upload state
  const [uploadFile,          setUploadFile]          = useState<File | null>(null);
  const [uploadFileError,     setUploadFileError]     = useState("");
  const [uploadThumbnail,     setUploadThumbnail]     = useState<string | null>(null);
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  const [dragging,            setDragging]            = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position,     setPosition]     = useState("");
  const [sport,        setSport]        = useState("");
  const [school,       setSchool]       = useState("");
  const [gradYear,     setGradYear]     = useState("");
  const [email,        setEmail]        = useState("");

  // Submit state
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Processing state
  const [job,        setJob]        = useState<JobState | null>(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [msgIndex,   setMsgIndex]   = useState(0);
  const [clipsSaved, setClipsSaved] = useState(false);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset position when sport changes
  useEffect(() => { setPosition(""); }, [sport]);

  // Generate canvas thumbnail for uploaded file
  const generateVideoThumbnail = useCallback((file: File) => {
    setThumbnailGenerating(true);
    setUploadThumbnail(null);
    try {
      const url    = URL.createObjectURL(file);
      const video  = document.createElement("video");
      video.preload = "metadata";
      video.muted   = true;
      video.src     = url;
      video.onseeked = () => {
        try {
          const canvas  = document.createElement("canvas");
          canvas.width  = 320;
          canvas.height = 180;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, 320, 180);
            setUploadThumbnail(canvas.toDataURL("image/jpeg", 0.8));
          }
        } catch { /* canvas tainted from local file — skip */ }
        URL.revokeObjectURL(url);
        setThumbnailGenerating(false);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        setThumbnailGenerating(false);
      };
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(video.duration * 0.12, 5);
      };
    } catch {
      setThumbnailGenerating(false);
    }
  }, []);

  // Handle file selection (with validation)
  const handleFileSelect = useCallback((file: File) => {
    setUploadFileError("");
    setUploadFile(null);
    setUploadThumbnail(null);

    if (!isAcceptedFormat(file)) {
      setUploadFileError(`Unsupported format "${file.name.split(".").pop()?.toUpperCase() ?? "unknown"}". Please upload MP4, MOV, AVI, MKV, or WEBM.`);
      return;
    }

    setUploadFile(file);
    generateVideoThumbnail(file);
  }, [generateVideoThumbnail]);

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
        if (!res.ok) {
          setYtPreviewError(
            data.error?.toLowerCase().includes("private") || data.error?.toLowerCase().includes("unavailable")
              ? "This video is private or unavailable. Please use a public YouTube video or upload your file directly."
              : (data.error ?? "Could not load video preview.")
          );
          setYtPreview(null);
        } else {
          setYtPreview(data as YouTubeOEmbedData);
          setYtPreviewError("");
        }
      } catch {
        setYtPreviewError("Failed to fetch video info. Check your connection.");
        setYtPreview(null);
      } finally {
        setYtPreviewLoading(false);
      }
    }, 600);
    return () => { if (ytDebounceRef.current) clearTimeout(ytDebounceRef.current); };
  }, [ytUrl]);

  // Elapsed timer
  useEffect(() => {
    if (phase === "processing") {
      elapsedRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [phase]);

  // Rotating messages (5 messages, rotate every 6 seconds)
  const rotatingMessages = [
    "Analyzing every frame...",
    `Looking for jersey #${jerseyNumber || "?"}...`,
    "Scoring play intensity...",
    "Finding your best moments...",
    "Almost ready...",
  ];
  useEffect(() => {
    if (phase !== "processing") return;
    msgRef.current = setInterval(() => setMsgIndex((p) => (p + 1) % rotatingMessages.length), 6000);
    return () => { if (msgRef.current) clearInterval(msgRef.current); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save clips to localStorage when complete
  useEffect(() => {
    if (job?.status === "complete" && !clipsSaved) {
      const clips = (job.resultClips && job.resultClips.length > 0)
        ? job.resultClips
        : generateMockClips(job.sport, job.jerseyNumber, job.position);
      localStorage.setItem("clipSource", "ai");
      localStorage.setItem("aiGeneratedClips", JSON.stringify(clips));
      localStorage.setItem("reviewComplete", "false");
      localStorage.setItem("aiJobMeta", JSON.stringify({
        jerseyNumber: job.jerseyNumber,
        firstName:    job.firstName,
        sport:        job.sport,
      }));
      // Store job ID so review page can save reviewed_clips to Supabase
      if (job.id && job.id !== "demo") {
        localStorage.setItem("currentJobId", job.id);
      }
      // Store blob URL of uploaded file for clip preview in review page
      try {
        const blobUrl = localStorage.getItem("originalVideoUrl");
        if (!blobUrl && tab === "upload" && uploadFile) {
          const url = URL.createObjectURL(uploadFile);
          localStorage.setItem("originalVideoUrl", url);
        }
      } catch { /* ignore */ }
      setClipsSaved(true);
    }
  }, [job?.status, clipsSaved, job]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-navigate to /review when complete (review page is new step between AI and customize)
  useEffect(() => {
    if (job?.status === "complete" && clipsSaved) {
      const timer = setTimeout(() => router.push("/review"), 2500);
      return () => clearTimeout(timer);
    }
  }, [job?.status, clipsSaved, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current)    clearInterval(pollRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (msgRef.current)     clearInterval(msgRef.current);
    };
  }, []);

  const fmtElapsed = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Demo simulation (client-side fallback when API unavailable)
  const runDemoSimulation = useCallback((jNum: number, fname: string, spt: string, pos: string) => {
    const mockJob: JobState = {
      id: "demo", status: "queued",
      jerseyNumber: jNum, firstName: fname, sport: spt, position: pos,
      errorMessage: null, resultClips: null, queuePosition: 1,
    };
    setJob(mockJob);
    setPhase("processing");
    const steps: Array<[number, string]> = [
      [1200, "downloading"], [3800, "scanning"],
      [3200, "identifying"], [2000, "building"], [1500, "complete"],
    ];
    let total = 0;
    steps.forEach(([delay, status]) => {
      total += delay;
      setTimeout(() => setJob((prev) => prev ? { ...prev, status } : prev), total);
    });
  }, []);

  // Poll job status directly from Supabase (no API route)
  const startPolling = useCallback((jobId: string, jNum: number, fname: string, spt: string, pos: string) => {
    const poll = async () => {
      try {
        const { data } = await supabase
          .from("processing_jobs")
          .select("*")
          .eq("id", jobId)
          .single();
        if (!data) return;
        setJob({
          id:            data.id,
          status:        data.status,
          jerseyNumber:  jNum,
          firstName:     fname,
          sport:         spt,
          position:      pos,
          errorMessage:  data.error_message ?? null,
          resultClips:   data.result_clips ?? null,
          queuePosition: data.queue_position ?? 0,
        });
        if (data.status === "complete" || data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
  }, []);

  // Validation
  const sharedFilled = firstName.trim() && lastName.trim() && jerseyNumber.trim() &&
    position.trim() && sport.trim() && school.trim() && email.trim();
  const ytReady  = tab === "youtube" && isValidYouTubeUrl(ytUrl) && !ytPreviewLoading && !!ytPreview;
  const canSubmit = (tab === "youtube" ? ytReady : !!uploadFile) && !!sharedFilled;

  // Submit
  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const jNum  = Number(jerseyNumber);
    const fname = firstName.trim();
    const spt   = sport.trim();
    const pos   = position.trim();

    // Save email to waitlist (non-blocking)
    supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase(), source: "process_page" })
      .then((response) => console.log("[Clipt] waitlist response:", response));

    const videoUrl = tab === "youtube" ? ytUrl : "https://example.com/stub-upload.mp4";

    try {
      // Generate job ID in browser so we own the row before the API processes it
      const jobId = crypto.randomUUID();

      // Count active jobs for queue position
      const { count } = await supabase
        .from("processing_jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "downloading", "scanning", "identifying", "building"]);
      const queuePosition = (count ?? 0) + 1;

      // Insert job row to Supabase directly from browser
      const { error: insertError } = await supabase
        .from("processing_jobs")
        .insert({
          id:             jobId,
          first_name:     fname,
          last_name:      lastName.trim(),
          jersey_number:  jNum,
          jersey_color:   "#FFFFFF",
          position:       pos,
          sport:          spt,
          school:         school.trim(),
          video_url:      videoUrl,
          source:         tab === "youtube" ? "youtube" : "upload",
          email:          email.trim(),
          status:         "queued",
          queue_position: queuePosition,
        });
      if (insertError) {
        console.error("[process] Supabase insert error:", insertError.message);
      }

      // Save jobId to localStorage
      localStorage.setItem("currentJobId", jobId);
      localStorage.setItem("currentJobMeta", JSON.stringify({
        jerseyNumber: jNum, sport: spt, position: pos, firstName: fname,
      }));

      // Show processing screen immediately
      setJob({ id: jobId, status: "queued", jerseyNumber: jNum, firstName: fname, sport: spt, position: pos, errorMessage: null, resultClips: null, queuePosition });
      setPhase("processing");

      // Simulate processing stages by updating Supabase directly from browser
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "downloading" }).eq("id", jobId).then(() => {}); }, 1200);
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "scanning"    }).eq("id", jobId).then(() => {}); }, 4000);
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "identifying" }).eq("id", jobId).then(() => {}); }, 7000);
      setTimeout(() => { supabase.from("processing_jobs").update({ status: "building"    }).eq("id", jobId).then(() => {}); }, 9500);
      setTimeout(() => {
        const mockClips = generateMockClips(spt, jNum, pos);
        supabase.from("processing_jobs").update({
          status: "complete", result_clips: mockClips, updated_at: new Date().toISOString(),
        }).eq("id", jobId).then(() => {});
      }, 12000);

      // Poll Supabase directly for status updates
      startPolling(jobId, jNum, fname, spt, pos);
    } catch {
      runDemoSimulation(jNum, fname, spt, pos);
    } finally {
      setSubmitting(false);
    }
  };

  const positions   = POSITIONS[sport] ?? [];
  const currentStep = STATUS_IDX[job?.status ?? "queued"] ?? -1;
  const thumbnailUrl = ytPreview ? (getYouTubeThumbnail(ytUrl, "maxres") ?? ytPreview.thumbnail_url) : null;
  const clipCount    = job ? generateMockClips(job.sport, job.jerseyNumber, job.position).length : 0;

  // ── Queue position message ─────────────────────────────────────────────────
  const queueMsg = (() => {
    if (!job) return null;
    const pos = job.queuePosition;
    if (job.status !== "queued" || pos <= 1) return null;
    const estMins = (pos - 1) * 2;
    return `You are #${pos} in queue — estimated wait ~${estMins} minute${estMins !== 1 ? "s" : ""}`;
  })();

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

        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl p-6 sm:p-10" style={{
              background: "#0A1628",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 0 80px rgba(0,80,255,0.1)",
            }}>
              {isFailed ? (
                // ── Error recovery ───────────────────────────────────────────
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <XBigIcon />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-3">Processing Failed</h2>
                  <p className="text-slate-400 text-sm mb-7 leading-relaxed max-w-md mx-auto">
                    {job.errorMessage ?? "An unexpected error occurred during AI processing. Your clips were not affected."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => { setPhase("input"); setJob(null); setElapsed(0); setClipsSaved(false); }}
                      className="px-8 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                      style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 24px rgba(0,120,255,0.3)" }}>
                      Try Again
                    </button>
                    <button
                      onClick={() => router.push("/upload")}
                      className="px-8 py-3 rounded-xl font-bold text-sm text-slate-300 transition-all hover:text-white"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Upload Clips Manually
                    </button>
                  </div>
                </div>
              ) : isComplete ? (
                // ── Complete ─────────────────────────────────────────────────
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                    <CheckCircleIcon />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Your Highlights Are Ready!</h2>
                  <p className="text-slate-400 text-sm mb-1">
                    AI found <span className="text-white font-bold">{clipCount} plays</span> featuring jersey{" "}
                    <span className="font-black" style={{ color: "#00A3FF" }}>#{job.jerseyNumber}</span> — sorted by quality.
                  </p>
                  <p className="text-slate-500 text-xs mb-2">Completed in {fmtElapsed(elapsed)}</p>
                  <p className="text-slate-600 text-xs mb-8">Taking you to review your clips...</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => router.push("/review")}
                      className="px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                      style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 28px rgba(0,120,255,0.35)" }}>
                      Review Your Clips →
                    </button>
                    <button onClick={() => { setPhase("input"); setJob(null); setElapsed(0); setClipsSaved(false); }}
                      className="px-8 py-3.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Process Another
                    </button>
                  </div>
                </div>
              ) : (
                // ── In progress ──────────────────────────────────────────────
                <>
                  {/* Top row: elapsed + jersey badge */}
                  <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                      style={{ background: "rgba(0,163,255,0.1)", border: "1px solid rgba(0,163,255,0.25)" }}>
                      <span className="w-2 h-2 rounded-full bg-[#00A3FF] animate-pulse" />
                      <span className="text-xs font-bold text-[#00A3FF]">Scanning for #{job.jerseyNumber}</span>
                    </div>
                    <div className="text-slate-400 text-sm font-mono tabular-nums">
                      {fmtElapsed(elapsed)}
                    </div>
                  </div>

                  {/* Queue position */}
                  {queueMsg && (
                    <div className="mb-5 px-4 py-2.5 rounded-xl text-sm text-center"
                      style={{ background: "rgba(0,163,255,0.06)", border: "1px solid rgba(0,163,255,0.18)", color: "#7EC8FF" }}>
                      {queueMsg}
                    </div>
                  )}

                  {/* Main 2-col layout — stacks on mobile */}
                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                    {/* Left: timeline */}
                    <div className="lg:w-52 shrink-0 w-full">
                      <p className="text-[10px] font-black tracking-widest uppercase text-slate-600 mb-4">Progress</p>
                      <div className="flex flex-col">
                        {PROC_STEPS.map((step, i) => {
                          const isDone    = i < currentStep || currentStep === 4;
                          const isActive  = i === currentStep;
                          const isPending = !isDone && !isActive;
                          const label = step.key === "scanning"
                            ? `Scanning for #${job.jerseyNumber}`
                            : step.label;
                          return (
                            <div key={step.key} className="flex items-start gap-3">
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
                                  {isDone
                                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    : isActive ? <Spinner size={14} />
                                    : <span className="text-[9px] font-bold text-slate-600">{i + 1}</span>}
                                </div>
                                {i < PROC_STEPS.length - 1 && (
                                  <div className="w-0.5 h-7 mt-1 transition-all duration-500 rounded-full"
                                    style={{ background: isDone ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.07)" }} />
                                )}
                              </div>
                              <div className="pb-7 pt-0.5">
                                <p className="text-sm font-semibold leading-none transition-colors duration-300"
                                  style={{ color: isDone ? "#22C55E" : isActive ? "#fff" : "#475569" }}>
                                  {label}
                                </p>
                                {isActive  && <p className="text-xs text-slate-500 mt-1 leading-snug">{step.hint}</p>}
                                {isDone    && <p className="text-[11px] text-emerald-700 mt-0.5">Done</p>}
                                {isPending && <p className="text-[11px] text-slate-600 mt-0.5">Queued</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: radar + status */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] sm:min-h-[260px]">
                      <RadarPulse />
                      <div className="mt-5 text-center">
                        <h3 className="text-lg sm:text-xl font-black text-white mb-2">
                          {currentStep === 0 && "Downloading video..."}
                          {currentStep === 1 && `Scanning for jersey #${job.jerseyNumber}...`}
                          {currentStep === 2 && "Ranking best plays..."}
                          {currentStep === 3 && "Building your reel..."}
                          {currentStep === -1 && "Starting up..."}
                        </h3>
                        <p className="text-slate-500 text-sm transition-all duration-700 min-h-[20px]">
                          {rotatingMessages[msgIndex]}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-slate-600 text-xs mt-6 sm:mt-8">
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
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `linear-gradient(rgba(0,163,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.022) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 80% 40% at 50% -5%, rgba(0,80,255,0.13) 0%, transparent 100%)",
      }} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pb-24">

        {/* ── Hero ── */}
        <div className="pt-10 sm:pt-12 pb-8 sm:pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#00A3FF]/30 bg-[#00A3FF]/10 text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-6">
            <SparkleIcon size={14} />
            AI Processing
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            Let AI Build Your Reel
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Submit your full game film. Our AI scans every frame for jersey number{" "}
            <span className="text-white font-bold">#{jerseyNumber || "?"}</span> and pulls your best plays automatically.
          </p>
        </div>

        {/* ── How It Works ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-12">
          {[
            { n: "1", icon: <UploadIcon />,            title: "Submit Your Film",    desc: "Paste a YouTube link or upload your game film." },
            { n: "2", icon: <SparkleIcon size={32} />, title: "AI Finds Your Clips", desc: `Our model detects jersey #${jerseyNumber || "?"} in every frame.` },
            { n: "3", icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>, title: "Review & Approve", desc: "Watch each clip, keep your best plays, remove the rest." },
            { n: "4", icon: <FilmIcon size={32} />,    title: "Build Your Reel",     desc: "Customize and export your professional recruiting reel." },
          ].map(({ n, icon, title, desc }) => (
            <div key={n} className="relative p-4 sm:p-5 rounded-2xl flex flex-col gap-3"
              style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="absolute top-4 right-4 text-4xl font-black text-white/[0.04] select-none">{n}</div>
              <div style={{ color: "#00A3FF" }}>{icon}</div>
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs — full width on mobile ── */}
        <div className="flex gap-1 p-1 rounded-xl mb-7 w-full sm:w-fit"
          style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["youtube","upload"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
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
                style={{
                  ...IS, paddingRight: "48px",
                  borderColor: ytPreviewError ? "rgba(239,68,68,0.5)"
                             : ytPreview     ? "rgba(34,197,94,0.4)"
                             : "rgba(255,255,255,0.09)",
                }}
                onFocus={(e) => { if (!ytPreviewError && !ytPreview) e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)"; }}
                onBlur={(e)  => { if (!ytPreviewError && !ytPreview) e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {ytPreviewLoading && <Spinner size={18} />}
                {ytPreview && !ytPreviewLoading && canSubmit && <CheckCircleIcon color="#22C55E" size={20} />}
                {ytPreview && !ytPreviewLoading && !canSubmit && <CheckCircleIcon color="#22C55E" size={20} />}
              </div>
            </div>
            {ytPreviewError && (
              <div className="flex items-start gap-2 mt-2">
                <AlertIcon size={15} />
                <p className="text-red-400 text-xs leading-snug">{ytPreviewError}</p>
              </div>
            )}

            {/* Preview card */}
            {ytPreview && (
              <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(34,197,94,0.25)", background: "#0A1628" }}>
                <div className="relative" style={{ paddingBottom: "56.25%" }}>
                  {thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailUrl} alt={ytPreview.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { const hq = getYouTubeThumbnail(ytUrl, "hq"); if (hq && e.currentTarget.src !== hq) e.currentTarget.src = hq; }}
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                  </div>
                  {/* Valid badge overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(34,197,94,0.9)", backdropFilter: "blur(4px)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span className="text-white text-[10px] font-black">Video found</span>
                  </div>
                </div>
                <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold line-clamp-1 mb-0.5">{ytPreview.title}</p>
                    <p className="text-slate-500 text-xs">{ytPreview.author_name}</p>
                  </div>
                  <button onClick={() => { setYtUrl(""); setYtPreview(null); }}
                    className="text-xs text-slate-500 hover:text-[#00A3FF] transition-colors whitespace-nowrap shrink-0 font-semibold">
                    Change
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
            <div
              onDragOver={(e)  => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e)     => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
              onClick={()     => !uploadFile && fileInputRef.current?.click()}
              className="rounded-xl p-6 sm:p-8 flex flex-col items-center text-center transition-all cursor-pointer"
              style={{
                background: "#0A1628",
                border: `2px dashed ${dragging ? "#00A3FF" : uploadFileError ? "rgba(239,68,68,0.5)" : uploadFile ? "rgba(34,197,94,0.4)" : "rgba(0,163,255,0.35)"}`,
                boxShadow: dragging ? "0 0 28px rgba(0,163,255,0.12)" : "none",
              }}>
              {uploadFile ? (
                <div className="w-full space-y-3">
                  {/* Thumbnail preview */}
                  {(uploadThumbnail || thumbnailGenerating) && (
                    <div className="relative rounded-xl overflow-hidden mb-3" style={{ paddingBottom: "56.25%" }}>
                      {thumbnailGenerating ? (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,163,255,0.05)" }}>
                          <Spinner size={24} />
                        </div>
                      ) : uploadThumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={uploadThumbnail} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                      ) : null}
                    </div>
                  )}

                  {/* File info row */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: "rgba(0,163,255,0.08)", border: "1px solid rgba(0,163,255,0.25)" }}>
                    <div className="flex flex-col text-left min-w-0 mr-3">
                      <span className="text-white text-sm font-semibold truncate">{uploadFile.name}</span>
                      <span className="text-slate-400 text-xs mt-0.5">
                        {(uploadFile.size / 1e6).toFixed(0)} MB · Est. {getEstimatedTime(uploadFile.size)}
                      </span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadThumbnail(null); setUploadFileError(""); }}
                      className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Large file warning */}
                  {uploadFile.size > 2e9 && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs text-amber-400"
                      style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      Large files may take longer to process. Make sure you have a stable connection.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4"><UploadIcon /></div>
                  <p className="text-white font-bold text-base mb-1">Drop your game film here</p>
                  <p className="text-slate-400 text-sm mb-1">MP4, MOV, AVI, MKV, WEBM — up to 4GB</p>
                  <p className="text-slate-500 text-xs mb-5">or click to browse</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#00A3FF" }}>
                    Browse File
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={[...ACCEPTED_FORMATS, ...ACCEPTED_EXTENSIONS].join(",")}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
              />
            </div>

            {uploadFileError && (
              <div className="flex items-start gap-2 mt-2 text-xs text-red-400">
                <AlertIcon size={14} />
                <span>{uploadFileError}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Athlete Info Form ── */}
        <div className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}>
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
                {Object.entries(SPORTS_CONFIG).map(([name, cfg]) => (
                  <option key={name} value={name} style={{ background: "#0A1628" }}>{cfg.icon} {name}</option>
                ))}
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

            <div>
              <label style={LS}>
                Jersey Number
                <span className="ml-2 text-xs font-normal text-slate-500">— AI scans every frame for this</span>
              </label>
              <input type="number" min={0} max={99} value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} placeholder="e.g. 23"
                style={{ ...IS, maxWidth: "160px" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")} />
            </div>

            <div>
              <label style={LS}>Graduation Year</label>
              <select value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                style={{ ...IS, appearance: "none" } as React.CSSProperties}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}>
                <option value="" disabled hidden>Select year</option>
                {GRAD_YEARS.map((y) => <option key={y} value={y} style={{ background: "#0A1628" }}>Class of {y}</option>)}
              </select>
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
              <p className="text-slate-500 text-xs mt-1.5">We will email you when your clips are ready.</p>
            </div>
          </div>
        </div>

        {/* Rate limit / submit errors */}
        {submitError && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4 text-sm text-red-400"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertIcon size={18} />{submitError}
          </div>
        )}

        {/* Helper text */}
        {!canSubmit && !submitError && (
          <p className="text-slate-500 text-xs text-center mb-3">
            {tab === "youtube" && ytUrl.trim() && !isValidYouTubeUrl(ytUrl) ? "Paste a valid YouTube URL above" :
             tab === "youtube" && isValidYouTubeUrl(ytUrl) && !ytPreview && !ytPreviewLoading ? "Waiting for video info..." :
             tab === "upload"  && !uploadFile ? "Add your game film video to continue" :
             !sharedFilled ? "Fill out all athlete info above to continue" : ""}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-base text-white transition-all flex items-center justify-center gap-3"
          style={canSubmit && !submitting
            ? { background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 40px rgba(0,120,255,0.4)", cursor: "pointer" }
            : { background: "rgba(255,255,255,0.06)", color: "#475569", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.07)" }}>
          {submitting
            ? <><Spinner size={20} />Starting Analysis...</>
            : <><SparkleIcon size={20} />Find My Highlights →</>}
        </button>

        {/* Footer hint */}
        <p className="text-center text-slate-600 text-xs mt-4">
          Already submitted?{" "}
          <button onClick={() => router.push("/my-reels")} className="text-slate-500 hover:text-[#00A3FF] transition-colors underline">
            Find my reels →
          </button>
        </p>
      </main>

      <Footer />
    </div>
  );
}
