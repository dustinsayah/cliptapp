"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import { SPORTS_CONFIG } from "../../lib/sportsConfig";

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

const FilmIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A3FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const steps = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize", number: 2 },
  { label: "Export", number: 3 },
];

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-[#0A1628] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A3FF]/60 transition-all";

const labelClass = "block text-sm font-semibold text-white mb-2";

const MAX_CLIPS = 50;

function fmtFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function getVideoExt(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext;
}

// ── Onboarding tooltip ────────────────────────────────────────────────────────

function UploadTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="tooltip-in relative mt-3 rounded-xl p-4 flex items-start gap-3"
      style={{
        background: "#0A1628",
        border: "1px solid rgba(0,163,255,0.4)",
        boxShadow: "0 4px 24px rgba(0,163,255,0.12)",
      }}
    >
      {/* Arrow pointing up to the drop zone */}
      <div
        style={{
          position: "absolute",
          top: -8,
          left: 32,
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: "8px solid rgba(0,163,255,0.4)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -6,
          left: 34,
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: "6px solid #0A1628",
        }}
      />
      <span style={{ fontSize: 20 }}>💡</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold mb-0.5">Upload up to 50 clips</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          Drag-and-drop or browse. Add your best plays — coaches want variety. MP4, MOV, AVI, and WebM all work.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
        style={{ background: "#00A3FF", color: "#050A14" }}
      >
        Got it
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();
  const reel = useReel();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from context so going back from step 2 restores the form
  const [files, setFiles]               = useState<File[]>(reel.files);
  const [dragging, setDragging]         = useState(false);
  const [firstName, setFirstName]       = useState(reel.firstName || "");
  const [jerseyNumber, setJerseyNumber] = useState(reel.jerseyNumber || "");
  const [sport, setSport]               = useState(reel.sport || "");
  const [position, setPosition]         = useState(reel.position || "");
  const [school, setSchool]             = useState(reel.school || "");
  const [thumbnails, setThumbnails]     = useState<(string | null)[]>([]);
  const [showUploadTip, setShowUploadTip] = useState(false);

  // Reset position when sport changes
  const handleSportChange = (newSport: string) => {
    setSport(newSport);
    setPosition("");
  };

  // Show upload tip only on first visit (before customize-page onboard is done)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("clipt_onboard_done");
    if (!done) setShowUploadTip(true);
  }, []);

  // Generate thumbnails when files change
  useEffect(() => {
    if (files.length === 0) {
      setThumbnails([]);
      return;
    }

    // Initialize with nulls
    setThumbnails(new Array(files.length).fill(null));

    const objectUrls: string[] = [];
    let cancelled = false;

    files.forEach((file, i) => {
      // Only attempt for common browser-supported formats
      const ext = getVideoExt(file);
      const supported = ["mp4", "webm", "mov", "m4v", "ogg", "ogv"].includes(ext) ||
        file.type.startsWith("video/mp4") ||
        file.type.startsWith("video/webm") ||
        file.type.startsWith("video/ogg");

      if (!supported) return;

      const objectUrl = URL.createObjectURL(file);
      objectUrls.push(objectUrl);

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.crossOrigin = "anonymous";

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1.5, video.duration * 0.12);
      };

      video.onseeked = () => {
        if (cancelled) { URL.revokeObjectURL(objectUrl); return; }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 120;
          canvas.height = 68;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.fillStyle = "#0A1628";
          ctx.fillRect(0, 0, 120, 68);
          ctx.drawImage(video, 0, 0, 120, 68);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
          if (!cancelled) {
            setThumbnails((prev) => {
              const next = [...prev];
              next[i] = dataUrl;
              return next;
            });
          }
        } catch {
          // CORS or format error — ignore, show generic icon
        }
        URL.revokeObjectURL(objectUrl);
      };

      video.onerror = () => URL.revokeObjectURL(objectUrl);
      video.src = objectUrl;
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch { /* ignore */ }
      });
    };
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(
      (f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|avi|mkv|webm|avi)$/i.test(f.name)
    );
    setFiles((prev) => {
      const combined = [...prev, ...valid];
      return combined.slice(0, MAX_CLIPS);
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setThumbnails((prev) => prev.filter((_, i) => i !== index));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // All fields and at least one clip required to continue
  const canContinue =
    files.length > 0 &&
    firstName.trim() !== "" &&
    jerseyNumber.trim() !== "" &&
    sport !== "" &&
    position !== "" &&
    school.trim() !== "";

  const handleContinue = () => {
    reel.update({
      files,
      firstName: firstName.trim(),
      jerseyNumber: jerseyNumber.trim(),
      sport,
      position,
      school: school.trim(),
    });
    localStorage.setItem("clipSource", "manual");
    // Store blob URLs so the export page can access clips after navigation
    try {
      const blobUrls = files.map((f) => URL.createObjectURL(f));
      localStorage.setItem("clipt_blob_urls", JSON.stringify(blobUrls));
      localStorage.setItem("clipt_blob_count", String(files.length));
    } catch {}
    router.push("/customize");
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/start")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6"
          aria-label="Go back"
        >
          <ArrowLeftIcon />
        </button>
        <span className="text-2xl font-black tracking-widest" style={{ color: "#00A3FF" }}>
          CLIPT
        </span>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <div className="max-w-3xl mx-auto px-6 mb-10">
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const isActive   = step.number === 1;
            const isComplete = step.number < 1;
            const isLast     = i === steps.length - 1;
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all"
                    style={
                      isActive || isComplete
                        ? { background: "#00A3FF", borderColor: "#00A3FF", color: "#050A14" }
                        : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                    }
                  >
                    {isComplete ? <CheckIcon /> : step.number}
                  </div>
                  <span
                    className="text-xs font-semibold whitespace-nowrap"
                    style={{ color: isActive || isComplete ? "#00A3FF" : "#64748b" }}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className="flex-1 h-px mx-2 mb-5"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-3xl mx-auto px-6 pb-12">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Upload Your Clips</h1>
          <p className="text-slate-400 text-sm">
            Add up to {MAX_CLIPS} clips you want in your reel. MP4, MOV, AVI, WebM supported.
          </p>
        </div>

        {/* ── UPLOAD ZONE ── */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="rounded-xl p-10 flex flex-col items-center text-center transition-all cursor-pointer mb-3"
          style={{
            background: "#0A1628",
            border: `2px dashed ${dragging ? "#00A3FF" : "rgba(0,163,255,0.45)"}`,
            boxShadow: dragging ? "0 0 32px rgba(0,163,255,0.15)" : "none",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="mb-5">
            <FilmIcon />
          </div>
          <p className="text-white font-bold text-lg mb-2">
            Drag and drop your clips here
          </p>
          <p className="text-slate-400 text-sm mb-6">
            MP4 · MOV · AVI · WebM · No size limit
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: "#00A3FF" }}
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              // Reset input so the same file can be re-added after removal
              e.target.value = "";
            }}
          />
        </div>

        {/* Onboarding tip — step 1 */}
        {showUploadTip && (
          <UploadTip onDismiss={() => setShowUploadTip(false)} />
        )}

        {/* File list with thumbnails */}
        {files.length > 0 && (
          <ul className="mb-8 flex flex-col gap-2 mt-4">
            {files.map((file, i) => (
              <li
                key={`${i}-${file.name}-${file.size}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: "#0A1628",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Thumbnail or icon */}
                <div
                  className="shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{
                    width: 56, height: 40,
                    background: "rgba(0,163,255,0.08)",
                    border: "1px solid rgba(0,163,255,0.2)",
                  }}
                >
                  {thumbnails[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnails[i]!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#00A3FF]"><VideoIcon /></span>
                  )}
                </div>

                <div className="flex flex-col min-w-0 mr-auto">
                  <span className="text-sm text-white truncate font-medium">{file.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{fmtFileSize(file.size)}</span>
                    <span className="text-slate-700 text-xs">·</span>
                    <span className="text-xs text-slate-600 uppercase">{getVideoExt(file) || "video"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-white transition-colors shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5"
                  aria-label={`Remove ${file.name}`}
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Clip count badge */}
        {files.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-400 text-sm">
              <span className="text-white font-bold">{files.length}</span> clip{files.length !== 1 ? "s" : ""} added
              {files.length >= MAX_CLIPS && (
                <span className="text-amber-400 ml-2">(max {MAX_CLIPS})</span>
              )}
            </p>
            {files.length < MAX_CLIPS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold transition-colors hover:opacity-80"
                style={{ color: "#00A3FF" }}
              >
                + Add more clips
              </button>
            )}
          </div>
        )}

        {/* ── FORM FIELDS ── */}
        <div className="flex flex-col gap-5 mb-8">
          {/* First Name */}
          <div>
            <label className={labelClass}>First Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Marcus"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* Jersey Number */}
          <div>
            <label className={labelClass}>Jersey Number</label>
            <input
              type="number"
              min={0}
              max={99}
              className={inputClass}
              placeholder="0–99"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
            />
          </div>

          {/* Sport */}
          <div>
            <label className={labelClass}>Sport</label>
            <select
              className={inputClass}
              value={sport}
              onChange={(e) => handleSportChange(e.target.value)}
              style={{ appearance: "none" }}
            >
              <option value="" disabled hidden>
                Select a sport
              </option>
              {Object.entries(SPORTS_CONFIG).map(([name, cfg]) => (
                <option key={name} value={name}>{cfg.icon} {name}</option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className={labelClass}>Position</label>
            <select
              className={inputClass}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={!sport}
              style={{ appearance: "none", opacity: sport ? 1 : 0.5 }}
            >
              <option value="" disabled hidden>
                {sport ? "Select a position" : "Select a sport first"}
              </option>
              {(SPORTS_CONFIG[sport]?.positions ?? []).map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* School */}
          <div>
            <label className={labelClass}>School</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. St. Mark's School of Texas"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </div>
        </div>

        {/* Helper text when button is disabled */}
        {!canContinue && (
          <p className="text-slate-500 text-xs text-center mb-3">
            {files.length === 0
              ? "Add at least one clip to continue"
              : !sport
              ? "Select a sport to continue"
              : !position
              ? "Select a position to continue"
              : "Fill out all fields above to continue"}
          </p>
        )}

        {/* ── CONTINUE BUTTON ── */}
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="w-full py-4 rounded-xl font-bold text-base text-white transition-all"
          style={
            canContinue
              ? {
                  background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
                  boxShadow: "0 0 28px rgba(0,120,255,0.3)",
                  cursor: "pointer",
                }
              : {
                  background: "rgba(255,255,255,0.06)",
                  color: "#64748b",
                  cursor: "not-allowed",
                  border: "1px solid rgba(255,255,255,0.08)",
                }
          }
        >
          Continue to Customize →
        </button>
      </main>
    </div>
  );
}
