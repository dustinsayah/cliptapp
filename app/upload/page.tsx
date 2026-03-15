"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SPORTS_CONFIG } from "../../lib/sportsConfig";
import { estimateClipClassification, classifyClipViaApi, playTypeBadgeColor } from "../../lib/clipClassifier";
import type { ClipClassification } from "../../lib/clipClassifier";
import JerseyColorInput from "../../components/JerseyColorInput";
import { uploadToCloudinary } from "../../lib/cloudinaryUpload";

// ── Icons ──────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);
const FilmIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A3FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_CLIPS = 50;
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029", "2030", "2031"];

const steps = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0A1628] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A3FF]/60 transition-all";
const labelClass = "block text-sm font-semibold text-white mb-2";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function fmtDuration(sec: number): string {
  if (!isFinite(sec) || isNaN(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `0:${s.toString().padStart(2, "0")}`;
}

// ── Thumbnail generation ───────────────────────────────────────────────────────
interface ClipMeta {
  thumbnail: string | null;
  duration: number;
  blobUrl: string;
}

function makePlaceholderThumbnail(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#0A1628";
    ctx.fillRect(0, 0, 320, 180);
    // Draw a play triangle
    ctx.fillStyle = "rgba(0,163,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(125, 90);
    ctx.lineTo(205, 135);
    ctx.lineTo(205, 45);
    ctx.closePath();
    ctx.fill();
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return "";
  }
}

async function generateClipMeta(file: File): Promise<ClipMeta> {
  return new Promise((resolve) => {
    let blobUrl = "";
    try {
      blobUrl = URL.createObjectURL(file);
    } catch {
      resolve({ thumbnail: makePlaceholderThumbnail(), duration: 0, blobUrl: "" });
      return;
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = "metadata";

    let resolved = false;
    const done = (result: ClipMeta) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const timeout = setTimeout(() => {
      done({ thumbnail: makePlaceholderThumbnail(), duration: 0, blobUrl });
    }, 12000);

    const doCapture = (duration: number) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) { done({ thumbnail: makePlaceholderThumbnail(), duration, blobUrl }); return; }
        ctx.fillStyle = "#0A1628";
        ctx.fillRect(0, 0, 320, 180);
        ctx.drawImage(video, 0, 0, 320, 180);
        const thumbnail = canvas.toDataURL("image/jpeg", 0.8);
        done({ thumbnail, duration, blobUrl });
      } catch {
        done({ thumbnail: makePlaceholderThumbnail(), duration, blobUrl });
      }
    };

    const attemptSeek = (duration: number) => {
      const safeDuration = isFinite(duration) && !isNaN(duration) && duration > 0 ? duration : 0;
      const seekTo = safeDuration > 2 ? 2 : safeDuration > 0 ? safeDuration * 0.15 : 0;
      video.onseeked = () => doCapture(safeDuration);
      if (seekTo > 0) {
        video.currentTime = seekTo;
      } else {
        doCapture(safeDuration);
      }
    };

    // Multiple events — whichever fires first triggers the seek
    let seekTriggered = false;
    const triggerSeek = () => {
      if (seekTriggered) return;
      seekTriggered = true;
      const dur = video.duration;
      const safeDur = isFinite(dur) && !isNaN(dur) && dur > 0 ? dur : 0;
      attemptSeek(safeDur);
    };

    video.onloadeddata = triggerSeek;
    video.onloadedmetadata = triggerSeek;
    video.oncanplay = triggerSeek;

    // Duration may resolve later for some formats
    video.ondurationchange = () => {
      const dur = video.duration;
      if (isFinite(dur) && !isNaN(dur) && dur > 0 && !seekTriggered) {
        triggerSeek();
      }
    };

    video.onerror = () => {
      // Format may not preview — still include with placeholder
      done({ thumbnail: makePlaceholderThumbnail(), duration: 0, blobUrl });
    };

    video.src = blobUrl;
    // Kick it for iOS Safari which sometimes needs load() called
    try { video.load(); } catch { /* ignore */ }
  });
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles]             = useState<File[]>([]);
  const [clipMeta, setClipMeta]       = useState<ClipMeta[]>([]);
  const [clipClassifications, setClipClassifications] = useState<(ClipClassification | null)[]>([]);
  const [classifyingSet, setClassifyingSet] = useState<Set<number>>(new Set());
  const [dragging, setDragging]       = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const [mounted,  setMounted]        = useState(false);

  // ── Per-clip Cloudinary upload state ──────────────────────────────────────
  const [clipUploadStatus,   setClipUploadStatus]   = useState<Array<"pending" | "uploading" | "done" | "error">>([]);
  const [clipUploadProgress, setClipUploadProgress] = useState<number[]>([]);
  const [cloudinaryUrls,     setCloudinaryUrls]     = useState<(string | null)[]>([]);
  const [hasCorruptedPrev,   setHasCorruptedPrev]   = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768 || navigator.maxTouchPoints > 0);
    // Check if previous session left clips with missing Cloudinary URLs
    try {
      const prev = JSON.parse(localStorage.getItem("cliptSettings") || "{}");
      if (Array.isArray(prev.clips) && prev.clips.length > 0) {
        const corrupted = (prev.clips as Array<Record<string, unknown>>).some(c =>
          !c.url || typeof c.url !== "string" || c.url.startsWith("blob:")
        );
        setHasCorruptedPrev(corrupted);
      }
    } catch { /* ignore */ }
  }, []);

  // Form fields
  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  // Always keep a valid hex — never allow empty string (crashes color rendering)
  const [jerseyColor, setJerseyColor] = useState("#FFFFFF");
  const safeSetJerseyColor = (c: string) => setJerseyColor(c && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : "#6B7280");
  const [sport, setSport]             = useState("");
  const [position, setPosition]       = useState("");
  const [school, setSchool]           = useState("");
  const [gradYear, setGradYear]       = useState("");
  const [email, setEmail]             = useState("");

  // Load saved data on mount in case user navigates back
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cliptData");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.firstName) setFirstName(d.firstName);
        if (d.lastName) setLastName(d.lastName);
        if (d.jerseyNumber) setJerseyNumber(d.jerseyNumber);
        if (d.jerseyColor) safeSetJerseyColor(d.jerseyColor);
        if (d.sport) setSport(d.sport);
        if (d.position) setPosition(d.position);
        if (d.school) setSchool(d.school);
        if (d.gradYear) setGradYear(d.gradYear);
        if (d.email) setEmail(d.email);
      }
    } catch { /* ignore */ }
  }, []);

  const handleSportChange = (newSport: string) => {
    setSport(newSport);
    setPosition("");
  };

  // Generate thumbnails + classifications + Cloudinary uploads when files added
  const processNewFiles = useCallback(async (newFiles: File[], startIndex: number, currentSport: string, currentPosition: string) => {
    // Load clips one at a time so the first clip appears immediately
    const cloudinaryCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    for (let localIdx = 0; localIdx < newFiles.length; localIdx++) {
      const globalIdx = startIndex + localIdx;
      const file = newFiles[localIdx];
      const meta = await generateClipMeta(file);
      setClipMeta(prev => [...prev, meta]);

      // ── Cloudinary upload (starts immediately, non-blocking) ───────────────
      setClipUploadStatus(prev => { const n = [...prev]; n[globalIdx] = cloudinaryCloud ? "uploading" : "error"; return n; });
      setClipUploadProgress(prev => { const n = [...prev]; n[globalIdx] = 0; return n; });
      setCloudinaryUrls(prev => { const n = [...prev]; n[globalIdx] = null; return n; });

      if (cloudinaryCloud) {
        const idx = globalIdx;
        console.log(`CLIPT: starting Cloudinary upload for clip ${file.name}`);
        uploadToCloudinary(file, (pct) => {
          setClipUploadProgress(prev => { const n = [...prev]; n[idx] = pct; return n; });
        }).then(url => {
          console.log(`CLIPT: upload successful — URL: ${url}`);
          setCloudinaryUrls(prev => { const n = [...prev]; n[idx] = url; return n; });
          setClipUploadStatus(prev => { const n = [...prev]; n[idx] = "done"; return n; });
        }).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`CLIPT: ERROR — upload failed for ${file.name}: ${msg}`);
          setClipUploadStatus(prev => { const n = [...prev]; n[idx] = "error"; return n; });
        });
      } else {
        console.warn(`CLIPT: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set — upload skipped for ${file.name}`);
      }

      // ── Classification (non-blocking) ──────────────────────────────────────
      setClassifyingSet(prev => { const n = new Set(prev); n.add(globalIdx); return n; });

      const classify = async () => {
        let result: ClipClassification;
        if (cloudinaryCloud) {
          // Cloudinary configured — call API with blob URL (server will fall back if needed)
          result = await classifyClipViaApi(meta.blobUrl || "", meta.duration || 0, currentSport, currentPosition, globalIdx);
        } else {
          // No Cloudinary — log warning and use estimated
          console.warn(`CLIPT AI: ⚠️ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set — AI analysis requires a public upload URL. Using estimated classification for clip ${globalIdx + 1}.`);
          result = estimateClipClassification(currentSport, currentPosition, globalIdx, meta.duration || 0);
        }
        console.log(`CLIPT AI: clip ${globalIdx + 1} classified → playType="${result.playType}" quality=${result.qualityScore} classifiedBy=${result.classifiedBy}`);
        setClipClassifications(prev => {
          const next = [...prev];
          while (next.length <= globalIdx) next.push(null);
          next[globalIdx] = result;
          return next;
        });
        setClassifyingSet(prev => { const n = new Set(prev); n.delete(globalIdx); return n; });
      };

      classify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((incoming: FileList | null, currentSport: string, currentPosition: string) => {
    if (!incoming) return;
    const all = Array.from(incoming);
    setFiles(prev => {
      const combined = [...prev, ...all].slice(0, MAX_CLIPS);
      const added = combined.slice(prev.length);
      if (added.length > 0) processNewFiles(added, prev.length, currentSport, currentPosition);
      return combined;
    });
  }, [processNewFiles]);

  const removeFile = (index: number) => {
    if (clipMeta[index]?.blobUrl) {
      try { URL.revokeObjectURL(clipMeta[index].blobUrl); } catch { /* ignore */ }
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
    setClipMeta(prev => prev.filter((_, i) => i !== index));
    setClipClassifications(prev => prev.filter((_, i) => i !== index));
    setClipUploadStatus(prev => prev.filter((_, i) => i !== index));
    setClipUploadProgress(prev => prev.filter((_, i) => i !== index));
    setCloudinaryUrls(prev => prev.filter((_, i) => i !== index));
    setClassifyingSet(prev => {
      const n = new Set(prev);
      // Rebuild with shifted indices
      const shifted = new Set<number>();
      n.forEach(idx => { if (idx > index) shifted.add(idx - 1); else if (idx < index) shifted.add(idx); });
      return shifted;
    });
  };

  const retryUpload = async (index: number) => {
    const file = files[index];
    if (!file) return;
    setClipUploadStatus(prev => { const n = [...prev]; n[index] = "uploading"; return n; });
    setClipUploadProgress(prev => { const n = [...prev]; n[index] = 0; return n; });
    setCloudinaryUrls(prev => { const n = [...prev]; n[index] = null; return n; });
    console.log(`CLIPT: starting Cloudinary upload for clip ${file.name} (retry)`);
    try {
      const url = await uploadToCloudinary(file, (pct) => {
        setClipUploadProgress(prev => { const n = [...prev]; n[index] = pct; return n; });
      });
      console.log(`CLIPT: upload successful — URL: ${url}`);
      setCloudinaryUrls(prev => { const n = [...prev]; n[index] = url; return n; });
      setClipUploadStatus(prev => { const n = [...prev]; n[index] = "done"; return n; });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`CLIPT: ERROR — upload failed for ${file.name}: ${msg}`);
      setClipUploadStatus(prev => { const n = [...prev]; n[index] = "error"; return n; });
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files, sport, position);
  };

  const cloudinaryConfigured = !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const allUploaded = !cloudinaryConfigured || (
    files.length > 0 &&
    cloudinaryUrls.length === files.length &&
    cloudinaryUrls.every(url => typeof url === "string" && url.startsWith("https://res.cloudinary.com"))
  );
  const anyUploading = cloudinaryConfigured && clipUploadStatus.some(s => s === "uploading");
  const anyUploadError = cloudinaryConfigured && clipUploadStatus.some(s => s === "error");

  const canContinue =
    files.length > 0 &&
    allUploaded &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    jerseyNumber.trim() !== "" &&
    sport !== "" &&
    position !== "" &&
    school.trim() !== "" &&
    gradYear !== "" &&
    email.trim() !== "";

  const handleContinue = () => {
    console.log("CLIPT AI: handleContinue — saving cliptData with classifications");
    // Build clips array with all metadata including AI/estimated classifications
    const clipsData = files.map((file, i) => {
      const cls = clipClassifications[i] ?? estimateClipClassification(sport, position, i, clipMeta[i]?.duration || 0);
      const cloudinaryUrl = cloudinaryUrls[i] ?? undefined;
      console.log(`CLIPT AI: clip ${i + 1} final save → playType="${cls.playType}" quality=${cls.qualityScore} classifiedBy=${cls.classifiedBy}`);
      console.log(`CLIPT: saving clip to cliptSettings with url: ${cloudinaryUrl}`);
      return {
        name: file.name,
        size: file.size,
        duration: clipMeta[i]?.duration || 0,
        thumbnailUrl: clipMeta[i]?.thumbnail || null,
        blobUrl: clipMeta[i]?.blobUrl || (() => { try { return URL.createObjectURL(file); } catch { return ""; } })(),
        url: cloudinaryUrl, // Cloudinary URL — required for server-side detection and Remotion render
        playType:     cls.playType,
        qualityScore: cls.qualityScore,
        confidence:   cls.confidence,
        classifiedBy: cls.classifiedBy,
      };
    });

    const cliptData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      jerseyNumber: jerseyNumber.trim(),
      jerseyColor: jerseyColor || "#6B7280",
      sport,
      position,
      school: school.trim(),
      gradYear,
      email: email.trim(),
      clips: clipsData,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("cliptData", JSON.stringify(cliptData));
      localStorage.setItem("clipSource", "manual");
      // Also store blob URLs separately for canvas export fallback
      localStorage.setItem("clipt_blob_urls", JSON.stringify(clipsData.map(c => c.blobUrl)));
      localStorage.setItem("clipt_blob_count", String(clipsData.length));
      // Verify the save immediately
      const verified = JSON.parse(localStorage.getItem("cliptData") || "{}") as { clips?: Array<{ url?: string }> };
      console.log("CLIPT: verified saved clip URLs:", verified.clips?.map(c => c.url));
    } catch (e) {
      console.warn("localStorage save failed:", e);
    }

    router.push("/customize");
  };

  const totalDuration = clipMeta.reduce((sum, m) => sum + (m?.duration || 0), 0);

  if (!mounted) return (
    <div className="min-h-screen bg-[#050A14] text-white">
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <div className="w-5 h-5 bg-[#0A1628] rounded animate-pulse mr-6" />
        <span className="text-2xl font-black tracking-widest" style={{ color: "#00A3FF" }}>CLIPT</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 space-y-4 pt-2">
        <div className="h-8 w-48 bg-[#0A1628] rounded-lg animate-pulse" />
        <div className="h-48 bg-[#0A1628] rounded-2xl animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-[#0A1628] rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <button onClick={() => router.push("/start")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6" aria-label="Go back">
          <ArrowLeftIcon />
        </button>
        <span className="text-2xl font-black tracking-widest" style={{ color: "#00A3FF" }}>CLIPT</span>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <div className="max-w-3xl mx-auto px-6 mb-10">
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const isActive = step.number === 1;
            const isLast = i === steps.length - 1;
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all"
                    style={isActive ? { background: "#00A3FF", borderColor: "#00A3FF", color: "#050A14" } : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }}>
                    {step.number}
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: isActive ? "#00A3FF" : "#64748b" }}>{step.label}</span>
                </div>
                {!isLast && <div className="flex-1 h-px mx-2 mb-5" style={{ background: "rgba(255,255,255,0.08)" }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-3xl mx-auto px-6 pb-12">
        {/* Corrupted clips banner */}
        {hasCorruptedPrev && (
          <div className="mb-6 px-4 py-3 rounded-xl flex items-start gap-3"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <div className="text-red-400 text-sm font-bold mb-0.5">Previous clips need re-upload</div>
              <div className="text-red-300 text-xs">Some of your previous clips didn&apos;t upload to the cloud correctly and need to be re-uploaded. Please remove them and add them again.</div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Upload Your Clips</h1>
          <p className="text-slate-400 text-sm">Add up to {MAX_CLIPS} clips. All video formats accepted — MP4, MOV, AVI, MKV, WEBM and more.</p>
        </div>

        {/* ── UPLOAD ZONE ── */}
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          className="rounded-xl p-10 flex flex-col items-center text-center transition-all cursor-pointer mb-4"
          style={{
            background: "#0A1628",
            border: `2px dashed ${dragging ? "#00A3FF" : "rgba(0,163,255,0.45)"}`,
            boxShadow: dragging ? "0 0 32px rgba(0,163,255,0.15)" : "none",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="mb-5"><FilmIcon /></div>
          <p className="text-white font-bold text-lg mb-2">
            {isMobile ? "Tap to select videos" : "Drag and drop your clips here"}
          </p>
          <p className="text-slate-400 text-sm mb-6">All video formats accepted · No size limit · No restrictions</p>
          <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#00A3FF" }}>
            {isMobile ? "Select Videos" : "Browse Files"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.avi,.webm,.mkv,.3gp,.m4v,.wmv"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files, sport, position); e.target.value = ""; }}
          />
        </div>
        {isMobile && (
          <p className="text-slate-500 text-xs text-center mb-4">
            Works with screen recordings, game film, and all video formats. No size limits.
          </p>
        )}

        {/* ── CLIP LIST ── */}
        {files.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {files.length >= 3 ? (
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span className="text-green-400 text-xs font-bold">{files.length} clips · {fmtDuration(totalDuration)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
                    <span className="text-amber-400 text-xs font-bold">{files.length} clip{files.length !== 1 ? "s" : ""} — add at least 3 for best results</span>
                  </div>
                )}
              </div>
              {files.length < MAX_CLIPS && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold transition-colors hover:opacity-80" style={{ color: "#00A3FF" }}>
                  + Add more clips
                </button>
              )}
            </div>

            {/* AI note banner */}
            {!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
              <div className="mb-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span className="text-amber-400 text-xs font-medium">AI analysis requires a cloud upload — showing estimated play types</span>
              </div>
            )}
            <ul className="mb-8 flex flex-col gap-2">
              {files.map((file, i) => {
                const cls = clipClassifications[i];
                const isClassifying = classifyingSet.has(i);
                const badgeColor = cls ? playTypeBadgeColor(cls.playType) : "#64748b";
                const qs = cls?.qualityScore ?? 0;
                const qsColor = qs >= 80 ? "#FBBF24" : qs >= 60 ? "#00A3FF" : "#64748b";
                return (
                <li key={`${i}-${file.name}-${file.size}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {/* Thumbnail */}
                  <div className="shrink-0 rounded-lg overflow-hidden flex items-center justify-center relative"
                    style={{ width: 64, height: 40, background: "rgba(0,163,255,0.08)", border: "1px solid rgba(0,163,255,0.2)", flexShrink: 0 }}>
                    {clipMeta[i]?.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={clipMeta[i].thumbnail!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#00A3FF]"><VideoIcon /></span>
                    )}
                    {/* Quality score overlay */}
                    {cls && (
                      <div className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: qsColor + "CC", border: `1px solid ${qsColor}`, fontSize: 7, fontWeight: 900, color: qs >= 80 ? "#000" : "#fff" }}>
                        {qs}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm text-white font-medium truncate" title={file.name}>
                      {file.name.length > 28 ? file.name.substring(0, 25) + "…" : file.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500">{fmtFileSize(file.size)}</span>
                      {clipMeta[i] && (
                        <>
                          <span className="text-slate-700 text-xs">·</span>
                          <span className="text-xs text-slate-400">
                            {(!isFinite(clipMeta[i].duration) || isNaN(clipMeta[i].duration) || clipMeta[i].duration === 0)
                              ? <span className="animate-pulse">Calculating…</span>
                              : fmtDuration(clipMeta[i].duration)}
                          </span>
                        </>
                      )}
                      {!clipMeta[i] && <span className="text-[10px] text-slate-500 animate-pulse">Loading…</span>}
                    </div>
                    {/* Upload status */}
                    {cloudinaryConfigured && (() => {
                      const status = clipUploadStatus[i];
                      const progress = clipUploadProgress[i] ?? 0;
                      if (status === "uploading") return (
                        <div className="mt-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <svg className="animate-spin" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00A3FF" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            <span className="text-[10px] text-blue-400">Uploading to cloud... {progress}%</span>
                          </div>
                          <div className="h-0.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                      if (status === "done") return (
                        <div className="flex items-center gap-1 mt-1">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span className="text-[10px] text-green-400 font-semibold">Ready</span>
                        </div>
                      );
                      if (status === "error") return (
                        <button type="button" onClick={() => retryUpload(i)}
                          className="flex items-center gap-1 mt-1 cursor-pointer hover:opacity-80">
                          <span className="text-[10px] text-red-400 font-semibold">Upload failed — tap to retry</span>
                        </button>
                      );
                      return null;
                    })()}

                  {/* Play type badge row */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {isClassifying && (
                        <span className="flex items-center gap-1 text-[9px] text-slate-500">
                          <svg className="animate-spin" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          Analyzing…
                        </span>
                      )}
                      {cls && !isClassifying && (
                        <>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                            style={{ background: badgeColor + "22", color: badgeColor, border: `1px solid ${badgeColor}44` }}>
                            {cls.playType}
                          </span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                            style={cls.classifiedBy === "google-ai"
                              ? { background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }
                              : { background: "rgba(251,191,36,0.10)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.2)" }}>
                            {cls.classifiedBy === "google-ai" ? "AI" : "EST"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Reclassify + Remove */}
                  <div className="flex items-center gap-1 shrink-0">
                    {sport && position && !isClassifying && (
                      <button type="button"
                        title="Reclassify with AI"
                        onClick={() => {
                          if (!clipMeta[i]) return;
                          setClassifyingSet(prev => { const n = new Set(prev); n.add(i); return n; });
                          classifyClipViaApi(clipMeta[i].blobUrl || "", clipMeta[i].duration || 0, sport, position, i).then(result => {
                            setClipClassifications(prev => { const next = [...prev]; next[i] = result; return next; });
                            setClassifyingSet(prev => { const n = new Set(prev); n.delete(i); return n; });
                          });
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-[#00A3FF] transition-colors"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      </button>
                    )}
                    <button type="button" onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-white transition-colors shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5"
                      aria-label={`Remove ${file.name}`}>
                      <XIcon />
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          </>
        )}

        {/* ── FORM FIELDS ── */}
        <div className="flex flex-col gap-5 mb-8">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name <span className="text-red-400">*</span></label>
              <input type="text" className={inputClass} placeholder="Marcus" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Last Name <span className="text-red-400">*</span></label>
              <input type="text" className={inputClass} placeholder="Johnson" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          {/* Jersey row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Jersey Number <span className="text-red-400">*</span></label>
              <input type="number" min={0} max={99} className={inputClass} placeholder="0–99" value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} />
            </div>
            <div>
              <JerseyColorInput
                value={jerseyColor}
                onChange={safeSetJerseyColor}
                label="Jersey Color"
                required
              />
            </div>
          </div>

          {/* Sport */}
          <div>
            <label className={labelClass}>Sport <span className="text-red-400">*</span></label>
            <select className={inputClass} value={sport} onChange={e => handleSportChange(e.target.value)} style={{ appearance: "none" }}>
              <option value="" disabled hidden>Select a sport</option>
              {Object.entries(SPORTS_CONFIG).map(([name, cfg]) => (
                <option key={name} value={name}>{cfg.icon} {name}</option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className={labelClass}>Position <span className="text-red-400">*</span></label>
            <select className={inputClass} value={position} onChange={e => setPosition(e.target.value)}
              disabled={!sport} style={{ appearance: "none", opacity: sport ? 1 : 0.5 }}>
              <option value="" disabled hidden>{sport ? "Select a position" : "Select a sport first"}</option>
              {(SPORTS_CONFIG[sport]?.positions ?? []).map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* School */}
          <div>
            <label className={labelClass}>School <span className="text-red-400">*</span></label>
            <input type="text" className={inputClass} placeholder="e.g. St. Mark's School of Texas" value={school} onChange={e => setSchool(e.target.value)} />
          </div>

          {/* Grad Year + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Graduation Year <span className="text-red-400">*</span></label>
              <select className={inputClass} value={gradYear} onChange={e => setGradYear(e.target.value)} style={{ appearance: "none" }}>
                <option value="" disabled hidden>Select year</option>
                {GRAD_YEARS.map(y => <option key={y} value={y}>Class of {y}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Email <span className="text-red-400">*</span></label>
              <input type="email" className={inputClass} placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Readiness indicator */}
        {canContinue && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <CheckIcon />
            <span className="text-green-400 text-sm font-semibold">All set! Ready to build your reel.</span>
          </div>
        )}

        {!canContinue && (
          <p className="text-slate-500 text-xs text-center mb-3">
            {files.length === 0 ? "Add at least one clip to continue"
              : anyUploading ? "Please wait — your clips are still uploading"
              : anyUploadError ? "Some clips failed to upload — tap 'Upload failed — tap to retry' on each"
              : !sport ? "Select a sport to continue"
              : !position ? "Select a position to continue"
              : "Fill out all required fields to continue"}
          </p>
        )}

        {/* ── CONTINUE BUTTON ── */}
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="w-full py-4 rounded-xl font-bold text-base text-white transition-all"
          style={canContinue ? {
            background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
            boxShadow: "0 0 28px rgba(0,120,255,0.3)",
            cursor: "pointer",
          } : {
            background: "rgba(255,255,255,0.06)",
            color: "#64748b",
            cursor: "not-allowed",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          Continue to Customize →
        </button>

        <p className="text-center text-slate-600 text-xs mt-4">
          Clips are securely uploaded to the cloud for processing and AI detection.
        </p>
      </main>

    </div>
  );
}
