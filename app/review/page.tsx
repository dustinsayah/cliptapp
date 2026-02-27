"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SPORTS_CONFIG } from "@/lib/sportsConfig";
import Footer from "@/components/Footer";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReviewClip {
  id: string;
  clipNumber: number;
  playType: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidenceScore: number;
  jerseyVisible: boolean;
  aiPicked: boolean;
  sport: string;
  jerseyNumber: number;
  thumbnailUrl: string | null;
  kept: boolean;
  selected: boolean;
}

interface AiJobMeta {
  jerseyNumber: number;
  firstName: string;
  sport: string;
}

type SortMode = "confidence" | "duration" | "playtype" | "custom";

// ── Play type badge colors ─────────────────────────────────────────────────

const PLAY_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Scoring Play":   { bg: "rgba(251,191,36,0.13)", color: "#FBBF24", border: "rgba(251,191,36,0.3)" },
  "Defensive Play": { bg: "rgba(0,163,255,0.12)",  color: "#00A3FF", border: "rgba(0,163,255,0.3)" },
  "Assist":         { bg: "rgba(34,197,94,0.12)",  color: "#22C55E", border: "rgba(34,197,94,0.3)" },
  "Fast Break":     { bg: "rgba(249,115,22,0.12)", color: "#F97316", border: "rgba(249,115,22,0.3)" },
  "Rebound":        { bg: "rgba(168,85,247,0.12)", color: "#A855F7", border: "rgba(168,85,247,0.3)" },
  "Block":          { bg: "rgba(0,163,255,0.12)",  color: "#38BDF8", border: "rgba(56,189,248,0.3)" },
  "Steal":          { bg: "rgba(34,197,94,0.12)",  color: "#4ADE80", border: "rgba(74,222,128,0.3)" },
  "Touchdown":      { bg: "rgba(251,191,36,0.13)", color: "#FBBF24", border: "rgba(251,191,36,0.3)" },
  "Sack":           { bg: "rgba(0,163,255,0.12)",  color: "#00A3FF", border: "rgba(0,163,255,0.3)" },
  "Interception":   { bg: "rgba(34,197,94,0.12)",  color: "#22C55E", border: "rgba(34,197,94,0.3)" },
  "Tackle":         { bg: "rgba(0,163,255,0.12)",  color: "#60A5FA", border: "rgba(96,165,250,0.3)" },
  "Reception":      { bg: "rgba(249,115,22,0.12)", color: "#F97316", border: "rgba(249,115,22,0.3)" },
  "Run Play":       { bg: "rgba(168,85,247,0.12)", color: "#A855F7", border: "rgba(168,85,247,0.3)" },
  "Goal":           { bg: "rgba(251,191,36,0.13)", color: "#FBBF24", border: "rgba(251,191,36,0.3)" },
  "Save":           { bg: "rgba(0,163,255,0.12)",  color: "#00A3FF", border: "rgba(0,163,255,0.3)" },
  "Home Run":       { bg: "rgba(251,191,36,0.13)", color: "#FBBF24", border: "rgba(251,191,36,0.3)" },
  "Strikeout":      { bg: "rgba(34,197,94,0.12)",  color: "#22C55E", border: "rgba(34,197,94,0.3)" },
  "Ground Ball":    { bg: "rgba(249,115,22,0.12)", color: "#F97316", border: "rgba(249,115,22,0.3)" },
  "Hit":            { bg: "rgba(168,85,247,0.12)", color: "#A855F7", border: "rgba(168,85,247,0.3)" },
  "Great Play":     { bg: "rgba(255,255,255,0.06)", color: "#94A3B8", border: "rgba(255,255,255,0.1)" },
};

function getPlayColor(playType: string) {
  return PLAY_TYPE_COLORS[playType] ?? PLAY_TYPE_COLORS["Great Play"];
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Icons ──────────────────────────────────────────────────────────────────

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

const XIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="5"  r="1.4" fill="currentColor" /><circle cx="9"  cy="12" r="1.4" fill="currentColor" />
    <circle cx="9"  cy="19" r="1.4" fill="currentColor" /><circle cx="15" cy="5"  r="1.4" fill="currentColor" />
    <circle cx="15" cy="12" r="1.4" fill="currentColor" /><circle cx="15" cy="19" r="1.4" fill="currentColor" />
  </svg>
);

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

// ── Clip Card ──────────────────────────────────────────────────────────────

interface ClipCardProps {
  clip: ReviewClip;
  index: number;
  accentHex: string;
  onRemove: () => void;
  onPreview: () => void;
  onToggleSelect: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
  thumbUrl: string | null;
}

function ClipCard({
  clip, accentHex, onRemove, onPreview, onToggleSelect,
  onDragStart, onDragOver, onDragEnd, isDragOver, thumbUrl,
}: ClipCardProps) {
  const col = getPlayColor(clip.playType);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDragEnd={onDragEnd}
      className="relative rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: "#0A1628",
        border: `1px solid ${isDragOver ? accentHex + "80" : "rgba(255,255,255,0.07)"}`,
        opacity: clip.kept ? 1 : 0.4,
        transform: isDragOver ? "scale(1.01)" : "scale(1)",
        boxShadow: isDragOver ? `0 0 0 2px ${accentHex}40` : "none",
      }}>

      {/* Thumbnail + play button */}
      <div className="relative" style={{ aspectRatio: "16/9", background: "#050A14", cursor: "pointer" }} onClick={onPreview}>
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="text-slate-700"><PlayIcon /></div>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center pl-1"
            style={{ background: "rgba(255,255,255,0.9)" }}>
            <div className="text-black"><PlayIcon /></div>
          </div>
        </div>
        {/* Timestamp overlay */}
        <div className="absolute bottom-1.5 right-1.5 rounded text-[10px] font-bold px-1.5 py-0.5"
          style={{ background: "rgba(0,0,0,0.75)", color: "#fff" }}>
          {fmtDur(clip.duration)}
        </div>
        {/* Clip number */}
        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
          style={{ background: accentHex, color: "#fff" }}>
          {clip.clipNumber}
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Checkbox + Drag handle */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button onClick={onToggleSelect} className="shrink-0 transition-all"
              style={{
                width: 16, height: 16, borderRadius: 4,
                background: clip.selected ? accentHex : "transparent",
                border: `2px solid ${clip.selected ? accentHex : "rgba(255,255,255,0.2)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {clip.selected && <CheckIcon />}
            </button>
            <span className="text-slate-600 cursor-grab active:cursor-grabbing"><GripIcon /></span>
          </div>

          {/* Play type badge */}
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[11px] font-black px-2 py-0.5 rounded-full"
              style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
              {clip.playType}
            </span>
          </div>

          {/* Remove button */}
          {clip.kept && (
            <button onClick={onRemove} title="Remove clip"
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
              <XIcon size={13} />
            </button>
          )}
          {!clip.kept && (
            <button onClick={onRemove} title="Restore clip"
              className="shrink-0 text-xs font-bold px-2 py-1 rounded-lg transition-all"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22C55E" }}>
              Keep
            </button>
          )}
        </div>

        {/* Timestamps + confidence */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 font-mono">
            {fmtTimestamp(clip.startTime)} — {fmtTimestamp(clip.endTime)}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(clip.confidenceScore * 100)}%`, background: col.color }} />
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{Math.round(clip.confidenceScore * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview Modal ──────────────────────────────────────────────────────────

interface PreviewModalProps {
  clip: ReviewClip;
  videoUrl: string | null;
  onClose: () => void;
  onKeep: () => void;
  onRemove: () => void;
  accentHex: string;
}

function PreviewModal({ clip, videoUrl, onClose, onKeep, onRemove, accentHex }: PreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const col = getPlayColor(clip.playType);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;

    const start = async () => {
      vid.src = videoUrl;
      vid.currentTime = clip.startTime;
      await vid.play().catch(() => {});
      intervalRef.current = setInterval(() => {
        if (vid.currentTime >= clip.endTime) {
          vid.pause();
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 100);
    };

    vid.onloadedmetadata = () => { start(); };
    if (vid.readyState >= 1) start();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      vid.pause();
    };
  }, [clip.startTime, clip.endTime, videoUrl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden" style={{ background: "#050A14" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-white">Clip #{clip.clipNumber}</span>
            <span className="text-[12px] font-black px-2.5 py-0.5 rounded-full"
              style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
              {clip.playType}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <XIcon size={20} />
          </button>
        </div>

        {/* Video */}
        <div style={{ background: "#000", aspectRatio: "16/9" }}>
          {videoUrl ? (
            <video
              ref={videoRef}
              playsInline
              muted={false}
              controls
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500" style={{ minHeight: 280 }}>
              <PlayIcon />
              <p className="text-sm text-center px-8">
                Preview not available for YouTube submissions — full clips will be in your reel.
              </p>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="px-5 py-3 flex items-center gap-4 text-xs text-slate-500"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span>Duration: <strong className="text-slate-300">{fmtDur(clip.duration)}</strong></span>
          <span>Timestamps: <strong className="text-slate-300 font-mono">{fmtTimestamp(clip.startTime)} → {fmtTimestamp(clip.endTime)}</strong></span>
          <span>Confidence: <strong style={{ color: col.color }}>{Math.round(clip.confidenceScore * 100)}%</strong></span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5">
          <button onClick={() => { onKeep(); onClose(); }}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${accentHex}CC, ${accentHex})`, boxShadow: `0 0 20px ${accentHex}40` }}>
            Keep This Clip
          </button>
          <button onClick={() => { onRemove(); onClose(); }}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();

  const [clips,      setClips]      = useState<ReviewClip[]>([]);
  const [meta,       setMeta]       = useState<AiJobMeta | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [videoUrl,   setVideoUrl]   = useState<string | null>(null);
  const [thumbMap,   setThumbMap]   = useState<Record<string, string>>({});

  const [filterType, setFilterType] = useState<string>("All");
  const [sortMode,   setSortMode]   = useState<SortMode>("confidence");

  const [previewClip, setPreviewClip] = useState<ReviewClip | null>(null);
  const [toast,       setToast]       = useState("");

  const [saving,  setSaving]  = useState(false);

  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const accentHex = "#00A3FF";

  // ── Load clips from localStorage on mount ──────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw     = localStorage.getItem("aiGeneratedClips");
      const metaRaw = localStorage.getItem("aiJobMeta");
      const vUrl    = localStorage.getItem("originalVideoUrl");

      if (vUrl) setVideoUrl(vUrl);
      if (metaRaw) setMeta(JSON.parse(metaRaw));

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const withFlags: ReviewClip[] = parsed.map((c, i) => ({
            ...c,
            id: c.id ?? `clip-${i + 1}`,
            clipNumber: c.clipNumber ?? i + 1,
            kept: true,
            selected: false,
          }));
          // Sort by confidence descending by default
          withFlags.sort((a, b) => b.confidenceScore - a.confidenceScore);
          setClips(withFlags);

          // Check if this is mock/fallback classification
          const clipSource = localStorage.getItem("clipSource");
          const reviewComplete = localStorage.getItem("reviewComplete");
          if (clipSource === "ai" && reviewComplete !== "true") {
            // Could be mock — no reliable way to know without calling the API
            // We'll just leave isFallback as false unless the API told us
            const fallbackFlag = localStorage.getItem("classifyFallback");
            if (fallbackFlag === "true") setIsFallback(true);
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // ── Generate thumbnails from video URL ────────────────────────────────

  useEffect(() => {
    if (!videoUrl || clips.length === 0) return;
    let cancelled = false;
    const map: Record<string, string> = {};

    const captureThumbs = async () => {
      const vid = document.createElement("video");
      vid.muted = true;
      vid.preload = "metadata";
      vid.src = videoUrl;
      await new Promise<void>((res) => {
        vid.onloadedmetadata = () => res();
        vid.onerror = () => res();
      });

      for (const clip of clips) {
        if (cancelled) break;
        await new Promise<void>((res) => {
          vid.currentTime = clip.startTime + 0.5;
          vid.onseeked = () => {
            if (!cancelled) {
              try {
                const c = document.createElement("canvas");
                c.width = 320; c.height = 180;
                const ctx = c.getContext("2d");
                if (ctx) {
                  ctx.fillStyle = "#050A14";
                  ctx.fillRect(0, 0, 320, 180);
                  ctx.drawImage(vid, 0, 0, 320, 180);
                  map[clip.id] = c.toDataURL("image/jpeg", 0.6);
                }
              } catch { /* CORS or draw error */ }
            }
            res();
          };
          vid.onerror = () => res();
        });
        if (!cancelled) setThumbMap({ ...map });
      }
    };

    captureThumbs();
    return () => { cancelled = true; };
  }, [videoUrl, clips.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ────────────────────────────────────────────────────────

  const keptClips = clips.filter((c) => c.kept);
  const totalDuration = keptClips.reduce((s, c) => s + c.duration, 0);
  const sport = meta?.sport ?? "";
  const sportCfg = SPORTS_CONFIG[sport];
  const warnMin = sportCfg?.recommendedLength?.max ?? 5;
  const isOverLength = totalDuration > warnMin * 60;

  const playTypes = ["All", ...Array.from(new Set(clips.map((c) => c.playType)))];

  const visibleClips = clips
    .filter((c) => filterType === "All" || c.playType === filterType)
    .slice()
    .sort((a, b) => {
      if (sortMode === "confidence") return b.confidenceScore - a.confidenceScore;
      if (sortMode === "duration")   return b.duration - a.duration;
      if (sortMode === "playtype")   return a.playType.localeCompare(b.playType);
      return 0; // custom = current order
    });

  const selectedCount = clips.filter((c) => c.selected).length;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const toggleKept = useCallback((id: string) => {
    setClips((prev) => prev.map((c) => c.id === id ? { ...c, kept: !c.kept } : c));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setClips((prev) => prev.map((c) => c.id === id ? { ...c, selected: !c.selected } : c));
  }, []);

  const selectAll = () => setClips((prev) => prev.map((c) => ({ ...c, selected: true })));
  const deselectAll = () => setClips((prev) => prev.map((c) => ({ ...c, selected: false })));
  const removeSelected = () => {
    setClips((prev) => prev.map((c) => c.selected ? { ...c, kept: false, selected: false } : c));
    showToast("Selected clips removed.");
  };

  // ── Drag reorder ──────────────────────────────────────────────────────────

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOver(i);
    if (dragIdx.current === null || dragIdx.current === i) return;
    setClips((prev) => {
      const sourceClip = visibleClips[dragIdx.current!];
      const targetClip = visibleClips[i];
      if (!sourceClip || !targetClip) return prev;
      const next = [...prev];
      const fromIdx = next.findIndex((c) => c.id === sourceClip.id);
      const toIdx   = next.findIndex((c) => c.id === targetClip.id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      dragIdx.current = i;
      return next;
    });
  };
  const onDragEnd = () => {
    dragIdx.current = null;
    setDragOver(null);
    setSortMode("custom");
    showToast("Clips reordered — your best play is now first.");
  };

  // ── Build My Reel ─────────────────────────────────────────────────────────

  const handleBuildReel = async () => {
    setSaving(true);
    const kept = keptClips.map((c) => ({
      id: c.id,
      clipNumber: c.clipNumber,
      playType: c.playType,
      startTime: c.startTime,
      endTime: c.endTime,
      duration: c.duration,
      confidenceScore: c.confidenceScore,
      jerseyVisible: c.jerseyVisible,
      aiPicked: c.aiPicked,
      sport: c.sport,
      jerseyNumber: c.jerseyNumber,
      thumbnailUrl: c.thumbnailUrl,
    }));

    // Save to localStorage
    localStorage.setItem("aiGeneratedClips", JSON.stringify(kept));
    localStorage.setItem("clipSource", "ai");
    localStorage.setItem("reviewComplete", "true");

    // Save to Supabase if job ID is available
    const jobId = localStorage.getItem("currentJobId");
    if (jobId) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key && url !== "https://placeholder.supabase.co" && key !== "your-anon-key-here") {
          const sb = createClient(url, key);
          await sb
            .from("processing_jobs")
            .update({ reviewed_clips: kept })
            .eq("id", jobId);
        }
      } catch (e) {
        console.warn("[review] Supabase save failed:", e);
      }
    }

    router.push("/customize");
  };

  // ── Empty state ────────────────────────────────────────────────────────────

  if (clips.length === 0) {
    return (
      <div className="min-h-screen bg-[#050A14] text-white flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-6xl">🤖</div>
        <h1 className="text-2xl font-black text-white text-center">No Clips Found</h1>
        <p className="text-slate-400 text-center max-w-sm">
          No AI-generated clips in storage. Submit a video from the AI processing page or load mock clips from the admin panel.
        </p>
        <div className="flex gap-3">
          <button onClick={() => router.push("/process")}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #0055EE, #00A3FF)" }}>
            Submit Game Film
          </button>
          <button onClick={() => router.push("/admin")}
            className="px-6 py-3 rounded-xl font-bold text-sm text-slate-300 transition-all hover:text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Admin Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-xl"
          style={{ background: "#0A1628", border: "1px solid rgba(0,163,255,0.3)", boxShadow: "0 0 24px rgba(0,163,255,0.2)" }}>
          {toast}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewClip && (
        <PreviewModal
          clip={previewClip}
          videoUrl={videoUrl}
          accentHex={accentHex}
          onClose={() => setPreviewClip(null)}
          onKeep={() => { toggleKept(previewClip.id); }}
          onRemove={() => { if (previewClip.kept) toggleKept(previewClip.id); }}
        />
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-30" style={{ background: "rgba(5,10,20,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <button onClick={() => router.push("/process")} className="text-slate-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            Back
          </button>

          {/* 4-step progress bar */}
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md mx-auto">
            {["Upload", "AI Processing", "Review Clips", "Build Reel"].map((label, i) => {
              const done = i < 2;
              const active = i === 2;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="h-1 w-full rounded-full"
                      style={{ background: done ? "#22C55E" : active ? accentHex : "rgba(255,255,255,0.08)" }} />
                    <span className="text-[9px] font-bold whitespace-nowrap"
                      style={{ color: active ? "#fff" : done ? "#22C55E" : "#475569" }}>
                      {label}
                    </span>
                  </div>
                  {i < 3 && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 hidden sm:block">{keptClips.length} of {clips.length} clips kept</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 pt-6 pb-36">

        {/* ── Hero header ── */}
        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
            AI Found <span style={{ color: accentHex }}>{clips.length} Clips</span> For You
          </h1>
          <p className="text-slate-400 text-base">
            {meta?.firstName && `${meta.firstName} · `}
            {meta?.sport && `${meta.sport} · `}
            {meta?.jerseyNumber !== undefined && `Jersey #${meta.jerseyNumber}`}
          </p>
        </div>

        {/* ── Green banner ── */}
        <div className="mb-6 px-4 py-3 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <span className="text-green-400 text-lg shrink-0 mt-0.5">✓</span>
          <p className="text-green-300 text-sm leading-relaxed">
            Review your clips below — keep the ones you want and remove the rest. Your best plays are sorted first.
          </p>
        </div>

        {/* ── Fallback notice ── */}
        {isFallback && (
          <div className="mb-5 px-4 py-3 rounded-xl flex items-start gap-3"
            style={{ background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.15)" }}>
            <span className="text-slate-500 text-sm shrink-0">ℹ</span>
            <p className="text-slate-500 text-xs leading-relaxed">
              Using estimated play labels — connect Google Video Intelligence for accurate classification. See <code>GOOGLE_CLOUD_SETUP.md</code>.
            </p>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Bulk actions */}
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:text-white text-slate-400"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Select All
            </button>
            <button onClick={deselectAll} className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:text-white text-slate-400"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Deselect All
            </button>
            {selectedCount > 0 && (
              <button onClick={removeSelected}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
                Remove {selectedCount} Selected
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="ml-auto">
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all text-slate-300"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", outline: "none", appearance: "none", cursor: "pointer" }}>
              <option value="confidence">Sort: Confidence ↓</option>
              <option value="duration">Sort: Duration ↓</option>
              <option value="playtype">Sort: Play Type</option>
              <option value="custom">Sort: Custom Order</option>
            </select>
          </div>
        </div>

        {/* ── Filter pills ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {playTypes.map((pt) => {
            const count = pt === "All" ? clips.length : clips.filter((c) => c.playType === pt).length;
            const isActive = filterType === pt;
            const col = pt === "All" ? { color: accentHex, bg: `${accentHex}18`, border: `${accentHex}40` } : getPlayColor(pt);
            return (
              <button key={pt} onClick={() => setFilterType(pt)}
                className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: isActive ? col.bg : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? col.border : "rgba(255,255,255,0.08)"}`,
                  color: isActive ? col.color : "#64748B",
                }}>
                {pt} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* ── Clip Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleClips.map((clip, i) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              index={i}
              accentHex={accentHex}
              thumbUrl={thumbMap[clip.id] ?? null}
              onRemove={() => toggleKept(clip.id)}
              onPreview={() => setPreviewClip(clip)}
              onToggleSelect={() => toggleSelected(clip.id)}
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              isDragOver={dragOver === i}
            />
          ))}
        </div>

        {visibleClips.length === 0 && filterType !== "All" && (
          <div className="text-center py-16 text-slate-600">
            No {filterType} clips found.{" "}
            <button onClick={() => setFilterType("All")} className="text-slate-500 hover:text-white underline transition-colors">Show all</button>
          </div>
        )}

      </div>

      {/* ── Sticky Summary Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: "rgba(5,10,20,0.98)", borderTop: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-wrap items-center gap-4 justify-between">

          {/* Stats */}
          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <div className="text-lg font-black text-white">{keptClips.length}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Clips Kept</div>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div>
              <div className="text-lg font-black text-white">{fmtDur(totalDuration)}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Reel Length</div>
            </div>
            {isOverLength && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#FBBF24" }}>
                ⚠ Over {warnMin} min — coaches prefer shorter reels
              </div>
            )}
          </div>

          {/* Build button */}
          <button
            onClick={handleBuildReel}
            disabled={keptClips.length === 0 || saving}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-base text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
              boxShadow: "0 0 32px rgba(0,120,255,0.4)",
            }}>
            {saving ? "Saving..." : "Build My Reel"}
            {!saving && <ArrowRightIcon />}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
