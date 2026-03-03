"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import { SPORTS_CONFIG } from "../../lib/sportsConfig";
import { TitleCardPreview } from "../../components/TitleCardPreview";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClipItem {
  id: string;
  name: string;
  blobUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  trimStart: number;
  trimEnd: number | undefined;
  skillCategory: string;
  playType?: string;
  qualityScore?: number;
  markX?: number; // player spotlight X position 0–100 (default 50)
  markY?: number; // player spotlight Y position 0–100 (default 40)
}

interface CliptDataClip {
  name: string;
  duration: number;
  thumbnailUrl: string | null;
  blobUrl: string;
  playType?: string;
  qualityScore?: number;
}

interface CliptData {
  firstName?: string;
  lastName?: string;
  jerseyNumber?: string;
  jerseyColor?: string;
  sport?: string;
  position?: string;
  school?: string;
  gradYear?: string;
  email?: string;
  statsData?: Record<string, string>;
  clips?: CliptDataClip[];
}

interface SavedSettings {
  clips?: ClipItem[];
  titleCard?: Record<string, string>;
  stats?: Record<string, string>;
  settings?: { colorAccent?: string };
  spotlightStyle?: string;
  exportType?: string;
  musicId?: string;
  music?: string;
  musicUrl?: string | null;
  musicName?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function fmtDur(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getSkillCategories(sport: string): string[] {
  if (sport === "Basketball") return ["Scoring", "Defensive", "Passing", "Rebounding", "Transition"];
  if (sport === "Football")   return ["Touchdown/Score", "Blocking", "Defense", "Special Teams", "Rushing"];
  if (sport === "Lacrosse")   return ["Scoring", "Defensive", "Ground Balls", "Transition", "Specialty"];
  return ["Offense", "Defense", "Transition", "Specialty"];
}

function getDefaultCategory(sport: string): string {
  if (sport === "Basketball") return "Scoring";
  if (sport === "Football")   return "Touchdown/Score";
  if (sport === "Lacrosse")   return "Scoring";
  return "Offense";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  { hex: "#00A3FF", name: "Electric Blue" },
  { hex: "#FF0000", name: "Red"           },
  { hex: "#FFD700", name: "Gold"          },
  { hex: "#00CC44", name: "Green"         },
  { hex: "#8B00FF", name: "Purple"        },
  { hex: "#FF6600", name: "Orange"        },
  { hex: "#FFFFFF", name: "White"         },
  { hex: "#1A1A2E", name: "Black"         },
  { hex: "#003087", name: "Navy"          },
  { hex: "#CC0000", name: "Cardinal"      },
  { hex: "#006400", name: "Forest Green"  },
  { hex: "#C0C0C0", name: "Silver"        },
];

const MUSIC_TRACKS = [
  { id: "no-music", name: "No Music",       desc: "Clean — coach preferred",               url: null },
  { id: "hype-1",   name: "Hype Mode",      desc: "Hard hitting sport energy",             url: "https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3" },
  { id: "hype-2",   name: "Game Time",      desc: "Intense drums and bass",                url: "https://assets.mixkit.co/music/preview/mixkit-boxing-workout-625.mp3" },
  { id: "hype-3",   name: "Champion",       desc: "Triumphant cinematic sport",            url: "https://assets.mixkit.co/music/preview/mixkit-sports-victory-623.mp3" },
  { id: "hype-4",   name: "Grind Season",   desc: "Motivational hip hop",                  url: "https://assets.mixkit.co/music/preview/mixkit-rap-workout-668.mp3" },
  { id: "hype-5",   name: "Beast Mode",     desc: "Dark trap instrumental",                url: "https://assets.mixkit.co/music/preview/mixkit-trap-hip-hop-intro-340.mp3" },
  { id: "hype-6",   name: "Warm Up",        desc: "Smooth basketball vibes",               url: "https://assets.mixkit.co/music/preview/mixkit-basketball-hip-hop-498.mp3" },
  { id: "custom",   name: "Upload My Own",  desc: "MP3, WAV or M4A up to 15MB",           url: null },
];

const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029", "2030", "2031"];

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="9"  cy="5"  r="1.3" fill="currentColor" /><circle cx="9"  cy="12" r="1.3" fill="currentColor" />
    <circle cx="9"  cy="19" r="1.3" fill="currentColor" /><circle cx="15" cy="5"  r="1.3" fill="currentColor" />
    <circle cx="15" cy="12" r="1.3" fill="currentColor" /><circle cx="15" cy="19" r="1.3" fill="currentColor" />
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Input styles ──────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  background: "#0D1F38", border: "1px solid rgba(255,255,255,0.08)",
  color: "#FFFFFF", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8",
  textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6,
};

// ── Live Preview: Stats Card ──────────────────────────────────────────────────

interface StatsCardPreviewProps {
  statsData: Record<string, string>;
  sport: string; position: string; accentHex: string;
}

function StatsCardPreview({ statsData, sport, position, accentHex }: StatsCardPreviewProps) {
  const sportConfig = SPORTS_CONFIG[sport];
  const allFields = sportConfig
    ? [...sportConfig.getStatFields(position).base, ...sportConfig.getStatFields(position).extra]
    : [];
  const filled = allFields.filter(f => statsData[f.key]?.trim());
  const show   = filled.slice(0, 12); // show up to 12 (2 slides worth)

  return (
    <div style={{ aspectRatio: "16/9", background: "#050A14", borderRadius: 8, overflow: "hidden", position: "relative", fontFamily: "Inter, sans-serif" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accentHex }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "6% 6% 5%", gap: "4%" }}>
        <div style={{ fontSize: "clamp(5px, 1.4vw, 11px)", color: accentHex, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Season Stats {sport ? `· ${sport}` : ""}
        </div>
        {show.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontSize: "clamp(5px, 1.2vw, 11px)" }}>
            Fill in your stats above to see a preview
          </div>
        ) : (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4%", alignItems: "center" }}>
            {show.map(f => (
              <div key={f.key} style={{ textAlign: "center", background: "#0A1628", borderRadius: 4, padding: "5% 3%", borderTop: `2px solid ${accentHex}` }}>
                <div style={{ fontSize: "clamp(9px, 2.5vw, 20px)", fontWeight: 800, color: "#FFFFFF" }}>{statsData[f.key]}</div>
                <div style={{ fontSize: "clamp(4px, 1vw, 9px)", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "6%" }}>{f.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  number: number; title: string; subtitle: string;
  open: boolean; onToggle: () => void;
  accentHex: string; children: React.ReactNode;
  tipBadge?: { text: string; color: string };
}

function SectionCard({ number, title, subtitle, open, onToggle, accentHex, children, tipBadge }: SectionCardProps) {
  return (
    <div style={{ background: "#0A1628", borderRadius: 16, overflow: "hidden", borderLeft: `3px solid ${open ? accentHex : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.2s ease" }}>
      <button type="button" onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: open ? accentHex : "#1E293B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, transition: "background 0.2s ease" }}>
          {number}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{title}</span>
            {tipBadge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: `${tipBadge.color}18`, color: tipBadge.color,
                border: `1px solid ${tipBadge.color}35`, whiteSpace: "nowrap", flexShrink: 0,
              }}>{tipBadge.text}</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ color: "#475569", flexShrink: 0 }}>
          <ChevronIcon open={open} />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 24px 24px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const router     = useRouter();
  const { update: reelUpdate } = useReel();

  // ── Open section ────────────────────────────────────────────────────────────
  const [openSection, setOpenSection] = useState<number>(1);

  // ── Clips ───────────────────────────────────────────────────────────────────
  const [clips, setClips]               = useState<ClipItem[]>([]);
  const dragIndexRef                    = useRef<number | null>(null);
  const [dragOver, setDragOver]         = useState<number | null>(null);
  const [expandedClip, setExpandedClip] = useState<string | null>(null);

  // ── Title card ──────────────────────────────────────────────────────────────
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [sport,        setSport]        = useState("");
  const [position,     setPosition]     = useState("");
  const [school,       setSchool]       = useState("");
  const [gradYear,     setGradYear]     = useState("");
  const [email,        setEmail]        = useState("");
  const [coachName,    setCoachName]    = useState("");
  const [coachEmail,   setCoachEmail]   = useState("");
  const [clubTeam,     setClubTeam]     = useState("");
  const [location,     setLocation]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [heightFt,     setHeightFt]     = useState("");
  const [heightIn,     setHeightIn]     = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [hometown,     setHometown]     = useState("");
  const [achievement,  setAchievement]  = useState("");

  // ── Stats ───────────────────────────────────────────────────────────────────
  const [statsData, setStatsData] = useState<Record<string, string>>({});

  // ── Color ───────────────────────────────────────────────────────────────────
  const [accentHex,   setAccentHex]   = useState("#00A3FF");
  const [customHex,   setCustomHex]   = useState("");
  const [jerseyColor, setJerseyColor] = useState<string | null>(null);

  // ── Spotlight ───────────────────────────────────────────────────────────────
  const [spotlightStyle, setSpotlightStyle] = useState<"arrow" | "circle" | "none">("arrow");

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exportType,    setExportType]    = useState<"landscape" | "social">("landscape");

  // ── Music ────────────────────────────────────────────────────────────────────
  const [selectedMusic,     setSelectedMusic]     = useState<string>("no-music");
  const [selectedMusicUrl,  setSelectedMusicUrl]  = useState<string | null>(null);
  const [selectedMusicName, setSelectedMusicName] = useState<string | null>(null);
  const [previewingTrack,   setPreviewingTrack]   = useState<string | null>(null);
  const [uploadedMusicName, setUploadedMusicName] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Audio cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // ── Error ───────────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  // ── Load from localStorage ───────────────────────────────────────────────────
  useEffect(() => {
    const d    = safeJson<CliptData>("cliptData", {});
    const prev = safeJson<SavedSettings>("cliptSettings", {});

    // Athlete info from upload step
    if (d.firstName)    setFirstName(d.firstName);
    if (d.lastName)     setLastName(d.lastName);
    if (d.jerseyNumber) setJerseyNumber(d.jerseyNumber);
    if (d.sport)        setSport(d.sport);
    if (d.position)     setPosition(d.position);
    if (d.school)       setSchool(d.school);
    if (d.gradYear)     setGradYear(d.gradYear);
    if (d.email)        setEmail(d.email);
    if (d.jerseyColor)  { setJerseyColor(d.jerseyColor); setAccentHex(d.jerseyColor); }

    // Overwrite with previously saved settings (returning users)
    if (prev.titleCard) {
      const tc = prev.titleCard;
      if (tc.firstName)    setFirstName(tc.firstName);
      if (tc.lastName)     setLastName(tc.lastName);
      if (tc.jerseyNumber) setJerseyNumber(tc.jerseyNumber);
      if (tc.sport)        setSport(tc.sport);
      if (tc.position)     setPosition(tc.position);
      if (tc.school)       setSchool(tc.school);
      if (tc.gradYear)     setGradYear(tc.gradYear);
      if (tc.email)        setEmail(tc.email);
      if (tc.coachName)    setCoachName(tc.coachName);
      if (tc.coachEmail)   setCoachEmail(tc.coachEmail);
      if (tc.clubTeam)     setClubTeam(tc.clubTeam);
      if (tc.location)     setLocation(tc.location);
      else if (tc.city || tc.state) setLocation([tc.city, tc.state].filter(Boolean).join(", ")); // migrate legacy
      if (tc.phone)        setPhone(tc.phone);
      if (tc.heightFt)     setHeightFt(tc.heightFt);
      if (tc.heightIn)     setHeightIn(tc.heightIn);
      if (tc.socialHandle) setSocialHandle(tc.socialHandle);
      if (tc.hometown)     setHometown(tc.hometown);
      if (tc.achievement)  setAchievement(tc.achievement);
    }
    if (prev.stats)  setStatsData(prev.stats);
    else if (d.statsData) setStatsData(d.statsData);

    if (prev.settings?.colorAccent) setAccentHex(prev.settings.colorAccent);

    if (prev.spotlightStyle === "arrow" || prev.spotlightStyle === "circle" || prev.spotlightStyle === "none") {
      setSpotlightStyle(prev.spotlightStyle);
    }
    if (prev.exportType === "landscape" || prev.exportType === "social") {
      setExportType(prev.exportType);
    } else if (prev.exportType === "coach") {
      setExportType("landscape"); // migrate legacy value
    }
    if (prev.music) {
      setSelectedMusic(prev.music);
      setSelectedMusicUrl(prev.musicUrl ?? null);
      setSelectedMusicName(prev.musicName ?? null);
    } else if (prev.musicId) {
      // migrate legacy musicId — try to find in current tracks, fall back to no-music
      const legacyTrack = MUSIC_TRACKS.find(m => m.id === prev.musicId);
      if (legacyTrack) {
        setSelectedMusic(legacyTrack.id);
        setSelectedMusicUrl(legacyTrack.url ?? null);
        setSelectedMusicName(legacyTrack.name);
      } else {
        setSelectedMusic("no-music");
      }
    }

    // Build clip list
    const defaultCat   = getDefaultCategory(d.sport || "");
    const prevClipMap  = new Map((prev.clips ?? []).map(c => [c.name, c]));

    if (d.clips && d.clips.length > 0) {
      setClips(d.clips.map((c, i) => {
        const saved = prevClipMap.get(c.name);
        return {
          id:            `clip-${i}-${Date.now()}`,
          name:          c.name,
          blobUrl:       c.blobUrl ?? "",
          thumbnailUrl:  c.thumbnailUrl,
          duration:      c.duration,
          trimStart:     saved?.trimStart ?? 0,
          trimEnd:       saved?.trimEnd,
          skillCategory: saved?.skillCategory ?? defaultCat,
          playType:      c.playType,
          qualityScore:  c.qualityScore,
        };
      }));
    }
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const sportConfig  = SPORTS_CONFIG[sport] || null;
  const positions    = sportConfig?.positions ?? [];
  const statFields   = sportConfig ? sportConfig.getStatFields(position) : { base: [], extra: [] };
  const skillCats    = getSkillCategories(sport);
  const totalSeconds = clips.reduce((s, c) => s + (c.duration || 0), 0);

  const filledStatCount = Object.keys(statsData).filter(k => statsData[k]?.trim()).length;
  const healthScore = Math.min(100, Math.round(
    (clips.length > 0 ? 30 : 0) +
    (firstName && lastName ? 20 : firstName ? 10 : 0) +
    (coachEmail ? 20 : coachName ? 10 : 0) +
    (filledStatCount >= 3 ? 20 : filledStatCount >= 1 ? 10 : 0) +
    (email ? 10 : 0)
  ));
  const healthColor = healthScore >= 80 ? "#22C55E" : healthScore >= 50 ? "#F59E0B" : "#EF4444";

  // ── Drag and drop ────────────────────────────────────────────────────────────
  function handleDragStart(idx: number) {
    dragIndexRef.current = idx;
  }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === idx) { setDragOver(idx); return; }
    setClips(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    dragIndexRef.current = idx;
    setDragOver(idx);
  }
  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOver(null);
  }

  // ── Clip mutations ───────────────────────────────────────────────────────────
  function setClipCategory(id: string, cat: string) {
    setClips(prev => prev.map(c => c.id === id ? { ...c, skillCategory: cat } : c));
  }
  function setClipTrim(id: string, field: "trimStart" | "trimEnd", val: string) {
    const num = parseFloat(val);
    setClips(prev => prev.map(c => c.id === id ? { ...c, [field]: isNaN(num) ? undefined : num } : c));
  }
  function setClipMark(id: string, x: number, y: number) {
    setClips(prev => prev.map(c => c.id === id ? { ...c, markX: x, markY: y } : c));
  }
  function removeClip(id: string) {
    setClips(prev => prev.filter(c => c.id !== id));
  }

  // ── Music preview ────────────────────────────────────────────────────────────
  const handlePreviewToggle = useCallback((trackId: string, trackUrl: string | null) => {
    if (!trackUrl) return;
    if (previewingTrack === trackId) {
      previewAudioRef.current?.pause();
      setPreviewingTrack(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      const audio = new Audio(trackUrl);
      audio.crossOrigin = "anonymous";
      audio.volume = 0.7;
      previewAudioRef.current = audio;
      audio.play().catch(err => console.log("Preview failed:", err));
      audio.addEventListener("ended", () => setPreviewingTrack(null));
      setPreviewingTrack(trackId);
    }
  }, [previewingTrack]);

  function selectMusicTrack(track: typeof MUSIC_TRACKS[0]) {
    if (track.id === "no-music") {
      setSelectedMusic("no-music");
      setSelectedMusicUrl(null);
      setSelectedMusicName(null);
    } else if (track.id === "custom") {
      setSelectedMusic("custom");
      // URL set when user picks file
    } else {
      setSelectedMusic(track.id);
      setSelectedMusicUrl(track.url ?? null);
      setSelectedMusicName(track.name);
    }
  }

  function handleMusicFileUpload(file: File) {
    const blobUrl = URL.createObjectURL(file);
    setSelectedMusic("custom");
    setSelectedMusicUrl(blobUrl);
    setSelectedMusicName(file.name);
    setUploadedMusicName(file.name);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (clips.length === 0) {
      setError("Please go back to Upload and add at least 1 clip.");
      return;
    }
    if (!firstName.trim()) {
      setError("First name is required — fill it in the Opening Title Card section.");
      setOpenSection(3);
      return;
    }
    setError(null);

    const statsEnabled = filledStatCount > 0;

    // Resolve final music values
    const finalMusic     = selectedMusic;
    const finalMusicUrl  = selectedMusicUrl;
    const finalMusicName = selectedMusicName;

    console.log("SAVING MUSIC:", finalMusic, finalMusicUrl, finalMusicName);
    console.log("SAVING EXPORT TYPE:", exportType);

    const cliptSettings = {
      clips: clips.map(c => ({
        name:          c.name,
        blobUrl:       c.blobUrl,
        thumbnailUrl:  c.thumbnailUrl,
        duration:      c.duration,
        trimStart:     c.trimStart,
        trimEnd:       c.trimEnd,
        skillCategory: c.skillCategory,
        playType:      c.playType,
        qualityScore:  c.qualityScore,
        markX:         c.markX,
        markY:         c.markY,
      })),
      titleCard: {
        firstName, lastName, jerseyNumber, position, sport, school, gradYear,
        email, coachName, coachEmail, clubTeam, location, phone,
        heightFt, heightIn, socialHandle, hometown, achievement,
      },
      stats: statsData,
      settings: {
        colorAccent:   accentHex,
        transition:    "Hard Cut",
        jerseyOverlay: true,
        statsEnabled,
      },
      spotlightStyle,
      exportType,          // "landscape" or "social"
      music:     finalMusic,     // track identifier
      musicUrl:  finalMusicUrl,  // full URL or null
      musicName: finalMusicName, // display name or null
    };

    try {
      localStorage.setItem("cliptSettings", JSON.stringify(cliptSettings));
      // Also patch cliptData so legacy export reads statsData
      const existing = safeJson<CliptData>("cliptData", {});
      localStorage.setItem("cliptData", JSON.stringify({ ...existing, statsData }));
    } catch (e) {
      console.warn("Failed to save cliptSettings:", e);
    }

    // Update provider for canvas export fallback
    reelUpdate({
      firstName, jerseyNumber, sport, school, position, gradYear,
      email, coachName, coachEmail, accentHex, statsData,
      includeStatsCard: statsEnabled,
      showJerseyOverlay: true,
    });

    router.push("/export");
  }

  // ── Accent button style ──────────────────────────────────────────────────────
  const isLightAccent = accentHex === "#FFFFFF" || accentHex === "#C0C0C0";
  const accentBtnStyle = {
    background: isLightAccent ? accentHex : `linear-gradient(135deg, ${accentHex}cc 0%, ${accentHex} 100%)`,
    color:      isLightAccent ? "#050A14" : "#FFFFFF",
    padding: "18px 24px", borderRadius: 14, border: "none", cursor: "pointer",
    fontSize: 17, fontWeight: 700, width: "100%",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#050A14", color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ maxWidth: 780, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/upload")} style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14 }}>
          <ArrowLeftIcon /> Back
        </button>
        {/* Step indicator */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
          {[{ n: 1, label: "Upload" }, { n: 2, label: "Customize" }, { n: 3, label: "Export" }].map((s, si) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: s.n === 2 ? accentHex : s.n < 2 ? "#1E3A5F" : "#1E293B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                {s.n < 2 ? <CheckIcon /> : s.n}
              </div>
              <span style={{ fontSize: 12, color: s.n === 2 ? "#FFFFFF" : "#475569", fontWeight: s.n === 2 ? 600 : 400 }}>{s.label}</span>
              {si < 2 && <div style={{ width: 20, height: 1, background: "#1E293B" }} />}
            </div>
          ))}
        </div>
      </nav>

      {/* ── HEADER ── */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "4px 24px 28px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>Customize Your Reel</h1>
        <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>
          Coaches decide in 30 seconds. Make every second count.
        </p>
      </div>

      {/* ── COACH OPTIMIZATION BANNER ── */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 20px" }}>
        <div style={{
          background: "#0A1628", borderRadius: 16,
          borderLeft: "3px solid #00A3FF", padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>Coach-Optimized Defaults</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Clipt automatically handles what coaches care about most</div>
            </div>
          </div>
          {/* 3-column badge grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 8, marginBottom: 14,
          }}>
            {[
              { label: "Hard Cuts Between Clips",     reason: "Coaches prefer no transitions",           check: "#22C55E" },
              { label: "No Music (Coach Version)",    reason: "98% of coaches watch on mute",            check: "#22C55E" },
              { label: "Best Plays First",            reason: "AI sorted by quality score",              check: "#22C55E" },
              { label: "1080p HD Export",             reason: "Professional broadcast quality",          check: "#22C55E" },
              { label: "Sport-Specific Stats",        reason: "Position-matched automatically",          check: "#22C55E" },
              { label: "6-Second Title Card",         reason: "Industry standard display time",          check: "#22C55E" },
              { label: "Contact Info on End Card",    reason: "Coach can reach you immediately",         check: "#22C55E" },
            ].map((item) => (
              <div key={item.label} style={{
                background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)",
                borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <span style={{ color: item.check, fontWeight: 700, fontSize: 13, lineHeight: 1.3, flexShrink: 0 }}>✓</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.reason}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#475569", fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>
            These settings match what college coaches at D1 programs told us they want to see. You focus on picking your best clips — we handle the rest.
          </p>
        </div>
      </div>

      {/* ── SECTIONS ── */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 120px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ─── 1 · YOUR CLIPS ─── */}
        <SectionCard
          number={1}
          title="Your Clips"
          subtitle={clips.length > 0 ? `${clips.length} clips · ${fmtDur(totalSeconds)} total` : "Drag to reorder, rate your best plays"}
          open={openSection === 1}
          onToggle={() => setOpenSection(openSection === 1 ? 0 : 1)}
          accentHex={accentHex}
          tipBadge={{ text: "Best plays first — coaches decide in 30 seconds", color: "#F97316" }}
        >
          {/* Reel health bar */}
          <div style={{ marginBottom: 20, padding: "14px 16px", background: "#0D1F38", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reel Health Score</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: healthColor }}>{healthScore}/100</span>
            </div>
            <div style={{ height: 6, background: "#1E293B", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${healthScore}%`, background: healthColor, borderRadius: 3, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 6, lineHeight: 1.5 }}>
              {healthScore < 50
                ? "Add coach email + at least 3 stats to boost your score"
                : healthScore < 80
                ? "Almost there — rate your best clips and add coach info"
                : "Great reel! Coaches will be impressed"}
            </div>
          </div>

          {clips.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "#475569" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 15, marginBottom: 16 }}>No clips loaded</div>
              <button onClick={() => router.push("/upload")}
                style={{ background: accentHex, color: isLightAccent ? "#050A14" : "#FFFFFF", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Go Upload Clips
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clips.map((clip, idx) => {
                const isExpanded = expandedClip === clip.id;
                return (
                  <div
                    key={clip.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: "#0D1F38", borderRadius: 10, overflow: "hidden",
                      border: dragOver === idx ? `1px solid ${accentHex}` : "1px solid rgba(255,255,255,0.06)",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* Clip header row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                      {/* Drag handle */}
                      <div style={{ color: "#334155", cursor: "grab", flexShrink: 0, lineHeight: 0 }}><GripIcon /></div>
                      {/* Thumbnail */}
                      {clip.thumbnailUrl ? (
                        <img src={clip.thumbnailUrl} alt="" style={{ width: 56, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 56, height: 32, background: "#1E293B", borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎬</div>
                      )}
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clip.name}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                          {fmtDur(clip.duration)} · {clip.skillCategory}
                          {clip.playType && <span style={{ marginLeft: 6 }}>· {clip.playType}</span>}
                        </div>
                      </div>
                      {/* Expand */}
                      <button type="button" onClick={() => setExpandedClip(isExpanded ? null : clip.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 4, lineHeight: 0 }}>
                        <ChevronIcon open={isExpanded} />
                      </button>
                      {/* Remove */}
                      <button type="button" onClick={() => removeClip(clip.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "4px 6px", fontSize: 18, lineHeight: 1 }}>
                        ×
                      </button>
                    </div>

                    {/* Expanded clip options */}
                    {isExpanded && (
                      <div style={{ padding: "0 12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        {/* Video preview with tap-to-mark */}
                        {clip.blobUrl && (
                          <div style={{ marginTop: 12 }}>
                            <label style={labelStyle}>
                              Mark Yourself
                              <span style={{ color: "#475569", fontWeight: 400, textTransform: "none", marginLeft: 6 }}>— tap the video to set your spotlight position</span>
                            </label>
                            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                              <video
                                src={clip.blobUrl}
                                playsInline muted controls
                                style={{ width: "100%", display: "block", maxHeight: 200, objectFit: "contain" }}
                                onClick={e => {
                                  const rect = (e.target as HTMLVideoElement).getBoundingClientRect();
                                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                  setClipMark(clip.id, x, y);
                                }}
                              />
                              {/* Crosshair at mark position */}
                              {(clip.markX !== undefined || clip.markY !== undefined) && (
                                <div style={{
                                  position: "absolute", pointerEvents: "none",
                                  left: `${clip.markX ?? 50}%`, top: `${clip.markY ?? 40}%`,
                                  transform: "translate(-50%, -50%)",
                                  width: 32, height: 32,
                                  border: `2px solid ${accentHex}`,
                                  borderRadius: "50%",
                                  boxShadow: `0 0 0 1px rgba(0,0,0,0.6)`,
                                }} />
                              )}
                            </div>
                            {(clip.markX !== undefined || clip.markY !== undefined) && (
                              <div style={{ fontSize: 11, color: accentHex, marginTop: 4 }}>
                                ✓ Marked at {clip.markX ?? 50}%, {clip.markY ?? 40}%
                                <button type="button" onClick={() => setClipMark(clip.id, 50, 40)}
                                  style={{ marginLeft: 10, fontSize: 10, color: "#475569", background: "none", border: "none", cursor: "pointer" }}>
                                  Reset
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Play Type */}
                        <div style={{ marginTop: 12 }}>
                          <label style={labelStyle}>Play Type</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {skillCats.map(cat => (
                              <button key={cat} type="button" onClick={() => setClipCategory(clip.id, cat)}
                                style={{
                                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                  cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                                  background: clip.skillCategory === cat ? accentHex : "transparent",
                                  borderColor: clip.skillCategory === cat ? accentHex : "rgba(255,255,255,0.1)",
                                  color: clip.skillCategory === cat ? "#fff" : "#64748b",
                                }}>
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Trim */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                          <div>
                            <label style={labelStyle}>Trim Start (sec)</label>
                            <input type="number" min={0} max={clip.duration} step={0.1}
                              value={clip.trimStart || ""} placeholder="0"
                              onChange={e => setClipTrim(clip.id, "trimStart", e.target.value)}
                              style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Trim End (sec)</label>
                            <input type="number" min={0} max={clip.duration} step={0.1}
                              value={clip.trimEnd ?? ""} placeholder={String(Math.round(clip.duration))}
                              onChange={e => setClipTrim(clip.id, "trimEnd", e.target.value)}
                              style={inputStyle} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ─── 2 · PLAYER SPOTLIGHT ─── */}
        <SectionCard
          number={2}
          title="Player Spotlight"
          subtitle="A 2-second overlay before each clip that identifies you"
          open={openSection === 2}
          onToggle={() => setOpenSection(openSection === 2 ? 0 : 2)}
          accentHex={accentHex}
          tipBadge={{ text: "Coaches stop watching if they can't find you", color: "#00A3FF" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {(
              [
                { id: "arrow",  label: "Arrow + Name",     desc: "Bold arrow points to you with your jersey #",     emoji: "⬇️" },
                { id: "circle", label: "Circle Highlight", desc: "Pulsing circle highlights your jersey number",    emoji: "⭕" },
                { id: "none",   label: "No Spotlight",     desc: "Clean cuts — no overlay between clips",           emoji: "✂️" },
              ] as const
            ).map(opt => (
              <button key={opt.id} type="button" onClick={() => setSpotlightStyle(opt.id)}
                style={{
                  padding: "18px 12px", borderRadius: 12, border: "2px solid",
                  textAlign: "center", cursor: "pointer", transition: "all 0.15s",
                  borderColor: spotlightStyle === opt.id ? accentHex : "rgba(255,255,255,0.08)",
                  background:  spotlightStyle === opt.id ? `${accentHex}20` : "#0D1F38",
                }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{opt.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{opt.desc}</div>
                {spotlightStyle === opt.id && <div style={{ marginTop: 8, fontSize: 11, color: accentHex, fontWeight: 600 }}>✓ Selected</div>}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* ─── 3 · OPENING TITLE CARD ─── */}
        <SectionCard
          number={3}
          title="Opening Title Card"
          subtitle="6-second ESPN-style intro — the first thing coaches see"
          open={openSection === 3}
          onToggle={() => setOpenSection(openSection === 3 ? 0 : 3)}
          accentHex={accentHex}
          tipBadge={{ text: "The one element every coach reads", color: "#22C55E" }}
        >
          {/* Live preview */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Live Preview</label>
            <TitleCardPreview
              firstName={firstName} lastName={lastName} jerseyNumber={jerseyNumber}
              position={position} sport={sport} school={school} gradYear={gradYear}
              heightFt={heightFt} heightIn={heightIn} weight={""} gpa={""}
              email={email} phone={phone} coachName={coachName} coachEmail={coachEmail}
              clubTeam={clubTeam} location={location}
              socialHandle={socialHandle} achievement={achievement}
              accentColor={accentHex}
            />
          </div>

          {/* Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Marcus" />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Johnson" />
            </div>
            <div>
              <label style={labelStyle}>Jersey #</label>
              <input style={inputStyle} value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} placeholder="e.g. 23" />
            </div>
            <div>
              <label style={labelStyle}>Sport</label>
              <select style={{ ...inputStyle, appearance: "none" }} value={sport}
                onChange={e => { setSport(e.target.value); setPosition(""); }}>
                <option value="">Select sport</option>
                {Object.keys(SPORTS_CONFIG).map(s => (
                  <option key={s} value={s}>{SPORTS_CONFIG[s].icon} {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <select style={{ ...inputStyle, appearance: "none" }} value={position}
                onChange={e => setPosition(e.target.value)} disabled={!sport}>
                <option value="">Select position</option>
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>School / Team</label>
              <input style={inputStyle} value={school} onChange={e => setSchool(e.target.value)} placeholder="e.g. Lincoln High School" />
            </div>
            <div>
              <label style={labelStyle}>Class Year</label>
              <select style={{ ...inputStyle, appearance: "none" }} value={gradYear} onChange={e => setGradYear(e.target.value)}>
                <option value="">Select year</option>
                {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Athlete Email</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="athlete@email.com" />
            </div>
            <div>
              <label style={labelStyle}>Coach Name</label>
              <input style={inputStyle} value={coachName} onChange={e => setCoachName(e.target.value)} placeholder="Coach Smith" />
            </div>
            <div>
              <label style={labelStyle}>Coach Email</label>
              <input style={inputStyle} type="email" value={coachEmail} onChange={e => setCoachEmail(e.target.value)} placeholder="coach@school.edu" />
            </div>
            <div>
              <label style={labelStyle}>Club / AAU Team</label>
              <input style={inputStyle} value={clubTeam} onChange={e => setClubTeam(e.target.value)} placeholder="e.g. Nike EYBL" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Dallas, TX" />
            </div>
            <div>
              <label style={labelStyle}>Height (ft)</label>
              <input style={inputStyle} value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="6" />
            </div>
            <div>
              <label style={labelStyle}>Height (in)</label>
              <input style={inputStyle} value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="3" />
            </div>
            <div>
              <label style={labelStyle}>Social Handle</label>
              <input style={inputStyle} value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder="@username" />
            </div>
            <div>
              <label style={labelStyle}>Hometown</label>
              <input style={inputStyle} value={hometown} onChange={e => setHometown(e.target.value)} placeholder="e.g. Atlanta, GA" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Achievement <span style={{ color: "#475569", fontWeight: 400, textTransform: "none" }}>(max 50 chars)</span></label>
              <input style={inputStyle} value={achievement} onChange={e => setAchievement(e.target.value.slice(0, 50))} placeholder="e.g. 2x All-State · Team Captain" maxLength={50} />
              {achievement && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{achievement.length}/50</div>}
            </div>
          </div>
        </SectionCard>

        {/* ─── 4 · STATS CARD ─── */}
        <SectionCard
          number={4}
          title="Stats Card"
          subtitle="5-second stats card — coaches want to see your numbers"
          open={openSection === 4}
          onToggle={() => setOpenSection(openSection === 4 ? 0 : 4)}
          accentHex={accentHex}
          tipBadge={{ text: "D1 coaches rated stats 4/5 in importance", color: "#00A3FF" }}
        >
          {!sport ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#475569", fontSize: 14 }}>
              Select your sport in the Opening Title Card section first
            </div>
          ) : (
            <>
              {/* 2-slide note */}
              {filledStatCount > 6 && (
                <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: `${accentHex}14`, border: `1px solid ${accentHex}30`, fontSize: 12, color: accentHex, fontWeight: 600 }}>
                  ✓ Your stats will show across 2 slides — first 6 on slide 1, remainder on slide 2
                </div>
              )}

              {/* Live preview */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Live Preview</label>
                <StatsCardPreview statsData={statsData} sport={sport} position={position} accentHex={accentHex} />
              </div>

              {/* All stat fields — base + extra always visible */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[...statFields.base, ...statFields.extra].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input style={inputStyle} value={statsData[f.key] || ""}
                      onChange={e => setStatsData(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* ─── 5 · TEAM COLOR ─── */}
        <SectionCard
          number={5}
          title="Team Color"
          subtitle="Accent color used on title card, stats, and jersey overlay"
          open={openSection === 5}
          onToggle={() => setOpenSection(openSection === 5 ? 0 : 5)}
          accentHex={accentHex}
          tipBadge={{ text: "Used on cards only — not on your footage", color: "#94a3b8" }}
        >
          {/* Jersey color from upload */}
          {jerseyColor && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Your Jersey Color (from upload)</label>
              <button type="button" onClick={() => setAccentHex(jerseyColor)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#0D1F38", cursor: "pointer", border: `2px solid ${accentHex === jerseyColor ? accentHex : "rgba(255,255,255,0.08)"}`, width: "100%" }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: jerseyColor, flexShrink: 0, border: "2px solid rgba(255,255,255,0.15)" }} />
                <span style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 600 }}>{jerseyColor}</span>
                {accentHex === jerseyColor && <span style={{ marginLeft: "auto", fontSize: 11, color: accentHex, fontWeight: 600 }}>✓ Active</span>}
              </button>
            </div>
          )}

          {/* Swatches */}
          <label style={labelStyle}>Common Team Colors</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {COLOR_SWATCHES.map(sw => {
              const isSelected = accentHex === sw.hex;
              const swIsLight  = sw.hex === "#FFFFFF" || sw.hex === "#C0C0C0";
              return (
                <button key={sw.hex} type="button" onClick={() => setAccentHex(sw.hex)} title={sw.name}
                  style={{ width: 40, height: 40, borderRadius: 10, background: sw.hex, border: `3px solid ${isSelected ? "#FFFFFF" : "transparent"}`, cursor: "pointer", transition: "all 0.15s", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: swIsLight ? "#050A14" : "#FFFFFF" }}>
                  {isSelected ? "✓" : ""}
                </button>
              );
            })}
          </div>

          {/* Custom hex */}
          <label style={labelStyle}>Custom Hex</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: accentHex, border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />
            <input
              style={{ ...inputStyle, fontFamily: "monospace" }}
              value={customHex}
              onChange={e => setCustomHex(e.target.value)}
              placeholder="#00A3FF"
              maxLength={7}
              onKeyDown={e => {
                if (e.key === "Enter" && /^#[0-9A-Fa-f]{6}$/.test(customHex)) setAccentHex(customHex);
              }}
            />
            <button type="button"
              onClick={() => { if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) setAccentHex(customHex); }}
              style={{ padding: "11px 18px", borderRadius: 10, background: accentHex, color: isLightAccent ? "#050A14" : "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              Apply
            </button>
          </div>

          {/* Preview stripe */}
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "#0D1F38", borderLeft: `3px solid ${accentHex}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: accentHex }}>{accentHex}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Used on title card stripe, stats card top border, and jersey overlay</div>
          </div>
        </SectionCard>

        {/* ─── 6 · EXPORT VERSION ─── */}
        <SectionCard
          number={6}
          title="Export Version"
          subtitle="Choose format and background music for your reel"
          open={openSection === 6}
          onToggle={() => setOpenSection(openSection === 6 ? 0 : 6)}
          accentHex={accentHex}
        >
          {/* Format selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {(
              [
                {
                  id: "landscape",
                  label: "16:9 Landscape",
                  emoji: "🎥",
                  subtitle: "Standard widescreen — for emails and recruiting profiles.",
                },
                {
                  id: "social",
                  label: "9:16 Vertical",
                  emoji: "📱",
                  subtitle: "Vertical format — for Instagram and TikTok.",
                },
              ] as const
            ).map(opt => (
              <button key={opt.id} type="button" onClick={() => setExportType(opt.id)}
                style={{
                  padding: "20px 16px", borderRadius: 12, border: "2px solid",
                  textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                  borderColor: exportType === opt.id ? accentHex : "rgba(255,255,255,0.08)",
                  background:  exportType === opt.id ? `${accentHex}1A` : "#0D1F38",
                }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{opt.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{opt.subtitle}</div>
                {exportType === opt.id && (
                  <div style={{ marginTop: 10, fontSize: 11, color: accentHex, fontWeight: 600 }}>✓ Selected</div>
                )}
              </button>
            ))}
          </div>

          {/* Music selector — always visible */}
          <div>
            <label style={labelStyle}>Background Music</label>
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 14px", lineHeight: 1.5 }}>
              Music is available on both formats. Select a track or upload your own.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MUSIC_TRACKS.map(track => {
                const isSelected   = selectedMusic === track.id;
                const isPreviewing = previewingTrack === track.id;
                return (
                  <div key={track.id}
                    style={{
                      borderRadius: 10, border: "2px solid",
                      borderColor: isSelected ? accentHex : "rgba(255,255,255,0.08)",
                      background:  isSelected ? `${accentHex}14` : "#0D1F38",
                      overflow: "hidden",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 12 }}>
                      {/* Select + info */}
                      <button type="button" onClick={() => selectMusicTrack(track)}
                        style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>{track.name}</span>
                          {isSelected && <span style={{ fontSize: 10, color: accentHex, fontWeight: 700 }}>✓</span>}
                        </div>
                        {"desc" in track && (
                          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{(track as { desc?: string }).desc}</div>
                        )}
                      </button>

                      {/* Equalizer animation while previewing */}
                      {isPreviewing && (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20, marginRight: 4 }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{
                              width: 3, borderRadius: 2, background: accentHex,
                              animation: `eq-bounce ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                              height: `${8 + i * 4}px`,
                            }} />
                          ))}
                          <style>{`@keyframes eq-bounce { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }`}</style>
                        </div>
                      )}

                      {/* Play/pause button — real tracks only */}
                      {track.url && (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); handlePreviewToggle(track.id, track.url ?? null); }}
                          style={{
                            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                            background: isPreviewing ? accentHex : `${accentHex}22`,
                            border: `1.5px solid ${accentHex}50`,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                          {isPreviewing ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill={isLightAccent ? "#050A14" : "#FFFFFF"}>
                              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill={accentHex}>
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          )}
                        </button>
                      )}

                      {/* No music / upload icons */}
                      {!track.url && track.id === "no-music" && (
                        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "#1E293B", border: "1.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🔇</div>
                      )}
                      {!track.url && track.id === "custom" && (
                        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "#1E293B", border: "1.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📁</div>
                      )}
                    </div>

                    {/* Upload My Own — file picker */}
                    {track.id === "custom" && isSelected && (
                      <div style={{ padding: "0 14px 14px" }}>
                        <label style={{ ...labelStyle, cursor: "pointer" }}>
                          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#0A1628", border: "1px dashed rgba(255,255,255,0.15)", textAlign: "center", fontSize: 13, color: "#64748b", cursor: "pointer" }}>
                            {uploadedMusicName ?? "Choose MP3 / WAV / M4A — max 15 MB"}
                          </div>
                          <input type="file" accept=".mp3,.wav,.m4a,audio/mp3,audio/wav,audio/m4a,audio/mpeg"
                            style={{ display: "none" }}
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (f.size > 15 * 1024 * 1024) { alert("File must be under 15 MB"); return; }
                              handleMusicFileUpload(f);
                            }} />
                        </label>
                        {selectedMusicName && selectedMusic === "custom" && (
                          <div style={{ fontSize: 11, color: accentHex, marginTop: 6 }}>✓ {selectedMusicName}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ── ERROR ── */}
        {error && (
          <div style={{ padding: "14px 18px", borderRadius: 10, background: "#2D0A0A", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* ── GENERATE BUTTON ── */}
        <button type="button" onClick={handleSubmit} style={accentBtnStyle}>
          Generate My Reel →
        </button>

        {/* Bottom padding spacer */}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
