"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReel, type MusicId, type StyleId } from "../providers";

// ── Icons ──────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);

const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MusicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const VolumeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const ZapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const FilmStripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="17" y1="7" x2="22" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
  </svg>
);

// ── Data ───────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize", number: 2 },
  { label: "Export", number: 3 },
];

// Clips are normalized to this shape so drag-reorder works for both
// real File objects (from upload) and the placeholder fallbacks.
type ClipItem = { key: string; name: string; file: File | null };

const DEFAULT_CLIP_ITEMS: ClipItem[] = [
  { key: "d1", name: "fastbreak_dunk.mp4",       file: null },
  { key: "d2", name: "defensive_stop.mov",        file: null },
  { key: "d3", name: "halftime_highlights.mp4",   file: null },
  { key: "d4", name: "three_pointer_buzzer.mov",  file: null },
  { key: "d5", name: "game_winner.mp4",           file: null },
];

const MUSIC: { id: MusicId; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "none",      label: "No Music",  desc: "Let your plays speak for themselves",    icon: <VolumeOffIcon /> },
  { id: "hype",      label: "Hype",      desc: "High-energy beats for standout moments", icon: <ZapIcon /> },
  { id: "energetic", label: "Energetic", desc: "Fast-paced, keeps coaches watching",     icon: <MusicIcon /> },
  { id: "cinematic", label: "Cinematic", desc: "Dramatic, orchestral feel",              icon: <MusicIcon /> },
];

const STYLES: { id: StyleId; label: string; gradient: string; accent: string }[] = [
  { id: "electric", label: "Electric", gradient: "linear-gradient(135deg,#0055EE,#00A3FF)", accent: "#00A3FF" },
  { id: "fire",     label: "Fire",     gradient: "linear-gradient(135deg,#C2410C,#FB923C)", accent: "#FB923C" },
  { id: "gold",     label: "Gold",     gradient: "linear-gradient(135deg,#92400E,#FBBF24)", accent: "#FBBF24" },
  { id: "stealth",  label: "Stealth",  gradient: "linear-gradient(135deg,#1E293B,#64748B)", accent: "#94A3B8" },
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
                    completed
                      ? { background: "#00A3FF", borderColor: "#00A3FF", color: "#050A14" }
                      : isActive
                      ? { background: "#00A3FF", borderColor: "#00A3FF", color: "#050A14" }
                      : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                  }
                >
                  {completed ? <CheckIcon /> : step.number}
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
                  className="flex-1 h-px mx-2 mb-5 transition-all"
                  style={{
                    background: completed
                      ? "rgba(0,163,255,0.5)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-1">{label}</p>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0"
      style={{ background: on ? "#00A3FF" : "rgba(255,255,255,0.1)" }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: on ? "translateX(22px)" : "translateX(4px)" }}
      />
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const router = useRouter();
  const reel   = useReel();

  // Clip order — initialized from context files if present, else show placeholders
  const [orderedClips, setOrderedClips] = useState<ClipItem[]>(() =>
    reel.files.length > 0
      ? reel.files.map((f, i) => ({ key: `${i}:${f.name}`, name: f.name, file: f }))
      : DEFAULT_CLIP_ITEMS
  );

  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOver(i);
    if (dragIdx.current === null || dragIdx.current === i) return;
    setOrderedClips(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(i, 0, moved);
      dragIdx.current = i;
      return next;
    });
  };
  const onDragEnd = () => { dragIdx.current = null; setDragOver(null); };

  // Initialized from context so going back preserves choices
  const [showIntro, setShowIntro] = useState(reel.showIntro);
  const [music, setMusic]         = useState<MusicId>(reel.music);
  const [style, setStyle]         = useState<StyleId>(reel.style);

  const activeStyle = STYLES.find(s => s.id === style)!;

  const handleContinue = () => {
    // Only save reordered real files back to context; placeholder clips are ignored
    const reorderedFiles = orderedClips
      .map(c => c.file)
      .filter((f): f is File => f !== null);

    reel.update({
      files: reorderedFiles.length > 0 ? reorderedFiles : reel.files,
      showIntro,
      music,
      style,
    });
    router.push("/export");
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/upload")}
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
      <ProgressBar active={2} />

      {/* ── MAIN ── */}
      <main className="max-w-3xl mx-auto px-6 pb-16">

        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">Customize Your Reel</h1>
          <p className="text-slate-400 text-sm">Make it yours. Every choice is optional.</p>
        </div>

        {/* ── SECTION 1: Clip Order ── */}
        <section className="mb-10">
          <SectionHeader label="01 — Clip Order" title="Drag to Reorder Your Clips" />
          <p className="text-slate-400 text-xs mb-4">
            The first clip plays first in your reel. Drag the handle to rearrange.
          </p>
          <ul className="flex flex-col gap-2">
            {orderedClips.map((clip, i) => (
              <li
                key={clip.key}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDragEnd={onDragEnd}
                className="flex items-center gap-3 px-4 py-3 rounded-xl select-none transition-all"
                style={{
                  background: dragOver === i ? "rgba(0,163,255,0.08)" : "#0A1628",
                  border: dragOver === i
                    ? "1px solid rgba(0,163,255,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  cursor: "grab",
                }}
              >
                <span className="text-slate-600 hover:text-slate-400 transition-colors">
                  <GripIcon />
                </span>
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
                  style={{ background: "rgba(0,163,255,0.15)", color: "#00A3FF" }}
                >
                  {i + 1}
                </span>
                <span className="text-slate-500 shrink-0"><FilmStripIcon /></span>
                <span className="text-sm text-white truncate">{clip.name}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── SECTION 2: Intro Card ── */}
        <section className="mb-10">
          <div className="flex items-start justify-between mb-4">
            <SectionHeader label="02 — Intro Card" title="Show Athlete Introduction" />
            <div className="flex items-center gap-3 mt-1 shrink-0">
              <span className="text-xs text-slate-400">{showIntro ? "On" : "Off"}</span>
              <Toggle on={showIntro} onChange={setShowIntro} />
            </div>
          </div>

          {/* Live preview — reflects real athlete data and selected style */}
          <div
            className="rounded-xl overflow-hidden transition-all duration-300"
            style={{ opacity: showIntro ? 1 : 0.35, filter: showIntro ? "none" : "grayscale(0.6)" }}
          >
            <div
              className="relative flex flex-col items-center justify-center text-center px-8 py-10"
              style={{
                background: "linear-gradient(160deg, #0A1628 0%, #070E1E 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.75rem",
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
                style={{ background: activeStyle.gradient }}
              />

              <p className="text-xs font-black tracking-widest mb-6" style={{ color: activeStyle.accent, opacity: 0.5 }}>
                CLIPT
              </p>

              <p className="text-2xl font-black tracking-wide text-white mb-1">
                {reel.firstName ? reel.firstName.toUpperCase() : "YOUR NAME"}
              </p>
              <p className="text-slate-400 text-sm mb-4">
                <span style={{ color: activeStyle.accent }}>
                  #{reel.jerseyNumber || "—"}
                </span>
                {" · "}
                {reel.sport || "Sport"}
              </p>
              <div className="w-10 h-px mb-4" style={{ background: activeStyle.accent }} />
              <p className="text-slate-500 text-xs tracking-widest uppercase">
                {reel.school || "Your School"}
              </p>

              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
                style={{ background: activeStyle.gradient }}
              />
            </div>
          </div>
          {!showIntro && (
            <p className="text-xs text-slate-500 mt-3 text-center">
              Your reel will start directly with your first clip.
            </p>
          )}
        </section>

        {/* ── SECTION 3: Music ── */}
        <section className="mb-10">
          <SectionHeader label="03 — Music" title="Choose Background Music" />
          <div className="grid grid-cols-2 gap-3">
            {MUSIC.map((track) => {
              const selected = music === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setMusic(track.id)}
                  className="text-left px-4 py-4 rounded-xl transition-all"
                  style={{
                    background: selected ? "rgba(0,163,255,0.1)" : "#0A1628",
                    border: selected
                      ? "1px solid rgba(0,163,255,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ color: selected ? "#00A3FF" : "#64748b" }}>
                      {track.icon}
                    </span>
                    <span className="text-sm font-bold" style={{ color: selected ? "#fff" : "#94a3b8" }}>
                      {track.label}
                    </span>
                    {selected && (
                      <span
                        className="ml-auto w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "#00A3FF" }}
                      >
                        <CheckIcon />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{track.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 4: Reel Style ── */}
        <section className="mb-10">
          <SectionHeader label="04 — Reel Style" title="Choose a Color Theme" />
          <p className="text-slate-400 text-xs mb-4">
            Sets the accent color on your intro card, lower-thirds, and end card.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {STYLES.map((s) => {
              const selected = style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 transition-all"
                  style={{
                    background: "#0A1628",
                    border: selected
                      ? `1px solid ${s.accent}`
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-full h-10 rounded-lg"
                    style={{ background: s.gradient }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: selected ? "#fff" : "#64748b" }}
                  >
                    {s.label}
                  </span>
                  {selected && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: s.accent }}
                    >
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── CONTINUE BUTTON ── */}
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ background: "#00A3FF", cursor: "pointer" }}
        >
          Continue to Step 3 →
        </button>
      </main>
    </div>
  );
}
