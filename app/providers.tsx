"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// ── Legacy types (kept for backward compat) ───────────────────────────────────
export type MusicId  = "none" | "hype" | "energetic" | "cinematic";
export type StyleId  = "electric" | "fire" | "gold" | "stealth";
export type Quality  = "720p" | "1080p" | "4k";

// ── Core types ─────────────────────────────────────────────────────────────────
export type MusicStyle      = "NoMusic" | "Hype" | "Cinematic" | "Trap" | "Drill" | "Piano" | "LoFi";
export type ColorAccent     = "Electric Blue" | "Red" | "Gold" | "Green" | "Purple" | "White";
export type IntroStyle      = "Name + School" | "Stats Card" | "Hype Intro";
export type FontStyle       = "Modern" | "Bold" | "Clean" | "Athletic";
export type TransitionStyle = "Hard Cut" | "Fade to Black" | "Crossfade" | "Flash Cut";

// ── New premium types ──────────────────────────────────────────────────────────
export type TitleCardTemplate = "espn-classic" | "nike-clean" | "draft-board" | "neon" | "championship" | "minimal";
export type IntroAnimation    = "fade-in" | "slide-in" | "reveal" | "glitch" | "clean-cut";
export type WatermarkStyle    = "clipt" | "jersey" | "initials" | "none";
export type ExportAspectRatio = "16:9" | "9:16" | "1:1" | "21:9";
export type ExportQuality     = "coach" | "standard" | "social";

interface ReelState {
  // Upload
  files:      File[];
  clipNames:  string[];
  clipLabels: string[];   // per-clip diversity labels

  // Athlete identity
  firstName:    string;
  jerseyNumber: string;
  sport:        string;
  school:       string;

  // Title card fields
  position:   string;
  gradYear:   string;
  heightFt:   string;
  heightIn:   string;
  weight:     string;
  gpa:        string;
  email:      string;
  coachName:  string;
  coachEmail: string;

  // Customize — legacy (kept for compat)
  musicStyle:        MusicStyle;
  colorAccent:       ColorAccent;
  reelLength:        number;
  introStyle:        IntroStyle;
  fontStyle:         FontStyle;
  transition:        TransitionStyle;
  includeStatsCard:  boolean;
  statsData:         Record<string, string>;
  highlightPlayer:   boolean;
  enhanceQuality:    boolean;
  showJerseyOverlay: boolean;

  // Per-clip editor
  clipTrimStarts:   number[];
  clipTrimEnds:     number[];
  clipTextOverlays: string[];
  clipIntensities:  number[];

  // ── New premium fields ───────────────────────────────────────────────────────

  // Music (new track-based system)
  musicTrackId: string;   // e.g. "nba-warmup", "espn-feature", "no-music"

  // Color (direct hex — replaces named ColorAccent for new UI)
  accentHex:   string;   // e.g. "#00A3FF"
  savedColors: string[]; // last 5 custom picks

  // Title card & intro
  titleCardTemplate: TitleCardTemplate;
  introAnimation:    IntroAnimation;

  // Clip customization
  clipPlayLabels:   string[];  // per-clip overlay label for first 1.5s
  bestPlayIndex:    number;    // -1 = none
  labelMyPlays:     boolean;
  highlightBestPlay: boolean;
  slowMotionReplay:  boolean;

  // Watermark & export format
  watermarkStyle:    WatermarkStyle;
  exportAspectRatio: ExportAspectRatio;
  exportQuality:     ExportQuality;

  // Extended stats
  showAcademicStats:   boolean;
  showMeasurablesCard: boolean;
  academicStatsData:   Record<string, string>;
  measurablesData:     Record<string, string>;

  // Shareable reel
  reelId: string;

  // Legacy
  showIntro: boolean;
  music:     MusicId;
  style:     StyleId;
  quality:   Quality;
}

const DEFAULTS: ReelState = {
  files:      [],
  clipNames:  [],
  clipLabels: [],

  firstName:    "",
  jerseyNumber: "",
  sport:        "",
  school:       "",

  position:   "",
  gradYear:   "",
  heightFt:   "",
  heightIn:   "",
  weight:     "",
  gpa:        "",
  email:      "",
  coachName:  "",
  coachEmail: "",

  musicStyle:        "NoMusic",
  colorAccent:       "Electric Blue",
  reelLength:        3,
  introStyle:        "Name + School",
  fontStyle:         "Modern",
  transition:        "Hard Cut",
  includeStatsCard:  false,
  statsData:         {},
  highlightPlayer:   false,
  enhanceQuality:    true,
  showJerseyOverlay: true,

  clipTrimStarts:   [],
  clipTrimEnds:     [],
  clipTextOverlays: [],
  clipIntensities:  [],

  // New premium defaults
  musicTrackId:   "no-music",
  accentHex:      "#00A3FF",
  savedColors:    [],

  titleCardTemplate: "espn-classic",
  introAnimation:    "clean-cut",

  clipPlayLabels:    [],
  bestPlayIndex:     -1,
  labelMyPlays:      false,
  highlightBestPlay: false,
  slowMotionReplay:  false,

  watermarkStyle:    "clipt",
  exportAspectRatio: "16:9",
  exportQuality:     "coach",

  showAcademicStats:   false,
  showMeasurablesCard: false,
  academicStatsData:   {},
  measurablesData:     {},

  reelId: "",

  showIntro: true,
  music:     "hype",
  style:     "electric",
  quality:   "1080p",
};

const STORAGE_KEY = "clipt_reel";

function loadFromStorage(): Partial<Omit<ReelState, "files">> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: ReelState) {
  if (typeof window === "undefined") return;
  try {
    const { files, ...rest } = state;
    const clipNames = files.length > 0 ? files.map((f) => f.name) : rest.clipNames;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, clipNames }));
  } catch {}
}

interface ReelContextValue extends ReelState {
  update: (patch: Partial<ReelState>) => void;
}

const ReelContext = createContext<ReelContextValue | null>(null);

export function ReelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReelState>(() => {
    const saved = loadFromStorage();
    return { ...DEFAULTS, ...saved, files: [] };
  });

  const update = (patch: Partial<ReelState>) => {
    setState((prev) => {
      const next: ReelState = {
        ...prev,
        ...patch,
        clipNames: patch.files
          ? patch.files.map((f) => f.name)
          : (patch.clipNames ?? prev.clipNames),
      };
      saveToStorage(next);
      return next;
    });
  };

  return (
    <ReelContext.Provider value={{ ...state, update }}>
      {children}
    </ReelContext.Provider>
  );
}

export function useReel() {
  const ctx = useContext(ReelContext);
  if (!ctx) throw new Error("useReel must be used within ReelProvider");
  return ctx;
}
