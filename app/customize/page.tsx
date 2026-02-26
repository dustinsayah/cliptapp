"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type { MusicStyle, ColorAccent, IntroStyle, FontStyle, TransitionStyle } from "../providers";

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
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
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

const BASKETBALL_POSITIONS = ["Point Guard","Shooting Guard","Small Forward","Power Forward","Center"];
const FOOTBALL_POSITIONS   = ["Quarterback","Running Back","Wide Receiver","Tight End","Linebacker","Cornerback","Safety","Defensive End","Kicker"];
const GRAD_YEARS           = ["2025","2026","2027","2028","2029","2030"];

// ── Music options ──────────────────────────────────────────────────────────

type MusicOption = { id: MusicStyle; label: string; desc: string; url?: string };
const MUSIC_OPTIONS: MusicOption[] = [
  { id: "NoMusic",  label: "No Music",          desc: "Coach-preferred · clean playback",   url: undefined },
  { id: "Hype",     label: "Hip Hop Game Day",   desc: "Hard-hitting game day instrumental", url: "https://assets.mixkit.co/music/370/370.mp3" },
  { id: "Cinematic",label: "Cinematic Strings",  desc: "Dramatic orchestral build",          url: "https://assets.mixkit.co/music/614/614.mp3" },
  { id: "Trap",     label: "Modern Trap",        desc: "Trap instrumental, no lyrics",       url: "https://assets.mixkit.co/music/267/267.mp3" },
  { id: "Drill",    label: "UK Drill",           desc: "Hard-hitting drill, no lyrics",      url: "https://assets.mixkit.co/music/400/400.mp3" },
  { id: "Piano",    label: "Motivational Piano", desc: "Uplifting piano, wide appeal",       url: "https://assets.mixkit.co/music/738/738.mp3" },
  { id: "LoFi",     label: "Lo-Fi Chill",        desc: "Relaxed lo-fi background beats",     url: "https://assets.mixkit.co/music/282/282.mp3" },
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

type TransitionOption = { id: TransitionStyle; desc: string; duration: string };
const TRANSITION_OPTIONS: TransitionOption[] = [
  { id: "Hard Cut",      desc: "Instant switch between clips",         duration: "0s"    },
  { id: "Fade to Black", desc: "Black canvas fade between clips",      duration: "0.5s"  },
  { id: "Crossfade",     desc: "Dissolve between clip frames",         duration: "0.4s"  },
  { id: "Flash Cut",     desc: "Quick white flash between clips",      duration: "0.2s"  },
];

type IntroOption = { id: IntroStyle; desc: string };
const INTRO_OPTIONS: IntroOption[] = [
  { id: "Name + School", desc: "Classic athlete intro"    },
  { id: "Stats Card",    desc: "Highlight your key stats" },
  { id: "Hype Intro",    desc: "High-energy opening"      },
];

const FONT_STYLES: FontStyle[] = ["Modern","Bold","Clean","Athletic"];
const FONT_MAP: Record<FontStyle, string> = {
  Modern:   "var(--font-inter), Inter, sans-serif",
  Bold:     "var(--font-oswald), Oswald, sans-serif",
  Clean:    "var(--font-poppins), Poppins, sans-serif",
  Athletic: "var(--font-bebas), 'Bebas Neue', sans-serif",
};

// ── Stats fields by sport / position ──────────────────────────────────────

interface StatField { label: string; key: string; placeholder: string }

function getStatFields(sport: string, position: string): StatField[] {
  if (sport === "Basketball") return [
    { label: "PPG",   key: "ppg",     placeholder: "18.5" },
    { label: "RPG",   key: "rpg",     placeholder: "7.2"  },
    { label: "APG",   key: "apg",     placeholder: "4.1"  },
    { label: "SPG",   key: "spg",     placeholder: "1.8"  },
    { label: "FG%",   key: "fg",      placeholder: "47%"  },
    { label: "3PT%",  key: "tpt",     placeholder: "38%"  },
    { label: "GPA",   key: "gpa_stat",placeholder: "3.8"  },
  ];
  if (position === "Quarterback") return [
    { label: "Pass Yds", key: "passyds",  placeholder: "2,847" },
    { label: "TDs",      key: "tds",      placeholder: "28"    },
    { label: "Comp%",    key: "comppct",  placeholder: "67%"   },
    { label: "Rush Yds", key: "rushyds",  placeholder: "312"   },
    { label: "GPA",      key: "gpa_stat", placeholder: "3.6"   },
  ];
  if (["Running Back","Wide Receiver","Tight End"].includes(position)) return [
    { label: "Rec Yds", key: "recyds",  placeholder: "1,204" },
    { label: "TDs",     key: "tds",     placeholder: "14"    },
    { label: "YAC",     key: "yac",     placeholder: "487"   },
    { label: "GPA",     key: "gpa_stat",placeholder: "3.5"   },
  ];
  if (["Linebacker","Cornerback","Safety","Defensive End","Kicker"].includes(position)) return [
    { label: "Tackles", key: "tackles", placeholder: "89"  },
    { label: "Sacks",   key: "sacks",   placeholder: "7.5" },
    { label: "INTs",    key: "ints",    placeholder: "3"   },
    { label: "PBUs",    key: "pbus",    placeholder: "12"  },
    { label: "GPA",     key: "gpa_stat",placeholder: "3.7" },
  ];
  return [{ label: "GPA", key: "gpa_stat", placeholder: "3.8" }];
}

// ── Clip label options ─────────────────────────────────────────────────────

function getClipLabels(sport: string): string[] {
  if (sport === "Basketball")
    return ["Layup/Dunk","Jump Shot","3-Pointer","Block","Steal","Assist","Defense","Rebound","Free Throw","Transition"];
  if (sport === "Football")
    return ["Run","Reception","Block","Tackle","Sack","Interception","Route","Kickoff","Pass","Blitz"];
  return ["Offense","Defense","Highlight","Transition","Other"];
}

// ── Diversity check ────────────────────────────────────────────────────────

function checkDiversity(labels: string[]): string | null {
  const filled = labels.filter((l) => !!l);
  if (filled.length < 3) return null;
  const counts: Record<string, number> = {};
  filled.forEach((l) => { counts[l] = (counts[l] || 0) + 1; });
  const max = Math.max(...Object.values(counts));
  if (max / filled.length > 0.6) {
    return Object.keys(counts).find((k) => counts[k] === max) ?? null;
  }
  return null;
}

// ── Duration helpers ───────────────────────────────────────────────────────

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ active, accent }: { active: number; accent: string }) {
  return (
    <div className="max-w-7xl mx-auto px-6 mb-10">
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
                  style={completed || isActive
                    ? { background: accent, borderColor: accent, color: "#050A14" }
                    : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }}
                >
                  {completed ? <CheckIcon /> : step.number}
                </div>
                <span className="text-xs font-semibold whitespace-nowrap transition-colors duration-300"
                  style={{ color: completed || isActive ? accent : "#64748b" }}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 h-px mx-2 mb-5 transition-all duration-300"
                  style={{ background: completed ? `${accent}70` : "rgba(255,255,255,0.08)" }} />
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
    <p className="text-[10px] font-black tracking-widest uppercase mb-1 transition-colors duration-300" style={{ color: accent }}>
      {text}
    </p>
  );
}

function Toggle({ on, onToggle, accent }: { on: boolean; onToggle: () => void; accent: string }) {
  return (
    <button type="button" onClick={onToggle} className="shrink-0 w-12 h-6 rounded-full transition-all relative"
      style={{ background: on ? accent : "rgba(255,255,255,0.1)" }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 shadow-sm"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );
}

const cardBase: React.CSSProperties = { background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" };

// ── Title Card Preview ─────────────────────────────────────────────────────

function TitleCardPreview({
  firstName, position, school, jerseyNumber, fontStyle, accentHex,
}: { firstName: string; position: string; school: string; jerseyNumber: string; fontStyle: FontStyle; accentHex: string }) {
  const font        = FONT_MAP[fontStyle];
  const nameDisplay = (firstName || "ATHLETE").toUpperCase();
  const posDisplay  = (position  || "YOUR POSITION").toUpperCase();
  const meta        = [jerseyNumber ? `#${jerseyNumber}` : null, school || null].filter(Boolean).join("  ·  ");
  const nameWeight  = fontStyle === "Athletic" ? 400 : 700;

  return (
    <div className="rounded-xl overflow-hidden relative w-full"
      style={{ background: "#050A14", border: `1px solid ${accentHex}40`, aspectRatio: "16 / 9", transition: "border-color 0.3s" }}>
      <div style={{ position: "absolute", inset: 0,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px),
                          repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px)` }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${accentHex}22 0%, transparent 68%)`, transition: "background 0.3s" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px", textAlign: "center" }}>
        <div style={{ width: 36, height: 2, background: accentHex, borderRadius: 1, marginBottom: 7, transition: "background 0.3s" }} />
        <div style={{ fontFamily: font, fontSize: "20px", fontWeight: nameWeight, color: "#FFF", letterSpacing: fontStyle === "Athletic" ? "0.06em" : "0.03em", lineHeight: 1, transition: "all 0.2s" }}>
          {nameDisplay}
        </div>
        <div style={{ fontFamily: font, fontSize: "8px", fontWeight: 600, color: accentHex, letterSpacing: "0.22em", marginTop: 6, transition: "all 0.2s" }}>
          {posDisplay}
        </div>
        {meta && (
          <div style={{ fontSize: "7px", color: "#94a3b8", letterSpacing: "0.1em", marginTop: 4 }}>
            {meta.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 5, right: 8, fontFamily: "'Courier New', monospace", fontSize: "6px", fontWeight: 700, color: `${accentHex}65`, letterSpacing: "0.18em" }}>
        CLIPT
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const router = useRouter();
  const reel   = useReel();

  const initialNames = reel.files.length > 0 ? reel.files.map((f) => f.name) : reel.clipNames;

  const [clipItems, setClipItems] = useState<{ name: string; label: string }[]>(() =>
    initialNames.map((n, i) => ({ name: n, label: reel.clipLabels[i] || "" }))
  );

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault(); setDragOver(i);
    if (dragIdx.current === null || dragIdx.current === i) return;
    setClipItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(i, 0, moved);
      dragIdx.current = i;
      return next;
    });
  };
  const onDragEnd = () => { dragIdx.current = null; setDragOver(null); };

  // ── Sport / positions ─────────────────────────────────────────────────────
  const sport     = reel.sport;
  const positions = sport === "Basketball" ? BASKETBALL_POSITIONS
    : sport === "Football" ? FOOTBALL_POSITIONS
    : [...BASKETBALL_POSITIONS, ...FOOTBALL_POSITIONS];

  // ── Customization state ────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState(reel.firstName);
  const [position,    setPosition]    = useState(() => positions.includes(reel.position) ? reel.position : "");
  const [gradYear,    setGradYear]    = useState(reel.gradYear);
  const [heightFt,    setHeightFt]    = useState(reel.heightFt);
  const [heightIn,    setHeightIn]    = useState(reel.heightIn);
  const [weight,      setWeight]      = useState(reel.weight);
  const [gpa,         setGpa]         = useState(reel.gpa);
  const [email,       setEmail]       = useState(reel.email);
  const [coachName,   setCoachName]   = useState(reel.coachName);
  const [coachEmail,  setCoachEmail]  = useState(reel.coachEmail);

  const [musicStyle,       setMusicStyle]       = useState<MusicStyle>(reel.musicStyle);
  const [colorAccent,      setColorAccent]      = useState<ColorAccent>(reel.colorAccent);
  const [reelLength,       setReelLength]        = useState(reel.reelLength);
  const [introStyle,       setIntroStyle]        = useState<IntroStyle>(reel.introStyle);
  const [fontStyle,        setFontStyle]         = useState<FontStyle>(reel.fontStyle);
  const [transition,       setTransition]        = useState<TransitionStyle>(reel.transition);
  const [highlightPlayer,  setHighlightPlayer]   = useState(reel.highlightPlayer);
  const [includeStatsCard, setIncludeStatsCard]  = useState(reel.includeStatsCard);
  const [statsData,        setStatsData]         = useState<Record<string, string>>(reel.statsData);

  const accentHex     = COLOR_OPTIONS.find((o) => o.id === colorAccent)?.hex ?? "#00A3FF";
  const btnTextColor  = colorAccent === "White" ? "#050A14" : "#ffffff";

  // ── Duration counter ──────────────────────────────────────────────────────
  const overhead         = 4 + (includeStatsCard ? 4 : 0) + 4;
  const estimatedSec     = reelLength * 60 + overhead;
  const durationColor    = estimatedSec < 240 ? "#22C55E" : estimatedSec < 300 ? "#F59E0B" : "#EF4444";
  const overDuration     = estimatedSec > 300;
  const durationFillPct  = Math.min((estimatedSec / 300) * 100, 100);

  // ── Clip diversity ────────────────────────────────────────────────────────
  const diversityWarn = checkDiversity(clipItems.map((c) => c.label));
  const clipLabelOpts = getClipLabels(sport);

  // ── Stats fields ──────────────────────────────────────────────────────────
  const statFields = getStatFields(sport, position);
  const handleStatChange = (key: string, val: string) =>
    setStatsData((p) => ({ ...p, [key]: val }));

  // ── Audio preview ──────────────────────────────────────────────────────────
  const [playingMusic, setPlayingMusic] = useState<MusicStyle | null>(null);
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const playTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { audioRef.current?.pause(); if (playTimer.current) clearTimeout(playTimer.current); };
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause(); audioRef.current = null;
    if (playTimer.current) { clearTimeout(playTimer.current); playTimer.current = null; }
    setPlayingMusic(null);
  };

  const handleMusicClick = (opt: MusicOption) => {
    setMusicStyle(opt.id);
    reel.update({ musicStyle: opt.id });
    if (playingMusic === opt.id) { stopAudio(); return; }
    stopAudio();
    if (!opt.url) return;
    const audio = new Audio(opt.url);
    audio.volume = 0.65;
    audioRef.current = audio;
    setPlayingMusic(opt.id);
    audio.play().catch(() => { audioRef.current = null; setPlayingMusic(null); });
    playTimer.current = setTimeout(() => { audioRef.current?.pause(); audioRef.current = null; setPlayingMusic(null); }, 15_000);
    audio.onended = () => { audioRef.current = null; setPlayingMusic(null); };
  };

  const handleColorPick  = (opt: ColorOption)    => { setColorAccent(opt.id);  reel.update({ colorAccent: opt.id });  };
  const handleFontPick   = (f: FontStyle)         => { setFontStyle(f);         reel.update({ fontStyle: f });         };
  const handleTransition = (t: TransitionStyle)   => { setTransition(t);        reel.update({ transition: t });        };

  const handleGenerate = () => {
    stopAudio();
    reel.update({
      firstName, position, gradYear, heightFt, heightIn, weight, gpa, email, coachName, coachEmail,
      musicStyle, colorAccent, reelLength, introStyle, fontStyle,
      transition, highlightPlayer, includeStatsCard, statsData,
      clipNames:  clipItems.map((c) => c.name),
      clipLabels: clipItems.map((c) => c.label),
    });
    router.push("/export");
  };

  const sliderPct = ((reelLength - 1) / 4) * 100;

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-[#050A14] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-600 text-sm focus:outline-none transition-all";

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-7xl mx-auto">
        <button onClick={() => router.push("/upload")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6">
          <ArrowLeftIcon />
        </button>
        <span className="text-2xl font-black tracking-widest transition-colors duration-300" style={{ color: accentHex }}>CLIPT</span>
      </nav>

      <ProgressBar active={2} accent={accentHex} />

      <main className="max-w-7xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Customize Your Reel</h1>
          <p className="text-slate-400 text-sm">Coaches decide in 30 seconds. Make every frame count.</p>
        </div>

        {/* ── THREE-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_270px] gap-5 mb-6">

          {/* ── LEFT: Clip Order + Duration ── */}
          <aside className="lg:sticky lg:top-6 lg:self-start flex flex-col gap-4">

            {/* Duration Counter */}
            <div className="rounded-2xl p-4" style={cardBase}>
              <SectionLabel text="Reel Duration" accent={accentHex} />
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black tabular-nums transition-colors duration-300" style={{ color: durationColor }}>
                  {fmtDuration(estimatedSec)}
                </span>
                <span className="text-xs text-slate-500">estimated</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${durationFillPct}%`, background: durationColor }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
                <span>0:00</span>
                <span style={{ color: "#22C55E" }}>4:00</span>
                <span style={{ color: "#EF4444" }}>5:00</span>
              </div>
              {overDuration && (
                <div className="mt-2 px-2.5 py-2 rounded-lg text-[10px] leading-snug"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                  ⚠ Coaches stop watching after 5 min. Remove your weakest clips.
                </div>
              )}
            </div>

            {/* Clip Order */}
            <div className="rounded-2xl p-4" style={cardBase}>
              <SectionLabel text="Clip Order" accent={accentHex} />
              <h2 className="text-sm font-bold text-white mb-1">Your Clips</h2>
              <p className="text-slate-500 text-[11px] mb-3">Drag to reorder · label each clip</p>

              {clipItems.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-xs mb-2">No clips found.</p>
                  <button onClick={() => router.push("/upload")} className="text-xs font-semibold hover:underline" style={{ color: accentHex }}>← Upload clips</button>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {clipItems.map((clip, i) => (
                    <li key={`${i}:${clip.name}`} draggable
                      onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={onDragEnd}
                      className="rounded-xl p-2.5 select-none transition-all"
                      style={{
                        background: dragOver === i ? `${accentHex}12` : "rgba(255,255,255,0.03)",
                        border: dragOver === i ? `1px solid ${accentHex}55` : "1px solid rgba(255,255,255,0.06)",
                        cursor: "grab",
                      }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-slate-600 shrink-0"><GripIcon /></span>
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0"
                          style={{ background: `${accentHex}20`, color: accentHex }}>{i + 1}</span>
                        <span className="text-[11px] text-slate-300 truncate">{clip.name}</span>
                      </div>
                      <select value={clip.label}
                        onChange={(e) => setClipItems((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], label: e.target.value };
                          return next;
                        })}
                        className="w-full text-[10px] rounded-lg px-2 py-1"
                        style={{ background: "#050A14", border: "1px solid rgba(255,255,255,0.07)", color: clip.label ? "#94a3b8" : "#475569", appearance: "none" }}>
                        <option value="">Label clip (optional)...</option>
                        {clipLabelOpts.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              )}

              {/* Diversity Warning */}
              {diversityWarn && (
                <div className="mt-3 px-3 py-2 rounded-xl text-[10px] leading-snug"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
                  ⚠ Coaches want variety. Too many "{diversityWarn}" clips — add defensive plays, hustle clips, or different play types.
                </div>
              )}
            </div>
          </aside>

          {/* ── CENTER: Customization Sections ── */}
          <div className="flex flex-col gap-5">

            {/* 01 — Title Card */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="01 — Title Card" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-5">Athlete Info</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Name</label>
                  <input type="text" className={inputCls} placeholder="Your first name" value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onFocus={(e) => { e.target.style.borderColor = `${accentHex}80`; }}
                    onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Position</label>
                  <div className="relative">
                    <select className={inputCls} value={position} onChange={(e) => setPosition(e.target.value)}
                      style={{ appearance: "none", paddingRight: "2.5rem" }}>
                      <option value="" disabled hidden>Select your position</option>
                      {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▼</span>
                  </div>
                </div>

                {/* Optional Details */}
                <div className="border-t border-white/5 pt-4">
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-3 text-slate-600">Optional Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Grad Year</label>
                      <div className="relative">
                        <select className={inputCls} value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                          style={{ appearance: "none", paddingRight: "2rem", fontSize: "13px" }}>
                          <option value="">Year...</option>
                          {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▼</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Height</label>
                      <div className="flex gap-1.5">
                        <input type="text" placeholder="6'" value={heightFt} onChange={(e) => setHeightFt(e.target.value)}
                          className="w-1/2 px-3 py-2.5 rounded-xl bg-[#050A14] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-600 text-sm focus:outline-none" />
                        <input type="text" placeholder='2"' value={heightIn} onChange={(e) => setHeightIn(e.target.value)}
                          className="w-1/2 px-3 py-2.5 rounded-xl bg-[#050A14] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-600 text-sm focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Weight (lbs)</label>
                      <input type="text" placeholder="185" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">GPA</label>
                      <input type="text" placeholder="3.8" value={gpa} onChange={(e) => setGpa(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Your Email</label>
                      <input type="email" placeholder="athlete@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Coach Name</label>
                      <input type="text" placeholder="Coach Smith" value={coachName} onChange={(e) => setCoachName(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Coach Email</label>
                      <input type="email" placeholder="coach@school.edu" value={coachEmail} onChange={(e) => setCoachEmail(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 02 — Music Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="02 — Music Style" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-1">Background Music</h2>
              <p className="text-slate-500 text-xs mb-5">Instrumental only · click to preview 15 sec</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MUSIC_OPTIONS.map((opt) => {
                  const selected = musicStyle === opt.id;
                  const playing  = playingMusic === opt.id;
                  return (
                    <button key={opt.id} type="button" onClick={() => handleMusicClick(opt)}
                      className="text-left px-4 py-3 rounded-xl transition-all relative"
                      style={{
                        background: selected ? `${accentHex}18` : "rgba(255,255,255,0.03)",
                        border: selected ? `1px solid ${accentHex}75` : "1px solid rgba(255,255,255,0.07)",
                      }}>
                      {opt.id === "NoMusic" && (
                        <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide"
                          style={{ background: `${accentHex}25`, color: accentHex }}>COACH ✓</span>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold pr-12 transition-colors duration-200"
                          style={{ color: selected ? accentHex : "#e2e8f0" }}>{opt.label}</p>
                        {opt.url && (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                            style={{ background: playing ? accentHex : `${accentHex}28`, color: playing ? "#050A14" : accentHex }}>
                            {playing ? <PauseIcon /> : <PlayIcon />}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                      {playing && (
                        <div className="mt-2 h-px rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full" style={{ background: accentHex, width: "100%", animation: "shrinkBar 15s linear forwards" }} />
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
                    <button key={opt.id} type="button" onClick={() => handleColorPick(opt)}
                      className="flex flex-col items-center gap-2 transition-transform active:scale-95" title={opt.id}>
                      <div className="w-10 h-10 rounded-full transition-all duration-200"
                        style={{ background: opt.hex,
                          border: selected ? "3px solid rgba(255,255,255,0.95)" : "3px solid rgba(255,255,255,0.12)",
                          boxShadow: selected ? `0 0 0 2px ${opt.hex}60` : "none" }} />
                      <span className="text-[10px] font-semibold whitespace-nowrap transition-colors duration-200"
                        style={{ color: selected ? "#fff" : "#64748b" }}>{opt.id}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 04 — Transition Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="04 — Transitions" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-5">Between Clips</h2>
              <div className="grid grid-cols-2 gap-3">
                {TRANSITION_OPTIONS.map((opt) => {
                  const selected = transition === opt.id;
                  return (
                    <button key={opt.id} type="button" onClick={() => handleTransition(opt.id)}
                      className="text-left px-4 py-3 rounded-xl transition-all relative"
                      style={{
                        background: selected ? `${accentHex}18` : "rgba(255,255,255,0.03)",
                        border: selected ? `1px solid ${accentHex}75` : "1px solid rgba(255,255,255,0.07)",
                      }}>
                      {opt.id === "Hard Cut" && (
                        <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded tracking-wide"
                          style={{ background: `${accentHex}25`, color: accentHex }}>COACH ✓</span>
                      )}
                      <p className="text-sm font-bold mb-1 pr-14 transition-colors duration-200"
                        style={{ color: selected ? accentHex : "#e2e8f0" }}>{opt.id}</p>
                      <p className="text-[11px] text-slate-500">{opt.desc}</p>
                      <p className="text-[10px] mt-1" style={{ color: `${accentHex}80` }}>{opt.duration}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 05 — Player Identification */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="05 — Player ID" accent={accentHex} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white mb-1">Highlight Me On Screen</h2>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Each clip starts with a 0.8 s freeze frame and a glowing arrow so coaches instantly know who to watch. Player identification is the #1 factor coaches look for.
                  </p>
                </div>
                <Toggle on={highlightPlayer} onToggle={() => setHighlightPlayer(!highlightPlayer)} accent={accentHex} />
              </div>
              {highlightPlayer && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: `${accentHex}12`, border: `1px solid ${accentHex}30`, color: accentHex }}>
                  ● Accent color circle + arrow will appear at clip start
                </div>
              )}
            </section>

            {/* 06 — Stats Card */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="06 — Stats Card" accent={accentHex} />
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white mb-1">Include Stats Card</h2>
                  <p className="text-slate-500 text-xs">Shown for 4 seconds after title card</p>
                </div>
                <Toggle on={includeStatsCard} onToggle={() => setIncludeStatsCard(!includeStatsCard)} accent={accentHex} />
              </div>
              {includeStatsCard && (
                <div className="grid grid-cols-2 gap-3">
                  {statFields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">{f.label}</label>
                      <input type="text" value={statsData[f.key] || ""} onChange={(e) => handleStatChange(f.key, e.target.value)}
                        placeholder={f.placeholder} className={inputCls}
                        onFocus={(e) => { e.target.style.borderColor = `${accentHex}80`; }}
                        onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 07 — Reel Length */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <SectionLabel text="07 — Reel Length" accent={accentHex} />
                  <h2 className="text-base font-bold text-white">Duration Target</h2>
                </div>
                <span className="text-3xl font-black tabular-nums transition-colors duration-300" style={{ color: accentHex }}>
                  {reelLength}<span className="text-base font-semibold text-slate-400 ml-0.5">m</span>
                </span>
              </div>
              <input type="range" min={1} max={5} step={1} value={reelLength}
                onChange={(e) => setReelLength(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, ${accentHex} ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%)`, accentColor: accentHex }} />
              <div className="flex justify-between mt-3">
                {[1,2,3,4,5].map((n) => (
                  <span key={n} className="text-xs font-semibold transition-colors duration-200"
                    style={{ color: reelLength === n ? accentHex : "#475569" }}>{n}m</span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Basketball: 3–4 min optimal · Football: 3–5 min optimal</p>
            </section>

            {/* 08 — Intro Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="08 — Intro Style" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-5">Opening Sequence</h2>
              <div className="grid grid-cols-3 gap-3">
                {INTRO_OPTIONS.map((opt) => {
                  const selected = introStyle === opt.id;
                  return (
                    <button key={opt.id} type="button" onClick={() => setIntroStyle(opt.id)}
                      className="text-center px-3 py-4 rounded-xl transition-all"
                      style={{
                        background: selected ? `${accentHex}18` : "rgba(255,255,255,0.03)",
                        border: selected ? `1px solid ${accentHex}75` : "1px solid rgba(255,255,255,0.07)",
                      }}>
                      <p className="text-sm font-bold mb-1.5 leading-snug transition-colors duration-200"
                        style={{ color: selected ? accentHex : "#e2e8f0" }}>{opt.id}</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 09 — Font Style */}
            <section className="rounded-2xl p-6" style={cardBase}>
              <SectionLabel text="09 — Font Style" accent={accentHex} />
              <h2 className="text-base font-bold text-white mb-5">Typography</h2>
              <div className="grid grid-cols-2 gap-3">
                {FONT_STYLES.map((f) => {
                  const selected = fontStyle === f;
                  return (
                    <button key={f} type="button" onClick={() => handleFontPick(f)}
                      className="px-4 py-3 rounded-xl transition-all text-left"
                      style={{
                        background: selected ? `${accentHex}18` : "rgba(255,255,255,0.03)",
                        border: selected ? `1px solid ${accentHex}75` : "1px solid rgba(255,255,255,0.07)",
                      }}>
                      <div style={{ fontFamily: FONT_MAP[f], fontSize: "20px", fontWeight: f === "Athletic" ? 400 : 700,
                        color: selected ? accentHex : "#e2e8f0", lineHeight: 1.1, marginBottom: 4, transition: "color 0.2s" }}>{f}</div>
                      <div style={{ fontFamily: FONT_MAP[f], fontSize: "10px", fontWeight: f === "Athletic" ? 400 : 500, color: "#64748b" }}>
                        Aa Bb Cc 123
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ── RIGHT: Live Preview ── */}
          <aside className="lg:sticky lg:top-6 lg:self-start flex flex-col gap-4">
            <div className="rounded-2xl p-4 transition-all duration-300"
              style={{ background: "#0A1628", border: `1px solid ${accentHex}30` }}>
              <SectionLabel text="Live Preview" accent={accentHex} />
              <h2 className="text-sm font-bold text-white mb-3">Title Card</h2>
              <TitleCardPreview firstName={firstName} position={position} school={reel.school}
                jerseyNumber={reel.jerseyNumber} fontStyle={fontStyle} accentHex={accentHex} />
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-500">Font</span>
                  <span className="text-[10px] font-semibold transition-colors duration-300" style={{ color: accentHex }}>{fontStyle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Color</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: accentHex }} />
                    <span className="text-[10px] text-slate-300">{colorAccent}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-500">Transition</span>
                  <span className="text-[10px] text-slate-300">{transition}</span>
                </div>
              </div>
            </div>

            {/* Reel structure */}
            <div className="rounded-2xl p-4" style={cardBase}>
              <SectionLabel text="Reel Structure" accent={accentHex} />
              <div className="mt-2 flex flex-col gap-1.5">
                {[
                  { label: "Title Card",  value: "4s", active: true },
                  { label: "Stats Card",  value: includeStatsCard ? "4s" : "off", active: includeStatsCard },
                  { label: "Your Clips",  value: `${clipItems.length} clips`, active: clipItems.length > 0 },
                  { label: "End Card",    value: "4s", active: true },
                ].map(({ label, value, active }) => (
                  <div key={label} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: active ? accentHex : "#334155" }} />
                      <span className="text-[11px] text-slate-400">{label}</span>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: active ? "#e2e8f0" : "#475569" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Now playing */}
            {playingMusic && (
              <div className="rounded-xl px-3 py-3 flex items-center gap-2.5"
                style={{ background: `${accentHex}12`, border: `1px solid ${accentHex}40` }}>
                <div className="flex gap-0.5 items-end h-4 shrink-0">
                  {[0.5,0.8,0.6].map((h, i) => (
                    <div key={i} className="w-1 rounded-full"
                      style={{ background: accentHex, height: `${h * 100}%`, animation: `soundBar ${0.5 + i * 0.15}s ease-in-out infinite alternate` }} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate" style={{ color: accentHex }}>{playingMusic}</p>
                  <p className="text-[10px] text-slate-500">15s preview</p>
                </div>
                <button type="button" onClick={stopAudio} className="text-slate-500 hover:text-white text-xs shrink-0">✕</button>
              </div>
            )}
          </aside>
        </div>

        {/* ── GENERATE BUTTON ── */}
        <button type="button" onClick={handleGenerate}
          className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ background: accentHex, color: btnTextColor, cursor: "pointer" }}>
          Generate My Reel →
        </button>
      </main>

      <style>{`
        @keyframes shrinkBar  { from { width: 100%; } to { width: 0%; } }
        @keyframes soundBar   { from { opacity: 0.5; transform: scaleY(0.4); } to { opacity: 1; transform: scaleY(1); } }
      `}</style>
    </div>
  );
}
