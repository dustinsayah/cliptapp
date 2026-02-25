"use client";

import { useState, useRef, useEffect } from "react";
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

const PlayIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);

// ── Static data ────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

const BASKETBALL_POSITIONS = [
  "Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center",
];

const FOOTBALL_POSITIONS = [
  "Quarterback", "Running Back", "Wide Receiver", "Tight End",
  "Linebacker", "Cornerback", "Safety", "Defensive End", "Kicker",
];

type MusicOption = { id: MusicStyle; label: string; desc: string; url?: string };
const MUSIC_OPTIONS: MusicOption[] = [
  { id: "Hype",       label: "Hype",       desc: "High energy beats",      url: "https://assets.mixkit.co/music/370/370.mp3" },
  { id: "Cinematic",  label: "Cinematic",  desc: "Dramatic, epic feel",    url: "https://assets.mixkit.co/music/614/614.mp3" },
  { id: "Trap",       label: "Trap",       desc: "Hard-hitting trap beats", url: "https://assets.mixkit.co/music/267/267.mp3" },
  { id: "Drill",      label: "Drill",      desc: "Gritty, intense drill",  url: "https://assets.mixkit.co/music/400/400.mp3" },
  { id: "Orchestral", label: "Orchestral", desc: "Grand orchestral sound", url: "https://assets.mixkit.co/music/188/188.mp3" },
  { id: "NoMusic",    label: "No Music",   desc: "Let your plays speak",   url: undefined },
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

const FONT_MAP: Record<FontStyle, string> = {
  Modern:   "var(--font-inter), Inter, sans-serif",
  Bold:     "var(--font-oswald), Oswald, sans-serif",
  Clean:    "var(--font-poppins), Poppins, sans-serif",
  Athletic: "var(--font-bebas), 'Bebas Neue', sans-serif",
};

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ active, accent }: { active: number; accent: string }) {
  return (
    <div className="max-w-6xl mx-auto px-6 mb-10">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const completed = step.number < active;
          const isActive  = step.number === active;
          const isLast    = i === STEPS.length - 1;
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300"
                  style={
                    completed || isActive
                      ? { background: accent, borderColor: accent, color: "#050A14" }
                      : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                  }
                >
                  {completed ? <CheckIcon /> : step.number}
                </div>
                <span
                  className="text-xs font-semibold whitespace-nowrap transition-colors duration-300"
                  style={{ color: completed || isActive ? accent : "#64748b" }}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-px mx-2 mb-5 transition-all duration-300"
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

function SectionLabel({ text, accent }: { text: string; accent: string }) {
  return (
    <p
      className="text-[10px] font-black tracking-widest uppercase mb-1 transition-colors duration-300"
      style={{ color: accent }}
    >
      {text}
    </p>
  );
}

const cardBase: React.CSSProperties = {
  background: "#0A1628",
  border: "1px solid rgba(255,255,255,0.08)",
};

// ── Title Card Preview ─────────────────────────────────────────────────────

function TitleCardPreview({
  firstName,
  position,
  school,
  jerseyNumber,
  fontStyle,
  accentHex,
}: {
  firstName:    string;
  position:     string;
  school:       string;
  jerseyNumber: string;
  fontStyle:    FontStyle;
  accentHex:    string;
}) {
  const font        = FONT_MAP[fontStyle];
  const nameDisplay = (firstName || "ATHLETE").toUpperCase();
  const posDisplay  = (position  || "YOUR POSITION").toUpperCase();
  const meta        = [
    jerseyNumber ? `#${jerseyNumber}` : null,
    school       || null,
  ].filter(Boolean).join("  ·  ");

  // Bebas Neue only has weight 400
  const nameWeight = fontStyle === "Athletic" ? 400 : 700;

  return (
    <div
      className="rounded-xl overflow-hidden relative w-full"
      style={{
        background:  "#050A14",
        border:      `1px solid ${accentHex}40`,
        aspectRatio: "16 / 9",
        transition:  "border-color 0.3s",
      }}
    >
      {/* Grid overlay */}
      <div
        style={{
          position:        "absolute",
          inset:           0,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px),
                            repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px)`,
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position:   "absolute",
          inset:      0,
          background: `radial-gradient(ellipse at 50% 50%, ${accentHex}22 0%, transparent 68%)`,
          transition: "background 0.3s",
        }}
      />

      {/* Content */}
      <div
        style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "8px",
          textAlign:      "center",
          gap:            0,
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width:        36,
            height:       2,
            background:   accentHex,
            borderRadius: 1,
            marginBottom: 7,
            transition:   "background 0.3s",
          }}
        />

        {/* Athlete name */}
        <div
          style={{
            fontFamily:    font,
            fontSize:      "20px",
            fontWeight:    nameWeight,
            color:         "#FFFFFF",
            letterSpacing: fontStyle === "Athletic" ? "0.06em" : "0.03em",
            lineHeight:    1,
            transition:    "all 0.2s",
          }}
        >
          {nameDisplay}
        </div>

        {/* Position */}
        <div
          style={{
            fontFamily:    font,
            fontSize:      "8px",
            fontWeight:    600,
            color:         accentHex,
            letterSpacing: "0.22em",
            marginTop:     6,
            transition:    "all 0.2s",
          }}
        >
          {posDisplay}
        </div>

        {/* School / jersey */}
        {meta && (
          <div
            style={{
              fontSize:      "7px",
              color:         "#94a3b8",
              letterSpacing: "0.1em",
              marginTop:     4,
              transition:    "color 0.2s",
            }}
          >
            {meta.toUpperCase()}
          </div>
        )}
      </div>

      {/* CLIPT watermark */}
      <div
        style={{
          position:      "absolute",
          bottom:        5,
          right:         8,
          fontFamily:    "'Courier New', monospace",
          fontSize:      "6px",
          fontWeight:    700,
          color:         `${accentHex}65`,
          letterSpacing: "0.18em",
          transition:    "color 0.3s",
        }}
      >
        CLIPT
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const router = useRouter();
  const reel   = useReel();

  const initialNames =
    reel.files.length > 0 ? reel.files.map((f) => f.name) : reel.clipNames;

  const [clipNames, setClipNames] = useState<string[]>(initialNames);

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
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
  const onDragEnd = () => { dragIdx.current = null; setDragOver(null); };

  // ── Sport positions ───────────────────────────────────────────────────────
  const sport     = reel.sport;
  const positions =
    sport === "Basketball" ? BASKETBALL_POSITIONS
    : sport === "Football" ? FOOTBALL_POSITIONS
    : [...BASKETBALL_POSITIONS, ...FOOTBALL_POSITIONS];

  // ── Customization state ────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState(reel.firstName);
  const [position,    setPosition]    = useState(() =>
    positions.includes(reel.position) ? reel.position : ""
  );
  const [musicStyle,  setMusicStyle]  = useState<MusicStyle>(reel.musicStyle);
  const [colorAccent, setColorAccent] = useState<ColorAccent>(reel.colorAccent);
  const [reelLength,  setReelLength]  = useState(reel.reelLength);
  const [introStyle,  setIntroStyle]  = useState<IntroStyle>(reel.introStyle);
  const [fontStyle,   setFontStyle]   = useState<FontStyle>(reel.fontStyle);

  // Derived accent color
  const accentHex = COLOR_OPTIONS.find((o) => o.id === colorAccent)?.hex ?? "#00A3FF";
  // For white accent, use dark text on the CTA button
  const btnTextColor = colorAccent === "White" ? "#050A14" : "#ffffff";

  // ── Audio preview ──────────────────────────────────────────────────────────
  const [playingMusic, setPlayingMusic] = useState<MusicStyle | null>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const playTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (playTimer.current) clearTimeout(playTimer.current);
    };
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (playTimer.current) { clearTimeout(playTimer.current); playTimer.current = null; }
    setPlayingMusic(null);
  };

  const handleMusicClick = (opt: MusicOption) => {
    // Always update selection + save immediately
    setMusicStyle(opt.id);
    reel.update({ musicStyle: opt.id });

    // Toggle: click same card while playing → stop
    if (playingMusic === opt.id) { stopAudio(); return; }

    stopAudio();
    if (!opt.url) return;

    const audio = new Audio(opt.url);
    audio.volume = 0.65;
    audioRef.current = audio;
    setPlayingMusic(opt.id);

    audio.play().catch(() => { audioRef.current = null; setPlayingMusic(null); });

    // Auto-stop after 15 s
    playTimer.current = setTimeout(() => {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingMusic(null);
    }, 15_000);

    audio.onended = () => { audioRef.current = null; setPlayingMusic(null); };
  };

  // ── Color pick (save immediately) ─────────────────────────────────────────
  const handleColorPick = (opt: ColorOption) => {
    setColorAccent(opt.id);
    reel.update({ colorAccent: opt.id });
  };

  // ── Font pick (save immediately) ──────────────────────────────────────────
  const handleFontPick = (f: FontStyle) => {
    setFontStyle(f);
    reel.update({ fontStyle: f });
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    stopAudio();
    reel.update({ firstName, position, musicStyle, colorAccent, reelLength, introStyle, fontStyle });
    router.push("/export");
  };

  const sliderPct = ((reelLength - 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-6xl mx-auto">
        <button
          onClick={() => router.push("/upload")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6"
          aria-label="Back to upload"
        >
          <ArrowLeftIcon />
        </button>
        <span
          className="text-2xl font-black tracking-widest transition-colors duration-300"
          style={{ color: accentHex }}
        >
          CLIPT
        </span>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <ProgressBar active={2} accent={accentHex} />

      {/* ── MAIN ── */}
      <main className="max-w-6xl mx-auto px-6 pb-16">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Customize Your Reel</h1>
          <p className="text-slate-400 text-sm">Set up every detail before we generate your highlight reel.</p>
        </div>

        {/* ── THREE-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_270px] gap-5 mb-6">

          {/* ── COLUMN 1: Clip Order ── */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl p-5" style={cardBase}>
              <SectionLabel text="Clip Order" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-1">Your Clips</h2>
              <p className="text-slate-500 text-xs mb-4">Drag to reorder</p>

              {clipNames.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm mb-3">No clips found.</p>
                  <button
                    onClick={() => router.push("/upload")}
                    className="text-xs font-semibold hover:underline transition-colors"
                    style={{ color: accentHex }}
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
                        background: dragOver === i ? `${accentHex}12` : "rgba(255,255,255,0.03)",
                        border:     dragOver === i ? `1px solid ${accentHex}55` : "1px solid rgba(255,255,255,0.06)",
                        cursor:     "grab",
                      }}
                    >
                      <span className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
                        <GripIcon />
                      </span>
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 transition-colors duration-300"
                        style={{ background: `${accentHex}20`, color: accentHex }}
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

          {/* ── COLUMN 2: Customization ── */}
          <div className="flex flex-col gap-5">

            {/* 01 — Title Card */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="01 — Title Card" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-5">Athlete Info</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-[#050A14] border text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    placeholder="Your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onFocus={(e)  => { e.target.style.borderColor = `${accentHex}80`; }}
                    onBlur={(e)   => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Position</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-[#050A14] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none transition-all"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      style={{ appearance: "none", paddingRight: "2.5rem" }}
                    >
                      <option value="" disabled hidden>Select your position</option>
                      {positions.map((p) => (
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
              <SectionLabel text="02 — Music Style" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-1">Background Music</h2>
              <p className="text-slate-500 text-xs mb-5">Click to hear a 15-second preview</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MUSIC_OPTIONS.map((opt) => {
                  const selected = musicStyle === opt.id;
                  const playing  = playingMusic === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleMusicClick(opt)}
                      className="text-left px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: selected ? `${accentHex}18` : "rgba(255,255,255,0.03)",
                        border:     selected ? `1px solid ${accentHex}75` : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className="text-sm font-bold transition-colors duration-200"
                          style={{ color: selected ? accentHex : "#e2e8f0" }}
                        >
                          {opt.label}
                        </p>
                        {opt.url && (
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                            style={{
                              background: playing ? accentHex : `${accentHex}28`,
                              color:      playing ? "#050A14" : accentHex,
                            }}
                          >
                            {playing ? <PauseIcon /> : <PlayIcon />}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>

                      {/* 15-second progress bar */}
                      {playing && (
                        <div
                          className="mt-2 h-px rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: accentHex,
                              width:      "100%",
                              animation:  "shrinkBar 15s linear forwards",
                            }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 03 — Color Accent */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="03 — Color Accent" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-5">Team Color</h2>
              <div className="flex flex-wrap gap-5">
                {COLOR_OPTIONS.map((opt) => {
                  const selected = colorAccent === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleColorPick(opt)}
                      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
                      title={opt.id}
                    >
                      <div
                        className="w-10 h-10 rounded-full transition-all duration-200"
                        style={{
                          background: opt.hex,
                          border:    selected ? "3px solid rgba(255,255,255,0.95)" : "3px solid rgba(255,255,255,0.12)",
                          boxShadow: selected ? `0 0 0 2px ${opt.hex}60` : "none",
                        }}
                      />
                      <span
                        className="text-[10px] font-semibold whitespace-nowrap transition-colors duration-200"
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
                  <SectionLabel text="04 — Reel Length" accent={accentHex} />
                  <h2 className="text-base font-bold text-white">Duration</h2>
                </div>
                <span
                  className="text-3xl font-black tabular-nums transition-colors duration-300"
                  style={{ color: accentHex }}
                >
                  {reelLength}<span className="text-base font-semibold text-slate-400 ml-0.5">m</span>
                </span>
              </div>
              <input
                type="range"
                min={1} max={5} step={1}
                value={reelLength}
                onChange={(e) => setReelLength(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background:  `linear-gradient(to right, ${accentHex} ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%)`,
                  accentColor: accentHex,
                }}
              />
              <div className="flex justify-between mt-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="text-xs font-semibold transition-colors duration-200"
                    style={{ color: reelLength === n ? accentHex : "#475569" }}
                  >
                    {n}m
                  </span>
                ))}
              </div>
            </section>

            {/* 05 — Intro Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="05 — Intro Style" accent={accentHex} />
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
                        background: selected ? `${accentHex}18` : "rgba(255,255,255,0.03)",
                        border:     selected ? `1px solid ${accentHex}75` : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <p
                        className="text-sm font-bold mb-1.5 leading-snug transition-colors duration-200"
                        style={{ color: selected ? accentHex : "#e2e8f0" }}
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
              <SectionLabel text="06 — Font Style" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-5">Typography</h2>
              <div className="grid grid-cols-2 gap-3">
                {FONT_STYLES.map((f) => {
                  const selected = fontStyle === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleFontPick(f)}
                      className="px-4 py-3 rounded-xl transition-all text-left"
                      style={{
                        background: selected ? `${accentHex}18` : "rgba(255,255,255,0.03)",
                        border:     selected ? `1px solid ${accentHex}75` : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: FONT_MAP[f],
                          fontSize:   "20px",
                          fontWeight: f === "Athletic" ? 400 : 700,
                          color:      selected ? accentHex : "#e2e8f0",
                          lineHeight: 1.1,
                          transition: "color 0.2s",
                          marginBottom: 4,
                        }}
                      >
                        {f}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_MAP[f],
                          fontSize:   "10px",
                          fontWeight: f === "Athletic" ? 400 : 500,
                          color:      "#64748b",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Aa Bb Cc 123
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ── COLUMN 3: Live Preview ── */}
          <aside className="lg:sticky lg:top-6 lg:self-start flex flex-col gap-4">

            {/* Title Card Preview */}
            <div
              className="rounded-2xl p-4 transition-all duration-300"
              style={{
                background: "#0A1628",
                border:     `1px solid ${accentHex}30`,
              }}
            >
              <SectionLabel text="Live Preview" accent={accentHex} />
              <h2 className="text-sm font-bold text-white mb-3">Title Card</h2>
              <TitleCardPreview
                firstName={firstName}
                position={position}
                school={reel.school}
                jerseyNumber={reel.jerseyNumber}
                fontStyle={fontStyle}
                accentHex={accentHex}
              />
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Font</span>
                  <span
                    className="text-[10px] font-semibold transition-colors duration-300"
                    style={{ color: accentHex }}
                  >
                    {fontStyle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Color</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: accentHex }}
                    />
                    <span className="text-[10px] text-slate-300">{colorAccent}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Updates</span>
                  <span className="text-[10px] text-slate-400">Real-time</span>
                </div>
              </div>
            </div>

            {/* Now playing indicator */}
            {playingMusic && (
              <div
                className="rounded-xl px-3 py-3 flex items-center gap-2.5 transition-all"
                style={{
                  background: `${accentHex}12`,
                  border:     `1px solid ${accentHex}40`,
                }}
              >
                {/* Sound bars */}
                <div className="flex gap-0.5 items-end h-4 shrink-0">
                  {[0.5, 0.8, 0.6].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full"
                      style={{
                        background: accentHex,
                        height:     `${h * 100}%`,
                        animation:  `soundBar ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate" style={{ color: accentHex }}>
                    {playingMusic}
                  </p>
                  <p className="text-[10px] text-slate-500">15s preview</p>
                </div>
                <button
                  type="button"
                  onClick={stopAudio}
                  className="text-slate-500 hover:text-white transition-colors text-xs shrink-0 w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Reel summary */}
            <div className="rounded-2xl p-4" style={cardBase}>
              <SectionLabel text="Reel Summary" accent={accentHex} />
              <div className="mt-2 flex flex-col gap-2">
                {[
                  { label: "Clips",  value: String(reel.files.length || clipNames.length) },
                  { label: "Music",  value: musicStyle },
                  { label: "Length", value: `${reelLength} min` },
                  { label: "Font",   value: fontStyle },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500">{label}</span>
                    <span className="text-[11px] font-semibold text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>

        {/* ── GENERATE BUTTON ── */}
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.99]"
          style={{
            background: accentHex,
            color:      btnTextColor,
            cursor:     "pointer",
          }}
        >
          Generate My Reel →
        </button>
      </main>

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes shrinkBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes soundBar {
          from { opacity: 0.5; transform: scaleY(0.4); }
          to   { opacity: 1;   transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}
