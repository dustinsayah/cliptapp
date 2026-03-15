"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import { SPORTS_CONFIG } from "../../lib/sportsConfig";
import { TitleCardPreview } from "../../components/TitleCardPreview";
import { MUSIC_TRACKS, type MusicTrack } from "../../lib/musicTracks";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClipItem {
  id: string;
  name: string;
  blobUrl: string;
  url?: string; // Cloudinary URL — required for server-side detection
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
  url?: string; // Cloudinary URL
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
  jerseyColor?: string;
  autoDetect?: boolean;
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
// Matches Remotion layout: 3×3 grid, x 18%/50%/82%, values y 40%/60%/80%, labels y 47%/67%/87%

interface StatsCardPreviewProps {
  statsData: Record<string, string>;
  sport: string; position: string; accentHex: string;
  firstName?: string; lastName?: string;
}

function StatsCardPreview({ statsData, sport, position, accentHex, firstName, lastName }: StatsCardPreviewProps) {
  const sportConfig = SPORTS_CONFIG[sport];
  const allFields = sportConfig
    ? [...sportConfig.getStatFields(position).base, ...sportConfig.getStatFields(position).extra]
    : [];
  const filled = allFields.filter(f => statsData[f.key]?.trim());
  const show   = filled.slice(0, 9); // max 9 (3×3 grid)
  const fullName = [firstName, lastName].filter(Boolean).join(" ").toUpperCase() || "ATHLETE NAME";

  // 3 columns × 3 rows matching Remotion x 18%/50%/82%, value y 40%/60%/80%
  const colPositions = ["18%", "50%", "82%"];
  const rowValPositions = ["40%", "60%", "80%"];
  const rowLblPositions = ["47%", "67%", "87%"];

  return (
    <div style={{ aspectRatio: "16/9", background: "#050A14", borderRadius: 8, overflow: "hidden", position: "relative", fontFamily: "Inter, sans-serif" }}>
      {/* Accent bars */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.5%", background: accentHex }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1.5%", background: accentHex }} />

      {/* Header — y 14% matches Remotion */}
      <div style={{ position: "absolute", top: "14%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" as const, width: "90%" }}>
        <div style={{ fontSize: "clamp(5px, 1.2vw, 10px)", color: accentHex, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
          SEASON STATS
        </div>
      </div>
      {/* Athlete name — y 24% matches Remotion */}
      <div style={{ position: "absolute", top: "24%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" as const, width: "90%" }}>
        <div style={{ fontSize: "clamp(6px, 1.8vw, 16px)", fontWeight: 700, color: "#FFFFFF", fontFamily: "Oswald, sans-serif" }}>
          {fullName}
        </div>
      </div>

      {show.length === 0 ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontSize: "clamp(5px, 1.2vw, 11px)" }}>
          Fill in your stats above to see a preview
        </div>
      ) : (
        <>
          {show.map((f, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            return (
              <div key={f.key}>
                {/* Stat value */}
                <div style={{
                  position: "absolute",
                  left: colPositions[col], top: rowValPositions[row],
                  transform: "translate(-50%, -50%)",
                  textAlign: "center" as const,
                  fontSize: "clamp(8px, 2.2vw, 20px)",
                  fontWeight: 700, color: accentHex, fontFamily: "Oswald, sans-serif",
                }}>
                  {statsData[f.key]}
                </div>
                {/* Stat label */}
                <div style={{
                  position: "absolute",
                  left: colPositions[col], top: rowLblPositions[row],
                  transform: "translate(-50%, -50%)",
                  textAlign: "center" as const, width: "28%",
                  fontSize: "clamp(3px, 0.85vw, 7px)",
                  color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em",
                }}>
                  {f.label}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Watermark */}
      <div style={{ position: "absolute", bottom: "3%", left: "50%", transform: "translateX(-50%)", fontSize: "clamp(3px,0.6vw,5px)", color: "#334155", fontWeight: 700, whiteSpace: "nowrap" }}>
        POWERED BY CLIPT
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

  // ── Mount guard — prevents layout shift from localStorage reads ─────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Open section ────────────────────────────────────────────────────────────
  const [openSection, setOpenSection] = useState<number>(1);

  // ── Clips ───────────────────────────────────────────────────────────────────
  const [clips, setClips]               = useState<ClipItem[]>([]);
  const [activeClipIdx, setActiveClipIdx] = useState<number>(0);
  const [trimPanelOpen, setTrimPanelOpen] = useState<boolean>(false);
  const dragIndexRef                    = useRef<number | null>(null);
  const [dragOver, setDragOver]         = useState<number | null>(null);

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
  const [spotlightStyle, setSpotlightStyle] = useState<"circle" | "none">("circle");
  const [spotlightStep,  setSpotlightStep]  = useState(0);
  const [spotlightDone,  setSpotlightDone]  = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [markedClips,    setMarkedClips]    = useState<Record<number, { x: number; y: number }>>({});
  const [videoMetaLoaded, setVideoMetaLoaded] = useState(0);
  const frameVideoRef = useRef<HTMLVideoElement>(null);
  const spotlightContainerRef = useRef<HTMLDivElement>(null);

  // ── AI Detection ─────────────────────────────────────────────────────────────
  const [autoDetect, setAutoDetect] = useState(false);
  const [aiDetectStatus, setAiDetectStatus] = useState<"idle" | "loading" | "success" | "error" | "timeout">("idle");
  const [aiDetectMsg, setAiDetectMsg] = useState("");

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exportType,    setExportType]    = useState<"landscape" | "social">("landscape");

  // ── Music ────────────────────────────────────────────────────────────────────
  const [selectedMusicId,   setSelectedMusicId]   = useState<string>("no-music");
  const [previewingId,      setPreviewingId]       = useState<string | null>(null);
  const [customMusicUrl,    setCustomMusicUrl]     = useState<string | null>(null);
  const [customMusicName,   setCustomMusicName]    = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Audio cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
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
    if (typeof prev.autoDetect === "boolean") setAutoDetect(prev.autoDetect);

    if (prev.spotlightStyle === "circle" || prev.spotlightStyle === "none") {
      setSpotlightStyle(prev.spotlightStyle);
    } else if (prev.spotlightStyle === "arrow") {
      setSpotlightStyle("circle");
    }
    if (prev.exportType === "landscape" || prev.exportType === "social") {
      setExportType(prev.exportType);
    } else if (prev.exportType === "coach") {
      setExportType("landscape"); // migrate legacy value
    }
    if (prev.music) {
      // Check if saved track id still exists in current MUSIC_TRACKS
      const savedTrack = MUSIC_TRACKS.find(m => m.id === prev.music);
      if (savedTrack) {
        setSelectedMusicId(prev.music);
        if (prev.music === "custom") {
          setCustomMusicUrl(prev.musicUrl ?? null);
          setCustomMusicName(prev.musicName ?? null);
        }
      } else {
        setSelectedMusicId("no-music"); // legacy id no longer exists
      }
    } else if (prev.musicId) {
      // migrate legacy musicId
      const legacyTrack = MUSIC_TRACKS.find(m => m.id === prev.musicId);
      setSelectedMusicId(legacyTrack ? legacyTrack.id : "no-music");
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
          url:           c.url,
          thumbnailUrl:  c.thumbnailUrl,
          duration:      c.duration,
          trimStart:     saved?.trimStart ?? 0,
          trimEnd:       saved?.trimEnd,
          skillCategory: saved?.skillCategory ?? defaultCat,
          playType:      c.playType,
          qualityScore:  c.qualityScore,
          markX:         saved?.markX,
          markY:         saved?.markY,
        };
      }));
      // Restore spotlight done state if all clips were previously marked
      if (prev.clips && prev.clips.length > 0 && prev.clips.every((c: ClipItem) => c.markX !== undefined)) {
        setSpotlightDone(true);
      }
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
    // Keep the active clip in view when dragging it
    if (from === activeClipIdx) setActiveClipIdx(idx);
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
  // ── Spotlight: seek video to first frame when step changes ───────────────────
  useEffect(() => {
    if (frameVideoRef.current) {
      frameVideoRef.current.currentTime = 0.1;
      frameVideoRef.current.pause();
    }
  }, [spotlightStep]);

  function getVideoRenderArea() {
    const video = frameVideoRef.current;
    const container = spotlightContainerRef.current;
    if (!video || !container) return null;

    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    if (!videoW || !videoH) return null;

    const containerW = container.offsetWidth;
    const containerH = container.offsetHeight;
    const videoAspect = videoW / videoH;
    const containerAspect = containerW / containerH;

    let renderW: number;
    let renderH: number;
    let offsetX: number;
    let offsetY: number;

    if (videoAspect > containerAspect) {
      // Wider than container — pillarbox top and bottom (landscape video in landscape container)
      renderW = containerW;
      renderH = containerW / videoAspect;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    } else {
      // Taller than container — letterbox left and right (portrait video in landscape container)
      renderH = containerH;
      renderW = containerH * videoAspect;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    }

    return { renderW, renderH, offsetX, offsetY, containerW, containerH };
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const container = e.currentTarget;
    const video = frameVideoRef.current;
    if (!video) return;

    const containerRect = container.getBoundingClientRect();
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    if (!videoW || !videoH) {
      // Fallback if dimensions not loaded yet — use raw container percentage
      const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;
      saveMark(x, y);
      return;
    }

    const containerW = containerRect.width;
    const containerH = containerRect.height;
    const videoAspect = videoW / videoH;
    const containerAspect = containerW / containerH;

    let renderW: number;
    let renderH: number;
    let offsetX: number;
    let offsetY: number;

    if (videoAspect > containerAspect) {
      renderW = containerW;
      renderH = containerW / videoAspect;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    } else {
      renderH = containerH;
      renderW = containerH * videoAspect;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    }

    const tapX = e.clientX - containerRect.left;
    const tapY = e.clientY - containerRect.top;

    // Ignore taps in the black bars
    if (tapX < offsetX || tapX > offsetX + renderW || tapY < offsetY || tapY > offsetY + renderH) return;

    const x = ((tapX - offsetX) / renderW) * 100;
    const y = ((tapY - offsetY) / renderH) * 100;

    console.log("TAP DEBUG:", {
      videoW, videoH, videoAspect,
      containerW, containerH, containerAspect,
      renderW, renderH, offsetX, offsetY,
      tapX, tapY, finalX: x, finalY: y,
    });

    saveMark(x, y);
  }

  function saveMark(x: number, y: number) {
    const updatedClips = [...clips];
    updatedClips[spotlightStep] = { ...updatedClips[spotlightStep], markX: x, markY: y };
    setClips(updatedClips);
    setMarkedClips(prev => ({ ...prev, [spotlightStep]: { x, y } }));

    console.log("SAVED MARK:", { x, y, clipIndex: spotlightStep });

    setShowConfirm(true);
    setTimeout(() => {
      setShowConfirm(false);
      if (spotlightStep < clips.length - 1) {
        setSpotlightStep(prev => prev + 1);
      } else {
        setSpotlightDone(true);
      }
    }, 600);
  }

  function removeClip(id: string) {
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const next = prev.filter(c => c.id !== id);
      // Keep activeClipIdx in bounds after removal
      setActiveClipIdx(cur => Math.min(cur, Math.max(0, next.length - 1)));
      if (idx !== -1 && idx < activeClipIdx) setActiveClipIdx(cur => Math.max(0, cur - 1));
      return next;
    });
  }

  // ── AI Detection ─────────────────────────────────────────────────────────────
  async function runAiDetect() {
    console.log("AUTO-DETECT STEP 1: function called");
    const firstClip = clips[0];

    console.log("AUTO-DETECT STEP 2: firstClip.url =", firstClip?.url?.slice(-50));
    console.log("AUTO-DETECT STEP 2: url is cloudinary?", firstClip?.url?.startsWith("https://res.cloudinary.com"));

    // Validate Cloudinary URL — blob URLs cannot be accessed by the Railway server
    if (!firstClip?.url?.startsWith("https://res.cloudinary.com")) {
      setAutoDetect(false);
      setAiDetectStatus("error");
      setAiDetectMsg("This clip needs to finish uploading before auto-detect can run. Please wait for the green checkmark.");
      return;
    }
    if (!jerseyNumber.trim()) {
      setAutoDetect(false);
      setAiDetectStatus("error");
      setAiDetectMsg("Add your jersey number above to use auto-detect");
      return;
    }
    if (!sport.trim()) {
      setAutoDetect(false);
      setAiDetectStatus("error");
      setAiDetectMsg("Add your sport above to use auto-detect");
      return;
    }

    console.log("AUTO-DETECT STEP 3: sending payload", { jerseyNumber, jerseyColor, sport, position });

    setAiDetectStatus("loading");
    setAiDetectMsg("");

    try {
      const response = await fetch("/api/detect-jersey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: firstClip.url, // Cloudinary URL — accessible by Railway server
          jerseyNumber: Number(jerseyNumber),
          jerseyColor: jerseyColor || "white",
          sport: sport.toLowerCase() || "basketball",
          position: position || undefined,
        }),
        signal: AbortSignal.timeout(155_000),
      });

      console.log("AUTO-DETECT STEP 4: API response status", response.status);

      const data = await response.json() as
        | { error?: string; [key: string]: unknown }
        | Array<{ confidence: number; bbox: { x1_pct: number; y1_pct: number; x2_pct: number; y2_pct: number } }>;

      const detections = Array.isArray(data) ? data : [];
      console.log("AUTO-DETECT STEP 5: detections received", JSON.stringify(detections).slice(0, 300));

      if (!response.ok || (data && typeof data === "object" && !Array.isArray(data) && data.error)) {
        const errMsg = Array.isArray(data) ? "" : (data as { error?: string }).error ?? "Detection failed";
        setAutoDetect(false);
        setAiDetectStatus("error");
        setAiDetectMsg(errMsg || "Couldn't auto-detect — tap your clip to place manually");
        return;
      }

      if (detections.length === 0) {
        setAutoDetect(false);
        setAiDetectStatus("error");
        setAiDetectMsg("Couldn't find you in this clip — tap to place manually");
        return;
      }

      // Pick highest confidence detection, use CENTER of bbox (not top-left corner)
      const best = detections.reduce((a, b) => (a.confidence > b.confidence ? a : b));
      const markX = (best.bbox.x1_pct + best.bbox.x2_pct) / 2;
      const markY = (best.bbox.y1_pct + best.bbox.y2_pct) / 2;

      console.log("AUTO-DETECT STEP 6: placing circle at markX=", markX, "markY=", markY);

      setClips(prev => prev.map((c, i) => i === 0 ? { ...c, markX, markY } : c));
      setMarkedClips(prev => ({ ...prev, 0: { x: markX, y: markY } }));

      // Save detected position directly to localStorage so it survives navigation without re-submit
      try {
        const existingSettings = JSON.parse(localStorage.getItem("cliptSettings") || "{}");
        if (Array.isArray(existingSettings.clips) && existingSettings.clips.length > 0) {
          existingSettings.clips[0] = { ...existingSettings.clips[0], markX, markY };
          localStorage.setItem("cliptSettings", JSON.stringify(existingSettings));
        }
        console.log("AUTO-DETECT STEP 7: saved to cliptSettings, verifying...");
        console.log("AUTO-DETECT STEP 7: verification =", JSON.parse(localStorage.getItem("cliptSettings") || "{}").clips?.[0]?.markX);
      } catch (saveErr) {
        console.warn("AUTO-DETECT: failed to persist to localStorage:", saveErr);
      }

      // Jump spotlight step to 0 so user sees the result immediately
      setSpotlightStep(0);
      setSpotlightDone(false);

      setAiDetectStatus("success");
      setAiDetectMsg("Spotlight placed automatically — you can tap to adjust if needed");
    } catch (err: unknown) {
      console.error("CLIPT: AI detection error:", err);
      setAutoDetect(false);
      if (err instanceof Error && (err.name === "TimeoutError" || err.message.includes("timeout"))) {
        setAiDetectStatus("timeout");
        setAiDetectMsg("Detection timed out — tap to place manually");
      } else {
        setAiDetectStatus("error");
        setAiDetectMsg("Couldn't auto-detect — tap your clip to place manually");
      }
    }
  }

  // Toggle handler — runs detection when turned on
  function handleAutoDetectToggle(on: boolean) {
    setAutoDetect(on);
    if (on) {
      runAiDetect();
    } else {
      setAiDetectStatus("idle");
      setAiDetectMsg("");
    }
  }

  // ── Music preview ────────────────────────────────────────────────────────────
  const handlePreview = useCallback((track: MusicTrack) => {
    if (!track.url) return;
    if (previewingId === track.id) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(track.url);
    audio.crossOrigin = "anonymous";
    audio.volume = 0.8;
    audio.play().catch(err => console.error("Preview failed:", err));
    audio.onended = () => setPreviewingId(null);
    audioRef.current = audio;
    setPreviewingId(track.id);
  }, [previewingId]);

  function handleMusicFileUpload(file: File) {
    const blobUrl = URL.createObjectURL(file);
    setSelectedMusicId("custom");
    setCustomMusicUrl(blobUrl);
    setCustomMusicName(file.name);
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

    // Resolve final music values from new state
    const selectedTrack = MUSIC_TRACKS.find(t => t.id === selectedMusicId);
    const music    = selectedMusicId;
    const musicUrl = selectedMusicId === "custom"
      ? customMusicUrl
      : selectedTrack?.url ?? null;
    const musicName = selectedMusicId === "custom"
      ? customMusicName
      : selectedTrack?.name ?? null;

    console.log("SAVING MUSIC:", { music, musicUrl, musicName });
    console.log("SAVING EXPORT TYPE:", exportType);

    const cliptSettings = {
      clips: clips.map(c => ({
        name:          c.name,
        blobUrl:       c.blobUrl,
        url:           c.url,
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
      exportType,   // "landscape" or "social"
      music,        // track identifier
      musicUrl,     // full URL or null
      musicName,    // display name or null
      jerseyColor: jerseyColor || undefined,
      autoDetect,
    };

    try {
      localStorage.setItem("cliptSettings", JSON.stringify(cliptSettings));
      // Also patch cliptData so legacy export reads statsData
      const existing = safeJson<CliptData>("cliptData", {});
      localStorage.setItem("cliptData", JSON.stringify({ ...existing, statsData }));
    } catch (e) {
      console.warn("Failed to save cliptSettings:", e);
    }

    console.log("CLIPS SAVED TO SETTINGS:", cliptSettings.clips.map((c) => ({
      blobUrl: c.blobUrl?.substring(0, 50),
      markX: c.markX,
      markY: c.markY,
    })));

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

  if (!mounted) return <div className="min-h-screen bg-[#050A14]" />;

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
          subtitle={clips.length > 0 ? `${clips.length} clips · ${fmtDur(totalSeconds)} total` : "Upload clips to get started"}
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
                ? "Almost there — add coach info and more stats"
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
            <div>
              {/* ── Filmstrip — drag to reorder, click to open trim panel ── */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>
                  {clips.length} {clips.length === 1 ? "Clip" : "Clips"} · {fmtDur(totalSeconds)} total
                  <span style={{ color: "#475569", fontWeight: 400, marginLeft: 8, textTransform: "none" as const, letterSpacing: 0 }}>Drag to reorder · Tap to trim</span>
                </label>
                <div style={{ overflowX: "auto" as const, paddingBottom: 6 }}>
                  <div style={{ display: "flex", gap: 6, minWidth: "min-content" }}>
                    {clips.map((c, i) => {
                      const isActive = i === activeClipIdx && trimPanelOpen;
                      return (
                        <div key={c.id}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={e => handleDragOver(e, i)}
                          onDragEnd={handleDragEnd}
                          onClick={() => { setActiveClipIdx(i); setTrimPanelOpen(true); }}
                          style={{
                            flexShrink: 0, cursor: "pointer",
                            border: `2px solid ${isActive ? accentHex : dragOver === i ? "#475569" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: 8, overflow: "hidden",
                            opacity: dragOver === i && dragIndexRef.current !== i ? 0.5 : 1,
                            transition: "border-color 0.15s",
                          }}>
                          {c.thumbnailUrl ? (
                            <img src={c.thumbnailUrl} alt="" style={{ width: 72, height: 40, objectFit: "cover", display: "block" }} />
                          ) : (
                            <div style={{ width: 72, height: 40, background: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎬</div>
                          )}
                          <div style={{ fontSize: 10, color: isActive ? accentHex : "#475569", textAlign: "center", padding: "3px 0", background: "#0D1F38", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                            <span style={{ color: "#334155" }}><GripIcon /></span>
                            {i + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Trim panel — shown when a clip is selected ── */}
              {trimPanelOpen && activeClipIdx < clips.length && (() => {
                const clip = clips[activeClipIdx];
                const trimStart = clip.trimStart || 0;
                const trimEnd   = clip.trimEnd ?? clip.duration;
                const dur       = clip.duration || 1;
                const startPct  = (trimStart / dur) * 100;
                const endPct    = (trimEnd   / dur) * 100;
                return (
                  <div style={{ background: "#0D1F38", borderRadius: 12, padding: "16px 16px 18px", border: `1px solid ${accentHex}40` }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{clip.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          {fmtDur(dur)} total · Trimmed: {fmtDur(Math.max(0, trimEnd - trimStart))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => removeClip(clip.id)}
                          style={{ fontSize: 12, color: "#EF4444", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
                          Remove
                        </button>
                        <button type="button" onClick={() => setTrimPanelOpen(false)}
                          style={{ fontSize: 12, color: "#94a3b8", background: "#1E293B", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 600 }}>
                          Done
                        </button>
                      </div>
                    </div>

                    {/* Time labels */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: accentHex, fontWeight: 600 }}>{fmtDur(trimStart)}</span>
                      <span style={{ fontSize: 12, color: accentHex, fontWeight: 600 }}>{fmtDur(trimEnd)}</span>
                    </div>

                    {/* Dual range slider */}
                    <div style={{ position: "relative", height: 44, marginBottom: 6 }}>
                      {/* Track background */}
                      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 4, background: "#1E293B", borderRadius: 2, transform: "translateY(-50%)", pointerEvents: "none" }}>
                        {/* Active range fill */}
                        <div style={{ position: "absolute", left: `${startPct}%`, right: `${100 - endPct}%`, top: 0, bottom: 0, background: accentHex, borderRadius: 2 }} />
                      </div>
                      {/* Start thumb */}
                      <div style={{ position: "absolute", top: "50%", left: `${startPct}%`, transform: "translate(-50%, -50%)", width: 20, height: 20, borderRadius: "50%", background: accentHex, border: "2px solid #FFFFFF", boxShadow: "0 0 0 2px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
                      {/* End thumb */}
                      <div style={{ position: "absolute", top: "50%", left: `${endPct}%`, transform: "translate(-50%, -50%)", width: 20, height: 20, borderRadius: "50%", background: accentHex, border: "2px solid #FFFFFF", boxShadow: "0 0 0 2px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
                      {/* Start range input (transparent, on top) */}
                      <input type="range" min={0} max={dur} step={0.1}
                        value={trimStart}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (v < (clip.trimEnd ?? dur)) setClipTrim(clip.id, "trimStart", String(v));
                        }}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize", margin: 0, zIndex: startPct > 85 ? 5 : 2 }}
                      />
                      {/* End range input (transparent, on top) */}
                      <input type="range" min={0} max={dur} step={0.1}
                        value={trimEnd}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          if (v > (clip.trimStart || 0)) setClipTrim(clip.id, "trimEnd", String(v));
                        }}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize", margin: 0, zIndex: startPct > 85 ? 2 : 5 }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "#334155" }}>0:00</span>
                      <span style={{ fontSize: 10, color: "#334155" }}>{fmtDur(dur)}</span>
                    </div>
                  </div>
                );
              })()}
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
          {/* Style selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["circle", "none"] as const).map(s => (
              <button key={s} type="button" onClick={() => setSpotlightStyle(s)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, border: "2px solid",
                  cursor: "pointer", fontSize: 12, fontWeight: spotlightStyle === s ? 700 : 500,
                  textAlign: "center" as const, transition: "all 0.15s",
                  borderColor: spotlightStyle === s ? accentHex : "rgba(255,255,255,0.08)",
                  background:  spotlightStyle === s ? `${accentHex}20` : "#0D1F38",
                  color: spotlightStyle === s ? "#FFFFFF" : "#64748b",
                }}>
                {s === "circle" ? "○ Circle" : "✂ None"}
              </button>
            ))}
          </div>

          {/* Auto-Detect Toggle (only when circle spotlight is on) */}
          {spotlightStyle !== "none" && clips.length > 0 && (() => {
            const firstUrl = clips[0]?.url;
            const hasCloudinaryUrl = typeof firstUrl === "string" && firstUrl.startsWith("https://res.cloudinary.com");
            if (!hasCloudinaryUrl) {
              return (
                <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "#0D1F38", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    Re-upload this clip to enable auto-detect
                  </div>
                </div>
              );
            }
            return (
              <div
                className={`transition-all ${autoDetect ? "border-blue-500 bg-blue-500/10" : "border-blue-500/40 bg-blue-500/5 animate-pulse"}`}
                style={{ marginBottom: 20, padding: "16px", borderRadius: 12, border: "1px solid", marginTop: 16 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>🎯 Auto-Place Spotlight Circle</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AI will find you in this clip and place the circle automatically. Takes 1-2 minutes.</div>
                    {/* Jersey number warning */}
                    {!jerseyNumber.trim() && (
                      <p style={{ color: "#FBBF24", fontSize: 12, margin: "6px 0 0" }}>⚠️ Add your jersey number above to enable auto-detect</p>
                    )}
                  </div>
                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={() => handleAutoDetectToggle(!autoDetect)}
                    aria-label="Toggle auto-detect"
                    style={{
                      flexShrink: 0,
                      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                      background: autoDetect ? accentHex : "#1E293B",
                      position: "relative", transition: "background 0.2s",
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3, left: autoDetect ? 23 : 3,
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s", display: "block",
                    }} />
                  </button>
                </div>
                {/* Status line */}
                {aiDetectStatus === "loading" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" style={{ flexShrink: 0 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    AI is finding you in your clips...
                  </div>
                )}
                {aiDetectStatus === "success" && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#22C55E" }}>
                    ✓ {aiDetectMsg}
                  </div>
                )}
                {(aiDetectStatus === "error" || aiDetectStatus === "timeout") && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                    {aiDetectMsg}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tap-to-mark slideshow (only when spotlight is on) */}
          {spotlightStyle !== "none" && (
            clips.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#475569", fontSize: 13 }}>
                Upload clips first to mark your position.
              </div>
            ) : spotlightDone ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 22, color: "#22C55E" }}>✓</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#22C55E", marginBottom: 4 }}>All {clips.length} clips marked</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Clipt will circle you at each position in the export.</div>
                <button type="button" onClick={() => { setSpotlightDone(false); setSpotlightStep(0); }}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
                  Edit Marks
                </button>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "white", fontSize: 18, fontWeight: 700 }}>Tap yourself in the clip</div>
                  <div style={{ color: "#9CA3AF", fontSize: 14, marginTop: 4 }}>
                    Clip {spotlightStep + 1} of {clips.length} — tap where you are on screen
                  </div>
                </div>

                {/* Frame + tap area */}
                <div
                  ref={spotlightContainerRef}
                  onClick={handleTap}
                  style={{
                    position: "relative", width: "100%",
                    height: 400, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#000", borderRadius: 10, overflow: "hidden",
                    cursor: "crosshair", marginBottom: 14,
                    border: `2px solid ${accentHex}40`,
                  }}>
                  <video
                    key={clips[spotlightStep]?.blobUrl}
                    src={clips[spotlightStep]?.blobUrl}
                    muted
                    playsInline
                    preload="metadata"
                    ref={frameVideoRef}
                    onLoadedMetadata={() => {
                      if (frameVideoRef.current) {
                        frameVideoRef.current.currentTime = 0.1;
                        frameVideoRef.current.pause();
                      }
                      setVideoMetaLoaded(v => v + 1);
                    }}
                    style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block", pointerEvents: "none" }}
                  />
                  {/* Circle at tapped position — computed to account for letterbox offset */}
                  {markedClips[spotlightStep] && (() => {
                    const area = getVideoRenderArea();
                    if (!area) return null;
                    const circleX = area.offsetX + (markedClips[spotlightStep].x / 100) * area.renderW;
                    const circleY = area.offsetY + (markedClips[spotlightStep].y / 100) * area.renderH;
                    return (
                      <div style={{
                        position: "absolute",
                        left: circleX,
                        top: circleY,
                        transform: "translate(-50%, -50%)",
                        width: 56, height: 56, borderRadius: "50%",
                        border: "3px solid white",
                        boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                      }} />
                    );
                  })()}
                  {/* Prompt when not yet tapped */}
                  {!markedClips[spotlightStep] && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <div style={{ background: "rgba(0,0,0,0.72)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#94a3b8" }}>
                        Tap where you are
                      </div>
                    </div>
                  )}
                  {/* Green confirmation flash */}
                  {showConfirm && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(34,197,94,0.15)", borderRadius: 8,
                      pointerEvents: "none", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ color: "#22C55E", fontSize: 48 }}>✓</div>
                    </div>
                  )}
                </div>

                {/* Progress dots */}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
                  {clips.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setSpotlightStep(i)}
                      style={{
                        width: 10, height: 10, borderRadius: "50%", cursor: "pointer",
                        background: markedClips[i] ? "#22C55E" : i === spotlightStep ? "white" : "#374151",
                      }}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" onClick={() => setSpotlightStep(s => Math.max(0, s - 1))} disabled={spotlightStep === 0}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: spotlightStep === 0 ? "transparent" : "#0D1F38", color: spotlightStep === 0 ? "#1E293B" : "#94a3b8", cursor: spotlightStep === 0 ? "default" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ←
                  </button>
                  <div style={{ flex: 1 }} />
                  {spotlightStep < clips.length - 1 ? (
                    <button type="button" onClick={() => setSpotlightStep(s => s + 1)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: accentHex, color: isLightAccent ? "#050A14" : "#FFFFFF", fontSize: 12, fontWeight: 700 }}>
                      Next →
                    </button>
                  ) : (
                    <button type="button" onClick={() => setSpotlightDone(true)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#22C55E", color: "#050A14", fontSize: 12, fontWeight: 700 }}>
                      Done ✓
                    </button>
                  )}
                </div>

                {/* Skip */}
                <div style={{ textAlign: "center", marginTop: 10 }}>
                  <button type="button" onClick={() => {
                    if (spotlightStep < clips.length - 1) setSpotlightStep(s => s + 1);
                    else setSpotlightDone(true);
                  }} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 11, textDecoration: "underline" }}>
                    Skip this clip
                  </button>
                </div>
              </div>
            )
          )}
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
              statsData={statsData}
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
              {/* Live preview */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Live Preview</label>
                <StatsCardPreview statsData={statsData} sport={sport} position={position} accentHex={accentHex} firstName={firstName} lastName={lastName} />
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

          {/* Music selector */}
          <div>
            <label style={labelStyle}>Background Music</label>
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 14px", lineHeight: 1.5 }}>
              Select a track or upload your own. Clicking a card selects it — use the play button to preview.
            </p>
            <style>{`@keyframes eq-bar { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }`}</style>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MUSIC_TRACKS.map(track => {
                const isSelected   = selectedMusicId === track.id;
                const isPreviewing = previewingId === track.id;
                return (
                  <div key={track.id} style={{ borderRadius: 10, overflow: "hidden" }}>
                    {/* Card row — click selects, play button previews */}
                    <div
                      onClick={() => setSelectedMusicId(track.id)}
                      style={{
                        display: "flex", alignItems: "center", padding: "14px 16px", gap: 14,
                        background: isSelected ? `${accentHex}1A` : "#0D1117",
                        border: `1px solid ${isSelected ? accentHex : "#1E2530"}`,
                        borderRadius: isSelected && track.id === "custom" ? "10px 10px 0 0" : 10,
                        cursor: "pointer", transition: "all 0.15s",
                      }}>
                      {/* Emoji */}
                      <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{track.emoji}</span>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{track.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{track.description}</div>
                      </div>

                      {/* Equalizer while previewing */}
                      {isPreviewing && (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20, flexShrink: 0 }}>
                          {[0.6, 0.9, 0.75].map((dur, i) => (
                            <div key={i} style={{
                              width: 3, height: `${10 + i * 5}px`, borderRadius: 2,
                              background: accentHex,
                              animation: `eq-bar ${dur}s ease-in-out infinite`,
                              animationDelay: `${i * 0.15}s`,
                            }} />
                          ))}
                        </div>
                      )}

                      {/* Play/pause button — only for real URLs */}
                      {track.url ? (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handlePreview(track); }}
                          style={{
                            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                            background: isPreviewing ? accentHex : `${accentHex}30`,
                            border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                          {isPreviewing ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={isLightAccent ? "#050A14" : "#FFFFFF"}>
                              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={isLightAccent ? "#050A14" : "#FFFFFF"}>
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          {track.emoji}
                        </div>
                      )}
                    </div>

                    {/* Upload My Own — file picker (only when selected) */}
                    {track.id === "custom" && isSelected && (
                      <div style={{ padding: "12px 16px", background: `${accentHex}0D`, border: `1px solid ${accentHex}`, borderTop: "none", borderRadius: "0 0 10px 10px" }}>
                        <label style={{ cursor: "pointer", display: "block" }}>
                          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#0A1628", border: "1px dashed rgba(255,255,255,0.2)", textAlign: "center", fontSize: 13, color: "#64748b" }}>
                            {customMusicName ?? "Choose MP3 / WAV / M4A — max 15 MB"}
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
                        {customMusicName && (
                          <div style={{ fontSize: 11, color: accentHex, marginTop: 6 }}>✓ {customMusicName}</div>
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
