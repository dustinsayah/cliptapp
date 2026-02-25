"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type { ColorAccent, FontStyle } from "../providers";

// ── Canvas config ────────────────────────────────────────────────────────────
const CW = 1280;
const CH = 720;
const TITLE_MS = 3000; // 3-second title card

// ── Accent hex lookup ────────────────────────────────────────────────────────
const COLOR_MAP: Record<ColorAccent, string> = {
  "Electric Blue": "#00A3FF",
  "Red":           "#EF4444",
  "Gold":          "#FBBF24",
  "Green":         "#22C55E",
  "Purple":        "#A855F7",
  "White":         "#F1F5F9",
};

// ── Canvas font lookup ───────────────────────────────────────────────────────
const CANVAS_FONT_MAP: Record<FontStyle, string> = {
  Modern:   "Inter",
  Bold:     "Oswald",
  Clean:    "Poppins",
  Athletic: "Bebas Neue",
};

// ── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

// ── Icons ────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckSmIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CheckMdIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ── Canvas helpers ────────────────────────────────────────────────────────────

/** Stamp the CLIPT watermark in the bottom-right corner */
function stamp(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillStyle = "rgba(0,163,255,0.72)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("CLIPT", CW - 18, CH - 14);
  ctx.restore();
}

interface TitleInfo {
  firstName:    string;
  jerseyNumber: string;
  sport:        string;
  school:       string;
  position:     string;
  fontFamily:   string;  // actual family name e.g. "Inter", "Oswald"
}

/** Draw one frame of the title card onto the canvas */
function drawTitleFrame(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string) {
  const ff      = info.fontFamily || "Arial";
  const ffStack = `"${ff}", Arial, sans-serif`;

  // Background
  ctx.fillStyle = "#050A14";
  ctx.fillRect(0, 0, CW, CH);

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= CW; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  }
  for (let y = 0; y <= CH; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }

  // Center radial glow
  const grd = ctx.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, 380);
  grd.addColorStop(0, accent + "28");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, CW, CH);

  // Accent bar above name
  ctx.fillStyle = accent;
  ctx.fillRect(CW / 2 - 44, CH / 2 - 96, 88, 3);

  // Athlete name — use selected font, Bebas Neue is weight 400 only
  const nameWeight = ff === "Bebas Neue" ? "" : "bold ";
  ctx.save();
  ctx.font          = `${nameWeight}78px ${ffStack}`;
  ctx.fillStyle     = "#FFFFFF";
  ctx.textAlign     = "center";
  ctx.textBaseline  = "alphabetic";
  ctx.letterSpacing = ff === "Bebas Neue" ? "4px" : "2px";
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), CW / 2, CH / 2 - 10);
  ctx.restore();

  // Position line (accent color)
  ctx.save();
  ctx.font          = `bold 22px ${ffStack}`;
  ctx.fillStyle     = accent;
  ctx.textAlign     = "center";
  ctx.textBaseline  = "alphabetic";
  ctx.letterSpacing = "4px";
  const posLine = [
    info.sport    || null,
    info.position || null,
  ].filter(Boolean).join(" · ");
  ctx.fillText((posLine || "ATHLETE").toUpperCase(), CW / 2, CH / 2 + 46);
  ctx.restore();

  // Jersey + School
  ctx.save();
  ctx.font          = "500 17px Arial, sans-serif";
  ctx.fillStyle     = "#94a3b8";
  ctx.textAlign     = "center";
  ctx.textBaseline  = "alphabetic";
  ctx.letterSpacing = "2px";
  const metaLine = [
    info.jerseyNumber ? `#${info.jerseyNumber}` : null,
    info.school       || null,
  ].filter(Boolean).join("  ·  ");
  if (metaLine) ctx.fillText(metaLine.toUpperCase(), CW / 2, CH / 2 + 84);
  ctx.restore();

  stamp(ctx);
}

/** Animate the title card for TITLE_MS milliseconds */
function runTitleCard(
  ctx: CanvasRenderingContext2D,
  info: TitleInfo,
  accent: string,
  isAborted: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      if (isAborted() || now - t0 >= TITLE_MS) { resolve(); return; }
      drawTitleFrame(ctx, info, accent);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Play one video clip on the canvas frame-by-frame */
function runClip(
  file: File,
  ctx: CanvasRenderingContext2D,
  isAborted: () => boolean,
  onClipPct: (p: number) => void,
): Promise<void> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.src = url;
    vid.muted = true;
    vid.playsInline = true;

    let raf = 0;

    const cleanup = () => {
      cancelAnimationFrame(raf);
      URL.revokeObjectURL(url);
    };

    const tick = () => {
      if (isAborted() || vid.ended) {
        cleanup();
        resolve();
        return;
      }
      ctx.drawImage(vid, 0, 0, CW, CH);
      stamp(ctx);
      if (vid.duration > 0) onClipPct(vid.currentTime / vid.duration);
      raf = requestAnimationFrame(tick);
    };

    vid.onloadedmetadata = () => {
      vid.play().then(() => {
        raf = requestAnimationFrame(tick);
      }).catch(() => {
        cleanup();
        reject(new Error("Processing failed — try uploading smaller clips"));
      });
    };

    vid.onended = () => { cleanup(); resolve(); };
    vid.onerror = () => {
      cleanup();
      reject(new Error("Processing failed — try uploading smaller clips"));
    };
  });
}

/** Build and return the rendered reel as a Blob */
async function buildReel(
  files: File[],
  info: TitleInfo,
  accent: string,
  isAborted: () => boolean,
  onProgress: (pct: number, text: string) => void,
): Promise<Blob> {
  if (!("MediaRecorder" in window)) {
    throw new Error("Processing failed — try uploading smaller clips");
  }

  const canvas = document.createElement("canvas");
  canvas.width  = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Processing failed — try uploading smaller clips");

  // Pick the best supported MIME type
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  const mime = candidates.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime) throw new Error("Processing failed — try uploading smaller clips");

  const stream   = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  try {
    // Phase 1 — title card: 0–10%
    onProgress(0, "Loading fonts...");
    if (info.fontFamily && info.fontFamily !== "Arial") {
      try {
        await document.fonts.load(`bold 78px "${info.fontFamily}"`);
        await document.fonts.load(`78px "${info.fontFamily}"`);
      } catch { /* fallback to Arial */ }
    }
    onProgress(2, "Drawing title card...");
    await runTitleCard(ctx, info, accent, isAborted);

    // Phase 2 — clips: 10–90%
    for (let i = 0; i < files.length; i++) {
      if (isAborted()) break;
      const base  = 10 + (i / files.length) * 80;
      const range = 80 / files.length;
      onProgress(base, `Processing clip ${i + 1} of ${files.length}...`);
      await runClip(files[i], ctx, isAborted, (p) => {
        onProgress(base + p * range, `Processing clip ${i + 1} of ${files.length}...`);
      });
    }

    // Phase 3 — end card: 90–95%
    if (!isAborted()) {
      onProgress(90, "Finalizing your reel...");
      ctx.fillStyle = "#050A14";
      ctx.fillRect(0, 0, CW, CH);
      stamp(ctx);
      await new Promise<void>((r) => setTimeout(r, 500));
      onProgress(95, "Encoding...");
    }
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
  }

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      if (!chunks.length) {
        reject(new Error("Processing failed — try uploading smaller clips"));
        return;
      }
      resolve(new Blob(chunks, { type: mime }));
    };
    recorder.onerror = () => reject(new Error("Processing failed — try uploading smaller clips"));
  });
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ active, accent }: { active: number; accent: string }) {
  return (
    <div className="max-w-3xl mx-auto px-6 mb-10">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const completed = step.number < active;
          const isActive  = step.number === active;
          const isLast    = i === STEPS.length - 1;
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all"
                  style={
                    completed || isActive
                      ? { background: accent, borderColor: accent, color: "#050A14" }
                      : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                  }
                >
                  {completed ? <CheckSmIcon /> : step.number}
                </div>
                <span
                  className="text-xs font-semibold whitespace-nowrap"
                  style={{ color: completed || isActive ? accent : "#64748b" }}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-px mx-2 mb-5 transition-all duration-500"
                  style={{ background: completed ? `${accent}70` : "rgba(255,255,255,0.08)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Phase = "idle" | "processing" | "done" | "error";

const cardBase: React.CSSProperties = {
  background: "#0A1628",
  border: "1px solid rgba(255,255,255,0.08)",
};

export default function ExportPage() {
  const router = useRouter();
  const reel   = useReel();

  const accentHex = COLOR_MAP[reel.colorAccent] ?? "#00A3FF";

  const [phase,    setPhase]    = useState<Phase>("idle");
  const [pct,      setPct]      = useState(0);
  const [stepText, setStepText] = useState("");
  const [errMsg,   setErrMsg]   = useState("");
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null);
  const [blobMime, setBlobMime] = useState("video/webm");
  const [copied,   setCopied]   = useState(false);

  const abortedRef   = useRef(false);
  const blobRef      = useRef<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Revoke blob URL and cancel any timers on unmount
  useEffect(() => {
    return () => {
      abortedRef.current = true;
      if (blobRef.current)      URL.revokeObjectURL(blobRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (reel.files.length === 0) {
      setErrMsg("No clips found — please go back and upload your clips first.");
      setPhase("error");
      return;
    }

    abortedRef.current = false;
    setPhase("processing");
    setPct(0);
    setStepText("Starting...");

    const accent     = COLOR_MAP[reel.colorAccent] ?? "#00A3FF";
    const fontFamily = CANVAS_FONT_MAP[reel.fontStyle] ?? "Arial";
    const info: TitleInfo = {
      firstName:    reel.firstName,
      jerseyNumber: reel.jerseyNumber,
      sport:        reel.sport,
      school:       reel.school,
      position:     reel.position,
      fontFamily,
    };

    try {
      const blob = await buildReel(
        reel.files,
        info,
        accent,
        () => abortedRef.current,
        (p, t) => { setPct(p); setStepText(t); },
      );

      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      setBlobUrl(url);
      setBlobMime(blob.type);
      setPct(100);
      setTimeout(() => setPhase("done"), 400);
    } catch (err) {
      if (abortedRef.current) { setPhase("idle"); return; }
      const msg = err instanceof Error ? err.message : "";
      setErrMsg(
        msg.includes("Processing failed")
          ? msg
          : "Processing failed — try uploading smaller clips",
      );
      setPhase("error");
    }
  };

  /** Render the title card to an off-screen canvas and download as PNG */
  const handleDownloadTitlePNG = async () => {
    const canvas = document.createElement("canvas");
    canvas.width  = CW;
    canvas.height = CH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontFamily = CANVAS_FONT_MAP[reel.fontStyle] ?? "Arial";
    if (fontFamily !== "Arial") {
      try {
        await document.fonts.load(`bold 78px "${fontFamily}"`);
        await document.fonts.load(`78px "${fontFamily}"`);
      } catch { /* fallback */ }
    }

    const accent = accentHex;
    const info: TitleInfo = {
      firstName:    reel.firstName,
      jerseyNumber: reel.jerseyNumber,
      sport:        reel.sport,
      school:       reel.school,
      position:     reel.position,
      fontFamily,
    };

    drawTitleFrame(ctx, info, accent);

    const png  = canvas.toDataURL("image/png");
    const a    = document.createElement("a");
    a.href     = png;
    a.download = `${(reel.firstName || "clipt").toLowerCase().replace(/\s+/g, "-")}-title-card.png`;
    a.click();
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const ext  = blobMime.includes("mp4") ? "mp4" : "webm";
    const name = `${(reel.firstName || "reel").toLowerCase().replace(/\s+/g, "-")}-clipt.${ext}`;
    const a    = document.createElement("a");
    a.href     = blobUrl;
    a.download = name;
    a.click();
  };

  const shareSlug = `${reel.firstName || "athlete"}-${reel.jerseyNumber || "00"}`
    .toLowerCase()
    .replace(/\s+/g, "-");

  const handleCopy = () => {
    navigator.clipboard
      .writeText(`https://clipt.app/reel/${shareSlug}`)
      .catch(() => {});
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const progressActive  = phase === "done" ? 4 : 3;
  const athleteNameDisp = (reel.firstName || "Athlete").toUpperCase();
  const athleteSub      = [
    reel.jerseyNumber ? `#${reel.jerseyNumber}` : null,
    reel.sport  || null,
    reel.school || null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <button
          onClick={() => phase !== "processing" && router.push("/customize")}
          disabled={phase === "processing"}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Back to customize"
        >
          <ArrowLeftIcon />
        </button>
        <span className="text-2xl font-black tracking-widest" style={{ color: accentHex }}>
          CLIPT
        </span>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <ProgressBar active={progressActive} accent={accentHex} />

      {/* ── MAIN ── */}
      <main className="max-w-3xl mx-auto px-6 pb-16">

        {/* ── HEADING ── */}
        <div className="mb-8">
          {phase === "idle" && (
            <>
              <h1 className="text-3xl font-black text-white mb-2">Export Your Reel</h1>
              <p className="text-slate-400 text-sm">
                Review your settings, then generate your downloadable highlight reel.
              </p>
            </>
          )}
          {phase === "processing" && (
            <>
              <h1 className="text-3xl font-black text-white mb-2">Building Your Reel…</h1>
              <p className="text-slate-400 text-sm">
                Stitching your clips together in your browser. Don&apos;t close this tab.
              </p>
            </>
          )}
          {phase === "done" && (
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: accentHex }}
              >
                <CheckMdIcon />
              </div>
              <h1 className="text-3xl font-black text-white">Your Reel is Ready</h1>
            </div>
          )}
          {phase === "error" && (
            <h1 className="text-3xl font-black text-white mb-2">Export Failed</h1>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            IDLE STATE
        ══════════════════════════════════════════════════════════ */}
        {phase === "idle" && (
          <div className="flex flex-col gap-5">

            {/* Athlete summary card */}
            <div className="rounded-2xl p-6" style={cardBase}>
              <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: accentHex }}>
                Reel Summary
              </p>
              <p className="text-white font-black text-xl mb-1">{athleteNameDisp}</p>
              <p className="text-slate-400 text-sm mb-4">{athleteSub}</p>

              <div
                className="h-px mb-4"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Clips",    value: `${reel.files.length} video${reel.files.length !== 1 ? "s" : ""}` },
                  { label: "Music",    value: reel.musicStyle },
                  { label: "Color",    value: reel.colorAccent },
                  { label: "Duration", value: `${reel.reelLength} min` },
                  { label: "Intro",    value: reel.introStyle },
                  { label: "Font",     value: reel.fontStyle },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-slate-500 text-xs mb-0.5">{label}</p>
                    <p className="text-white text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning if no files */}
            {reel.files.length === 0 && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                <span className="shrink-0 text-[#EF4444]">⚠</span>
                <p className="text-sm text-[#EF4444]">
                  No clips loaded. Go back and upload your clips first.
                </p>
              </div>
            )}

            {/* Download title card PNG */}
            <button
              type="button"
              onClick={handleDownloadTitlePNG}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
              style={{
                background: `${accentHex}15`,
                color:       accentHex,
                border:      `1px solid ${accentHex}40`,
              }}
            >
              <DownloadIcon />
              Preview Title Card as PNG
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.99]"
              style={{
                background: accentHex,
                color:      reel.colorAccent === "White" ? "#050A14" : "#ffffff",
              }}
            >
              Generate My Reel →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            PROCESSING STATE
        ══════════════════════════════════════════════════════════ */}
        {phase === "processing" && (
          <div className="flex flex-col items-center gap-6">

            {/* Spinner */}
            <div
              className="w-14 h-14 rounded-full border-2 animate-spin mt-4"
              style={{
                borderColor:    `${accentHex}18`,
                borderTopColor: accentHex,
              }}
            />

            {/* Percentage */}
            <p
              className="text-6xl font-black tabular-nums leading-none"
              style={{ color: accentHex }}
            >
              {Math.floor(pct)}%
            </p>

            {/* Step label */}
            <p className="text-white text-sm font-semibold">{stepText}</p>

            {/* Progress bar */}
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width:      `${pct}%`,
                  background: accentHex,
                }}
              />
            </div>

            {/* Hint */}
            <p className="text-slate-500 text-xs">Processing in your browser — please don&apos;t close this tab</p>

            {/* What's happening */}
            <div
              className="w-full rounded-xl px-5 py-4 text-xs text-slate-400 leading-relaxed"
              style={cardBase}
            >
              <span className="font-semibold" style={{ color: accentHex }}>How it works: </span>
              Your clips are being stitched together using the Canvas API directly in your browser.
              A title card with your name and sport is drawn first, then each clip is rendered
              frame-by-frame, and a CLIPT watermark is stamped on every frame.
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            DONE STATE
        ══════════════════════════════════════════════════════════ */}
        {phase === "done" && (
          <div className="flex flex-col gap-4">

            {/* Done banner */}
            <div
              className="rounded-2xl px-6 py-5 flex items-center gap-4"
              style={{
                background: `${accentHex}12`,
                border:     `1px solid ${accentHex}45`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${accentHex}25` }}
              >
                <CheckMdIcon />
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-0.5">Reel complete!</p>
                <p className="text-slate-400 text-xs">
                  Rendered at 1280×720 · 30 fps · {blobMime.includes("mp4") ? "MP4" : "WebM"}
                </p>
              </div>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.99]"
              style={{
                background: accentHex,
                color:      reel.colorAccent === "White" ? "#050A14" : "#ffffff",
              }}
            >
              <DownloadIcon />
              Download Highlight Reel
            </button>

            {/* Share link */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Share Link</p>
              <div className="flex gap-2">
                <div
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-400 truncate select-all"
                  style={cardBase}
                >
                  clipt.app/reel/{shareSlug}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all"
                  style={
                    copied
                      ? { background: `${accentHex}15`, color: accentHex, border: `1px solid ${accentHex}55` }
                      : { background: "#0A1628", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {copied ? <CheckSmIcon /> : <CopyIcon />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

            {/* Start over */}
            <button
              type="button"
              onClick={() => router.push("/upload")}
              className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors text-center py-1"
            >
              Create a new reel →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            ERROR STATE
        ══════════════════════════════════════════════════════════ */}
        {phase === "error" && (
          <div className="flex flex-col gap-5">

            {/* Error card */}
            <div
              className="rounded-2xl px-6 py-6 flex flex-col gap-3"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <AlertIcon />
                <p className="text-[#EF4444] font-bold text-sm">
                  {errMsg || "Processing failed — try uploading smaller clips"}
                </p>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed pl-9">
                This can happen with very large video files or if your browser doesn&apos;t
                support the required APIs. Try splitting large files into shorter clips.
              </p>
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={() => { setPhase("idle"); setErrMsg(""); }}
              className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.99]"
              style={{
                background: accentHex,
                color:      reel.colorAccent === "White" ? "#050A14" : "#ffffff",
              }}
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() => router.push("/customize")}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:border-white/20"
              style={{ background: "#0A1628", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              ← Back to Customize
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
