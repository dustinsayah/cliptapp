"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type {
  FontStyle, TransitionStyle,
  TitleCardTemplate, IntroAnimation, WatermarkStyle, ExportAspectRatio,
} from "../providers";
import { SPORTS_CONFIG } from "../../lib/sportsConfig";

// ── Icons ──────────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);
const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="5"  r="1.2" fill="currentColor" /><circle cx="9"  cy="12" r="1.2" fill="currentColor" />
    <circle cx="9"  cy="19" r="1.2" fill="currentColor" /><circle cx="15" cy="5"  r="1.2" fill="currentColor" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" /><circle cx="15" cy="19" r="1.2" fill="currentColor" />
  </svg>
);
const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const PlayIconSm = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
);
const PauseIconSm = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ── Static data ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

// ── Music Library ──────────────────────────────────────────────────────────────

type MusicTrack = { id: string; label: string; vibe: string; url?: string };
type MusicCategory = { category: string; emoji: string; tracks: MusicTrack[] };

const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    category: "Hype",
    emoji: "🔥",
    tracks: [
      { id: "nba-warmup",    label: "NBA Warmup",    vibe: "Heavy stadium drums & bass · pre-game energy",       url: "https://assets.mixkit.co/music/370/370.mp3" },
      { id: "championship",  label: "Championship",  vibe: "Epic orchestral build to a climax",                  url: "https://assets.mixkit.co/music/591/591.mp3" },
      { id: "playoff-mode",  label: "Playoff Mode",  vibe: "Intense percussion-driven energy",                   url: "https://assets.mixkit.co/music/601/601.mp3" },
      { id: "game-time",     label: "Game Time",     vibe: "Hard-hitting trap with triumphant horns",            url: "https://assets.mixkit.co/music/490/490.mp3" },
      { id: "court-vision",  label: "Court Vision",  vibe: "Modern hip-hop instrumental · deep 808s",            url: "https://assets.mixkit.co/music/421/421.mp3" },
    ],
  },
  {
    category: "Cinematic",
    emoji: "🎬",
    tracks: [
      { id: "espn-feature",  label: "ESPN Feature",  vibe: "Sweeping orchestral strings · SportsCenter vibe",    url: "https://assets.mixkit.co/music/614/614.mp3" },
      { id: "rise-up",       label: "Rise Up",       vibe: "Inspirational piano building to full orchestra",      url: "https://assets.mixkit.co/music/738/738.mp3" },
      { id: "legacy",        label: "Legacy",        vibe: "Emotional strings & piano · awards ceremony",         url: "https://assets.mixkit.co/music/652/652.mp3" },
      { id: "the-journey",   label: "The Journey",   vibe: "Cinematic trailer style with choir",                  url: "https://assets.mixkit.co/music/668/668.mp3" },
      { id: "triumph",       label: "Triumph",       vibe: "Olympic ceremony style brass",                        url: "https://assets.mixkit.co/music/712/712.mp3" },
    ],
  },
  {
    category: "Trap & Drill",
    emoji: "🎤",
    tracks: [
      { id: "trap-god",      label: "Trap God",      vibe: "Clean modern trap · hard 808s, no lyrics",           url: "https://assets.mixkit.co/music/267/267.mp3" },
      { id: "drill-season",  label: "Drill Season",  vibe: "Dark UK drill instrumental",                          url: "https://assets.mixkit.co/music/400/400.mp3" },
      { id: "ice-cold",      label: "Ice Cold",      vibe: "Minimal dark trap beat",                              url: "https://assets.mixkit.co/music/346/346.mp3" },
      { id: "street-ball",   label: "Street Ball",   vibe: "Underground hip-hop instrumental",                    url: "https://assets.mixkit.co/music/308/308.mp3" },
      { id: "pressure",      label: "Pressure",      vibe: "Aggressive drill with heavy bass",                    url: "https://assets.mixkit.co/music/325/325.mp3" },
    ],
  },
  {
    category: "Chill",
    emoji: "🎧",
    tracks: [
      { id: "focus",         label: "Focus",         vibe: "Lo-fi chill beats · minimal",                        url: "https://assets.mixkit.co/music/282/282.mp3" },
      { id: "late-night",    label: "Late Night",    vibe: "Smooth jazz-influenced instrumental",                 url: "https://assets.mixkit.co/music/297/297.mp3" },
      { id: "smooth",        label: "Smooth",        vibe: "Laid-back hip-hop instrumental",                     url: "https://assets.mixkit.co/music/315/315.mp3" },
    ],
  },
  {
    category: "Coach Recommended",
    emoji: "🏆",
    tracks: [
      { id: "no-music",      label: "No Music — Coach Preferred", vibe: "Silence · coaches focus on your game",           url: undefined },
      { id: "crowd-noise",   label: "Crowd Noise Only",           vibe: "Ambient stadium atmosphere · no music",           url: "https://assets.mixkit.co/music/562/562.mp3" },
    ],
  },
];

function getAllTrack(id: string): MusicTrack | undefined {
  for (const cat of MUSIC_CATEGORIES) {
    const t = cat.tracks.find((tr) => tr.id === id);
    if (t) return t;
  }
  return undefined;
}

// ── 24 Color Presets (6 cols × 4 rows) ────────────────────────────────────────

const PRESET_COLORS = [
  // Row 1 – Blues
  { name: "Electric Blue", hex: "#00A3FF" },
  { name: "Royal Blue",    hex: "#2563EB" },
  { name: "Navy",          hex: "#1E3A5F" },
  { name: "Sky Blue",      hex: "#38BDF8" },
  { name: "Teal",          hex: "#14B8A6" },
  { name: "Mint",          hex: "#10B981" },
  // Row 2 – Reds & Warm
  { name: "Red",           hex: "#EF4444" },
  { name: "Crimson",       hex: "#DC2626" },
  { name: "Maroon",        hex: "#991B1B" },
  { name: "Coral",         hex: "#FB7185" },
  { name: "Orange",        hex: "#F97316" },
  { name: "Amber",         hex: "#F59E0B" },
  // Row 3 – Yellows, Greens, Purples
  { name: "Gold",          hex: "#FBBF24" },
  { name: "Yellow",        hex: "#FACC15" },
  { name: "Lime Green",    hex: "#84CC16" },
  { name: "Forest Green",  hex: "#16A34A" },
  { name: "Purple",        hex: "#A855F7" },
  { name: "Violet",        hex: "#7C3AED" },
  // Row 4 – Neutrals & Lights
  { name: "Lavender",      hex: "#C4B5FD" },
  { name: "Pink",          hex: "#EC4899" },
  { name: "Hot Pink",      hex: "#F472B6" },
  { name: "White",         hex: "#F1F5F9" },
  { name: "Silver",        hex: "#94A3B8" },
  { name: "Black",         hex: "#1E293B" },
];

// ── Sport / Position data ──────────────────────────────────────────────────────

const BASKETBALL_POSITIONS = ["Point Guard","Shooting Guard","Small Forward","Power Forward","Center"];
const FOOTBALL_POSITIONS   = ["Quarterback","Running Back","Wide Receiver","Tight End","Linebacker","Cornerback","Safety","Defensive End","Kicker"];
const GRAD_YEARS           = ["2025","2026","2027","2028","2029","2030"];

// ── Stats fields & benchmarks ──────────────────────────────────────────────────

interface StatField { label: string; key: string; placeholder: string; benchmark: number }

const BASKETBALL_BASE: StatField[] = [
  { label: "PPG",   key: "ppg",   placeholder: "18.5", benchmark: 25 },
  { label: "RPG",   key: "rpg",   placeholder: "7.2",  benchmark: 12 },
  { label: "APG",   key: "apg",   placeholder: "4.1",  benchmark: 10 },
  { label: "SPG",   key: "spg",   placeholder: "1.8",  benchmark: 3  },
  { label: "FG%",   key: "fg",    placeholder: "47%",  benchmark: 55 },
  { label: "3PT%",  key: "tpt",   placeholder: "38%",  benchmark: 45 },
];
const BASKETBALL_EXTRA: StatField[] = [
  { label: "MPG",        key: "mpg",    placeholder: "28",   benchmark: 35  },
  { label: "BPG",        key: "bpg",    placeholder: "0.8",  benchmark: 3   },
  { label: "TOV",        key: "tov",    placeholder: "2.1",  benchmark: 5   },
  { label: "+/-",        key: "pm",     placeholder: "+8",   benchmark: 15  },
  { label: "FT%",        key: "ft",     placeholder: "78%",  benchmark: 90  },
  { label: "OREB",       key: "oreb",   placeholder: "1.8",  benchmark: 5   },
  { label: "DREB",       key: "dreb",   placeholder: "5.2",  benchmark: 8   },
  { label: "AST/TO",     key: "astto",  placeholder: "2.4",  benchmark: 4   },
  { label: "GP",         key: "gp",     placeholder: "28",   benchmark: 35  },
  { label: "Record",     key: "record", placeholder: "22-8",  benchmark: 0  },
];
const MEASURABLES: StatField[] = [
  { label: "Height",       key: "height_m",    placeholder: "6'3\"",  benchmark: 0 },
  { label: "Weight",       key: "weight_m",    placeholder: "185 lbs", benchmark: 0 },
  { label: "Wingspan",     key: "wingspan",    placeholder: "6'7\"",  benchmark: 0 },
  { label: "Vertical",     key: "vertical",    placeholder: "36\"",   benchmark: 0 },
  { label: "Hand Size",    key: "handsize",    placeholder: "9.5\"",  benchmark: 0 },
  { label: "Sprint Speed", key: "sprintspeed", placeholder: "4.45s",  benchmark: 0 },
];
const ACADEMIC: StatField[] = [
  { label: "GPA",            key: "gpa_ac",    placeholder: "3.8",     benchmark: 4.0 },
  { label: "Class Rank",     key: "classrank", placeholder: "15 / 320", benchmark: 0  },
  { label: "SAT Score",      key: "sat",       placeholder: "1320",    benchmark: 1600 },
  { label: "ACT Score",      key: "act",       placeholder: "29",      benchmark: 36  },
  { label: "Intended Major", key: "major",     placeholder: "Business", benchmark: 0  },
];

function getStatFields(sport: string, position: string): { base: StatField[]; extra: StatField[] } {
  if (sport === "Basketball") return { base: BASKETBALL_BASE, extra: BASKETBALL_EXTRA };

  if (sport === "Football") {
    if (position === "Quarterback") return {
      base: [
        { label: "Pass Yds", key: "passyds",  placeholder: "2,847", benchmark: 4000 },
        { label: "TDs",      key: "tds",      placeholder: "28",    benchmark: 40   },
        { label: "Comp%",    key: "comppct",  placeholder: "67%",   benchmark: 70   },
        { label: "Rush Yds", key: "rushyds",  placeholder: "312",   benchmark: 1000 },
        { label: "INT",      key: "ints",     placeholder: "5",     benchmark: 10   },
        { label: "Rating",   key: "rating",   placeholder: "108",   benchmark: 120  },
      ],
      extra: [
        { label: "Yds/Att", key: "ypa",      placeholder: "8.2",  benchmark: 10 },
        { label: "Long",    key: "longcomp", placeholder: "72",   benchmark: 80 },
        { label: "Rush TDs",key: "rushtds",  placeholder: "4",    benchmark: 10 },
        { label: "Fumbles", key: "fumbles",  placeholder: "2",    benchmark: 5  },
      ],
    };
    if (["Running Back"].includes(position)) return {
      base: [
        { label: "Rush Yds",  key: "rushyds", placeholder: "1,204", benchmark: 2000 },
        { label: "TDs",       key: "tds",     placeholder: "14",    benchmark: 20   },
        { label: "Yds/Carry", key: "ypc",     placeholder: "6.2",   benchmark: 7    },
        { label: "Rec",       key: "rec",     placeholder: "38",    benchmark: 80   },
        { label: "Long",      key: "long",    placeholder: "68",    benchmark: 80   },
      ],
      extra: [
        { label: "YAC",    key: "yac",    placeholder: "312", benchmark: 500 },
        { label: "Fumbles",key: "fumbles",placeholder: "1",   benchmark: 5   },
      ],
    };
    if (["Wide Receiver","Tight End"].includes(position)) return {
      base: [
        { label: "Rec Yds", key: "recyds", placeholder: "1,204", benchmark: 1500 },
        { label: "TDs",     key: "tds",    placeholder: "12",    benchmark: 20   },
        { label: "Rec",     key: "rec",    placeholder: "72",    benchmark: 120  },
        { label: "Yds/Rec", key: "ypr",   placeholder: "16.7",  benchmark: 20   },
        { label: "Targets", key: "targets",placeholder: "98",   benchmark: 140  },
      ],
      extra: [
        { label: "Long",     key: "long",    placeholder: "78", benchmark: 80 },
        { label: "Drop Rate",key: "droprate",placeholder: "4%", benchmark: 10 },
      ],
    };
    if (["Linebacker","Cornerback","Safety","Defensive End"].includes(position)) return {
      base: [
        { label: "Tackles",  key: "tackles",  placeholder: "89",  benchmark: 120 },
        { label: "Sacks",    key: "sacks",    placeholder: "7.5", benchmark: 15  },
        { label: "INTs",     key: "ints",     placeholder: "3",   benchmark: 8   },
        { label: "PBUs",     key: "pbus",     placeholder: "12",  benchmark: 20  },
        { label: "TFLs",     key: "tfls",     placeholder: "11",  benchmark: 20  },
      ],
      extra: [
        { label: "FF",        key: "ff",      placeholder: "2",  benchmark: 5   },
        { label: "FR",        key: "fr",      placeholder: "1",  benchmark: 3   },
        { label: "Pass Def",  key: "passdef", placeholder: "8",  benchmark: 20  },
        { label: "QB Hurry",  key: "qbhurry",placeholder: "12", benchmark: 20  },
      ],
    };
    return { base: [{ label: "GPA", key: "gpa_stat", placeholder: "3.8", benchmark: 4 }], extra: [] };
  }

  return {
    base: [
      { label: "GPA", key: "gpa_stat", placeholder: "3.8", benchmark: 4 },
    ],
    extra: [],
  };
}

function getClipLabels(sport: string): string[] {
  if (sport === "Basketball")
    return ["Layup/Dunk","Jump Shot","3-Pointer","Block","Steal","Assist","Defense","Rebound","Free Throw","Transition"];
  if (sport === "Football")
    return ["Run","Reception","Block","Tackle","Sack","Interception","Route","Kickoff","Pass","Blitz"];
  return ["Offense","Defense","Highlight","Transition","Other"];
}

function checkDiversity(labels: string[]): string | null {
  const filled = labels.filter(Boolean);
  if (filled.length < 3) return null;
  const counts: Record<string, number> = {};
  filled.forEach((l) => { counts[l] = (counts[l] || 0) + 1; });
  const max = Math.max(...Object.values(counts));
  if (max / filled.length > 0.6) return Object.keys(counts).find((k) => counts[k] === max) ?? null;
  return null;
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Title Card Templates ───────────────────────────────────────────────────────

type TemplateInfo = { id: TitleCardTemplate; label: string; desc: string };
const TITLE_TEMPLATES: TemplateInfo[] = [
  { id: "espn-classic",   label: "ESPN Classic",   desc: "Bold left stripe · dual column layout" },
  { id: "nike-clean",     label: "Nike Clean",     desc: "Minimal · accent name · clean lines"   },
  { id: "draft-board",    label: "Draft Board",    desc: "Prospect card · measurables prominent" },
  { id: "neon",           label: "Neon",           desc: "Dark bg · glowing neon name text"      },
  { id: "championship",   label: "Championship",   desc: "Diagonal texture · bold impact style"  },
  { id: "minimal",        label: "Minimal",        desc: "Pure black · white text · zero clutter"},
];

// ── Intro Animations ──────────────────────────────────────────────────────────

type AnimInfo = { id: IntroAnimation; label: string; desc: string };
const INTRO_ANIMS: AnimInfo[] = [
  { id: "clean-cut",  label: "Clean Cut",  desc: "Instant hard cut · classic default" },
  { id: "fade-in",    label: "Fade In",    desc: "Title fades from black · smooth"    },
  { id: "slide-in",   label: "Slide In",   desc: "Card slides in from left"           },
  { id: "reveal",     label: "Reveal",     desc: "Accent color wipe reveal"           },
  { id: "glitch",     label: "Glitch",     desc: "Digital glitch effect · then reveal"},
];

// ── Aspect Ratios ─────────────────────────────────────────────────────────────

type AspectInfo = { id: ExportAspectRatio; label: string; sublabel: string; desc: string; w: number; h: number };
const ASPECT_OPTIONS: AspectInfo[] = [
  { id: "16:9",  label: "Coach Version",    sublabel: "16:9 · 1080p",  desc: "Email & Hudl upload · default",       w: 16, h: 9   },
  { id: "9:16",  label: "Social Vertical",  sublabel: "9:16 · 1080p",  desc: "TikTok & Instagram Reels",            w: 9,  h: 16  },
  { id: "1:1",   label: "Square",           sublabel: "1:1 · 1080p",   desc: "Twitter & Instagram Feed",            w: 1,  h: 1   },
  { id: "21:9",  label: "Widescreen",       sublabel: "21:9 · 1080p",  desc: "YouTube cinematic",                   w: 21, h: 9   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0"))
    .join("");
}

function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function getStatPct(val: string, benchmark: number): number {
  if (!benchmark) return 0;
  const n = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
  return Math.min((n / benchmark) * 100, 100);
}

// ── Font map ──────────────────────────────────────────────────────────────────

const FONT_STYLES: FontStyle[] = ["Modern","Bold","Clean","Athletic"];
const FONT_MAP: Record<FontStyle, string> = {
  Modern:   "var(--font-inter), Inter, sans-serif",
  Bold:     "var(--font-oswald), Oswald, sans-serif",
  Clean:    "var(--font-poppins), Poppins, sans-serif",
  Athletic: "var(--font-bebas), 'Bebas Neue', sans-serif",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ active, accent }: { active: number; accent: string }) {
  return (
    <div className="max-w-7xl mx-auto px-6 mb-10">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const completed = step.number < active, isActive = step.number === active, isLast = i === STEPS.length - 1;
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300"
                  style={completed || isActive ? { background: accent, borderColor: accent, color: "#050A14" } : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }}>
                  {completed ? <CheckIcon /> : step.number}
                </div>
                <span className="text-xs font-semibold whitespace-nowrap transition-colors duration-300" style={{ color: completed || isActive ? accent : "#64748b" }}>{step.label}</span>
              </div>
              {!isLast && <div className="flex-1 h-px mx-2 mb-5 transition-all duration-300" style={{ background: completed ? `${accent}70` : "rgba(255,255,255,0.08)" }} />}
            </div>
          );
        })}
      </div>
    </div>
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

function CollapsibleSection({
  title, subtitle, children, accent, defaultOpen = true,
}: {
  title: string; subtitle?: string; children: React.ReactNode; accent: string; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl overflow-hidden" style={cardBase}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition-colors">
        <div className="min-w-0 pr-3">
          <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-slate-500 text-xs mt-0.5 leading-snug">{subtitle}</p>}
        </div>
        <span style={{ color: accent }}><ChevronDownIcon open={open} /></span>
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div className="px-6 pb-6">
            <div className="h-px mb-5" style={{ background: "rgba(255,255,255,0.05)" }} />
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Sound Wave ────────────────────────────────────────────────────────────────

function SoundWave({ accent }: { accent: string }) {
  const heights = [14, 20, 18, 22, 16, 20, 12];
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 22 }}>
      {heights.map((h, i) => (
        <div key={i} className="music-bar rounded-sm" style={{
          width: 3, height: h, background: accent, borderRadius: 2,
          animationDuration: `${0.6 + i * 0.08}s`,
          animationDelay: `${i * 0.09}s`,
        }} />
      ))}
    </div>
  );
}

// ── Music Track Row ───────────────────────────────────────────────────────────

function MusicTrackRow({
  track, isSelected, isPlaying, accent, onSelect, onTogglePlay,
}: {
  track: MusicTrack; isSelected: boolean; isPlaying: boolean;
  accent: string; onSelect: () => void; onTogglePlay: () => void;
}) {
  return (
    <div onClick={onSelect} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
      style={{
        background: isSelected ? `${accent}14` : "transparent",
        border: isSelected ? `1px solid ${accent}40` : "1px solid transparent",
      }}>
      {/* Play / pause button */}
      {track.url ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-90"
          style={{ background: isPlaying ? accent : "rgba(255,255,255,0.1)", color: isPlaying ? "#050A14" : "#fff" }}>
          {isPlaying ? <PauseIconSm /> : <PlayIconSm />}
        </button>
      ) : (
        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 12 }}>🔇</span>
        </div>
      )}

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{track.label}</span>
          {isSelected && <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent, color: "#050A14" }}><CheckIcon /></span>}
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">{track.vibe}</p>
      </div>

      {/* Animated wave when playing */}
      {isPlaying && (
        <div className="shrink-0">
          <SoundWave accent={accent} />
        </div>
      )}
    </div>
  );
}

// ── Color Swatch ──────────────────────────────────────────────────────────────

function ColorSwatch({
  hex, name, selected, accent, onClick,
}: {
  hex: string; name: string; selected: boolean; accent: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} title={name}
      className="rounded-lg transition-all relative"
      style={{
        width: "100%", aspectRatio: "1",
        background: hex,
        border: selected ? `2px solid ${accent}` : "2px solid transparent",
        boxShadow: selected ? `0 0 0 2px #050A14, 0 0 0 4px ${accent}` : "none",
        transform: selected ? "scale(0.92)" : "scale(1)",
        outline: "none",
      }}
    />
  );
}

// ── Stat Input with Progress Bar ──────────────────────────────────────────────

function StatInput({
  field, value, onChange, accent,
}: {
  field: StatField; value: string; onChange: (v: string) => void; accent: string;
}) {
  const pct = getStatPct(value, field.benchmark);
  return (
    <div>
      <label className="text-xs text-slate-400 font-medium block mb-1">{field.label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      />
      {field.benchmark > 0 && (
        <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: accent }} />
        </div>
      )}
    </div>
  );
}

// ── Template Preview Card ──────────────────────────────────────────────────────

function TemplateCard({
  info, selected, accent, onClick,
}: {
  info: TemplateInfo; selected: boolean; accent: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-xl p-3 text-left transition-all"
      style={{
        background: selected ? `${accent}12` : "#050A14",
        border: selected ? `1.5px solid ${accent}60` : "1.5px solid rgba(255,255,255,0.07)",
      }}>
      {/* Mini preview */}
      <div className="rounded-lg overflow-hidden mb-2.5" style={{ aspectRatio: "16/9", background: "#020508" }}>
        <TemplateMiniPreview id={info.id} accent={accent} />
      </div>
      <div className="flex items-center gap-1.5">
        {selected && <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{ background: accent }}><CheckIcon /></div>}
        <span className="text-xs font-bold text-white leading-tight">{info.label}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{info.desc}</p>
    </button>
  );
}

function TemplateMiniPreview({ id, accent }: { id: TitleCardTemplate; accent: string }) {
  const base: React.CSSProperties = { width: "100%", height: "100%", position: "relative", overflow: "hidden" };
  if (id === "espn-classic") return (
    <div style={{ ...base, background: "#050A14", display: "flex" }}>
      <div style={{ width: 4, background: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "6px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>NAME</div>
        <div style={{ fontSize: 6, color: accent, letterSpacing: 2, marginTop: 2 }}>POSITION · SPORT</div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          {["18.2", "7.3", "4.1"].map((s,i) => (
            <div key={i} style={{ fontSize: 8, color: "#64748b" }}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
  if (id === "nike-clean") return (
    <div style={{ ...base, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 20, height: 1.5, background: accent, marginBottom: 5 }} />
      <div style={{ fontSize: 12, fontWeight: 900, color: accent, letterSpacing: 0.5 }}>NAME</div>
      <div style={{ fontSize: 5, color: "#e2e8f0", marginTop: 4, letterSpacing: 3 }}>POSITION</div>
    </div>
  );
  if (id === "draft-board") return (
    <div style={{ ...base, background: "#050A14", border: `1px solid ${accent}40`, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 3, background: accent }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 4 }}>
        <div style={{ fontSize: 5, color: accent, letterSpacing: 2, marginBottom: 2 }}>DRAFT PROSPECT</div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>NAME</div>
        <div style={{ fontSize: 5, color: "#94a3b8", marginTop: 1 }}>6&apos;3&quot; · 185 LBS · CLASS OF 2026</div>
      </div>
    </div>
  );
  if (id === "neon") return (
    <div style={{ ...base, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: accent, textShadow: `0 0 12px ${accent}, 0 0 24px ${accent}80`, letterSpacing: 1 }}>NAME</div>
      <div style={{ fontSize: 5, color: "#94a3b8", marginTop: 4, letterSpacing: 3 }}>POSITION</div>
    </div>
  );
  if (id === "championship") return (
    <div style={{ ...base, background: "#050A14" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(45deg, ${accent}08 0, ${accent}08 1px, transparent 0, transparent 8px)` }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>NAME</div>
        <div style={{ fontSize: 5, color: accent, letterSpacing: 3, marginTop: 3 }}>POSITION</div>
      </div>
    </div>
  );
  // minimal
  return (
    <div style={{ ...base, background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>NAME</div>
      <div style={{ fontSize: 5, color: "#94a3b8", marginTop: 5, letterSpacing: 2 }}>POSITION · SCHOOL</div>
    </div>
  );
}

// ── Intro Animation Card ──────────────────────────────────────────────────────

function IntroAnimCard({
  info, selected, accent, onClick,
}: {
  info: AnimInfo; selected: boolean; accent: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-xl p-3 text-left transition-all"
      style={{
        background: selected ? `${accent}12` : "#050A14",
        border: selected ? `1.5px solid ${accent}60` : "1.5px solid rgba(255,255,255,0.07)",
      }}>
      {/* Mini animated preview */}
      <div className="rounded-lg overflow-hidden mb-2 flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#020508" }}>
        <IntroAnimPreview id={info.id} accent={accent} />
      </div>
      <div className="flex items-center gap-1.5">
        {selected && <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{ background: accent }}><CheckIcon /></div>}
        <span className="text-xs font-bold text-white">{info.label}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-0.5">{info.desc}</p>
    </button>
  );
}

function IntroAnimPreview({ id, accent }: { id: IntroAnimation; accent: string }) {
  const animStyles: Record<IntroAnimation, React.CSSProperties> = {
    "clean-cut":  {},
    "fade-in":    { animation: "tooltipIn 1.5s ease infinite" },
    "slide-in":   { animation: "tooltipIn 1.5s ease infinite", transformOrigin: "left" },
    "reveal":     {},
    "glitch":     {},
  };
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {id === "reveal" && <div style={{ position: "absolute", inset: 0, background: accent, transformOrigin: "left", animation: "tooltipIn 1.5s ease infinite", opacity: 0.3 }} />}
      {id === "glitch" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: accent, fontSize: 8, fontWeight: 900, textShadow: `2px 0 #ff0000, -2px 0 #00ff00`, letterSpacing: 1, opacity: 0.8 }}>NAME</div>
        </div>
      )}
      <div style={{ color: "#fff", fontSize: 9, fontWeight: 700, ...animStyles[id] }}>
        {id !== "glitch" ? "NAME" : ""}
      </div>
    </div>
  );
}

// ── Live Preview Panel ─────────────────────────────────────────────────────────

function LivePreviewPanel({
  firstName, position, school, jerseyNumber, fontStyle, accentHex,
  includeStatsCard, statsData, showJerseyOverlay, sport,
}: {
  firstName: string; position: string; school: string; jerseyNumber: string;
  fontStyle: FontStyle; accentHex: string; includeStatsCard: boolean;
  statsData: Record<string, string>; showJerseyOverlay: boolean; sport: string;
}) {
  const font        = FONT_MAP[fontStyle];
  const name        = (firstName || "ATHLETE").toUpperCase();
  const pos         = (position || "YOUR POSITION").toUpperCase();
  const meta        = [jerseyNumber ? `#${jerseyNumber}` : null, school || null].filter(Boolean).join(" · ");
  const nameWeight  = fontStyle === "Athletic" ? 400 : 700;
  const isLight     = isLightColor(accentHex);

  const topStats = Object.entries(statsData).filter(([,v]) => v.trim()).slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Preview</p>

      {/* Title card mini */}
      <div className="rounded-xl overflow-hidden relative" style={{ background: "#050A14", border: `1px solid ${accentHex}40`, aspectRatio: "16/9", transition: "border-color 0.3s" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.02) 19px, rgba(255,255,255,0.02) 20px)` }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${accentHex}22 0%, transparent 68%)`, transition: "background 0.3s" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentHex, transition: "background 0.3s" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px", textAlign: "center" }}>
          <div style={{ width: 28, height: 2, background: accentHex, borderRadius: 1, marginBottom: 6, transition: "background 0.3s" }} />
          <div style={{ fontFamily: font, fontSize: "18px", fontWeight: nameWeight, color: "#FFF", letterSpacing: fontStyle === "Athletic" ? "0.06em" : "0.03em", lineHeight: 1, transition: "all 0.2s" }}>{name}</div>
          <div style={{ fontFamily: font, fontSize: "7px", fontWeight: 600, color: accentHex, letterSpacing: "0.22em", marginTop: 5, transition: "all 0.2s" }}>{pos}</div>
          {meta && <div style={{ fontSize: "6px", color: "#94a3b8", letterSpacing: "0.1em", marginTop: 3 }}>{meta.toUpperCase()}</div>}
        </div>
        <div style={{ position: "absolute", bottom: 4, right: 7, fontFamily: "'Courier New', monospace", fontSize: "5px", fontWeight: 700, color: `${accentHex}65`, letterSpacing: "0.18em" }}>CLIPT</div>
      </div>

      {/* Stats card mini */}
      {includeStatsCard && topStats.length > 0 && (
        <div className="rounded-xl overflow-hidden relative" style={{ background: "#050A14", border: `1px solid ${accentHex}25`, aspectRatio: "16/9" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${accentHex}12 0%, transparent 70%)` }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accentHex }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <div style={{ fontSize: 6, color: accentHex, letterSpacing: 3, fontWeight: 700 }}>SEASON STATS</div>
            <div style={{ display: "flex", gap: 6 }}>
              {topStats.map(([key, val]) => (
                <div key={key} className="text-center" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accentHex}30`, borderRadius: 4, padding: "4px 8px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: accentHex }}>{val}</div>
                  <div style={{ fontSize: 5, color: "#64748b", letterSpacing: 1 }}>{key.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lower third mini */}
      {showJerseyOverlay && (
        <div className="rounded-lg overflow-hidden" style={{ background: "#050A14", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ background: "rgba(5,10,20,0.93)", padding: "6px 10px", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 3, height: 28, background: accentHex, borderRadius: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>
                {name}{jerseyNumber ? `  #${jerseyNumber}` : ""}
              </div>
              <div style={{ fontSize: 7, color: accentHex, letterSpacing: 1, marginTop: 1 }}>
                {[sport, position, school].filter(Boolean).join(" · ").toUpperCase() || "SPORT · POSITION · SCHOOL"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color accent chip */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md shrink-0 ring-1 ring-white/10" style={{ background: accentHex, transition: "background 0.2s" }} />
        <span className="text-xs text-slate-400 font-mono">{accentHex.toUpperCase()}</span>
        {isLight && <span className="text-[9px] text-slate-500">· dark text on export</span>}
      </div>
    </div>
  );
}

// ── Onboarding Tooltips ───────────────────────────────────────────────────────

function OnboardTooltip({
  step, total, message, onDismiss, accent,
}: {
  step: number; total: number; message: string; onDismiss: () => void; accent: string;
}) {
  return (
    <div className="tooltip-in flex items-start gap-3 rounded-xl px-4 py-3 mb-3"
      style={{ background: `${accent}14`, border: `1px solid ${accent}40` }}>
      <span style={{ color: accent, marginTop: 1 }}><InfoIcon /></span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white font-medium leading-snug">{message}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Tip {step} of {total}</p>
      </div>
      <button type="button" onClick={onDismiss} className="shrink-0 text-xs font-bold rounded-lg px-2.5 py-1 transition-all"
        style={{ background: accent, color: isLightColor(accent) ? "#050A14" : "#fff" }}>
        Got it
      </button>
    </div>
  );
}

// ── AI Clip type (matches process page output) ─────────────────────────────────

interface AiClip {
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
}

interface AiJobMeta {
  jerseyNumber: number;
  firstName: string;
  sport: string;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const router = useRouter();
  const reel   = useReel();

  // ── AI Clips detection ───────────────────────────────────────────────────
  const [aiClips,    setAiClips]    = useState<AiClip[] | null>(null);
  const [aiMeta,     setAiMeta]     = useState<AiJobMeta | null>(null);
  const [aiBannerDismissed, setAiBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Only load AI clips if user arrived via the AI processing flow
      const clipSource = localStorage.getItem("clipSource");
      if (clipSource === "manual") return;

      const raw = localStorage.getItem("aiGeneratedClips");
      const metaRaw = localStorage.getItem("aiJobMeta");
      if (raw) {
        const parsed = JSON.parse(raw) as AiClip[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiClips(parsed);
        }
      }
      if (metaRaw) {
        setAiMeta(JSON.parse(metaRaw) as AiJobMeta);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const initialNames = reel.files.length > 0 ? reel.files.map((f) => f.name) : reel.clipNames;

  // If AI clips are available, derive clip names from them; otherwise use manual clips
  const derivedInitialClips = (): Array<{ name: string; label: string; playLabel: string; aiClip?: AiClip }> => {
    if (aiClips && aiClips.length > 0) {
      return aiClips.map((c) => ({
        name: c.playType,
        label: c.playType,
        playLabel: c.playType,
        aiClip: c,
      }));
    }
    return initialNames.map((n, i) => ({
      name: n, label: reel.clipLabels?.[i] || "", playLabel: reel.clipPlayLabels?.[i] || "",
    }));
  };

  const [clips, setClips] = useState<{ name: string; label: string; playLabel: string; aiClip?: AiClip }[]>(
    derivedInitialClips
  );

  // Re-sync when aiClips first loads (after mount)
  useEffect(() => {
    if (aiClips && aiClips.length > 0) {
      setClips(aiClips.map((c) => ({
        name: c.playType,
        label: c.playType,
        playLabel: c.playType,
        aiClip: c,
      })));
    }
  }, [aiClips]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag reorder ──────────────────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault(); setDragOver(i);
    if (dragIdx.current === null || dragIdx.current === i) return;
    setClips((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(i, 0, moved);
      dragIdx.current = i;
      return next;
    });
  };
  const onDragEnd = () => { dragIdx.current = null; setDragOver(null); };

  // ── Sport / positions ─────────────────────────────────────────────────────
  const sport     = reel.sport || "";
  const positions = SPORTS_CONFIG[sport]?.positions ?? [];

  // ── State ─────────────────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState(reel.firstName || "");
  const [position,    setPosition]    = useState(() => positions.includes(reel.position) ? reel.position : "");
  const [gradYear,    setGradYear]    = useState(reel.gradYear || "");
  const [heightFt,    setHeightFt]    = useState(reel.heightFt || "");
  const [heightIn,    setHeightIn]    = useState(reel.heightIn || "");
  const [weight,      setWeight]      = useState(reel.weight || "");
  const [gpa,         setGpa]         = useState(reel.gpa || "");
  const [email,       setEmail]       = useState(reel.email || "");
  const [coachName,   setCoachName]   = useState(reel.coachName || "");
  const [coachEmail,  setCoachEmail]  = useState(reel.coachEmail || "");

  // Music
  const [musicTrackId,  setMusicTrackId]  = useState(reel.musicTrackId || "no-music");
  const [playingTrack,  setPlayingTrack]  = useState<string | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Color
  const [accentHex,    setAccentHexLocal] = useState(reel.accentHex || "#00A3FF");
  const [savedColors,  setSavedColors]    = useState<string[]>(reel.savedColors || []);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [rgbR, setRgbR] = useState(() => hexToRgb(reel.accentHex || "#00A3FF").r);
  const [rgbG, setRgbG] = useState(() => hexToRgb(reel.accentHex || "#00A3FF").g);
  const [rgbB, setRgbB] = useState(() => hexToRgb(reel.accentHex || "#00A3FF").b);

  // Style
  const [fontStyle,        setFontStyle]        = useState<FontStyle>(reel.fontStyle || "Modern");
  const [transition,       setTransition]        = useState(reel.transition || "Hard Cut");
  const [includeStatsCard, setIncludeStatsCard]  = useState(reel.includeStatsCard || false);
  const [statsData,        setStatsData]         = useState<Record<string,string>>(reel.statsData || {});
  const [showAcademic,     setShowAcademic]      = useState(reel.showAcademicStats || false);
  const [showMeasurables,  setShowMeasurables]   = useState(reel.showMeasurablesCard || false);
  const [academicData,     setAcademicData]      = useState<Record<string,string>>(reel.academicStatsData || {});
  const [measurablesData,  setMeasurablesData]   = useState<Record<string,string>>(reel.measurablesData || {});
  const [reelLength,       setReelLength]        = useState(reel.reelLength || 3);
  const [highlightPlayer,  setHighlightPlayer]   = useState(reel.highlightPlayer || false);
  const [enhanceQuality,   setEnhanceQuality]    = useState(reel.enhanceQuality ?? true);
  const [showJerseyOverlay,setShowJerseyOverlay] = useState(reel.showJerseyOverlay ?? true);

  // New premium
  const [titleTemplate,   setTitleTemplate]  = useState<TitleCardTemplate>(reel.titleCardTemplate || "espn-classic");
  const [introAnim,       setIntroAnim]      = useState<IntroAnimation>(reel.introAnimation || "clean-cut");
  const [watermark,       setWatermark]      = useState<WatermarkStyle>(reel.watermarkStyle || "clipt");
  const [aspectRatio,     setAspectRatio]    = useState(reel.exportAspectRatio || "16:9");
  const [labelMyPlays,    setLabelMyPlays]   = useState(reel.labelMyPlays || false);
  const [bestPlayIdx,     setBestPlayIdx]    = useState(reel.bestPlayIndex ?? -1);
  const [highlightBest,   setHighlightBest]  = useState(reel.highlightBestPlay || false);
  const [slowMo,          setSlowMo]         = useState(reel.slowMotionReplay || false);

  // Computed
  const isLight   = isLightColor(accentHex);
  const btnColor  = isLight ? "#050A14" : "#ffffff";

  // Stats fields — sport-specific from SPORTS_CONFIG
  const { base: baseStats, extra: extraStats } = SPORTS_CONFIG[sport]?.getStatFields(position) ?? getStatFields(sport, position);
  const [showExtraStats, setShowExtraStats] = useState(false);
  const clipLabelOpts = SPORTS_CONFIG[sport]?.clipLabels ?? getClipLabels(sport);
  const diversityWarn = checkDiversity(clips.map((c) => c.label));

  // Duration
  const overhead        = 4 + (includeStatsCard ? 4 : 0) + (showMeasurables ? 3 : 0) + 5;
  const estimatedSec    = reelLength * 60 + overhead;
  const limitSec        = SPORTS_CONFIG[sport]?.recommendedLength.warnAt ?? 300;
  const durationColor   = estimatedSec < limitSec ? "#22C55E" : estimatedSec < limitSec + 60 ? "#F59E0B" : "#EF4444";
  const durationFillPct = Math.min((estimatedSec / limitSec) * 100, 100);

  // Onboarding
  const [onboardStep, setOnboardStep] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("clipt_onboard_done");
    if (!done) setOnboardStep(1);
  }, []);
  const dismissOnboard = (step: number) => {
    if (step >= 3) {
      localStorage.setItem("clipt_onboard_done", "1");
      setOnboardStep(0);
    } else {
      setOnboardStep(step + 1);
    }
  };

  // ── Music handlers ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (playTimer.current) clearTimeout(playTimer.current);
    };
  }, []);

  const handlePlayTrack = (trackId: string, url: string) => {
    if (playingTrack === trackId) {
      audioRef.current?.pause();
      setPlayingTrack(null);
      return;
    }
    audioRef.current?.pause();
    if (playTimer.current) clearTimeout(playTimer.current);
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingTrack(trackId);
    playTimer.current = setTimeout(() => {
      audio.pause();
      setPlayingTrack(null);
    }, 15000);
    audio.onended = () => setPlayingTrack(null);
  };

  // ── Color handlers ────────────────────────────────────────────────────────
  const applyAccentHex = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    setAccentHexLocal(hex);
    setRgbR(r); setRgbG(g); setRgbB(b);
    reel.update({ accentHex: hex, colorAccent: "Electric Blue" }); // keep legacy field
  };

  const handleRgbChange = (r: number, g: number, b: number) => {
    setRgbR(r); setRgbG(g); setRgbB(b);
    const hex = rgbToHex(r, g, b);
    setAccentHexLocal(hex);
    reel.update({ accentHex: hex });
  };

  const saveCustomColor = (hex: string) => {
    const next = [hex, ...savedColors.filter((c) => c !== hex)].slice(0, 5);
    setSavedColors(next);
    reel.update({ savedColors: next });
  };

  const handleHexInput = (raw: string) => {
    const hex = raw.startsWith("#") ? raw : "#" + raw;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      applyAccentHex(hex);
      saveCustomColor(hex);
    } else {
      setAccentHexLocal(hex); // allow typing without full validation
    }
  };

  // ── Stat handlers ─────────────────────────────────────────────────────────
  const handleStat   = (key: string, val: string) => setStatsData((p)   => ({ ...p, [key]: val }));
  const handleAcad   = (key: string, val: string) => setAcademicData((p) => ({ ...p, [key]: val }));
  const handleMeas   = (key: string, val: string) => setMeasurablesData((p) => ({ ...p, [key]: val }));

  // ── Clip label handlers ───────────────────────────────────────────────────
  const updatePlayLabel = (i: number, val: string) => {
    setClips((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], playLabel: val.slice(0, 20) };
      return next;
    });
  };
  const updateDiversityLabel = (i: number, val: string) => {
    setClips((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], label: val };
      return next;
    });
  };

  // ── Save & next ───────────────────────────────────────────────────────────
  const handleNext = () => {
    audioRef.current?.pause();
    reel.update({
      firstName, position, gradYear, heightFt, heightIn, weight, gpa, email, coachName, coachEmail,
      musicTrackId, accentHex,
      fontStyle, transition: transition as never,
      reelLength, highlightPlayer, enhanceQuality, showJerseyOverlay,
      includeStatsCard, statsData,
      showAcademicStats: showAcademic, showMeasurablesCard: showMeasurables,
      academicStatsData: academicData, measurablesData,
      titleCardTemplate: titleTemplate,
      introAnimation: introAnim,
      watermarkStyle: watermark,
      exportAspectRatio: aspectRatio as never,
      labelMyPlays, bestPlayIndex: bestPlayIdx, highlightBestPlay: highlightBest, slowMotionReplay: slowMo,
      clipLabels: clips.map((c) => c.label),
      clipPlayLabels: clips.map((c) => c.playLabel),
    });
    router.push("/export");
  };

  const TRANSITION_OPTIONS = [
    { id: "Hard Cut",      desc: "Instant switch" },
    { id: "Fade to Black", desc: "Black fade"     },
    { id: "Crossfade",     desc: "Dissolve"       },
    { id: "Flash Cut",     desc: "White flash"    },
  ];
  const WATERMARK_OPTIONS: { id: WatermarkStyle; label: string; desc: string }[] = [
    { id: "clipt",     label: "CLIPT",           desc: "Subtle branded watermark" },
    { id: "jersey",    label: "Jersey #",         desc: `Shows #${reel.jerseyNumber || "00"}` },
    { id: "initials",  label: "School Initials",  desc: "First letters of school" },
    { id: "none",      label: "None",             desc: "No watermark"            },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#050A14]/90 backdrop-blur-md border-b border-white/[0.04] py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <button type="button" onClick={() => router.push("/upload")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon /><span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex-1 max-w-xs">
            <ProgressBar active={2} accent={accentHex} />
          </div>
          <button type="button" onClick={handleNext}
            className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: accentHex, color: btnColor }}>
            Next: Export →
          </button>
        </div>
      </div>

      {/* ── AI Generated Banner ── */}
      {aiClips && aiClips.length > 0 && !aiBannerDismissed && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex items-center justify-between gap-4 rounded-xl px-5 py-3.5"
            style={{ background: "rgba(0,163,255,0.09)", border: "1px solid rgba(0,163,255,0.28)" }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-black"
                style={{ background: "rgba(0,163,255,0.18)", color: "#00A3FF" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                </svg>
                AI REEL
              </div>
              <span className="text-white text-sm font-semibold truncate">
                AI found <strong>{aiClips.length} clips</strong> featuring jersey{" "}
                <strong style={{ color: "#00A3FF" }}>#{aiMeta?.jerseyNumber ?? "?"}</strong>
                {aiMeta?.firstName ? ` for ${aiMeta.firstName}` : ""} — your best plays are already sorted by quality.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => {
                localStorage.removeItem("aiGeneratedClips");
                localStorage.removeItem("aiJobMeta");
                setAiClips(null);
                setAiMeta(null);
                setAiBannerDismissed(true);
                // Reset to manual clips
                const names = reel.files.length > 0 ? reel.files.map((f) => f.name) : reel.clipNames;
                setClips(names.map((n, i) => ({ name: n, label: reel.clipLabels?.[i] || "", playLabel: reel.clipPlayLabels?.[i] || "" })));
              }}
                className="text-xs text-slate-400 hover:text-white transition-colors font-semibold whitespace-nowrap">
                Use Manual Clips
              </button>
              <button onClick={() => setAiBannerDismissed(true)}
                className="text-slate-500 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3-column layout ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr_280px] gap-6">

          {/* ── LEFT: Clips panel ── */}
          <div className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl overflow-hidden" style={cardBase}>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Clips ({clips.length})
                  </p>
                  {aiClips && aiClips.length > 0 && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(0,163,255,0.12)", color: "#00A3FF", border: "1px solid rgba(0,163,255,0.25)" }}>
                      AI SORTED
                    </span>
                  )}
                </div>
                {clips.length === 0 ? (
                  <p className="text-slate-600 text-xs">No clips uploaded</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {clips.map((clip, i) => (
                      <div key={`${clip.name}-${i}`}
                        draggable onDragStart={() => onDragStart(i)}
                        onDragOver={(e) => onDragOver(e, i)} onDragEnd={onDragEnd}
                        className="flex items-start gap-2 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all"
                        style={{
                          background: dragOver === i ? `${accentHex}12` : (clip.aiClip ? "rgba(0,163,255,0.04)" : "transparent"),
                          border: `1px solid ${dragOver === i ? accentHex + "40" : (clip.aiClip ? "rgba(0,163,255,0.12)" : "transparent")}`,
                        }}>
                        <span className="text-slate-600 shrink-0 mt-0.5"><GripIcon /></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs text-slate-300 truncate">{clip.name}</p>
                            {clip.aiClip?.aiPicked && (
                              <span className="shrink-0 text-[8px] font-black px-1.5 py-px rounded"
                                style={{ background: "rgba(251,191,36,0.18)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.3)" }}>
                                AI PICK
                              </span>
                            )}
                          </div>
                          {clip.aiClip && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", maxWidth: 48 }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.round(clip.aiClip.confidenceScore * 100)}%`, background: "#00A3FF" }} />
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {Math.round(clip.aiClip.confidenceScore * 100)}%
                              </span>
                            </div>
                          )}
                          {!clip.aiClip && clip.playLabel && (
                            <p className="text-[10px] text-slate-500 truncate">{clip.playLabel}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {/* Best play star */}
                          {highlightBest && (
                            <button type="button" onClick={() => setBestPlayIdx(bestPlayIdx === i ? -1 : i)}
                              className="transition-colors" style={{ color: bestPlayIdx === i ? accentHex : "#334155" }}>
                              <StarIcon filled={bestPlayIdx === i} />
                            </button>
                          )}
                          {/* Remove clip button for AI clips */}
                          {clip.aiClip && (
                            <button type="button"
                              onClick={() => setClips((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-slate-600 hover:text-red-400 transition-colors" title="Remove clip">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                          <span className="text-[10px] font-bold text-slate-600">{i + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {diversityWarn && (
                  <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    <p className="text-[10px] text-[#FBBF24] leading-snug">
                      ⚠️ Many clips labeled &ldquo;{diversityWarn}&rdquo; — coaches like variety
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── CENTER: Sections ── */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* 1. REEL INFO */}
            <CollapsibleSection title="Reel Info" subtitle="Your athlete profile — shown on every card" accent={accentHex}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">First Name *</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jordan"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Jersey #</label>
                  <input value={reel.jerseyNumber} onChange={(e) => reel.update({ jerseyNumber: e.target.value })} placeholder="23"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Position</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                    style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <option value="">Select position</option>
                    {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Class of</label>
                  <select value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                    style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <option value="">Select year</option>
                    {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">School</label>
                  <input value={reel.school} onChange={(e) => reel.update({ school: e.target.value })} placeholder="Westlake High School"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="athlete@email.com"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Height</label>
                  <div className="flex gap-2">
                    <input value={heightFt} onChange={(e) => setHeightFt(e.target.value)} placeholder="6" maxLength={1}
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    <input value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="3" maxLength={2}
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Weight (lbs)</label>
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="185"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 font-medium block mb-1">Coach Name (optional)</label>
                  <input value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Coach Smith"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 font-medium block mb-1">Coach Email (optional)</label>
                  <input type="email" value={coachEmail} onChange={(e) => setCoachEmail(e.target.value)} placeholder="coach@university.edu"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>
              </div>
            </CollapsibleSection>

            {/* 2. MUSIC LIBRARY */}
            <CollapsibleSection title="Music Library" subtitle="20 royalty-free tracks · lazy-loaded previews" accent={accentHex} defaultOpen={false}>
              {/* Coach Tip */}
              {onboardStep === 2 && (
                <OnboardTooltip step={2} total={3} accent={accentHex}
                  message="🔇 Coaches usually watch on mute. Choose music that fits your vibe, but don't stress about it."
                  onDismiss={() => dismissOnboard(2)} />
              )}
              <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
                style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <span style={{ fontSize: 16 }}>🔇</span>
                <p className="text-xs text-[#FBBF24] font-medium">Coach Tip: Most coaches watch on mute. Music is for your social posts.</p>
              </div>

              <div className="flex flex-col gap-4">
                {MUSIC_CATEGORIES.map((cat) => {
                  const [catOpen, setCatOpen] = useState(cat.category === "Coach Recommended");
                  return (
                    <div key={cat.category}>
                      <button type="button" onClick={() => setCatOpen((o) => !o)}
                        className="flex items-center gap-2 mb-2 w-full text-left">
                        <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                        <span className="text-sm font-bold text-white">{cat.category}</span>
                        <span className="text-[10px] text-slate-500 ml-1">({cat.tracks.length} tracks)</span>
                        <span className="ml-auto" style={{ color: accentHex }}><ChevronDownIcon open={catOpen} /></span>
                      </button>
                      {catOpen && (
                        <div className="flex flex-col gap-1">
                          {cat.tracks.map((track) => (
                            <MusicTrackRow
                              key={track.id}
                              track={track}
                              isSelected={musicTrackId === track.id}
                              isPlaying={playingTrack === track.id}
                              accent={accentHex}
                              onSelect={() => setMusicTrackId(track.id)}
                              onTogglePlay={() => track.url ? handlePlayTrack(track.id, track.url) : null}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* 3. COLOR & STYLE */}
            <CollapsibleSection title="Color & Style" subtitle="24 presets · custom color picker · live preview" accent={accentHex}>
              {onboardStep === 1 && (
                <OnboardTooltip step={1} total={3} accent={accentHex}
                  message="🎨 Match your school colors here. Pick a preset or enter a custom hex code."
                  onDismiss={() => dismissOnboard(1)} />
              )}

              {/* 24 Presets */}
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">School Color Presets</p>
              <div className="grid grid-cols-6 gap-2 mb-5">
                {PRESET_COLORS.map((c) => (
                  <ColorSwatch key={c.hex} hex={c.hex} name={c.name} selected={accentHex === c.hex} accent={accentHex}
                    onClick={() => applyAccentHex(c.hex)} />
                ))}
              </div>

              {/* Custom color picker */}
              <button type="button" onClick={() => setShowColorPicker((o) => !o)}
                className="flex items-center gap-2 text-sm font-semibold mb-3 transition-colors"
                style={{ color: accentHex }}>
                <div className="w-5 h-5 rounded-md" style={{ background: accentHex, border: "1px solid rgba(255,255,255,0.1)" }} />
                Custom Color {showColorPicker ? "▲" : "▼"}
              </button>

              {showColorPicker && (
                <div className="rounded-xl p-4 mb-4 flex flex-col gap-4" style={{ background: "#050A14", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {/* Hex input + native picker */}
                  <div className="flex items-center gap-3">
                    <input type="color" value={accentHex.slice(0, 7)} onChange={(e) => {
                      const hex = e.target.value;
                      applyAccentHex(hex);
                      saveCustomColor(hex);
                    }} className="w-12 h-10 rounded-lg cursor-pointer" style={{ border: "none", padding: 2 }} />
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 block mb-1">Hex</label>
                      <input type="text" value={accentHex} onChange={(e) => handleHexInput(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                        placeholder="#00A3FF" maxLength={7} />
                    </div>
                  </div>

                  {/* RGB sliders */}
                  {[
                    { label: "R", val: rgbR, set: (v: number) => handleRgbChange(v, rgbG, rgbB), color: "#ef4444" },
                    { label: "G", val: rgbG, set: (v: number) => handleRgbChange(rgbR, v, rgbB), color: "#22c55e" },
                    { label: "B", val: rgbB, set: (v: number) => handleRgbChange(rgbR, rgbG, v), color: "#3b82f6" },
                  ].map(({ label, val, set, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-4 text-slate-400">{label}</span>
                      <input type="range" min={0} max={255} value={val} onChange={(e) => set(Number(e.target.value))}
                        className="flex-1 accent-current h-1.5 rounded"
                        style={{ accentColor: color }} />
                      <span className="text-xs font-mono text-slate-400 w-8 text-right">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Saved colors */}
              {savedColors.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Recently Used</p>
                  <div className="flex gap-2">
                    {savedColors.map((hex) => (
                      <button key={hex} type="button" onClick={() => applyAccentHex(hex)}
                        className="w-8 h-8 rounded-lg transition-all"
                        style={{ background: hex, border: accentHex === hex ? `2px solid #fff` : "2px solid transparent", boxShadow: accentHex === hex ? "0 0 0 1px rgba(255,255,255,0.3)" : "none" }}
                        title={hex} />
                    ))}
                  </div>
                </div>
              )}

              {/* Font style */}
              <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Font Style</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {FONT_STYLES.map((f) => (
                  <button key={f} type="button" onClick={() => setFontStyle(f)}
                    className="rounded-xl py-3 px-2 text-center transition-all"
                    style={{
                      background: fontStyle === f ? `${accentHex}18` : "rgba(255,255,255,0.04)",
                      border: fontStyle === f ? `1.5px solid ${accentHex}60` : "1.5px solid rgba(255,255,255,0.06)",
                    }}>
                    <div className="text-sm font-bold text-white mb-0.5" style={{ fontFamily: FONT_MAP[f] }}>{f}</div>
                    <div className="text-[9px] text-slate-500" style={{ fontFamily: FONT_MAP[f] }}>Aa</div>
                  </button>
                ))}
              </div>

              {/* Transition style */}
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Clip Transition</p>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITION_OPTIONS.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTransition(t.id as typeof transition)}
                    className="rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      background: transition === t.id ? `${accentHex}14` : "rgba(255,255,255,0.03)",
                      border: transition === t.id ? `1px solid ${accentHex}50` : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    <div className="flex items-center gap-2">
                      {transition === t.id && <div className="w-3 h-3 rounded-full" style={{ background: accentHex }} />}
                      <span className="text-xs font-semibold text-white">{t.id}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* 4. STATS SYSTEM */}
            <CollapsibleSection title="Stats System" subtitle="Season stats · academic · athletic measurables" accent={accentHex} defaultOpen={false}>
              {onboardStep === 3 && (
                <OnboardTooltip step={3} total={3} accent={accentHex}
                  message="📊 Add your season stats to stand out. Coaches make scholarship decisions based on academic + athletic data."
                  onDismiss={() => dismissOnboard(3)} />
              )}

              {/* Show stats card toggle */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Include Stats Card</p>
                  <p className="text-xs text-slate-500">4-second stat card after title card</p>
                </div>
                <Toggle on={includeStatsCard} onToggle={() => setIncludeStatsCard((o) => !o)} accent={accentHex} />
              </div>

              {includeStatsCard && (
                <>
                  {/* Base stats */}
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Season Stats</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {baseStats.map((f) => (
                      <StatInput key={f.key} field={f} value={statsData[f.key] || ""} onChange={(v) => handleStat(f.key, v)} accent={accentHex} />
                    ))}
                  </div>

                  {/* Extra stats toggle */}
                  {extraStats.length > 0 && (
                    <>
                      <button type="button" onClick={() => setShowExtraStats((o) => !o)}
                        className="text-xs font-semibold mb-3 flex items-center gap-1.5 transition-colors"
                        style={{ color: accentHex }}>
                        {showExtraStats ? "− Hide" : "+ Show"} advanced stats
                      </button>
                      {showExtraStats && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {extraStats.map((f) => (
                            <StatInput key={f.key} field={f} value={statsData[f.key] || ""} onChange={(v) => handleStat(f.key, v)} accent={accentHex} />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Academic stats toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Show Academic Stats</p>
                      <p className="text-xs text-slate-500">GPA, SAT, ACT, major — coaches care</p>
                    </div>
                    <Toggle on={showAcademic} onToggle={() => setShowAcademic((o) => !o)} accent={accentHex} />
                  </div>
                  {showAcademic && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {ACADEMIC.map((f) => (
                        <StatInput key={f.key} field={f} value={academicData[f.key] || ""} onChange={(v) => handleAcad(f.key, v)} accent={accentHex} />
                      ))}
                    </div>
                  )}

                  {/* Measurables toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Show Measurables Card</p>
                      <p className="text-xs text-slate-500">3s card: wingspan, vertical, hand size, speed</p>
                    </div>
                    <Toggle on={showMeasurables} onToggle={() => setShowMeasurables((o) => !o)} accent={accentHex} />
                  </div>
                  {showMeasurables && (
                    <div className="grid grid-cols-2 gap-3">
                      {(SPORTS_CONFIG[sport]?.measurables ?? MEASURABLES).map((f) => (
                        <StatInput key={f.key} field={{ ...f, benchmark: 0 }} value={measurablesData[f.key] || ""} onChange={(v) => handleMeas(f.key, v)} accent={accentHex} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CollapsibleSection>

            {/* 5. TITLE CARD TEMPLATE */}
            <CollapsibleSection title="Title Card Template" subtitle="Choose your opening card design" accent={accentHex} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TITLE_TEMPLATES.map((t) => (
                  <TemplateCard key={t.id} info={t} selected={titleTemplate === t.id} accent={accentHex}
                    onClick={() => setTitleTemplate(t.id)} />
                ))}
              </div>
            </CollapsibleSection>

            {/* 6. INTRO ANIMATION */}
            <CollapsibleSection title="Intro Animation" subtitle="How the title card enters the screen" accent={accentHex} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {INTRO_ANIMS.map((a) => (
                  <IntroAnimCard key={a.id} info={a} selected={introAnim === a.id} accent={accentHex}
                    onClick={() => setIntroAnim(a.id)} />
                ))}
              </div>
            </CollapsibleSection>

            {/* 7. CLIP CUSTOMIZATION */}
            <CollapsibleSection title="Clip Customization" subtitle="Labels, highlights, slow motion" accent={accentHex} defaultOpen={false}>
              {/* Enhance quality */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Enhance Video Quality</p>
                  <p className="text-xs text-slate-500">Applies contrast/saturation filter per frame</p>
                </div>
                <Toggle on={enhanceQuality} onToggle={() => setEnhanceQuality((o) => !o)} accent={accentHex} />
              </div>

              {/* Jersey overlay */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Jersey Number Overlay</p>
                  <p className="text-xs text-slate-500">Persistent lower-third on all clips</p>
                </div>
                <Toggle on={showJerseyOverlay} onToggle={() => setShowJerseyOverlay((o) => !o)} accent={accentHex} />
              </div>

              <div className="h-px my-4" style={{ background: "rgba(255,255,255,0.05)" }} />

              {/* Label My Plays */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">Label My Plays</p>
                  <p className="text-xs text-slate-500">Short overlay text for first 1.5s of each clip</p>
                </div>
                <Toggle on={labelMyPlays} onToggle={() => setLabelMyPlays((o) => !o)} accent={accentHex} />
              </div>

              {labelMyPlays && clips.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {clips.map((clip, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-5 shrink-0">{i + 1}.</span>
                      <input
                        type="text"
                        value={clip.playLabel}
                        onChange={(e) => updatePlayLabel(i, e.target.value)}
                        placeholder="Pull Up 3, Chase Block…"
                        maxLength={20}
                        className="flex-1 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <span className="text-[9px] text-slate-600 shrink-0">{clip.playLabel.length}/20</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Highlight Best Play */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">Highlight Best Play ★</p>
                  <p className="text-xs text-slate-500">Glowing accent border pulse on your standout clip</p>
                </div>
                <Toggle on={highlightBest} onToggle={() => setHighlightBest((o) => !o)} accent={accentHex} />
              </div>
              {highlightBest && (
                <div className="rounded-lg px-3 py-2 mb-4" style={{ background: `${accentHex}0D`, border: `1px solid ${accentHex}25` }}>
                  <p className="text-xs text-slate-400">
                    Tap the ★ on any clip in the left panel to mark it as your best play.
                    {bestPlayIdx >= 0 ? ` Clip ${bestPlayIdx + 1} selected.` : " No clip selected."}
                  </p>
                </div>
              )}

              {/* Slow Motion Replay */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">Add Slow Motion Replay</p>
                  <p className="text-xs text-slate-500">50% speed replay immediately after best play</p>
                </div>
                <Toggle on={slowMo} onToggle={() => setSlowMo((o) => !o)} accent={accentHex} />
              </div>
              {slowMo && (
                <div className="rounded-lg px-3 py-2 mb-4" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <p className="text-xs text-[#FBBF24]">⚠️ Use sparingly — coaches prefer full speed footage.</p>
                </div>
              )}

              {/* Diversity labels */}
              {clips.length > 0 && (
                <>
                  <div className="h-px my-4" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Clip Diversity Labels</p>
                  <div className="flex flex-col gap-2">
                    {clips.map((clip, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-5 shrink-0">{i + 1}.</span>
                        <select value={clip.label} onChange={(e) => updateDiversityLabel(i, e.target.value)}
                          className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                          style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <option value="">Select play type…</option>
                          {clipLabelOpts.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CollapsibleSection>

            {/* 8. WATERMARK */}
            <CollapsibleSection title="Watermark" subtitle="Shown in corner of every clip" accent={accentHex} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                {WATERMARK_OPTIONS.map((w) => (
                  <button key={w.id} type="button" onClick={() => setWatermark(w.id)}
                    className="rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      background: watermark === w.id ? `${accentHex}14` : "rgba(255,255,255,0.03)",
                      border: watermark === w.id ? `1.5px solid ${accentHex}50` : "1.5px solid rgba(255,255,255,0.06)",
                    }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {watermark === w.id && <div className="w-3 h-3 rounded-full" style={{ background: accentHex }} />}
                      <span className="text-xs font-bold text-white">{w.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{w.desc}</p>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* 9. EXPORT FORMAT / ASPECT RATIO */}
            <CollapsibleSection title="Output Format" subtitle="Aspect ratio optimized for each platform" accent={accentHex} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                {ASPECT_OPTIONS.map((a) => {
                  const maxDim  = 54;
                  const normW   = (a.w / Math.max(a.w, a.h)) * maxDim;
                  const normH   = (a.h / Math.max(a.w, a.h)) * maxDim;
                  const isSel   = aspectRatio === a.id;
                  return (
                    <button key={a.id} type="button" onClick={() => setAspectRatio(a.id)}
                      className="rounded-xl p-4 text-left transition-all flex flex-col items-center gap-3"
                      style={{
                        background: isSel ? `${accentHex}12` : "rgba(255,255,255,0.03)",
                        border: isSel ? `1.5px solid ${accentHex}55` : "1.5px solid rgba(255,255,255,0.06)",
                      }}>
                      {/* Aspect ratio shape */}
                      <div className="flex items-center justify-center" style={{ width: 60, height: 60 }}>
                        <div className="rounded-sm" style={{
                          width: normW, height: normH,
                          background: isSel ? accentHex : "rgba(255,255,255,0.15)",
                          border: isSel ? `none` : "1px solid rgba(255,255,255,0.2)",
                          transition: "all 0.2s",
                        }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 justify-center">
                          {isSel && <div className="w-3 h-3 rounded-full" style={{ background: accentHex }} />}
                          <span className="text-xs font-bold text-white">{a.label}</span>
                        </div>
                        <p className="text-[10px] font-mono" style={{ color: accentHex }}>{a.sublabel}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{a.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* 10. DURATION */}
            <CollapsibleSection title="Reel Duration" subtitle="Total length including cards" accent={accentHex} defaultOpen={false}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">{reelLength} min of clips</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: durationColor }}>
                  ~{fmtDuration(estimatedSec)} total
                </span>
              </div>
              <input type="range" min={1} max={5} step={0.5} value={reelLength}
                onChange={(e) => setReelLength(Number(e.target.value))}
                className="w-full mb-3" style={{ accentColor: accentHex }} />
              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${durationFillPct}%`, background: durationColor }} />
              </div>
              <p className="text-xs text-slate-500">
                {sport === "Basketball" ? "Basketball: coaches prefer under 4 min" : sport === "Football" ? "Football: coaches prefer under 5 min" : "Keep it under 5 min"}
              </p>
            </CollapsibleSection>

            {/* Next button */}
            <button type="button" onClick={handleNext}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: accentHex, color: btnColor }}>
              Next: Export Your Reel →
            </button>
          </div>

          {/* ── RIGHT: Live Preview ── */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="rounded-2xl p-4" style={cardBase}>
                <LivePreviewPanel
                  firstName={firstName}
                  position={position}
                  school={reel.school}
                  jerseyNumber={reel.jerseyNumber}
                  fontStyle={fontStyle}
                  accentHex={accentHex}
                  includeStatsCard={includeStatsCard}
                  statsData={statsData}
                  showJerseyOverlay={showJerseyOverlay}
                  sport={sport}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
