"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReel, type MusicId, type StyleId, type Quality } from "../providers";

// ── Icons ──────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);

const CheckSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CheckMd = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
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

const XTwitterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// ── Label maps ─────────────────────────────────────────────────────────────

const MUSIC_LABELS: Record<MusicId, string> = {
  none: "No Music", hype: "Hype", energetic: "Energetic", cinematic: "Cinematic",
};

const STYLE_LABELS: Record<StyleId, string> = {
  electric: "Electric", fire: "Fire", gold: "Gold", stealth: "Stealth",
};

const QUALITY_SIZES: Record<Quality, string> = {
  "720p": "80 MB", "1080p": "180 MB", "4k": "420 MB",
};

const QUALITY_DISPLAY: Record<Quality, string> = {
  "720p": "720p", "1080p": "HD", "4k": "4K Ultra",
};

// ── Data ───────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

const QUALITY_OPTIONS: { id: Quality; label: string; sub: string; size: string; badge?: string }[] = [
  { id: "720p",  label: "720p",     sub: "Standard",    size: "~80 MB"  },
  { id: "1080p", label: "1080p HD", sub: "Recommended", size: "~180 MB", badge: "Best" },
  { id: "4k",    label: "4K Ultra", sub: "Max quality", size: "~420 MB" },
];

const SHARE_OPTIONS = [
  { label: "Twitter / X",  icon: <XTwitterIcon />,  color: "#1d9bf0" },
  { label: "Instagram",    icon: <InstagramIcon />,  color: "#e1306c" },
  { label: "Text Message", icon: <MessageIcon />,    color: "#34d399" },
];

// ── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({ active }: { active: number }) {
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
                      ? { background: "#00A3FF", borderColor: "#00A3FF", color: "#050A14" }
                      : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                  }
                >
                  {completed ? <CheckSm /> : step.number}
                </div>
                <span
                  className="text-xs font-semibold whitespace-nowrap"
                  style={{ color: completed || isActive ? "#00A3FF" : "#64748b" }}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-px mx-2 mb-5 transition-all duration-500"
                  style={{ background: completed ? "rgba(0,163,255,0.5)" : "rgba(255,255,255,0.08)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-1">{label}</p>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  );
}

// ── Reel Thumbnail ─────────────────────────────────────────────────────────

function ReelThumbnail({
  overlay,
  done,
  clipBadge,
  athleteName,
  athleteSub,
}: {
  overlay?: React.ReactNode;
  done?: boolean;
  clipBadge: string;
  athleteName: string;
  athleteSub: string;
}) {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ aspectRatio: "16/9", background: "#060C1A" }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,163,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Center glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(0,70,200,0.12) 0%, transparent 70%)",
        }}
      />

      {/* CLIPT watermark */}
      <span
        className="absolute top-3 right-4 text-[10px] font-black tracking-widest select-none"
        style={{ color: "#00A3FF", opacity: 0.3 }}
      >
        CLIPT
      </span>

      {/* Top-left badge */}
      <div className="absolute top-3 left-3">
        {done ? (
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold"
            style={{ background: "rgba(0,163,255,0.9)", color: "#fff" }}
          >
            <CheckSm /> READY
          </span>
        ) : !overlay ? (
          <span
            className="px-2 py-1 rounded-md text-[10px] font-semibold"
            style={{ background: "rgba(0,0,0,0.55)", color: "#94a3b8" }}
          >
            {clipBadge}
          </span>
        ) : null}
      </div>

      {/* Duration badge */}
      {!overlay && (
        <span
          className="absolute bottom-12 right-3 px-2 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: "rgba(0,0,0,0.7)", color: "#94a3b8" }}
        >
          2:34
        </span>
      )}

      {/* Play button */}
      {!overlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{
              background: "rgba(0,163,255,0.9)",
              boxShadow: "0 0 40px rgba(0,163,255,0.35)",
            }}
          >
            <PlayIcon />
          </div>
        </div>
      )}

      {/* Bottom athlete overlay */}
      {!overlay && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pt-8 pb-3"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)",
          }}
        >
          <p className="text-white font-black text-sm tracking-wide leading-none mb-0.5">
            {athleteName}
          </p>
          <p className="text-slate-400 text-xs">{athleteSub}</p>
        </div>
      )}

      {/* Processing overlay */}
      {overlay && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "rgba(5,10,20,0.82)", backdropFilter: "blur(6px)" }}
        >
          {overlay}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type Phase = "idle" | "generating" | "done";

export default function ExportPage() {
  const router = useRouter();
  const { files, firstName, jerseyNumber, sport, school, music, style, quality, showIntro, update } = useReel();

  const [phase, setPhase]       = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState("Analyzing your clips...");
  const [copied, setCopied]     = useState(false);

  // Process steps are built dynamically in handleGenerate so they reflect
  // the user's actual music, style, and quality choices at generation time.
  const processStepsRef = useRef<{ at: number; text: string }[]>([]);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const copyTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current)    clearInterval(intervalRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Drive the progress animation
  useEffect(() => {
    if (phase !== "generating") return;

    let current = 0;

    intervalRef.current = setInterval(() => {
      current += 1.4;
      const clamped = Math.min(current, 100);

      let text = processStepsRef.current[0]?.text ?? "";
      for (const s of processStepsRef.current) {
        if (current >= s.at) text = s.text;
      }

      setProgress(clamped);
      setStepText(text);

      if (current >= 100) {
        clearInterval(intervalRef.current!);
        setTimeout(() => setPhase("done"), 500);
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const handleGenerate = () => {
    // Build step labels from the user's actual choices
    processStepsRef.current = [
      { at: 0,  text: "Analyzing your clips..." },
      { at: 17, text: "Detecting key moments..." },
      { at: 34, text: `Applying ${STYLE_LABELS[style]} theme...` },
      { at: 52, text: `Mixing ${MUSIC_LABELS[music]} audio...` },
      { at: 68, text: `Rendering in ${quality === "4k" ? "4K Ultra" : quality}...` },
      { at: 86, text: "Finalizing your reel..." },
    ];
    setProgress(0);
    setStepText(processStepsRef.current[0].text);
    setPhase("generating");
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(`https://clipt.app/reel/${shareSlug}`);
    } catch {
      // no-op in non-secure contexts
    }
    setCopied(true);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Derived display values
  const clipCount   = files.length > 0 ? files.length : 5;
  const athleteName = firstName ? firstName.toUpperCase() : "ATHLETE";
  const athleteSub  = `#${jerseyNumber || "—"} · ${sport || "Sport"} · ${school || "Your School"}`;
  const clipBadge   = `${clipCount} clip${clipCount !== 1 ? "s" : ""} · ${MUSIC_LABELS[music]} · ${STYLE_LABELS[style]}`;
  const shareSlug   = firstName
    ? `${firstName.toLowerCase()}-${jerseyNumber || "00"}`
    : "athlete-00";

  const progressActive = phase === "done" ? 4 : 3;

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <button
          onClick={() => phase !== "generating" && router.push("/customize")}
          disabled={phase === "generating"}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Go back"
        >
          <ArrowLeftIcon />
        </button>
        <span className="text-2xl font-black tracking-widest" style={{ color: "#00A3FF" }}>
          CLIPT
        </span>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <ProgressBar active={progressActive} />

      {/* ── MAIN ── */}
      <main className="max-w-3xl mx-auto px-6 pb-16">

        {/* Page title */}
        <div className="mb-8">
          {phase === "idle" && (
            <>
              <h1 className="text-3xl font-black text-white mb-2">Export Your Reel</h1>
              <p className="text-slate-400 text-sm">
                Choose your export quality, then generate your highlight reel.
              </p>
            </>
          )}
          {phase === "generating" && (
            <>
              <h1 className="text-3xl font-black text-white mb-2">Building Your Reel...</h1>
              <p className="text-slate-400 text-sm">
                AI is crafting your highlight reel. This takes about 30 seconds.
              </p>
            </>
          )}
          {phase === "done" && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#00A3FF" }}
                >
                  <CheckMd />
                </div>
                <h1 className="text-3xl font-black text-white">Your Reel is Ready</h1>
              </div>
              <p className="text-slate-400 text-sm">
                Download your reel or share the link directly with coaches.
              </p>
            </>
          )}
        </div>

        {/* ── THUMBNAIL ── */}
        <div className="mb-6">
          <ReelThumbnail
            done={phase === "done"}
            clipBadge={clipBadge}
            athleteName={athleteName}
            athleteSub={athleteSub}
            overlay={
              phase === "generating" ? (
                <div className="flex flex-col items-center gap-5 px-8 w-full max-w-xs text-center">
                  <div
                    className="w-10 h-10 rounded-full border-2 animate-spin"
                    style={{
                      borderColor: "rgba(0,163,255,0.2)",
                      borderTopColor: "#00A3FF",
                    }}
                  />
                  <p className="text-white text-sm font-semibold leading-snug">{stepText}</p>
                  <p className="text-5xl font-black leading-none" style={{ color: "#00A3FF" }}>
                    {Math.floor(progress)}%
                  </p>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #0055EE, #00A3FF)",
                      }}
                    />
                  </div>
                  <p className="text-slate-500 text-xs">Don&apos;t close this tab</p>
                </div>
              ) : undefined
            }
          />
        </div>

        {/* ── REEL META (idle only) ── */}
        {phase === "idle" && (
          <div
            className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl mb-8 text-xs text-slate-400"
            style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span>{clipCount} {clipCount === 1 ? "clip" : "clips"}</span>
            <span className="w-px h-3 bg-slate-700" />
            <span>{MUSIC_LABELS[music]} music</span>
            <span className="w-px h-3 bg-slate-700" />
            <span>{STYLE_LABELS[style]} style</span>
            <span className="w-px h-3 bg-slate-700" />
            <span>Intro card {showIntro ? "on" : "off"}</span>
            <span className="w-px h-3 bg-slate-700" />
            <span>~2:34 duration</span>
          </div>
        )}

        {/* ── QUALITY SELECTOR (idle only) ── */}
        {phase === "idle" && (
          <section className="mb-8">
            <SectionHeader label="Export Quality" title="Choose Your Quality" />
            <div className="grid grid-cols-3 gap-3">
              {QUALITY_OPTIONS.map((opt) => {
                const sel = quality === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update({ quality: opt.id })}
                    className="text-left p-4 rounded-xl transition-all"
                    style={{
                      background: sel ? "rgba(0,163,255,0.1)" : "#0A1628",
                      border: sel
                        ? "1px solid rgba(0,163,255,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-1 gap-1">
                      <span
                        className="text-sm font-bold leading-none"
                        style={{ color: sel ? "#fff" : "#94a3b8" }}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ background: "rgba(0,163,255,0.2)", color: "#00A3FF" }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{opt.sub}</p>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: sel ? "#00A3FF" : "#334155" }}
                    >
                      {opt.size}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── GENERATE BUTTON (idle only) ── */}
        {phase === "idle" && (
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full py-4 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: "#00A3FF" }}
          >
            Generate My Reel →
          </button>
        )}

        {/* ── DONE STATE ── */}
        {phase === "done" && (
          <div className="flex flex-col gap-4">

            {/* Download */}
            <button
              type="button"
              className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: "#00A3FF" }}
            >
              <DownloadIcon />
              Download {QUALITY_DISPLAY[quality]} · {QUALITY_SIZES[quality]}
            </button>

            {/* Share link */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Share Link</p>
              <div className="flex gap-2">
                <div
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-400 truncate"
                  style={{
                    background: "#0A1628",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  clipt.app/reel/{shareSlug}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all"
                  style={
                    copied
                      ? {
                          background: "rgba(0,163,255,0.12)",
                          color: "#00A3FF",
                          border: "1px solid rgba(0,163,255,0.4)",
                        }
                      : {
                          background: "#0A1628",
                          color: "#94a3b8",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }
                  }
                >
                  {copied ? <CheckSm /> : <CopyIcon />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Share to */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Share to</p>
              <div className="grid grid-cols-3 gap-3">
                {SHARE_OPTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className="flex flex-col items-center gap-2.5 py-4 rounded-xl transition-all hover:border-white/20"
                    style={{
                      background: "#0A1628",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <span className="text-xs text-slate-400 font-medium leading-none">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px mt-2" style={{ background: "rgba(255,255,255,0.06)" }} />

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
      </main>
    </div>
  );
}
