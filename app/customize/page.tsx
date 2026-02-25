"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type { MusicStyle, ColorAccent, IntroStyle, FontStyle } from "../providers";

// ── Icons ──────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);

const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="5"  r="1.2" fill="currentColor" />
    <circle cx="9"  cy="12" r="1.2" fill="currentColor" />
    <circle cx="9"  cy="19" r="1.2" fill="currentColor" />
    <circle cx="15" cy="5"  r="1.2" fill="currentColor" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" />
    <circle cx="15" cy="19" r="1.2" fill="currentColor" />
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Static data ────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

const POSITIONS = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
  "Quarterback",
  "Running Back",
  "Wide Receiver",
  "Linebacker",
  "Cornerback",
  "Safety",
  "Kicker",
];

type MusicOption = { id: MusicStyle; label: string; desc: string };
const MUSIC_OPTIONS: MusicOption[] = [
  { id: "Hype",       label: "Hype",       desc: "High energy beats"             },
  { id: "Cinematic",  label: "Cinematic",  desc: "Dramatic, epic feel"           },
  { id: "Trap",       label: "Trap",       desc: "Hard-hitting trap beats"       },
  { id: "Drill",      label: "Drill",      desc: "Gritty, intense drill"         },
  { id: "Orchestral", label: "Orchestral", desc: "Grand orchestral sound"        },
  { id: "NoMusic",    label: "No Music",   desc: "Let your plays speak"          },
];

type ColorOption = { id: ColorAccent; hex: string };
const COLOR_OPTIONS: ColorOption[] = [
  { id: "Electric Blue", hex: "#00A3FF" },
  { id: "Red",           hex: "#EF4444" },
  { id: "Gold",          hex: "#FBBF24" },
  { id: "Green",         hex: "#22C55E" },
  { id: "Purple",        hex: "#A855F7" },
  { id: "White",         hex: "#F1F5F9" },
];

type IntroOption = { id: IntroStyle; desc: string };
const INTRO_OPTIONS: IntroOption[] = [
  { id: "Name + School", desc: "Classic athlete intro"    },
  { id: "Stats Card",    desc: "Highlight your key stats" },
  { id: "Hype Intro",    desc: "High-energy opening"      },
];

const FONT_STYLES: FontStyle[] = ["Modern", "Bold", "Clean", "Athletic"];

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ active }: { active: number }) {
  return (
    <div className="max-w-5xl mx-auto px-6 mb-10">
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
                  style={{ background: completed ? "rgba(0,163,255,0.45)" : "rgba(255,255,255,0.08)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-[#00A3FF] text-[10px] font-black tracking-widest uppercase mb-1">
      {text}
    </p>
  );
}

const cardBase: React.CSSProperties = {
  background: "#0A1628",
  border: "1px solid rgba(255,255,255,0.08)",
};

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-[#050A14] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A3FF]/60 transition-all";

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const router = useRouter();
  const reel   = useReel();

  // Clip names: prefer live File objects, fall back to localStorage-persisted names
  const initialNames =
    reel.files.length > 0
      ? reel.files.map((f) => f.name)
      : reel.clipNames;

  const [clipNames, setClipNames] = useState<string[]>(initialNames);

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = (i: number) => {
    dragIdx.current = i;
  };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOver(i);
    if (dragIdx.current === null || dragIdx.current === i) return;
    setClipNames((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(i, 0, moved);
      dragIdx.current = i;
      return next;
    });
  };
  const onDragEnd = () => {
    dragIdx.current = null;
    setDragOver(null);
  };

  // ── Customization state (initialized from context / localStorage) ─────────
  const [firstName,   setFirstName]   = useState(reel.firstName);
  const [position,    setPosition]    = useState(reel.position);
  const [musicStyle,  setMusicStyle]  = useState<MusicStyle>(reel.musicStyle);
  const [colorAccent, setColorAccent] = useState<ColorAccent>(reel.colorAccent);
  const [reelLength,  setReelLength]  = useState(reel.reelLength);
  const [introStyle,  setIntroStyle]  = useState<IntroStyle>(reel.introStyle);
  const [fontStyle,   setFontStyle]   = useState<FontStyle>(reel.fontStyle);

  const handleGenerate = () => {
    reel.update({ firstName, position, musicStyle, colorAccent, reelLength, introStyle, fontStyle });
    router.push("/export");
  };

  // Slider fill percentage
  const sliderPct = ((reelLength - 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/upload")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6"
          aria-label="Back to upload"
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
      <main className="max-w-5xl mx-auto px-6 pb-16">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Customize Your Reel</h1>
          <p className="text-slate-400 text-sm">Set up every detail before we generate your highlight reel.</p>
        </div>

        {/* ── TWO-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 mb-6">

          {/* ── LEFT PANEL: Clip Order ── */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl p-5" style={cardBase}>
              <SectionLabel text="Clip Order" />
              <h2 className="text-base font-bold text-white mb-1">Your Clips</h2>
              <p className="text-slate-500 text-xs mb-4">Drag the handle to reorder</p>

              {clipNames.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm mb-3">No clips found.</p>
                  <button
                    onClick={() => router.push("/upload")}
                    className="text-[#00A3FF] text-xs font-semibold hover:underline"
                  >
                    ← Go back to upload
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {clipNames.map((name, i) => (
                    <li
                      key={`${i}:${name}`}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={(e) => onDragOver(e, i)}
                      onDragEnd={onDragEnd}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl select-none transition-all"
                      style={{
                        background: dragOver === i ? "rgba(0,163,255,0.08)" : "rgba(255,255,255,0.03)",
                        border: dragOver === i
                          ? "1px solid rgba(0,163,255,0.4)"
                          : "1px solid rgba(255,255,255,0.06)",
                        cursor: "grab",
                      }}
                    >
                      <span className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
                        <GripIcon />
                      </span>
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{ background: "rgba(0,163,255,0.15)", color: "#00A3FF" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs text-slate-300 truncate">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* ── RIGHT PANEL: Customization Options ── */}
          <div className="flex flex-col gap-5">

            {/* 01 — Title Card */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="01 — Title Card" />
              <h2 className="text-base font-bold text-white mb-5">Athlete Info</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Position</label>
                  <div className="relative">
                    <select
                      className={inputClass}
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      style={{ appearance: "none", paddingRight: "2.5rem" }}
                    >
                      <option value="" disabled hidden>Select your position</option>
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▼</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 02 — Music Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="02 — Music Style" />
              <h2 className="text-base font-bold text-white mb-5">Background Music</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MUSIC_OPTIONS.map((opt) => {
                  const selected = musicStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMusicStyle(opt.id)}
                      className="text-left px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: selected ? "rgba(0,163,255,0.12)" : "rgba(255,255,255,0.03)",
                        border: selected
                          ? "1px solid rgba(0,163,255,0.55)"
                          : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <p className="text-sm font-bold mb-1" style={{ color: selected ? "#00A3FF" : "#e2e8f0" }}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 03 — Color Accent */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="03 — Color Accent" />
              <h2 className="text-base font-bold text-white mb-5">Choose a Color</h2>
              <div className="flex flex-wrap gap-5">
                {COLOR_OPTIONS.map((opt) => {
                  const selected = colorAccent === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setColorAccent(opt.id)}
                      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
                      title={opt.id}
                    >
                      <div
                        className="w-10 h-10 rounded-full transition-all"
                        style={{
                          background: opt.hex,
                          border: selected
                            ? "3px solid rgba(255,255,255,0.95)"
                            : "3px solid rgba(255,255,255,0.12)",
                          boxShadow: selected ? `0 0 0 2px ${opt.hex}60` : "none",
                        }}
                      />
                      <span
                        className="text-[10px] font-semibold whitespace-nowrap"
                        style={{ color: selected ? "#fff" : "#64748b" }}
                      >
                        {opt.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 04 — Reel Length */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <SectionLabel text="04 — Reel Length" />
                  <h2 className="text-base font-bold text-white">Duration</h2>
                </div>
                <span className="text-3xl font-black tabular-nums" style={{ color: "#00A3FF" }}>
                  {reelLength}<span className="text-base font-semibold text-slate-400 ml-0.5">m</span>
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={reelLength}
                onChange={(e) => setReelLength(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00A3FF ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%)`,
                  accentColor: "#00A3FF",
                }}
              />
              <div className="flex justify-between mt-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="text-xs font-semibold"
                    style={{ color: reelLength === n ? "#00A3FF" : "#475569" }}
                  >
                    {n}m
                  </span>
                ))}
              </div>
            </section>

            {/* 05 — Intro Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="05 — Intro Style" />
              <h2 className="text-base font-bold text-white mb-5">Opening Sequence</h2>
              <div className="grid grid-cols-3 gap-3">
                {INTRO_OPTIONS.map((opt) => {
                  const selected = introStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setIntroStyle(opt.id)}
                      className="text-center px-3 py-4 rounded-xl transition-all"
                      style={{
                        background: selected ? "rgba(0,163,255,0.12)" : "rgba(255,255,255,0.03)",
                        border: selected
                          ? "1px solid rgba(0,163,255,0.55)"
                          : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <p
                        className="text-sm font-bold mb-1.5 leading-snug"
                        style={{ color: selected ? "#00A3FF" : "#e2e8f0" }}
                      >
                        {opt.id}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 06 — Font Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="06 — Font Style" />
              <h2 className="text-base font-bold text-white mb-5">Typography</h2>
              <div className="relative">
                <select
                  className={inputClass}
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                  style={{ appearance: "none", paddingRight: "2.5rem" }}
                >
                  {FONT_STYLES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▼</span>
              </div>
            </section>
          </div>
        </div>

        {/* ── GENERATE BUTTON ── */}
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full py-4 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ background: "#00A3FF", cursor: "pointer" }}
        >
          Generate My Reel →
        </button>
      </main>
    </div>
  );
}
