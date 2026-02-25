"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type MusicId = "none" | "hype" | "energetic" | "cinematic";
export type StyleId = "electric" | "fire" | "gold" | "stealth";
export type Quality = "720p" | "1080p" | "4k";

interface ReelState {
  files: File[];
  firstName: string;
  jerseyNumber: string;
  sport: string;
  school: string;
  showIntro: boolean;
  music: MusicId;
  style: StyleId;
  quality: Quality;
}

interface ReelContextValue extends ReelState {
  update: (patch: Partial<ReelState>) => void;
}

const ReelContext = createContext<ReelContextValue | null>(null);

export function ReelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReelState>({
    files: [],
    firstName: "",
    jerseyNumber: "",
    sport: "",
    school: "",
    showIntro: true,
    music: "hype",
    style: "electric",
    quality: "1080p",
  });

  const update = (patch: Partial<ReelState>) =>
    setState((prev) => ({ ...prev, ...patch }));

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
