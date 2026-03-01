"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type { ColorAccent, FontStyle } from "../providers";
import { classifyClipViaApi, playTypeBadgeColor } from "../../lib/clipClassifier";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ClipItem {
  id:           string;
  file:         File | null;
  blobUrl:      string;
  name:         string;
  thumbnailUrl: string | null;
  duration:     number;
  trimStart:    number;
  trimEnd:      number;
  textOverlay:  string;
  intensity:    number;
  starred:      boolean;
  // AI / estimated classification
  playType?:     string;
  qualityScore?: number;
  confidence?:   number;
  classifiedBy?: "google-ai" | "estimated";
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<ColorAccent, string> = {
  "Electric Blue": "#00A3FF",
  "Red":           "#EF4444",
  "Gold":          "#FBBF24",
  "Green":         "#22C55E",
  "Purple":        "#A855F7",
  "White":         "#F1F5F9",
};
const FONT_MAP: Record<FontStyle, string> = {
  Modern:   "Inter",
  Bold:     "Oswald",
  Clean:    "Poppins",
  Athletic: "Bebas Neue",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);
const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const PauseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
const ScissorsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);
const TypeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const XSmIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const GripIcon = () => (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
    <circle cx="3" cy="3"  r="1.5" fill="rgba(255,255,255,0.35)" />
    <circle cx="7" cy="3"  r="1.5" fill="rgba(255,255,255,0.35)" />
    <circle cx="3" cy="8"  r="1.5" fill="rgba(255,255,255,0.35)" />
    <circle cx="7" cy="8"  r="1.5" fill="rgba(255,255,255,0.35)" />
    <circle cx="3" cy="13" r="1.5" fill="rgba(255,255,255,0.35)" />
    <circle cx="7" cy="13" r="1.5" fill="rgba(255,255,255,0.35)" />
  </svg>
);
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

// ── Editor Page ────────────────────────────────────────────────────────────────
export default function EditorPage() {
  const router = useRouter();
  const reel   = useReel();

  // Read accent/font from cliptSettings (new flow) or fall back to reel context
  const settingsAccent = (() => { try { const s = JSON.parse(localStorage.getItem("cliptSettings") || "{}"); return s.accentHex || null; } catch { return null; } })();
  const settingsFont   = (() => { try { const s = JSON.parse(localStorage.getItem("cliptSettings") || "{}"); return s.fontStyle || null; } catch { return null; } })();
  const accentHex    = settingsAccent || COLOR_MAP[reel.colorAccent] || "#00A3FF";
  const accentIsWhite = accentHex === "#F1F5F9" || accentHex === "#FFFFFF";
  const fontFamily   = FONT_MAP[(settingsFont as FontStyle) || reel.fontStyle] ?? "Arial";

  // ── State ──────────────────────────────────────────────────────────────────
  const [clips, setClips]           = useState<ClipItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [thumbs, setThumbs]         = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [trimDrag, setTrimDrag]     = useState<"start" | "end" | null>(null);
  const [showText, setShowText]     = useState(false);
  const [textInput, setTextInput]   = useState("");
  const [dragFrom, setDragFrom]     = useState<number | null>(null);
  const [dragOver, setDragOver]     = useState<number | null>(null);
  const [ready, setReady]           = useState(false);
  const [reclassifyingIdx, setReclassifyingIdx] = useState<number | null>(null);
  // Read sport/position from cliptSettings for reclassify
  const editorSport    = (() => { try { return JSON.parse(localStorage.getItem("cliptSettings") || "{}").sport    || ""; } catch { return ""; } })();
  const editorPosition = (() => { try { return JSON.parse(localStorage.getItem("cliptSettings") || "{}").position || ""; } catch { return ""; } })();

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef    = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const trimBarRef  = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // ── Init: load clips from cliptSettings (primary) or reel context (fallback) ─
  useEffect(() => {
    let initial: ClipItem[] = [];

    // Try cliptSettings first (new flow)
    try {
      const raw = localStorage.getItem("cliptSettings");
      if (raw) {
        const settings = JSON.parse(raw);
        if (Array.isArray(settings.clips) && settings.clips.length > 0) {
          initial = settings.clips.map((c: { name: string; blobUrl?: string; thumbnailUrl?: string | null; duration?: number; trimStart?: number; trimEnd?: number; textOverlay?: string; starred?: boolean; playType?: string; qualityScore?: number; confidence?: number; classifiedBy?: "google-ai" | "estimated" }, i: number) => ({
            id:           `clip-${i}-${(c.name || "").replace(/\W+/g, "")}`,
            file:         null,
            blobUrl:      c.blobUrl || "",
            name:         c.name || `Clip ${i + 1}`,
            thumbnailUrl: c.thumbnailUrl || null,
            duration:     c.duration || 0,
            trimStart:    c.trimStart ?? 0,
            trimEnd:      c.trimEnd ?? (c.duration || 0),
            textOverlay:  c.textOverlay || "",
            intensity:    0,
            starred:      c.starred ?? false,
            playType:     c.playType,
            qualityScore: c.qualityScore,
            confidence:   c.confidence,
            classifiedBy: c.classifiedBy,
          }));
        }
      }
    } catch { /* ignore */ }

    // Fallback: reel.files (old flow)
    if (initial.length === 0 && reel.files.length > 0) {
      initial = reel.files.map((f, i) => ({
        id:           `clip-${i}-${f.name.replace(/\W+/g, "")}`,
        file:         f,
        blobUrl:      "",
        name:         f.name,
        thumbnailUrl: null,
        duration:     0,
        trimStart:    reel.clipTrimStarts[i]   ?? 0,
        trimEnd:      reel.clipTrimEnds[i]     ?? 0,
        textOverlay:  reel.clipTextOverlays[i] ?? "",
        intensity:    reel.clipIntensities[i]  ?? 0,
        starred:      false,
      }));
    }

    if (initial.length === 0) { router.push("/customize"); return; }

    setClips(initial);
    setReady(true);

    // Load metadata + thumbnails for each clip
    initial.forEach((item, idx) => {
      // Use existing thumbnail if available
      if (item.thumbnailUrl) {
        setThumbs((prev) => ({ ...prev, [item.id]: item.thumbnailUrl! }));
      }

      const src = item.blobUrl || (item.file ? URL.createObjectURL(item.file) : "");
      if (!src) return;
      const owned = !item.blobUrl && !!item.file;

      const vid = document.createElement("video");
      vid.muted = true; vid.playsInline = true; vid.preload = "metadata";

      vid.onloadedmetadata = () => {
        const dur = vid.duration;
        setClips((prev) =>
          prev.map((c, i) =>
            i === idx
              ? { ...c, duration: dur, trimEnd: (c.trimEnd > 0 && c.trimEnd <= dur) ? c.trimEnd : dur }
              : c
          )
        );
        if (!item.thumbnailUrl) vid.currentTime = Math.min(0.8, dur / 4);
        else if (owned) URL.revokeObjectURL(src);
      };

      vid.onseeked = () => {
        if (!item.thumbnailUrl) {
          const canvas = document.createElement("canvas");
          canvas.width = 160; canvas.height = 90;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const sA = vid.videoWidth / vid.videoHeight;
            if (sA < (160 / 90) - 0.05) {
              const dw = Math.round(90 * sA);
              ctx.fillStyle = "#0A1628"; ctx.fillRect(0, 0, 160, 90);
              ctx.drawImage(vid, (160 - dw) / 2, 0, dw, 90);
            } else {
              ctx.drawImage(vid, 0, 0, 160, 90);
            }
            setThumbs((prev) => ({ ...prev, [item.id]: canvas.toDataURL("image/jpeg", 0.6) }));
          }
        }
        if (owned) URL.revokeObjectURL(src);
      };

      vid.onerror = () => { if (owned) URL.revokeObjectURL(src); };
      vid.src = src;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load video when selectedIdx changes ────────────────────────────────────
  useEffect(() => {
    if (!ready || clips.length === 0) return;
    const vid = videoRef.current;
    const clip = clips[selectedIdx];
    if (!vid || !clip) return;

    vid.pause(); setIsPlaying(false);
    // Only revoke if it was an owned URL we created
    if (videoUrlRef.current && !videoUrlRef.current.startsWith("blob:") && videoUrlRef.current !== clip.blobUrl) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    videoUrlRef.current = null;

    const url = clip.blobUrl || (clip.file ? URL.createObjectURL(clip.file) : "");
    if (!url) return;
    const owned = !clip.blobUrl && !!clip.file;
    if (owned) videoUrlRef.current = url;

    vid.src = url;

    const onMeta = () => { vid.currentTime = clip.trimStart; setCurrentTime(clip.trimStart); };
    vid.addEventListener("loadedmetadata", onMeta, { once: true });
    vid.load();

    // Scroll timeline to selected clip
    if (timelineRef.current) {
      const block = timelineRef.current.children[selectedIdx] as HTMLElement;
      if (block) block.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedIdx, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Track time + enforce trim ──────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    const clip = clips[selectedIdx];
    if (!vid || !clip) return;

    const onTimeUpdate = () => {
      setCurrentTime(vid.currentTime);
      if (clip.trimEnd > 0 && vid.currentTime >= clip.trimEnd) {
        vid.pause(); vid.currentTime = clip.trimStart;
        setIsPlaying(false); setCurrentTime(clip.trimStart);
      }
    };
    const onEnded = () => { vid.currentTime = clip.trimStart; setIsPlaying(false); setCurrentTime(clip.trimStart); };

    vid.addEventListener("timeupdate", onTimeUpdate);
    vid.addEventListener("ended", onEnded);
    return () => { vid.removeEventListener("timeupdate", onTimeUpdate); vid.removeEventListener("ended", onEnded); };
  }, [selectedIdx, clips]);

  // Cleanup video URL on unmount
  useEffect(() => {
    return () => { if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current); };
  }, []);

  // ── Trim drag handlers ─────────────────────────────────────────────────────
  const handleTrimPointerDown = (handle: "start" | "end") => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setTrimDrag(handle);
  };
  const handleTrimPointerMove = (e: React.PointerEvent) => {
    if (!trimDrag || !trimBarRef.current) return;
    const rect = trimBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const clip = clips[selectedIdx];
    if (!clip || clip.duration === 0) return;
    const t = (x / rect.width) * clip.duration;
    setClips((prev) =>
      prev.map((c, i) => {
        if (i !== selectedIdx) return c;
        if (trimDrag === "start") return { ...c, trimStart: Math.max(0, Math.min(t, c.trimEnd - 0.5)) };
        return { ...c, trimEnd: Math.max(c.trimStart + 0.5, Math.min(t, c.duration)) };
      })
    );
  };
  const handleTrimPointerUp = () => {
    setTrimDrag(null);
    // Seek video to trimStart when handle released
    const vid = videoRef.current;
    const clip = clips[selectedIdx];
    if (vid && clip) { vid.currentTime = clip.trimStart; setCurrentTime(clip.trimStart); }
  };

  // ── Playback ───────────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    const vid = videoRef.current; if (!vid) return;
    if (isPlaying) { vid.pause(); setIsPlaying(false); }
    else {
      const clip = clips[selectedIdx];
      if (clip && clip.trimEnd > 0 && vid.currentTime >= clip.trimEnd) {
        vid.currentTime = clip.trimStart; setCurrentTime(clip.trimStart);
      }
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Clicking on the progress area of trim bar → seek
  const handleTrimBarClick = (e: React.MouseEvent) => {
    if (trimDrag) return;
    const rect = trimBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clip = clips[selectedIdx];
    if (!clip || clip.duration === 0) return;
    const t = ((e.clientX - rect.left) / rect.width) * clip.duration;
    const clamped = Math.max(clip.trimStart, Math.min(t, clip.trimEnd));
    const vid = videoRef.current;
    if (vid) { vid.currentTime = clamped; setCurrentTime(clamped); }
  };

  // ── Clip operations ────────────────────────────────────────────────────────
  const handleDelete = (idx: number) => {
    if (clips.length === 1) return;
    const next = clips.filter((_, i) => i !== idx);
    setClips(next);
    setSelectedIdx(Math.min(selectedIdx, next.length - 1));
  };

  const handleSplit = () => {
    const clip = clips[selectedIdx];
    if (!clip || clip.duration === 0) return;
    const t = Math.max(clip.trimStart + 0.1, Math.min(currentTime, clip.trimEnd - 0.1));
    const a: ClipItem = { ...clip, id: `${clip.id}-a`, trimEnd: t };
    const b: ClipItem = { ...clip, id: `${clip.id}-b`, trimStart: t };
    const next = [...clips];
    next.splice(selectedIdx, 1, a, b);
    setClips(next);
  };

  const handleApplyText = () => {
    setClips((prev) => prev.map((c, i) => i === selectedIdx ? { ...c, textOverlay: textInput.slice(0, 30) } : c));
    setShowText(false);
  };

  const handleClearText = () => {
    setClips((prev) => prev.map((c, i) => i === selectedIdx ? { ...c, textOverlay: "" } : c));
    setTextInput(""); setShowText(false);
  };

  const handleIntensity = (val: number) => {
    setClips((prev) => prev.map((c, i) => i === selectedIdx ? { ...c, intensity: val } : c));
  };

  // ── Timeline drag-to-reorder ───────────────────────────────────────────────
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragFrom(idx); e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(idx);
  };
  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragFrom === null || dragFrom === idx) { setDragFrom(null); setDragOver(null); return; }
    const arr = [...clips];
    const [moved] = arr.splice(dragFrom, 1);
    arr.splice(idx, 0, moved);
    setClips(arr); setSelectedIdx(idx);
    setDragFrom(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragFrom(null); setDragOver(null); };

  // ── Save and navigate to export ────────────────────────────────────────────
  const handleSave = () => {
    // Update reel context (legacy flow)
    if (clips.some(c => c.file)) {
      reel.update({
        files:            clips.filter(c => c.file).map((c) => c.file!),
        clipNames:        clips.map((c) => c.name),
        clipTrimStarts:   clips.map((c) => c.trimStart),
        clipTrimEnds:     clips.map((c) => c.trimEnd),
        clipTextOverlays: clips.map((c) => c.textOverlay),
        clipIntensities:  clips.map((c) => c.intensity),
      });
    }

    // Update cliptSettings with trim data (new flow)
    try {
      const raw = localStorage.getItem("cliptSettings");
      if (raw) {
        const settings = JSON.parse(raw);
        settings.clips = clips.map((c) => ({
          name:         c.name,
          blobUrl:      c.blobUrl || "",
          thumbnailUrl: c.thumbnailUrl || null,
          duration:     c.duration,
          trimStart:    c.trimStart,
          trimEnd:      c.trimEnd,
          textOverlay:  c.textOverlay,
          starred:      c.starred,
          size:         0,
        }));
        localStorage.setItem("cliptSettings", JSON.stringify(settings));
      }
    } catch { /* ignore */ }

    router.push("/export");
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedClip = clips[selectedIdx];
  const trimDuration = selectedClip ? Math.max(0, selectedClip.trimEnd - selectedClip.trimStart) : 0;
  const totalDuration = clips.reduce((s, c) => s + Math.max(0, c.trimEnd - c.trimStart), 0);
  const filterStyle = selectedClip?.intensity
    ? `saturate(${(1 + selectedClip.intensity * 0.01).toFixed(3)}) contrast(${(1 + selectedClip.intensity * 0.003).toFixed(3)})`
    : "none";

  if (!ready && clips.length === 0) {
    return (
      <div className="min-h-screen bg-[#050A14] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: `${accentHex}20`, borderTopColor: accentHex }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#050A14] text-white select-none" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5" style={{ background: "#050A14" }}>
        <button onClick={() => router.push("/export")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeftIcon />
          <span className="text-sm hidden sm:inline">Export</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-lg font-black tracking-widest" style={{ color: accentHex }}>CLIPT</span>
          <span className="text-[9px] text-slate-600 tracking-widest uppercase">Editor</span>
        </div>

        <button onClick={handleSave} disabled={clips.length === 0}
          className="px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
          style={{ background: accentHex, color: accentIsWhite ? "#050A14" : "#ffffff" }}>
          Save &amp; Export →
        </button>
      </header>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

        {/* ── VIDEO PREVIEW ── */}
        <div className="relative bg-[#050A14] flex items-center justify-center py-2">
          <div className="relative w-full" style={{ maxWidth: "min(640px, 100vw)" }}>
            {selectedClip ? (
              <>
                {/* Play type label — shown above video */}
                {selectedClip.playType && (
                  <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 z-10"
                    style={{ background: "linear-gradient(to bottom, rgba(5,10,20,0.9), transparent)", pointerEvents: "none" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black" style={{ color: accentHex }}>
                        {selectedClip.playType}
                      </span>
                      {selectedClip.classifiedBy && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                          style={selectedClip.classifiedBy === "google-ai"
                            ? { background: "rgba(34,197,94,0.2)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }
                            : { background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.25)" }}>
                          {selectedClip.classifiedBy === "google-ai" ? "AI" : "EST"}
                        </span>
                      )}
                      {selectedClip.starred && (
                        <span style={{ color: "#FBBF24", fontSize: 14 }}>★</span>
                      )}
                    </div>
                    {/* Quality score — top right */}
                    {selectedClip.qualityScore !== undefined && (() => {
                      const qs = selectedClip.qualityScore!;
                      const qc = qs >= 80 ? "#FBBF24" : qs >= 60 ? "#00A3FF" : "#64748b";
                      return (
                        <div title={qs >= 80 ? "Elite Play" : qs >= 60 ? "Strong Play" : "Consider Removing"}
                          style={{ width: 36, height: 36, borderRadius: "50%", background: qc + "22", border: `2px solid ${qc}`, color: qc, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {qs}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <video
                  ref={videoRef}
                  playsInline
                  className="w-full block"
                  style={{ maxHeight: "42vh", objectFit: "contain", filter: filterStyle }}
                />

                {/* Text overlay preview */}
                {selectedClip.textOverlay && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center px-4 py-3" style={{ background: "rgba(5,10,20,0.82)" }}>
                    <p className="text-white font-bold text-sm text-center"
                      style={{ fontFamily: `"${fontFamily}", Arial, sans-serif` }}>
                      {selectedClip.textOverlay}
                    </p>
                  </div>
                )}

                {/* Play/Pause overlay */}
                <button onClick={handlePlayPause}
                  className="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: "transparent" }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
                    <span style={{ color: "#fff" }}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
                  </div>
                </button>

                {/* Time badge — bottom right (only when no play type shown) */}
                {!selectedClip.playType && (
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-mono tabular-nums"
                    style={{ background: "rgba(0,0,0,0.7)", color: accentHex }}>
                    {fmtTime(currentTime)} / {fmtTime(selectedClip.trimEnd)}
                  </div>
                )}
                {selectedClip.playType && (
                  <div className="absolute bottom-8 right-2 px-2 py-1 rounded-lg text-[10px] font-mono tabular-nums"
                    style={{ background: "rgba(0,0,0,0.7)", color: accentHex }}>
                    {fmtTime(currentTime)} / {fmtTime(selectedClip.trimEnd)}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-video bg-[#0A1628] flex items-center justify-center rounded-xl mx-4">
                <p className="text-slate-600 text-sm">Select a clip</p>
              </div>
            )}
          </div>
        </div>

        {/* ── CLIP INFO + ACTION ROW ── */}
        {selectedClip && (
          <div className="shrink-0 px-4 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: "#0A1628" }}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{selectedClip.name || selectedClip.file?.name || "Clip"}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">
                Clip {selectedIdx + 1} of {clips.length} · {fmtTime(trimDuration)} selected · {fmtTime(totalDuration)} total
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Reclassify with AI */}
              {editorSport && editorPosition && (
                <button
                  onClick={() => {
                    const clip = clips[selectedIdx];
                    if (!clip) return;
                    setReclassifyingIdx(selectedIdx);
                    classifyClipViaApi(clip.blobUrl || "", clip.duration || 0, editorSport, editorPosition, selectedIdx).then(result => {
                      setClips(prev => prev.map((c, i) => i === selectedIdx ? { ...c, playType: result.playType, qualityScore: result.qualityScore, confidence: result.confidence, classifiedBy: result.classifiedBy } : c));
                      setReclassifyingIdx(null);
                    });
                  }}
                  disabled={reclassifyingIdx === selectedIdx}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: "rgba(0,163,255,0.1)", color: "#00A3FF", border: "1px solid rgba(0,163,255,0.2)" }}
                  title="Reclassify with AI">
                  {reclassifyingIdx === selectedIdx ? (
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  )}
                  AI
                </button>
              )}
              <button onClick={handleSplit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: `${accentHex}1A`, color: accentHex, border: `1px solid ${accentHex}30` }}>
                <ScissorsIcon /> Split
              </button>
              <button onClick={() => { setTextInput(selectedClip.textOverlay); setShowText((v) => !v); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={showText
                  ? { background: `${accentHex}30`, color: accentHex, border: `1px solid ${accentHex}50` }
                  : { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>
                <TypeIcon /> Text
              </button>
              <button onClick={() => handleDelete(selectedIdx)} disabled={clips.length === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 disabled:opacity-25 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <XIcon />
              </button>
            </div>
          </div>
        )}

        {/* ── TRIM BAR ── */}
        {selectedClip && selectedClip.duration > 0 && (
          <div className="shrink-0 px-4 py-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black tracking-widest uppercase text-slate-600">Trim</p>
              <p className="text-[10px] text-slate-500">
                {fmtTime(selectedClip.trimStart)} — {fmtTime(selectedClip.trimEnd)} ({fmtTime(trimDuration)})
              </p>
            </div>

            {/* Bar */}
            <div
              ref={trimBarRef}
              className="relative h-10 rounded-lg cursor-crosshair"
              style={{ background: "rgba(255,255,255,0.06)" }}
              onClick={handleTrimBarClick}
              onPointerMove={handleTrimPointerMove}
              onPointerUp={handleTrimPointerUp}
            >
              {/* Inactive left region */}
              <div className="absolute inset-y-0 left-0 rounded-l-lg pointer-events-none"
                style={{ width: `${(selectedClip.trimStart / selectedClip.duration) * 100}%`, background: "rgba(0,0,0,0.55)" }} />

              {/* Inactive right region */}
              <div className="absolute inset-y-0 right-0 rounded-r-lg pointer-events-none"
                style={{ width: `${((selectedClip.duration - selectedClip.trimEnd) / selectedClip.duration) * 100}%`, background: "rgba(0,0,0,0.55)" }} />

              {/* Active region highlight */}
              <div className="absolute inset-y-0 pointer-events-none"
                style={{
                  left:   `${(selectedClip.trimStart / selectedClip.duration) * 100}%`,
                  right:  `${((selectedClip.duration - selectedClip.trimEnd) / selectedClip.duration) * 100}%`,
                  border: `2px solid ${accentHex}`,
                  borderRadius: "6px",
                  background: `${accentHex}08`,
                }} />

              {/* Playhead */}
              {currentTime >= 0 && currentTime <= selectedClip.duration && (
                <div className="absolute top-0 bottom-0 w-0.5 pointer-events-none rounded"
                  style={{ left: `${(currentTime / selectedClip.duration) * 100}%`, background: "#FFFFFF", opacity: 0.75, zIndex: 5 }} />
              )}

              {/* Start handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded cursor-col-resize touch-none"
                style={{ width: "18px", height: "36px", left: `calc(${(selectedClip.trimStart / selectedClip.duration) * 100}% - 9px)`, background: accentHex }}
                onPointerDown={handleTrimPointerDown("start")}
              >
                <div className="w-0.5 h-4 rounded" style={{ background: accentIsWhite ? "#050A14" : "rgba(255,255,255,0.7)" }} />
              </div>

              {/* End handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded cursor-col-resize touch-none"
                style={{ width: "18px", height: "36px", left: `calc(${(selectedClip.trimEnd / selectedClip.duration) * 100}% - 9px)`, background: accentHex }}
                onPointerDown={handleTrimPointerDown("end")}
              >
                <div className="w-0.5 h-4 rounded" style={{ background: accentIsWhite ? "#050A14" : "rgba(255,255,255,0.7)" }} />
              </div>
            </div>
          </div>
        )}

        {/* ── TEXT OVERLAY INPUT ── */}
        {showText && selectedClip && (
          <div className="shrink-0 px-4 py-3 border-b border-white/5" style={{ background: "#0A1628" }}>
            <p className="text-[9px] font-black tracking-widest uppercase text-slate-600 mb-2">Text Overlay (Lower Third)</p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={30}
                value={textInput}
                autoFocus
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyText()}
                placeholder="e.g. GAME-WINNING BLOCK"
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-white/20 transition-all"
                style={{ background: "#050A14", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button onClick={handleApplyText}
                className="px-4 py-2 rounded-xl font-bold text-sm shrink-0 transition-all hover:opacity-90"
                style={{ background: accentHex, color: accentIsWhite ? "#050A14" : "#fff" }}>
                Apply
              </button>
              {selectedClip.textOverlay && (
                <button onClick={handleClearText}
                  className="px-3 py-2 rounded-xl text-sm transition-all hover:text-red-400"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Clear
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">{textInput.length}/30 characters</p>
          </div>
        )}

        {/* ── COLOR GRADE ── */}
        {selectedClip && (
          <div className="shrink-0 px-4 py-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-500"><SunIcon /></span>
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-600">Color Grade</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedClip.intensity > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${accentHex}20`, color: accentHex }}>
                    +{selectedClip.intensity}
                  </span>
                )}
                <p className="text-[10px] text-slate-500">
                  {selectedClip.intensity === 0 ? "Off" : `Saturation ×${(1 + selectedClip.intensity * 0.01).toFixed(2)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-600 w-5">0</span>
              <input
                type="range" min={0} max={100} value={selectedClip.intensity}
                onChange={(e) => handleIntensity(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${accentHex} ${selectedClip.intensity}%, rgba(255,255,255,0.1) ${selectedClip.intensity}%)`,
                  WebkitAppearance: "none",
                }}
              />
              <span className="text-[10px] text-slate-600 w-8 text-right">100</span>
            </div>
          </div>
        )}
      </div>

      {/* ── TIMELINE (sticky bottom) ── */}
      <div className="shrink-0 border-t border-white/5" style={{ background: "#0A1628", height: "120px" }}>
        <div
          ref={timelineRef}
          className="flex items-center h-full gap-2 px-3 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {clips.map((clip, idx) => (
            <div
              key={clip.id}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedIdx(idx)}
              className="shrink-0 relative rounded-xl overflow-hidden cursor-pointer transition-all active:scale-95"
              style={{
                width: "92px",
                height: "84px",
                border: idx === selectedIdx
                  ? `2px solid ${accentHex}`
                  : dragOver === idx && dragFrom !== idx
                    ? `2px solid ${accentHex}60`
                    : "2px solid rgba(255,255,255,0.07)",
                opacity: dragFrom === idx ? 0.35 : 1,
                boxShadow: idx === selectedIdx ? `0 0 12px ${accentHex}40` : "none",
              }}
            >
              {/* Thumbnail */}
              {thumbs[clip.id] ? (
                <img src={thumbs[clip.id]} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "#050A14" }}>
                  <div className="w-5 h-5 rounded-full border border-white/10 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
              )}

              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1"
                style={{ background: "linear-gradient(to top, rgba(5,10,20,0.95), transparent)" }}>
                <p className="text-white text-[9px] font-black">#{idx + 1}</p>
                {clip.playType ? (
                  <p className="text-[7px] truncate font-bold" style={{ color: playTypeBadgeColor(clip.playType) }}>{clip.playType}</p>
                ) : (
                  <p className="text-slate-400 text-[8px]">{fmtTime(clip.trimEnd - clip.trimStart)}</p>
                )}
              </div>

              {/* Quality score badge */}
              {clip.qualityScore !== undefined && (() => {
                const qs = clip.qualityScore!;
                const qc = qs >= 80 ? "#FBBF24" : qs >= 60 ? "#00A3FF" : "#64748b";
                return (
                  <div className="absolute top-1 right-1"
                    style={{ width: 18, height: 18, borderRadius: "50%", background: qc + "CC", border: `1.5px solid ${qc}`, color: qs >= 80 ? "#000" : "#fff", fontSize: 7, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {qs}
                  </div>
                );
              })()}

              {/* Grip handle */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0.5 opacity-50 pointer-events-none">
                <GripIcon />
              </div>

              {/* Starred indicator */}
              {clip.starred && (
                <div className="absolute top-1 left-1 text-[10px]" style={{ color: "#FBBF24", lineHeight: 1 }}>★</div>
              )}

              {/* Text overlay indicator */}
              {clip.textOverlay && (
                <div className="absolute top-1 left-5 w-4 h-4 rounded flex items-center justify-center"
                  style={{ background: accentHex + "CC" }}>
                  <span className="text-[7px] font-black" style={{ color: accentIsWhite ? "#050A14" : "#fff" }}>T</span>
                </div>
              )}

              {/* Intensity indicator */}
              {clip.intensity > 0 && (
                <div className="absolute top-6 left-1 w-4 h-4 rounded flex items-center justify-center"
                  style={{ background: "rgba(251,191,36,0.8)" }}>
                  <span className="text-[7px] font-black text-black">✦</span>
                </div>
              )}

              {/* Delete button */}
              {clips.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:bg-red-500"
                  style={{ background: "rgba(0,0,0,0.75)" }}>
                  <XSmIcon />
                </button>
              )}

              {/* Selected ring */}
              {idx === selectedIdx && (
                <div className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{ border: `1px solid ${accentHex}60` }} />
              )}
            </div>
          ))}

          {/* End spacer */}
          <div className="shrink-0 w-4 h-full" />
        </div>
      </div>

      {/* Range input style override */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
