"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// ── Legacy types (kept for upload page compat) ──────────────────────────────
export type MusicId  = "none" | "hype" | "energetic" | "cinematic";
export type StyleId  = "electric" | "fire" | "gold" | "stealth";
export type Quality  = "720p" | "1080p" | "4k";

// ── New customize types ─────────────────────────────────────────────────────
export type MusicStyle  = "Hype" | "Cinematic" | "Trap" | "Drill" | "Orchestral" | "NoMusic";
export type ColorAccent = "Electric Blue" | "Red" | "Gold" | "Green" | "Purple" | "White";
export type IntroStyle  = "Name + School" | "Stats Card" | "Hype Intro";
export type FontStyle   = "Modern" | "Bold" | "Clean" | "Athletic";

interface ReelState {
  // Upload page
  files:        File[];
  clipNames:    string[];   // persisted to localStorage; mirrors file names
  firstName:    string;
  jerseyNumber: string;
  sport:        string;
  school:       string;
  // Customize page
  position:     string;
  musicStyle:   MusicStyle;
  colorAccent:  ColorAccent;
  reelLength:   number;     // minutes 1–5
  introStyle:   IntroStyle;
  fontStyle:    FontStyle;
  // Legacy (kept so export page still works)
  showIntro: boolean;
  music:     MusicId;
  style:     StyleId;
  quality:   Quality;
}

const DEFAULTS: ReelState = {
  files:        [],
  clipNames:    [],
  firstName:    "",
  jerseyNumber: "",
  sport:        "",
  school:       "",
  position:     "",
  musicStyle:   "Hype",
  colorAccent:  "Electric Blue",
  reelLength:   2,
  introStyle:   "Name + School",
  fontStyle:    "Modern",
  showIntro:    true,
  music:        "hype",
  style:        "electric",
  quality:      "1080p",
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
    // Keep clipNames in sync with actual files when files are present
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
        // Auto-sync clipNames when files are updated
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
