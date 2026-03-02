"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type { FontStyle, TitleCardTemplate, WatermarkStyle, ExportAspectRatio, ExportQuality } from "../providers";
import QRCode from "qrcode";

// ── Dimensions ─────────────────────────────────────────────────────────────────
type Dim = { w: number; h: number };

function getExportDim(ratio: ExportAspectRatio, quality: ExportQuality): Dim {
  const base: Record<ExportAspectRatio, Dim> = {
    "16:9":  { w: 1920, h: 1080 },
    "9:16":  { w: 1080, h: 1920 },
    "1:1":   { w: 1080, h: 1080 },
    "21:9":  { w: 2560, h: 1080 },
  };
  const b = base[ratio] || base["16:9"];
  if (quality === "standard" || quality === "social") {
    return { w: Math.round(b.w * 2 / 3), h: Math.round(b.h * 2 / 3) };
  }
  return b;
}

function getExportBitrate(quality: ExportQuality): number {
  if (quality === "coach")    return 12_000_000;
  if (quality === "standard") return 5_000_000;
  return 2_500_000;
}

function getExportFps(quality: ExportQuality): number {
  return quality === "coach" ? 60 : 30;
}

function estimatedFileSizeMB(quality: ExportQuality, reelMin: number): number {
  const bitsPerSecond = getExportBitrate(quality);
  const totalSec = reelMin * 60 + 13; // overhead
  return Math.round((bitsPerSecond * totalSec) / 8 / 1_000_000);
}

const TITLE_MS  = 4000;
const STATS_MS  = 4000;
const MEAS_MS   = 3000;
const END_MS    = 5000;
const PLAYER_MS = 800;

// ── Music track display name map ──────────────────────────────────────────────
const MUSIC_TRACK_LABELS: Record<string, string> = {
  // New Pixabay tracks (from customize page)
  "nba-warmup":    "NBA Warmup",      "epic-sport":   "Epic Sport",     "motivational":  "Motivational",
  "trap":          "Trap Instrumental","championship": "Championship",  "upload":        "Your Track",
  "custom":        "Your Track",
  // Legacy Mixkit tracks
  "playoff-mode":  "Playoff Mode",    "game-time":    "Game Time",      "court-vision":  "Court Vision",
  "espn-feature":  "ESPN Feature",    "rise-up":      "Rise Up",        "legacy":        "Legacy",
  "the-journey":   "The Journey",     "triumph":      "Triumph",        "trap-god":      "Trap God",
  "drill-season":  "Drill Season",    "ice-cold":     "Ice Cold",       "street-ball":   "Street Ball",
  "pressure":      "Pressure",        "focus":        "Focus",          "late-night":    "Late Night",
  "smooth":        "Smooth",          "crowd-noise":  "Crowd Noise",
};

// ── Music track URL map ────────────────────────────────────────────────────────
const MUSIC_TRACK_URLS: Record<string, string | undefined> = {
  // New Pixabay tracks (from customize page)
  "nba-warmup":    "https://cdn.pixabay.com/audio/2022/10/16/audio_127a8b04d5.mp3",
  "epic-sport":    "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
  "motivational":  "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3",
  "trap":          "https://cdn.pixabay.com/audio/2023/01/10/audio_5b01f1f0be.mp3",
  "championship":  "https://cdn.pixabay.com/audio/2022/09/14/audio_bf8d48e5bd.mp3",
  // Legacy Mixkit tracks (backward compat)
  "playoff-mode":  "https://assets.mixkit.co/music/601/601.mp3",
  "game-time":     "https://assets.mixkit.co/music/490/490.mp3",
  "court-vision":  "https://assets.mixkit.co/music/421/421.mp3",
  "espn-feature":  "https://assets.mixkit.co/music/614/614.mp3",
  "rise-up":       "https://assets.mixkit.co/music/738/738.mp3",
  "legacy":        "https://assets.mixkit.co/music/652/652.mp3",
  "the-journey":   "https://assets.mixkit.co/music/668/668.mp3",
  "triumph":       "https://assets.mixkit.co/music/712/712.mp3",
  "trap-god":      "https://assets.mixkit.co/music/267/267.mp3",
  "drill-season":  "https://assets.mixkit.co/music/400/400.mp3",
  "ice-cold":      "https://assets.mixkit.co/music/346/346.mp3",
  "street-ball":   "https://assets.mixkit.co/music/308/308.mp3",
  "pressure":      "https://assets.mixkit.co/music/325/325.mp3",
  "focus":         "https://assets.mixkit.co/music/282/282.mp3",
  "late-night":    "https://assets.mixkit.co/music/297/297.mp3",
  "smooth":        "https://assets.mixkit.co/music/315/315.mp3",
  "crowd-noise":   "https://assets.mixkit.co/music/562/562.mp3",
};

// ── Canvas Font Map ────────────────────────────────────────────────────────────
const CANVAS_FONT_MAP: Record<FontStyle, string> = {
  Modern:   "Inter",
  Bold:     "Oswald",
  Clean:    "Poppins",
  Athletic: "Bebas Neue",
};

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

// ── Device helpers ─────────────────────────────────────────────────────────────
type DeviceType = "ios" | "android" | "desktop";

interface DeviceDetails {
  type: DeviceType;
  isIOS: boolean;
  isSafari: boolean;
  isAndroid: boolean;
  isMobileChrome: boolean;
}

function detectDevice(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !/Windows Phone/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function detectDeviceDetails(): DeviceDetails {
  if (typeof navigator === "undefined") return { type: "desktop", isIOS: false, isSafari: false, isAndroid: false, isMobileChrome: false };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !/Windows Phone/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMobileChrome = isAndroid && /chrome/i.test(ua);
  const type: DeviceType = isIOS ? "ios" : isAndroid ? "android" : "desktop";
  return { type, isIOS, isSafari, isAndroid, isMobileChrome };
}

function getSupportedMime(): string | null {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) return null;
  const c = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return c.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function fmtCompat(mime: string) {
  return { label: mime.includes("mp4") ? "MP4" : "WebM", ios: mime.includes("mp4"), android: true, desktop: true };
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => document.body.removeChild(a), 200);
}
function iosOpen(url: string) { window.open(url, "_blank", "noopener"); }

// ── Color helper ───────────────────────────────────────────────────────────────
function isLightColor(hex: string): boolean {
  const h = (hex || "#000").replace("#","");
  const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
  return (0.299*r + 0.587*g + 0.114*b) > 0.6;
}

// ── Coach Ready Score ─────────────────────────────────────────────────────────

interface ScoreItem {
  label: string;
  delta: number; // negative = deduction, positive = bonus
  applies: boolean;
  fix?: string;
}

interface CoachScore {
  score: number;
  grade: string;
  gradeLabel: string;
  bonuses: ScoreItem[];
  deductions: ScoreItem[];
}

function calcCoachReadyScore(reel: {
  reelLength: number; sport: string; musicTrackId: string; includeStatsCard: boolean;
  gradYear: string; heightFt: string; weight: string; email: string; gpa: string;
  fontStyle: string; transition: string; firstName: string; school: string;
  position: string; jerseyNumber: string;
}): CoachScore {
  const sportCfg = (() => { try { const { SPORTS_CONFIG } = require("@/lib/sportsConfig"); return SPORTS_CONFIG[reel.sport]; } catch { return null; } })();
  const sportMax = sportCfg?.recommendedLength?.max ?? (reel.sport === "Basketball" ? 4 : 5);

  const deductions: ScoreItem[] = [
    { label: "Reel over recommended length", delta: -20, applies: reel.reelLength > sportMax, fix: `Reduce to ${sportMax} min or less in Reel Duration settings` },
    { label: "Missing graduation year", delta: -15, applies: !reel.gradYear, fix: "Add your Class of year in Reel Info" },
    { label: "Missing height or weight", delta: -10, applies: !reel.heightFt || !reel.weight, fix: "Add your measurables in Reel Info" },
    { label: "Missing email address", delta: -10, applies: !reel.email, fix: "Add your email in Reel Info — coaches need a way to contact you" },
    { label: "No stats card included", delta: -10, applies: !reel.includeStatsCard, fix: "Enable Stats Card in the Stats System section" },
    { label: "Missing GPA", delta: -10, applies: !reel.gpa, fix: "Add your GPA in Reel Info — coaches factor academics heavily" },
    { label: "Non-Hard Cut transitions slow down viewing", delta: -5, applies: reel.transition !== "Hard Cut", fix: "Switch to Hard Cut in Color & Style" },
    { label: "Font not coach-standard (Modern or Clean)", delta: -5, applies: !["Modern","Clean"].includes(reel.fontStyle), fix: "Switch to Modern or Clean font in Color & Style" },
  ];

  const bonuses: ScoreItem[] = [];

  let score = 100;
  deductions.forEach((d) => { if (d.applies) score += d.delta; });
  score = Math.max(0, Math.min(100, score));

  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "D";
  const gradeLabel = score >= 90 ? "Coach Ready" : score >= 80 ? "Strong Reel" : score >= 70 ? "Needs Work" : "Missing Key Info";

  return { score, grade, gradeLabel, bonuses, deductions };
}

// ── Reel Comparison Benchmarks ─────────────────────────────────────────────────

interface PosBenchmark { avgReelMin: number; idealClips: [number, number]; avgGpa: number; topClips: string }

const BENCHMARKS: Record<string, Record<string, PosBenchmark>> = {
  Basketball: {
    "Point Guard":      { avgReelMin: 3.1, idealClips: [6, 10], avgGpa: 3.4, topClips: "Ball handling, assists, defense" },
    "Shooting Guard":   { avgReelMin: 3.2, idealClips: [6, 10], avgGpa: 3.3, topClips: "Scoring, three-point shooting" },
    "Small Forward":    { avgReelMin: 3.0, idealClips: [6, 10], avgGpa: 3.2, topClips: "Scoring versatility, defense" },
    "Power Forward":    { avgReelMin: 2.9, idealClips: [5, 9],  avgGpa: 3.1, topClips: "Post play, rebounding, defense" },
    "Center":           { avgReelMin: 2.8, idealClips: [5, 8],  avgGpa: 3.0, topClips: "Post scoring, shot blocking" },
  },
  Football: {
    "Quarterback":      { avgReelMin: 4.2, idealClips: [8, 14], avgGpa: 3.5, topClips: "Deep ball, pocket presence, accuracy" },
    "Running Back":     { avgReelMin: 3.5, idealClips: [7, 12], avgGpa: 3.2, topClips: "Explosion, receiving, pass pro" },
    "Wide Receiver":    { avgReelMin: 3.8, idealClips: [8, 14], avgGpa: 3.3, topClips: "Route running, YAC, separation" },
    "Linebacker":       { avgReelMin: 3.6, idealClips: [7, 12], avgGpa: 3.3, topClips: "Pass rush, tackling, coverage" },
    "Cornerback":       { avgReelMin: 3.4, idealClips: [7, 12], avgGpa: 3.4, topClips: "Man coverage, ball skills" },
    "Defensive End":    { avgReelMin: 3.3, idealClips: [6, 10], avgGpa: 3.1, topClips: "Pass rush, sacks, run stops" },
  },
  Lacrosse: {
    "Attack":           { avgReelMin: 3.2, idealClips: [6, 10], avgGpa: 3.3, topClips: "Goals, dodges, assists" },
    "Midfield":         { avgReelMin: 3.0, idealClips: [6, 10], avgGpa: 3.3, topClips: "Transition, shooting, groundballs" },
    "Defense":          { avgReelMin: 3.0, idealClips: [6, 10], avgGpa: 3.2, topClips: "Caused turnovers, groundballs" },
    "Goalkeeper":       { avgReelMin: 2.8, idealClips: [5, 8],  avgGpa: 3.2, topClips: "Saves, outlet passes" },
  },
};

function getBenchmark(sport: string, position: string): PosBenchmark | null {
  return BENCHMARKS[sport]?.[position] ?? Object.values(BENCHMARKS[sport] ?? {})[0] ?? null;
}

// ── Recruiting Card Canvas ─────────────────────────────────────────────────────

async function drawRecruitingCard(info: TitleInfo, accentHex: string): Promise<string> {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  await Promise.allSettled([
    document.fonts.load(`bold 56px "Oswald"`),
    document.fonts.load(`bold 32px "Oswald"`),
    document.fonts.load(`400 13px "Inter"`),
    document.fonts.load(`bold 13px "Inter"`),
  ]);

  // Background
  ctx.fillStyle = "#050A14";
  ctx.fillRect(0, 0, W, H);

  // Left panel
  const LEFT_W = 290;
  ctx.fillStyle = accentHex + "12";
  ctx.fillRect(0, 0, LEFT_W, H);
  // Left panel right border
  ctx.fillStyle = accentHex + "60";
  ctx.fillRect(LEFT_W - 2, 0, 2, H);
  // Left accent stripe (left edge)
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 10, H);

  // Jersey number — big in left panel
  ctx.save();
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = 50;
  ctx.font = `bold 120px "Oswald", Arial, sans-serif`;
  ctx.fillStyle = accentHex;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(info.jerseyNumber ? `#${info.jerseyNumber}` : "#00", LEFT_W / 2 + 5, 155);
  ctx.restore();

  // Sport + position
  ctx.save();
  ctx.font = `bold 12px "Inter", Arial, sans-serif`;
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";
  ctx.fillText([info.sport, info.position].filter(Boolean).join(" · ").toUpperCase(), LEFT_W / 2 + 5, 255);
  ctx.restore();

  // School
  if (info.school) {
    ctx.save();
    ctx.font = `bold 13px "Inter", Arial, sans-serif`;
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(info.school.toUpperCase(), LEFT_W / 2 + 5, 282);
    ctx.restore();
  }

  // Measurables
  const measLines = [
    info.heightFt ? `${info.heightFt}'${info.heightIn || "0"}"  HEIGHT` : null,
    info.weight ? `${info.weight} LBS` : null,
    info.gradYear ? `CLASS OF ${info.gradYear}` : null,
    info.gpa ? `GPA  ${info.gpa}` : null,
  ].filter(Boolean) as string[];
  measLines.forEach((line, i) => {
    ctx.save();
    ctx.font = `11px "Inter", Arial, sans-serif`;
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(line, LEFT_W / 2 + 5, 318 + i * 22);
    ctx.restore();
  });

  // Real QR code pointing to cliptapp.com
  try {
    const qrDataUrl = await QRCode.toDataURL("https://cliptapp.com", {
      width: 128,
      margin: 1,
      color: { dark: "#FFFFFF", light: "#00000000" },
    });
    const qrImg = new Image();
    await new Promise<void>((resolve) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = () => resolve();
      qrImg.src = qrDataUrl;
    });
    const qrSize = 128;
    const qrX = Math.round((LEFT_W - qrSize) / 2) + 5;
    const qrY = H - 185;
    // Background box behind QR
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 8);
    ctx.fill();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    // Label
    ctx.save();
    ctx.font = `bold 10px "Inter", Arial, sans-serif`;
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "1px";
    ctx.fillText("SCAN FOR FULL REEL", LEFT_W / 2 + 5, qrY + qrSize + 10);
    ctx.restore();
  } catch { /* skip QR on error */ }

  // ── Right Panel ──────────────────────────────────────────────────────────────
  const rx = LEFT_W + 28;
  const rw = W - rx - 28;

  // Athlete name
  ctx.save();
  ctx.font = `bold 56px "Oswald", Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let nameText = (info.firstName || "ATHLETE").toUpperCase();
  while (ctx.measureText(nameText).width > rw && nameText.length > 1) {
    nameText = nameText.slice(0, -1);
  }
  ctx.fillText(nameText, rx, 26);
  ctx.restore();

  // Accent divider line under name
  ctx.fillStyle = accentHex;
  ctx.fillRect(rx, 96, Math.min(rw, 440), 3);

  // Stats section
  const statEntries = Object.entries(info.statsData || {}).filter(([, v]) => v?.trim()).slice(0, 6);
  if (statEntries.length > 0) {
    ctx.save();
    ctx.font = `bold 10px "Inter", Arial, sans-serif`;
    ctx.fillStyle = accentHex;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";
    ctx.fillText("SEASON STATS", rx, 112);
    ctx.restore();

    const cols = 3;
    const gx = 12, gy = 10;
    const cw = Math.floor((rw - (cols - 1) * gx) / cols);
    const ch = 78;
    const sy = 134;

    statEntries.forEach(([label, value], idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = rx + col * (cw + gx);
      const y = sy + row * (ch + gy);

      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, cw, ch, 8);
      ctx.fill();
      ctx.strokeStyle = accentHex + "30";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.font = `bold 30px "Oswald", Arial, sans-serif`;
      ctx.fillStyle = accentHex;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(value, x + cw / 2, y + ch * 0.42);
      ctx.restore();

      ctx.save();
      ctx.font = `10px "Inter", Arial, sans-serif`;
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      (ctx as unknown as { letterSpacing: string }).letterSpacing = "1px";
      ctx.fillText(label.toUpperCase(), x + cw / 2, y + ch * 0.78);
      ctx.restore();
    });
  }

  // Contact info at bottom of right panel
  const contactY = H - 130;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(rx, contactY, rw, 1);

  const contactLines: Array<{ text: string; color: string }> = [];
  if (info.email) contactLines.push({ text: info.email, color: "#00A3FF" });
  if (info.coachName) contactLines.push({ text: `Recruiting Contact: ${info.coachName}`, color: "#94a3b8" });
  if (info.coachEmail) contactLines.push({ text: info.coachEmail, color: "#64748b" });

  contactLines.forEach(({ text, color }, i) => {
    ctx.save();
    ctx.font = `13px "Inter", Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, rx, contactY + 14 + i * 24);
    ctx.restore();
  });

  // CLIPT watermark — bottom right
  ctx.save();
  ctx.font = `bold 11px "Inter", monospace`;
  ctx.fillStyle = "#00A3FF" + "66";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";
  ctx.fillText("CLIPT · CLIPTAPP.COM", W - 16, H - 10);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckSmIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const TwitterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const InstagramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// ── Canvas types ───────────────────────────────────────────────────────────────
interface TitleInfo {
  firstName: string; jerseyNumber: string; sport: string; school: string;
  position: string; fontFamily: string; gradYear: string;
  heightFt: string; heightIn: string; weight: string; gpa: string;
  email: string; coachName: string; coachEmail: string;
  statsData: Record<string, string>;
  academicStatsData: Record<string, string>;
  measurablesData: Record<string, string>;
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawStamp(ctx: CanvasRenderingContext2D, dim: Dim, style: WatermarkStyle, info: TitleInfo, accent: string) {
  if (style === "none") return;
  ctx.save();
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  let text = "CLIPT";
  let fontSize = 14;
  let color = "rgba(0,163,255,0.72)";
  if (style === "jersey" && info.jerseyNumber) {
    text = `#${info.jerseyNumber}`; fontSize = Math.round(dim.h * 0.022); color = accent + "88";
  } else if (style === "initials" && info.school) {
    text = info.school.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 4);
    color = "rgba(255,255,255,0.45)";
  }
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 3;
  ctx.fillText(text, dim.w - 14, dim.h - 10);
  ctx.restore();
}

function drawVideoFrame(ctx: CanvasRenderingContext2D, vid: HTMLVideoElement, dim: Dim, accent = "#0A1628") {
  const srcW = vid.videoWidth || 1280, srcH = vid.videoHeight || 720;
  const srcAspect = srcW / srcH, dstAspect = dim.w / dim.h, TOL = 0.06;
  ctx.fillStyle = "#0A1628"; ctx.fillRect(0, 0, dim.w, dim.h);
  if (srcAspect > dstAspect + TOL) {
    if (dim.w < dim.h) {
      const cropW = Math.round(srcH * dstAspect), cropX = Math.round((srcW - cropW) / 2);
      ctx.drawImage(vid, cropX, 0, cropW, srcH, 0, 0, dim.w, dim.h);
    } else {
      const drawH = Math.round(srcH * (dim.w / srcW)), y = Math.round((dim.h - drawH) / 2);
      ctx.drawImage(vid, 0, y, dim.w, drawH);
    }
  } else if (srcAspect < dstAspect - TOL) {
    const drawW = Math.round(srcW * (dim.h / srcH)), x = Math.round((dim.w - drawW) / 2);
    if (x > 4) {
      const gl = ctx.createLinearGradient(0, 0, x * 1.6, 0);
      gl.addColorStop(0, "#050A14"); gl.addColorStop(1, accent + "18");
      ctx.fillStyle = gl; ctx.fillRect(0, 0, x, dim.h);
      const gr = ctx.createLinearGradient(dim.w, 0, dim.w - x * 1.6, 0);
      gr.addColorStop(0, "#050A14"); gr.addColorStop(1, accent + "18");
      ctx.fillStyle = gr; ctx.fillRect(x + drawW, 0, dim.w - (x + drawW), dim.h);
    }
    ctx.drawImage(vid, x, 0, drawW, dim.h);
  } else {
    ctx.drawImage(vid, 0, 0, dim.w, dim.h);
  }
}

function drawLowerThird(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim) {
  const barH = Math.round(dim.h * 0.1), y = dim.h - barH;
  ctx.fillStyle = "rgba(5,10,20,0.93)"; ctx.fillRect(0, y, dim.w, barH);
  ctx.fillStyle = accent; ctx.fillRect(0, y, 4, barH);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 2;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(barH * 0.38)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`${(info.firstName || "ATHLETE").toUpperCase()}${info.jerseyNumber ? `  #${info.jerseyNumber}` : ""}`, 16, y + barH * 0.35);
  ctx.restore(); ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.font = `${Math.round(barH * 0.27)}px Arial, sans-serif`;
  ctx.fillStyle = accent;
  ctx.fillText([info.sport, info.position, info.school].filter(Boolean).join(" · ").toUpperCase(), 16, y + barH * 0.72);
  ctx.restore();
}

function drawHighlightBorder(ctx: CanvasRenderingContext2D, accent: string, alpha: number, dim: Dim) {
  if (alpha <= 0) return;
  const bw = Math.round(dim.h * 0.008);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = accent; ctx.shadowBlur = bw * 5;
  ctx.strokeStyle = accent; ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, dim.w - bw, dim.h - bw);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, dim: Dim) {
  ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1;
  for (let x = 0; x <= dim.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dim.h); ctx.stroke(); }
  for (let y = 0; y <= dim.h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dim.w, y); ctx.stroke(); }
}

function drawDiagonalPattern(ctx: CanvasRenderingContext2D, dim: Dim, accent: string) {
  ctx.save(); ctx.strokeStyle = accent + "0D"; ctx.lineWidth = 1;
  const step = Math.round(dim.w * 0.025);
  for (let x = -dim.h; x < dim.w + dim.h; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + dim.h, dim.h); ctx.stroke();
  }
  ctx.restore();
}

// ── Title Card Renderers ───────────────────────────────────────────────────────

function drawTitleFrame(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim, template: TitleCardTemplate) {
  const ff = info.fontFamily || "Arial";
  const ffs = `"${ff}", Arial, sans-serif`;
  const cx = dim.w / 2;
  const s = dim.h / 1080;

  ctx.imageSmoothingEnabled = true;
  (ctx as unknown as { imageSmoothingQuality: string }).imageSmoothingQuality = "high";

  if (template === "espn-classic") {
    // Dark bg, thick left accent stripe, left col = info, right = name
    ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
    drawGrid(ctx, dim);
    const grd = ctx.createRadialGradient(cx, dim.h * 0.5, 0, cx, dim.h * 0.5, dim.w * 0.5);
    grd.addColorStop(0, accent + "20"); grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);
    const stripeW = Math.round(12 * s);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, stripeW, dim.h);
    ctx.fillStyle = accent + "22"; ctx.fillRect(stripeW, 0, Math.round(dim.w * 0.35), dim.h);
    ctx.fillStyle = accent; ctx.fillRect(0, dim.h - 4, dim.w, 4);
    // Name — right side
    const rightX = Math.round(dim.w * 0.42);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4;
    ctx.font = `bold ${Math.round(72 * s)}px ${ffs}`;
    ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), rightX, dim.h * 0.38); ctx.restore();
    ctx.save();
    ctx.font = `bold ${Math.round(30 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
    ctx.fillText([info.position, info.sport].filter(Boolean).join("  ·  ").toUpperCase(), rightX, dim.h * 0.52); ctx.restore();
    ctx.save();
    ctx.font = `${Math.round(20 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#64748b"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText([info.school, info.gradYear ? `Class of ${info.gradYear}` : ""].filter(Boolean).join("  ·  "), rightX, dim.h * 0.61); ctx.restore();
    // Left column stats
    const topStats = Object.entries(info.statsData || {}).filter(([,v]) => v.trim()).slice(0, 4);
    const lx = Math.round(dim.w * 0.07), ly = Math.round(dim.h * 0.3), gap = Math.round(dim.h * 0.12);
    topStats.forEach(([k, v], i) => {
      ctx.save(); ctx.font = `bold ${Math.round(40 * s)}px Arial, sans-serif`;
      ctx.fillStyle = accent; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(v, lx, ly + i * gap); ctx.restore();
      ctx.save(); ctx.font = `${Math.round(15 * s)}px Arial, sans-serif`;
      ctx.fillStyle = "#64748b"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(k.toUpperCase(), lx, ly + i * gap + Math.round(28 * s)); ctx.restore();
    });
  } else if (template === "nike-clean") {
    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, dim.w, dim.h);
    const grd = ctx.createRadialGradient(cx, dim.h * 0.5, 0, cx, dim.h * 0.5, dim.h * 0.6);
    grd.addColorStop(0, accent + "12"); grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);
    const sepW = Math.round(80 * s);
    ctx.fillStyle = accent; ctx.fillRect(cx - sepW/2, dim.h * 0.35, sepW, 2);
    ctx.save(); ctx.shadowColor = accent + "66"; ctx.shadowBlur = 8;
    ctx.font = `bold ${Math.round(88 * s)}px ${ffs}`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "8px";
    ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, dim.h * 0.44); ctx.restore();
    ctx.save();
    ctx.font = `${Math.round(22 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#e2e8f0"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "8px";
    ctx.fillText([info.position, info.sport].filter(Boolean).join("  ·  ").toUpperCase(), cx, dim.h * 0.57); ctx.restore();
    ctx.save();
    ctx.font = `${Math.round(16 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#475569"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(info.school ? info.school.toUpperCase() : "", cx, dim.h * 0.63); ctx.restore();
  } else if (template === "draft-board") {
    ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
    drawDiagonalPattern(ctx, dim, accent);
    // Outer card border
    const cPadW = Math.round(dim.w * 0.1), cPadH = Math.round(dim.h * 0.08);
    ctx.strokeStyle = accent + "50"; ctx.lineWidth = 1.5;
    rrect(ctx, cPadW, cPadH, dim.w - cPadW * 2, dim.h - cPadH * 2, 16 * s); ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(cPadW, cPadH, dim.w - cPadW * 2, 5);
    ctx.save();
    ctx.font = `bold ${Math.round(14 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
    ctx.fillText("DRAFT PROSPECT", cx, cPadH + Math.round(38 * s)); ctx.restore();
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 6;
    ctx.font = `bold ${Math.round(80 * s)}px ${ffs}`;
    ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, dim.h * 0.42); ctx.restore();
    ctx.save();
    ctx.font = `bold ${Math.round(26 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText([info.position, info.sport].filter(Boolean).join("  ·  ").toUpperCase(), cx, dim.h * 0.55); ctx.restore();
    const measLine = [
      info.heightFt ? `${info.heightFt}'${info.heightIn||"0"}"` : null,
      info.measurablesData?.weight_m || (info.weight ? `${info.weight} LBS` : null),
      info.gradYear ? `CLASS OF ${info.gradYear}` : null,
    ].filter(Boolean).join("  ·  ");
    ctx.save();
    ctx.font = `${Math.round(18 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(measLine, cx, dim.h * 0.62); ctx.restore();
  } else if (template === "neon") {
    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, dim.w, dim.h);
    // Neon glow name
    ctx.save();
    ctx.shadowColor = accent; ctx.shadowBlur = Math.round(32 * s);
    ctx.font = `bold ${Math.round(80 * s)}px ${ffs}`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
    ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, dim.h * 0.43);
    // Draw again for intensity
    ctx.shadowBlur = Math.round(60 * s);
    ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, dim.h * 0.43);
    ctx.restore();
    // Thin neon line
    ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 10;
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - Math.round(80 * s), dim.h * 0.54); ctx.lineTo(cx + Math.round(80 * s), dim.h * 0.54); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = `${Math.round(22 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
    ctx.fillText([info.position, info.sport].filter(Boolean).join("  ·  ").toUpperCase(), cx, dim.h * 0.59); ctx.restore();
  } else if (template === "championship") {
    ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
    drawDiagonalPattern(ctx, dim, accent);
    const grd = ctx.createRadialGradient(cx, dim.h * 0.45, 0, cx, dim.h * 0.45, dim.h * 0.55);
    grd.addColorStop(0, accent + "20"); grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w, 10);
    ctx.fillStyle = accent; ctx.fillRect(0, dim.h - 6, dim.w, 6);
    ctx.fillStyle = accent + "30"; ctx.fillRect(0, Math.round(dim.h * 0.12), dim.w, Math.round(dim.h * 0.06));
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8;
    ctx.font = `bold ${Math.round(88 * s)}px ${ffs}`;
    ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "8px";
    ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, dim.h * 0.44); ctx.restore();
    ctx.save();
    ctx.font = `bold ${Math.round(28 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
    ctx.fillText([info.position, info.sport].filter(Boolean).join("  ·  ").toUpperCase(), cx, dim.h * 0.57); ctx.restore();
  } else {
    // minimal
    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, dim.w, dim.h);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 2;
    ctx.font = `bold ${Math.round(72 * s)}px ${ffs}`;
    ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, dim.h * 0.42); ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fillRect(cx - Math.round(60 * s), dim.h * 0.52, Math.round(120 * s), 1);
    ctx.save();
    ctx.font = `${Math.round(22 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText([info.position, info.sport].filter(Boolean).join("  ·  ").toUpperCase(), cx, dim.h * 0.58); ctx.restore();
    if (info.school) {
      ctx.save();
      ctx.font = `${Math.round(18 * s)}px Arial, sans-serif`;
      ctx.fillStyle = "#475569"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(info.school.toUpperCase(), cx, dim.h * 0.65); ctx.restore();
    }
  }

  if (info.jerseyNumber) {
    ctx.save();
    ctx.font = `bold ${Math.round(20 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`#${info.jerseyNumber}`, cx, dim.h * 0.78); ctx.restore();
  }

  if (info.email) {
    ctx.save();
    ctx.font = `${Math.round(16 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent + "99"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(info.email, cx, dim.h * 0.85); ctx.restore();
  }

  drawStamp(ctx, dim, "clipt", info, accent);
}

// ── Unsharp mask — 3×3 sharpening kernel applied to canvas pixels ──────────────
function applyUnsharpMask(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const id = ctx.getImageData(0, 0, w, h);
    const src = id.data;
    const out = new Uint8ClampedArray(src);
    // 3×3 sharpening kernel: -1 -1 -1 / -1 9 -1 / -1 -1 -1 (gentle unsharp)
    const k = [0, -0.5, 0, -0.5, 3, -0.5, 0, -0.5, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          let v = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              v += src[((y + ky) * w + (x + kx)) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)];
            }
          }
          out[i + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
      }
    }
    id.data.set(out);
    ctx.putImageData(id, 0, 0);
  } catch { /* ignore SecurityError on cross-origin frames */ }
}

function drawStatsFrame(ctx: CanvasRenderingContext2D, statsData: Record<string, string>, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2, cy = dim.h / 2, s = dim.h / 1080;
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawDiagonalPattern(ctx, dim, accent);
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(dim.w, dim.h) * 0.5);
  grd.addColorStop(0, accent + "1A"); grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w, 6);
  const hY = Math.round(dim.h * 0.14);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 3;
  ctx.font = `bold ${Math.round(24 * s)}px Arial, sans-serif`;
  ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("SEASON STATS", cx, hY); ctx.restore();
  ctx.fillStyle = accent; ctx.fillRect(cx - Math.round(40 * s), hY + Math.round(24 * s), Math.round(80 * s), 2);
  ctx.save();
  ctx.font = `bold ${Math.round(48 * s)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4;
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, hY + Math.round(72 * s)); ctx.restore();
  const entries = Object.entries(statsData).filter(([,v]) => v.trim()).slice(0, 6);
  if (entries.length > 0) {
    const cols = 3, cw = Math.round(dim.w * 0.24), ch = Math.round(dim.h * 0.2);
    const gx = Math.round(dim.w * 0.03), gy = Math.round(dim.h * 0.025);
    const rows = Math.ceil(entries.length / cols);
    const sx = cx - (cols * cw + (cols-1) * gx) / 2, sy = cy - (rows * ch + (rows-1) * gy) / 2 + Math.round(60 * s);
    entries.forEach(([label, value], idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = sx + col * (cw + gx), y = sy + row * (ch + gy);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      rrect(ctx, x, y, cw, ch, Math.round(12 * s)); ctx.fill();
      ctx.strokeStyle = accent + "35"; ctx.lineWidth = 1;
      rrect(ctx, x, y, cw, ch, Math.round(12 * s)); ctx.stroke();
      ctx.save(); ctx.font = `bold ${Math.round(52 * s)}px Arial, sans-serif`;
      ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = accent + "60"; ctx.shadowBlur = 4;
      ctx.fillText(value, x + cw / 2, y + ch * 0.42); ctx.restore();
      ctx.save(); ctx.font = `${Math.round(18 * s)}px Arial, sans-serif`;
      ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px";
      ctx.fillText(label.toUpperCase(), x + cw / 2, y + ch * 0.78); ctx.restore();
    });
  }
  drawStamp(ctx, dim, "clipt", info, accent);
}

function drawMeasurablesFrame(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2, s = dim.h / 1080;
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawDiagonalPattern(ctx, dim, accent);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w, 6);
  ctx.save();
  ctx.font = `bold ${Math.round(22 * s)}px Arial, sans-serif`;
  ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("ATHLETIC MEASURABLES", cx, Math.round(dim.h * 0.15)); ctx.restore();
  const entries = Object.entries(info.measurablesData || {}).filter(([,v]) => v.trim()).slice(0, 6);
  if (entries.length > 0) {
    const cols = 3, cw = Math.round(dim.w * 0.26), ch = Math.round(dim.h * 0.18);
    const gx = Math.round(dim.w * 0.02), gy = Math.round(dim.h * 0.03);
    const sx = cx - (cols * cw + (cols-1) * gx) / 2;
    const sy = dim.h * 0.3;
    entries.forEach(([label, value], idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = sx + col * (cw + gx), y = sy + row * (ch + gy);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      rrect(ctx, x, y, cw, ch, 12 * s); ctx.fill();
      ctx.strokeStyle = accent + "30"; ctx.lineWidth = 1;
      rrect(ctx, x, y, cw, ch, 12 * s); ctx.stroke();
      ctx.save(); ctx.font = `bold ${Math.round(42 * s)}px Arial, sans-serif`;
      ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(value, x + cw / 2, y + ch * 0.42); ctx.restore();
      ctx.save(); ctx.font = `${Math.round(16 * s)}px Arial, sans-serif`;
      ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label.toUpperCase(), x + cw / 2, y + ch * 0.78); ctx.restore();
    });
  }
  drawStamp(ctx, dim, "clipt", info, accent);
}

function drawEndFrame(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2, s = dim.h / 1080;
  ctx.imageSmoothingEnabled = true;
  (ctx as unknown as { imageSmoothingQuality: string }).imageSmoothingQuality = "high";

  // Background + depth gradient
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawDiagonalPattern(ctx, dim, accent);
  const bg = ctx.createRadialGradient(cx, dim.h * 0.40, 0, cx, dim.h * 0.40, Math.min(dim.w, dim.h) * 0.55);
  bg.addColorStop(0, accent + "22"); bg.addColorStop(1, "transparent");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, dim.w, dim.h);

  // Top accent stripe 8px
  ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w, Math.round(8 * s));
  // Bottom accent stripe 8px
  ctx.fillStyle = accent; ctx.fillRect(0, dim.h - Math.round(8 * s), dim.w, Math.round(8 * s));

  // "CONTACT ME" heading
  const headingY = Math.round(dim.h * 0.12);
  ctx.save();
  ctx.font = `bold ${Math.round(22 * s)}px Arial, sans-serif`;
  ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "10px";
  ctx.fillText("CONTACT ME", cx, headingY); ctx.restore();

  // Accent line under heading
  ctx.fillStyle = accent + "BB";
  ctx.fillRect(cx - Math.round(60 * s), headingY + Math.round(20 * s), Math.round(120 * s), 2);

  // Athlete name — 72px bold
  const nameY = headingY + Math.round(74 * s);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 10;
  ctx.font = `bold ${Math.round(72 * s)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, nameY); ctx.restore();

  // Jersey # in accent — 52px
  if (info.jerseyNumber) {
    ctx.save();
    ctx.font = `bold ${Math.round(52 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = accent + "66"; ctx.shadowBlur = 8;
    ctx.fillText(`#${info.jerseyNumber}`, cx, nameY + Math.round(60 * s)); ctx.restore();
  }

  // Position · Sport — 26px gray
  const posLine = [info.position, info.sport].filter(Boolean).join("  ·  ");
  if (posLine) {
    ctx.save();
    ctx.font = `${Math.round(26 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(posLine.toUpperCase(), cx, nameY + Math.round((info.jerseyNumber ? 112 : 56) * s)); ctx.restore();
  }

  // School · grad year — 22px gray
  const schoolLine = [info.school, info.gradYear ? `Class of ${info.gradYear}` : ""].filter(Boolean).join("  ·  ");
  if (schoolLine) {
    const schoolOffset = info.jerseyNumber ? 146 : posLine ? 90 : 56;
    ctx.save();
    ctx.font = `${Math.round(22 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(schoolLine, cx, nameY + Math.round(schoolOffset * s)); ctx.restore();
  }

  // Divider
  const divY = nameY + Math.round(172 * s);
  ctx.fillStyle = accent + "55";
  ctx.fillRect(Math.round(dim.w * 0.15), divY, Math.round(dim.w * 0.7), 1);

  // Top 3 stats grid (48px values)
  const topStats = Object.entries(info.statsData || {}).filter(([,v]) => v.trim()).slice(0, 3);
  if (topStats.length > 0) {
    const statsY = divY + Math.round(28 * s);
    const cw = Math.round(200 * s), ch = Math.round(100 * s), gx = Math.round(30 * s);
    const totalW = topStats.length * cw + (topStats.length - 1) * gx;
    const sx = cx - totalW / 2;
    topStats.forEach(([label, value], i) => {
      const x = sx + i * (cw + gx);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      rrect(ctx, x, statsY, cw, ch, Math.round(12 * s)); ctx.fill();
      ctx.strokeStyle = accent + "44"; ctx.lineWidth = 1.5;
      rrect(ctx, x, statsY, cw, ch, Math.round(12 * s)); ctx.stroke();
      ctx.save(); ctx.font = `bold ${Math.round(48 * s)}px Arial, sans-serif`;
      ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = accent + "60"; ctx.shadowBlur = 8;
      ctx.fillText(value, x + cw / 2, statsY + ch * 0.43); ctx.restore();
      ctx.save(); ctx.font = `${Math.round(16 * s)}px Arial, sans-serif`;
      ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px";
      ctx.fillText(label.toUpperCase(), x + cw / 2, statsY + ch * 0.80); ctx.restore();
    });
  }

  // Email — electric blue
  if (info.email) {
    const emailY = Math.round(dim.h * 0.74);
    ctx.save();
    ctx.font = `${Math.round(22 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#00A3FF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "#00A3FF44"; ctx.shadowBlur = 6;
    ctx.fillText(`✉  ${info.email}`, cx, emailY); ctx.restore();
  }

  // Recruiting Contact section (coach)
  if (info.coachName || info.coachEmail) {
    const coachY = Math.round(dim.h * 0.81);
    ctx.save();
    ctx.font = `bold ${Math.round(13 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText("RECRUITING CONTACT", cx, coachY); ctx.restore();
    const coachLine = [info.coachName, info.coachEmail].filter(Boolean).join("  ·  ");
    ctx.save();
    ctx.font = `${Math.round(17 * s)}px Arial, sans-serif`;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(coachLine, cx, coachY + Math.round(26 * s)); ctx.restore();
  }

  // "Powered by CLIPT" at very bottom center
  ctx.save();
  ctx.font = `bold ${Math.round(13 * s)}px Arial, sans-serif`;
  ctx.fillStyle = "#475569"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
  ctx.fillText("POWERED BY CLIPT", cx, dim.h - Math.round(20 * s)); ctx.restore();
}

// ── Animation runners ──────────────────────────────────────────────────────────

function runCard(drawFn: () => void, ms: number, isAborted: () => boolean, fadeCtx?: CanvasRenderingContext2D, fadeDim?: Dim): Promise<void> {
  console.log("[runCard] START ms=" + ms);
  return new Promise((resolve) => {
    let ivl: ReturnType<typeof setInterval> | undefined;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      if (ivl !== undefined) clearInterval(ivl);
      console.log("[runCard] END");
      resolve();
    };
    const t0 = Date.now();
    const tick = () => {
      const el = Date.now() - t0;
      if (isAborted() || el >= ms) { done(); return; }
      try { drawFn(); } catch (e) { console.warn("[runCard] drawFn error", e); }
      // 15-frame (~495ms) fade-in overlay
      if (fadeCtx && fadeDim && el < 495) {
        const alpha = 1 - (el / 495);
        fadeCtx.fillStyle = "#050A14";
        fadeCtx.globalAlpha = alpha;
        fadeCtx.fillRect(0, 0, fadeDim.w, fadeDim.h);
        fadeCtx.globalAlpha = 1;
      }
    };
    drawFn(); // draw first frame immediately
    ivl = setInterval(tick, 33);
    setTimeout(done, Math.max(ms, 4000) + 500); // hard safety cap
  });
}

function runTitleCardAnimated(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim, template: TitleCardTemplate, anim: string, ab: () => boolean): Promise<void> {
  console.log("[runTitleCardAnimated] START anim=" + anim);
  return new Promise((resolve) => {
    let ivl: ReturnType<typeof setInterval> | undefined;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      if (ivl !== undefined) clearInterval(ivl);
      console.log("[runTitleCardAnimated] END");
      resolve();
    };
    const t0 = Date.now();
    const tick = () => {
      const el = Date.now() - t0;
      if (ab() || el >= TITLE_MS) { done(); return; }
      ctx.clearRect(0, 0, dim.w, dim.h);
      drawTitleFrame(ctx, info, accent, dim, template);
      // Always apply 15-frame (~495ms) fade-in at start
      if (el < 495) {
        const alpha = 1 - (el / 495);
        ctx.fillStyle = "#050A14"; ctx.globalAlpha = alpha; ctx.fillRect(0, 0, dim.w, dim.h); ctx.globalAlpha = 1;
      } else if (anim === "reveal" && el < 600) {
        const pct = el / 600;
        ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w * (1 - pct), dim.h);
      } else if (anim === "glitch" && el < 400) {
        const offset = Math.round((1 - el / 400) * 8);
        const id = ctx.getImageData(0, 0, dim.w, dim.h);
        ctx.putImageData(id, -offset, 0);
      }
    };
    tick();
    ivl = setInterval(tick, 33);
    setTimeout(done, TITLE_MS + 500);
  });
}

function runPlayerIDOverlay(ctx: CanvasRenderingContext2D, vid: HTMLVideoElement, accent: string, dim: Dim, ab: () => boolean): Promise<void> {
  console.log("[runPlayerIDOverlay] START");
  return new Promise((resolve) => {
    let ivl: ReturnType<typeof setInterval> | undefined;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      if (ivl !== undefined) clearInterval(ivl);
      console.log("[runPlayerIDOverlay] END");
      resolve();
    };
    const t0 = Date.now();
    const cx = dim.w / 2, cy = dim.h / 2, r = Math.round(Math.min(dim.w, dim.h) * 0.09);
    const tick = () => {
      const el = Date.now() - t0;
      if (ab() || el >= PLAYER_MS) { done(); return; }
      const pulse = Math.sin((el / PLAYER_MS) * Math.PI * 3) * 0.3 + 0.7;
      const cr = r * (0.9 + pulse * 0.15);
      drawVideoFrame(ctx, vid, dim, accent);
      ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 18 * pulse; ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      const ay = cy + cr + Math.round(dim.h * 0.022), as_ = Math.round(dim.h * 0.024);
      ctx.save(); ctx.fillStyle = accent; ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.moveTo(cx - as_, ay); ctx.lineTo(cx + as_, ay); ctx.lineTo(cx, ay + as_ * 1.1); ctx.closePath(); ctx.fill(); ctx.restore();
    };
    tick();
    ivl = setInterval(tick, 33);
    setTimeout(done, PLAYER_MS + 300);
  });
}

function runTransition(ctx: CanvasRenderingContext2D, type: string, dim: Dim, ab: () => boolean): Promise<void> {
  if (type === "Hard Cut") return Promise.resolve();
  const ms = type === "Flash Cut" ? 220 : type === "Crossfade" ? 400 : 500;
  const color = type === "Flash Cut" ? "#FFFFFF" : "#000000";
  return new Promise((resolve) => {
    let ivl: ReturnType<typeof setInterval> | undefined;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      if (ivl !== undefined) clearInterval(ivl);
      ctx.globalAlpha = 1;
      resolve();
    };
    const t0 = Date.now();
    const tick = () => {
      const el = Date.now() - t0;
      if (ab() || el >= ms) { done(); return; }
      const alpha = type === "Flash Cut" ? Math.sin((el / ms) * Math.PI) : el / ms;
      ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fillRect(0, 0, dim.w, dim.h); ctx.globalAlpha = 1;
    };
    tick();
    ivl = setInterval(tick, 33);
    setTimeout(done, ms + 200);
  });
}

interface ClipOpts {
  dim: Dim; highlightPlayer: boolean;
  showJerseyOverlay: boolean; enhanceQuality: boolean;
  info: TitleInfo; accent: string;
  trimStart: number; trimEnd: number;
  textOverlay: string; intensity: number;
  playLabel: string; isBestPlay: boolean; highlightBestPlay: boolean;
  watermarkStyle: WatermarkStyle;
  onPct: (p: number) => void;
  slowMo?: boolean;
  isReplay?: boolean;
}

function runClipInner(vid: HTMLVideoElement, ctx: CanvasRenderingContext2D, isAborted: () => boolean, opts: ClipOpts, speedFactor = 1): Promise<void> {
  return new Promise((resolve) => {
    const { dim, showJerseyOverlay, enhanceQuality, info, accent,
      trimStart, trimEnd, textOverlay, intensity, isBestPlay,
      highlightBestPlay, watermarkStyle } = opts;

    vid.playbackRate = speedFactor;
    const tEnd = (trimEnd > 0 && trimEnd <= vid.duration) ? trimEnd : vid.duration;
    const tStart = trimStart > 0 ? trimStart : 0;
    const playDuration = tEnd - tStart;
    const flashDuration = 1.2 / speedFactor;
    const startRealTime = Date.now();

    let ivl: ReturnType<typeof setInterval> | undefined;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      if (ivl !== undefined) clearInterval(ivl);
      resolve();
    };

    const tick = () => {
      if (isAborted() || vid.ended || vid.currentTime >= tEnd) { done(); return; }
      // Skip frame if video not decoded yet — keep interval running
      if (vid.readyState < 4) return;
      const elapsed = vid.currentTime - tStart;
      const realElapsed = (Date.now() - startRealTime) / 1000;

      const filters: string[] = [];
      if (enhanceQuality) filters.push("contrast(1.12) saturate(1.18) brightness(1.04)");
      if (intensity > 0) filters.push(`saturate(${(1 + intensity * 0.01).toFixed(3)}) contrast(${(1 + intensity * 0.003).toFixed(3)})`);
      if (filters.length) ctx.filter = filters.join(" ");
      drawVideoFrame(ctx, vid, dim, accent);
      ctx.filter = "none";

      if (showJerseyOverlay) drawLowerThird(ctx, info, accent, dim);

      if (textOverlay) {
        const barH = Math.round(dim.h * 0.092), y = dim.h - barH;
        ctx.fillStyle = "rgba(5,10,20,0.82)"; ctx.fillRect(0, y, dim.w, barH);
        ctx.save(); ctx.font = `bold ${Math.round(barH * 0.48)}px Arial, sans-serif`;
        ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(textOverlay.slice(0, 30), dim.w / 2, y + barH / 2); ctx.restore();
      }

      if (isBestPlay && highlightBestPlay && realElapsed < flashDuration) {
        const pulse = Math.sin((realElapsed / flashDuration) * Math.PI);
        drawHighlightBorder(ctx, accent, pulse * 0.8, dim);
      }

      if (speedFactor < 1) {
        ctx.save();
        ctx.font = `bold ${Math.round(dim.h * 0.022)}px Arial, sans-serif`;
        ctx.fillStyle = accent; ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4;
        ctx.fillText("SLOW MOTION", dim.w - 20, 20); ctx.restore();
      }

      if (opts.isReplay) {
        ctx.save();
        ctx.font = `bold ${Math.round(dim.h * 0.025)}px Arial, sans-serif`;
        ctx.fillStyle = accent; ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 6;
        ctx.fillText("REPLAY", dim.w - 20, 20); ctx.restore();
      }

      drawStamp(ctx, dim, watermarkStyle, info, accent);
      if (playDuration > 0) opts.onPct(Math.min(elapsed / playDuration, 1));
    };

    tick();
    ivl = setInterval(tick, 33);
    // Hard safety timeout: clip real-time duration + 3s buffer
    const safetyMs = Math.ceil((playDuration / speedFactor) * 1000) + 3000;
    setTimeout(done, safetyMs);
  });
}

// Wait for canplaythrough with 15-second timeout — definitive fix for clip 1 lag
function waitForCanPlay(vid: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (vid.readyState >= 4) { resolve(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    vid.addEventListener("canplaythrough", finish, { once: true });
    setTimeout(finish, 15000); // hard 15-second timeout
  });
}

function runClip(file: File, ctx: CanvasRenderingContext2D, isAborted: () => boolean, opts: ClipOpts, speedFactor = 1): Promise<void> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.preload = "auto"; vid.muted = true; vid.playsInline = true;
    const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };

    vid.onerror = () => { cleanup(); reject(new Error("Processing failed — try uploading smaller clips")); };
    vid.onloadedmetadata = async () => {
      const tStart = opts.trimStart > 0 ? opts.trimStart : 0;
      if (tStart > 0) {
        await new Promise<void>((res) => { vid.onseeked = () => res(); vid.currentTime = tStart; });
      }
      await waitForCanPlay(vid);
      try { await vid.play(); } catch { cleanup(); reject(new Error("Processing failed — try uploading smaller clips")); return; }
      if (opts.highlightPlayer) await runPlayerIDOverlay(ctx, vid, opts.accent, opts.dim, isAborted);
      await runClipInner(vid, ctx, isAborted, opts, speedFactor);
      vid.pause(); cleanup(); resolve();
    };
    vid.src = url; vid.load();
  });
}

function runClipSlowMo(file: File, ctx: CanvasRenderingContext2D, isAborted: () => boolean, opts: ClipOpts): Promise<void> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.preload = "auto"; vid.muted = true; vid.playsInline = true;
    const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };

    vid.onerror = () => { cleanup(); reject(new Error("Processing failed")); };
    vid.onloadedmetadata = async () => {
      const tStart = opts.trimStart > 0 ? opts.trimStart : 0;
      if (tStart > 0) {
        await new Promise<void>((res) => { vid.onseeked = () => res(); vid.currentTime = tStart; });
      }
      await waitForCanPlay(vid);
      try { await vid.play(); } catch { cleanup(); reject(new Error("Processing failed")); return; }
      await runClipInner(vid, ctx, isAborted, { ...opts, playLabel: "REPLAY", isBestPlay: false }, 0.5);
      vid.pause(); cleanup(); resolve();
    };
    vid.src = url; vid.load();
  });
}

function runClipByUrl(url: string, ctx: CanvasRenderingContext2D, isAborted: () => boolean, opts: ClipOpts, speedFactor = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.preload = "auto"; vid.muted = true; vid.playsInline = true;

    vid.onerror = () => { reject(new Error("Processing failed — could not load clip")); };
    vid.onloadedmetadata = async () => {
      const tStart = opts.trimStart > 0 ? opts.trimStart : 0;
      if (tStart > 0) {
        await new Promise<void>((res) => { vid.onseeked = () => res(); vid.currentTime = tStart; });
      }
      await waitForCanPlay(vid);
      try { await vid.play(); } catch { reject(new Error("Processing failed — try uploading smaller clips")); return; }
      if (opts.highlightPlayer) await runPlayerIDOverlay(ctx, vid, opts.accent, opts.dim, isAborted);
      await runClipInner(vid, ctx, isAborted, opts, speedFactor);
      vid.pause(); resolve();
    };
    vid.src = url; vid.load();
  });
}

// ── Build Reel config ─────────────────────────────────────────────────────────

interface BuildConfig {
  files: File[]; clipUrls?: string[]; info: TitleInfo; accent: string;
  dim: Dim; fps: number; bitrate: number;
  musicTrackId: string;
  transitionStyle: string;
  includeStatsCard: boolean; statsData: Record<string, string>;
  showMeasurablesCard: boolean;
  highlightPlayer: boolean; showJerseyOverlay: boolean; enhanceQuality: boolean;
  titleCardTemplate: TitleCardTemplate; introAnimation: string;
  trimStarts: number[]; trimEnds: number[];
  textOverlays: string[]; intensities: number[];
  clipPlayLabels: string[]; bestPlayIndex: number;
  highlightBestPlay: boolean; slowMotionReplay: boolean;
  starredClipIndices: number[]; starredSlowMo: boolean; starredReplay: boolean;
  watermarkStyle: WatermarkStyle;
  isAborted: () => boolean;
  onProgress: (pct: number, text: string) => void;
  onMusicFailed?: () => void;
}

async function buildReel(cfg: BuildConfig): Promise<Blob> {
  const { files, clipUrls, info, accent, dim, fps, bitrate, musicTrackId, transitionStyle,
    includeStatsCard, statsData, showMeasurablesCard, highlightPlayer, showJerseyOverlay, enhanceQuality,
    titleCardTemplate, introAnimation, trimStarts, trimEnds, textOverlays, intensities,
    clipPlayLabels, bestPlayIndex, highlightBestPlay, slowMotionReplay,
    starredClipIndices, starredSlowMo, starredReplay, watermarkStyle,
    isAborted, onProgress, onMusicFailed } = cfg;

  // Determine clip source — prefer File objects, fall back to blob URLs
  const useUrls = clipUrls && clipUrls.length > 0;
  const clipCount = useUrls ? clipUrls!.length : files.length;
  if (clipCount === 0) throw new Error("Processing failed — no clips provided");

  const mime = getSupportedMime();
  if (!mime) throw new Error("NO_RECORDER");

  const canvas = document.createElement("canvas");
  canvas.width = dim.w; canvas.height = dim.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Processing failed — canvas not available");
  ctx.imageSmoothingEnabled = true;
  (ctx as unknown as { imageSmoothingQuality: string }).imageSmoothingQuality = "high";

  // Audio setup — failures are non-fatal, export continues without audio
  let audioCtx: AudioContext | null = null, gainNode: GainNode | null = null, audioDest: MediaStreamAudioDestinationNode | null = null;
  const musicUrl = musicTrackId === "custom"
    ? (() => { try { return localStorage.getItem("clipt_custom_music_url") || undefined; } catch { return undefined; } })()
    : MUSIC_TRACK_URLS[musicTrackId];
  const isCrowdNoise = musicTrackId === "crowd-noise";
  if (musicUrl) {
    try {
      audioCtx = new AudioContext();
      // Resume context in case browser suspended it
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const resp = await fetch(musicUrl, { mode: "cors" });
      if (!resp.ok) throw new Error("fetch failed");
      const buf  = await audioCtx.decodeAudioData(await resp.arrayBuffer());
      const src  = audioCtx.createBufferSource();
      src.buffer = buf; src.loop = true;
      gainNode   = audioCtx.createGain();
      const targetVol = isCrowdNoise ? 0.15 : 0.4;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetVol, audioCtx.currentTime + 2);
      audioDest = audioCtx.createMediaStreamDestination();
      src.connect(gainNode); gainNode.connect(audioDest); src.start();
      console.log("[buildReel] Music loaded:", musicTrackId);
    } catch (e) {
      console.warn("[buildReel] Music failed, continuing without audio:", e);
      audioCtx?.close().catch(() => {});
      audioCtx = null; gainNode = null; audioDest = null;
      onMusicFailed?.();
    }
  }

  const vTracks = canvas.captureStream(fps).getVideoTracks();
  const aTracks = audioDest ? audioDest.stream.getAudioTracks() : [];
  const stream  = new MediaStream([...vTracks, ...aTracks]);
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: bitrate,
    videoKeyFrameIntervalDuration: 1000,
  } as MediaRecorderOptions);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const recordStartMs = Date.now();
  recorder.start(100);

  try {
    onProgress(0, "Loading fonts...");
    const fontsToLoad = ["Inter", "Oswald", "Poppins", "Bebas Neue"];
    await Promise.allSettled(fontsToLoad.map((f) => document.fonts.load(`bold 78px "${f}"`)));

    onProgress(4, "Drawing title card...");
    await runTitleCardAnimated(ctx, info, accent, dim, titleCardTemplate, introAnimation, isAborted);

    if (!isAborted() && includeStatsCard) {
      // Filter out empty stat fields so wrong-sport keys don't show up
      const filteredStats = Object.fromEntries(
        Object.entries(statsData).filter(([, v]) => v && v.trim())
      );
      if (Object.keys(filteredStats).length > 0) {
        onProgress(10, "Drawing stats card...");
        console.log("[buildReel] Drawing stats card with", Object.keys(filteredStats).length, "fields");
        await runCard(() => drawStatsFrame(ctx, filteredStats, info, accent, dim), STATS_MS, isAborted, ctx, dim);
      }
    }

    if (!isAborted() && showMeasurablesCard && Object.values(info.measurablesData || {}).some(Boolean)) {
      onProgress(15, "Drawing measurables card...");
      await runCard(() => drawMeasurablesFrame(ctx, info, accent, dim), MEAS_MS, isAborted, ctx, dim);
    }

    const effTrans = transitionStyle;
    for (let i = 0; i < clipCount; i++) {
      if (isAborted()) break;
      const base = 21 + (i / clipCount) * 58, range = 58 / clipCount;
      onProgress(base, `Processing clip ${i + 1} of ${clipCount}...`);
      if (i > 0) await runTransition(ctx, effTrans, dim, isAborted);
      const clipOpts: ClipOpts = {
        dim, highlightPlayer, showJerseyOverlay, enhanceQuality, info, accent,
        trimStart:   trimStarts[i]    ?? 0,
        trimEnd:     trimEnds[i]      ?? 0,
        textOverlay: textOverlays[i]  ?? "",
        intensity:   intensities[i]   ?? 0,
        playLabel:   clipPlayLabels[i] ?? "",
        isBestPlay:  i === bestPlayIndex,
        highlightBestPlay, watermarkStyle,
        onPct: (p) => onProgress(base + p * range, `Processing clip ${i + 1} of ${clipCount}...`),
      };
      const isStarred = (starredClipIndices ?? []).includes(i);
      const clipSpeed = isStarred && starredSlowMo ? 0.5 : 1;
      console.log(`[buildReel] Running clip ${i + 1}/${clipCount} via ${useUrls ? "URL" : "File"}${isStarred ? " [starred]" : ""}`);
      if (useUrls) {
        await runClipByUrl(clipUrls![i], ctx, isAborted, clipOpts, clipSpeed);
      } else {
        await runClip(files[i], ctx, isAborted, clipOpts, clipSpeed);
      }

      // Instant replay for starred clips (play again at full speed with REPLAY overlay)
      if (!isAborted() && isStarred && starredReplay) {
        onProgress(base + range, `Instant replay: clip ${i + 1}...`);
        await runTransition(ctx, "Fade to Black", dim, isAborted);
        const replayOpts: ClipOpts = { ...clipOpts, isReplay: true, isBestPlay: false };
        if (useUrls) {
          await runClipByUrl(clipUrls![i], ctx, isAborted, replayOpts, 1);
        } else {
          await runClip(files[i], ctx, isAborted, replayOpts, 1);
        }
      }

      // Slow motion replay after best play (legacy single-clip system)
      if (!isAborted() && slowMotionReplay && i === bestPlayIndex && !useUrls && !isStarred) {
        onProgress(base + range, `Slow motion replay: clip ${i + 1}...`);
        await runTransition(ctx, "Fade to Black", dim, isAborted);
        await runClipSlowMo(files[i], ctx, isAborted, clipOpts);
      }

      // 500ms clean gap between clips ensures smooth transition
      if (!isAborted() && i < clipCount - 1) {
        await new Promise<void>((r) => setTimeout(r, 500));
      }
    }

    if (!isAborted()) {
      onProgress(82, "Drawing end card...");
      await runTransition(ctx, "Fade to Black", dim, isAborted);
      await runCard(() => drawEndFrame(ctx, info, accent, dim), END_MS, isAborted, ctx, dim);
    }

    if (!isAborted() && gainNode && audioCtx) {
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
      await new Promise<void>((r) => setTimeout(r, 3000));
    }
    onProgress(96, "Encoding...");
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    audioCtx?.close();
  }

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = async () => {
      if (!chunks.length) { reject(new Error("Processing failed — try uploading smaller clips")); return; }
      const rawBlob = new Blob(chunks, { type: mime });
      // Inject duration metadata into WebM so it can be seeked in any player
      if (mime.includes("webm")) {
        try {
          const { default: fixWebmDuration } = await import("fix-webm-duration");
          const durationMs = Date.now() - recordStartMs;
          const fixed = await fixWebmDuration(rawBlob, durationMs, { logger: false });
          resolve(fixed);
        } catch {
          resolve(rawBlob); // fallback — better than nothing
        }
      } else {
        resolve(rawBlob);
      }
    };
    recorder.onerror = () => reject(new Error("Processing failed — try uploading smaller clips"));
  });
}

// ── UI components ──────────────────────────────────────────────────────────────

function TitleCardPreview({ info, accent, template }: { info: TitleInfo; accent: string; template: TitleCardTemplate }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    Promise.allSettled(["Inter","Oswald","Poppins","Bebas Neue"].map((f) => document.fonts.load(`bold 48px "${f}"`))).then(() => {
      drawTitleFrame(ctx, info, accent, { w: 640, h: 360 }, template);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.firstName, info.sport, info.position, info.school, info.gradYear, info.email, accent, template]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${accent}25` }}>
      <canvas ref={canvasRef} width={640} height={360} style={{ width: "100%", display: "block" }} />
    </div>
  );
}

function ProgressBar({ active, accent }: { active: number; accent: string }) {
  return (
    <div className="max-w-3xl mx-auto px-6 mb-10">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const completed = step.number < active, isActive = step.number === active, isLast = i === STEPS.length - 1;
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all"
                  style={completed || isActive ? { background: accent, borderColor: accent, color: "#050A14" } : { background: "#0A1628", borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }}>
                  {completed ? <CheckSmIcon /> : step.number}
                </div>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: completed || isActive ? accent : "#64748b" }}>{step.label}</span>
              </div>
              {!isLast && <div className="flex-1 h-px mx-2 mb-5 transition-all" style={{ background: completed ? `${accent}70` : "rgba(255,255,255,0.08)" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardBase: React.CSSProperties = { background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" };

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

// ── Quality Preset Selector ────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
  {
    id: "coach"    as ExportQuality,
    label:    "Coach Quality",
    sublabel: "1080p · 60fps · 12 Mbps",
    desc:     "Highest bitrate — best for email & Hudl upload",
    badge:    "BEST",
    minPerMB: 90,
  },
  {
    id: "standard" as ExportQuality,
    label:    "Standard",
    sublabel: "720p · 30fps · 5 Mbps",
    desc:     "Good for most uses — solid quality",
    badge:    "",
    minPerMB: 38,
  },
  {
    id: "social"   as ExportQuality,
    label:    "Social Optimized",
    sublabel: "720p · 30fps · 2.5 Mbps",
    desc:     "Smallest file — best for TikTok & Instagram",
    badge:    "SMALLEST",
    minPerMB: 19,
  },
];

// ── Export page ────────────────────────────────────────────────────────────────

export default function ExportPage() {
  const router = useRouter();
  const reel   = useReel();

  const accentHex = (() => {
    try {
      const s = JSON.parse(localStorage.getItem("cliptSettings") || "{}");
      return s.accentHex || reel.accentHex || "#00A3FF";
    } catch { return reel.accentHex || "#00A3FF"; }
  })();
  const accentIsWhite = isLightColor(accentHex);

  const [device, setDevice] = useState<DeviceType>("desktop");
  const [isSafari, setIsSafari] = useState(false);
  const [isMobileChrome, setIsMobileChrome] = useState(false);
  useEffect(() => {
    const d = detectDeviceDetails();
    setDevice(d.type);
    setIsSafari(d.isSafari);
    setIsMobileChrome(d.isMobileChrome);
    try { localStorage.setItem("cliptDevice", d.type); } catch {}
  }, []);

  // Quality selector
  const [quality, setQuality] = useState<ExportQuality>(reel.exportQuality || "coach");
  const aspectRatio = (reel.exportAspectRatio || "16:9") as ExportAspectRatio;

  // Build state
  const [phase, setPhase]   = useState<Phase>("idle");
  const [pct,   setPct]     = useState(0);
  const [stepText, setStep] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobMime, setBlobMime] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [clipsOnly, setClipsOnly] = useState(false);
  const [storedClipCount, setStoredClipCount] = useState(0);
  const [builtMusicTrackId, setBuiltMusicTrackId] = useState<string>("");
  const [selectedMusicTrackId, setSelectedMusicTrackId] = useState<string>("");
  const [selectedMusicName, setSelectedMusicName] = useState<string | null>(null);
  const [exportTypeSetting, setExportTypeSetting] = useState<"landscape" | "social">("landscape");
  const [showCapcutGuide, setShowCapcutGuide] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Creatomate server-side rendering state
  const [creatomatAvailable, setCreatomatAvailable] = useState(false);
  const [isCreatomateRender, setIsCreatomateRender] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [lastReelUrl, setLastReelUrl] = useState<string | null>(null);
  const creatomatePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const abortRef  = useRef(false);
  const blobRef   = useRef<string | null>(null);

  // Proprietary feature state
  const [showCoachScore, setShowCoachScore] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [recruitingCardUrl, setRecruitingCardUrl] = useState<string | null>(null);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [smartCropOffset, setSmartCropOffset] = useState(0); // -50 to +50 percent shift
  const [smartCropPreviewUrl, setSmartCropPreviewUrl] = useState<string | null>(null);
  const [showSmartCropPanel, setShowSmartCropPanel] = useState(false);
  const smartCropOffsetRef = useRef(0); // keep in sync with smartCropOffset for preview fn

  // Sharing
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState<string | null>(null);
  const copyTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duration enforcement
  const [durationModal, setDurationModal] = useState(false);

  const sport = (() => { try { return JSON.parse(localStorage.getItem("cliptSettings") || "{}").sport || reel.sport || ""; } catch { return reel.sport || ""; } })();
  const reelMinutes  = reel.reelLength || 3;
  const limitMin     = sport === "Basketball" ? 4 : 5;
  const isOverLimit  = reelMinutes > limitMin && (sport === "Basketball" || sport === "Football");

  // Reel ID for sharing
  const reelId = useMemo(() => {
    if (reel.reelId) return reel.reelId;
    const id = Math.random().toString(36).slice(2, 10);
    reel.update({ reelId: id });
    return id;
  }, [reel.reelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reel quality analysis (from AI clips)
  const [qualityData, setQualityData] = useState<{ avg: number; elite: number; strong: number; decent: number } | null>(null);

  useEffect(() => {
    // Load stored clip count for display when files are not in context
    try {
      const n = parseInt(localStorage.getItem("clipt_blob_count") || "0", 10);
      if (n > 0) setStoredClipCount(n);
    } catch {}
    // Load quality data — prefer cliptSettings.clips (manual), fall back to aiGeneratedClips
    try {
      let scores: number[] = [];
      try {
        const settings = JSON.parse(localStorage.getItem("cliptSettings") || "{}");
        if (Array.isArray(settings.clips)) {
          const settingsScores = settings.clips.map((c: { qualityScore?: number }) => c.qualityScore).filter((s: unknown): s is number => typeof s === "number");
          if (settingsScores.length > 0) scores = settingsScores;
        }
      } catch { /* ignore */ }
      if (scores.length === 0) {
        const raw: { qualityScore?: number }[] = JSON.parse(localStorage.getItem("aiGeneratedClips") || "[]");
        scores = raw.map((c) => c.qualityScore).filter((s): s is number => typeof s === "number");
      }
      if (scores.length > 0) {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        setQualityData({
          avg,
          elite:  scores.filter((s) => s >= 80).length,
          strong: scores.filter((s) => s >= 60 && s < 80).length,
          decent: scores.filter((s) => s >= 40 && s < 60).length,
        });
      }
    } catch {}
    // Load selected music track for pre-export music card
    try {
      const s = JSON.parse(localStorage.getItem("cliptSettings") || "{}");
      console.log("EXPORT READING MUSIC:", s.music, s.musicUrl, s.musicName);
      console.log("EXPORT TYPE READ:", s.exportType);
      // Read music — prefer new fields (music/musicName), fall back to legacy (musicTrackId)
      const tid = s.music || s.musicId || s.musicTrackId || reel.musicTrackId || "no-music";
      setSelectedMusicTrackId(tid);
      setSelectedMusicName(s.musicName ?? null);
      // Read export type
      const et = s.exportType as string | undefined;
      if (et === "social") setExportTypeSetting("social");
      else setExportTypeSetting("landscape");
    } catch {}
    // Load last Creatomate render URL for "Previous Reels" section
    try {
      const lastUrl = localStorage.getItem("lastReelUrl");
      if (lastUrl?.startsWith("http")) setLastReelUrl(lastUrl);
    } catch {}
    // Check if Creatomate server rendering is configured
    fetch("/api/render-reel")
      .then((r) => r.json())
      .then((d) => { if (d?.configured) setCreatomatAvailable(true); })
      .catch(() => {});
    return () => {
      abortRef.current = true;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (shareTimer.current) clearTimeout(shareTimer.current);
      if (successTimer.current) clearTimeout(successTimer.current);
      if (creatomatePollRef.current) clearInterval(creatomatePollRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildInfo = (): TitleInfo => {
    // Read cliptSettings (saved by customize page) — primary source for new flow
    let saved: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem("cliptSettings");
      if (raw) saved = JSON.parse(raw);
    } catch {}
    // Also read cliptData (saved by upload page) for fields not in cliptSettings
    let uploadData: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem("cliptData");
      if (raw) uploadData = JSON.parse(raw);
    } catch {}

    // cliptSettings takes priority, then reel context, then uploadData
    const s = (k: string, fallback: string): string => {
      const sv = saved[k]; if (sv && typeof sv === "string" && sv.trim()) return sv;
      const rv = reel[k as keyof typeof reel]; if (rv && typeof rv === "string" && (rv as string).trim()) return rv as string;
      const uv = uploadData[k]; if (uv && typeof uv === "string" && uv.trim()) return uv;
      return fallback;
    };

    const statsData = (saved.statsData && Object.keys(saved.statsData as object).length > 0)
      ? (saved.statsData as Record<string,string>)
      : (reel.statsData && Object.keys(reel.statsData).length > 0)
        ? reel.statsData
        : {};

    console.log("[buildInfo] merged:", { firstName: s("firstName",""), email: s("email",""), sport: s("sport",""), statsKeys: Object.keys(statsData) });
    return {
      firstName: s("firstName", ""), jerseyNumber: s("jerseyNumber", ""),
      sport: s("sport", ""), school: s("school", ""), position: s("position", ""),
      fontFamily: CANVAS_FONT_MAP[(s("fontStyle","Modern") as FontStyle)] ?? "Arial",
      gradYear: s("gradYear", ""), heightFt: s("heightFt", ""), heightIn: s("heightIn", ""),
      weight: s("weight", ""), gpa: s("gpa", ""),
      email: s("email", ""), coachName: s("coachName", ""), coachEmail: s("coachEmail", ""),
      statsData,
      academicStatsData: (saved.academicStatsData as Record<string,string>) ?? reel.academicStatsData ?? {},
      measurablesData: (saved.measurablesData as Record<string,string>) ?? reel.measurablesData ?? {},
    };
  };

  const baseName = (() => {
    try {
      const s = JSON.parse(localStorage.getItem("cliptSettings") || "{}");
      const fn = s.firstName || reel.firstName || "reel";
      const ln = s.lastName || "";
      return `${fn}${ln ? "-" + ln : ""}`.toLowerCase().replace(/\s+/g, "-");
    } catch { return (reel.firstName || "reel").toLowerCase().replace(/\s+/g, "-"); }
  })();

  const handleBuild = async (forceSocial?: boolean) => {
    if (isOverLimit) { setDurationModal(true); return; }
    // Route to Creatomate when configured, canvas otherwise
    if (creatomatAvailable) { await doCreatomateBuild(forceSocial); return; }
    await doBuild(forceSocial);
  };

  // ── Creatomate server-side render flow ──────────────────────────────────────
  const doCreatomateBuild = async (forceSocial?: boolean) => {
    setDurationModal(false);
    abortRef.current = false;
    setPhase("uploading");
    setPct(0);
    setStep("Preparing clips...");
    setIsCreatomateRender(true);
    setRenderUrl(null);
    setBuiltMusicTrackId("");

    // Read per-clip data (trim, duration, blob URLs) from cliptSettings
    let settingsClips: Array<{
      blobUrl?: string; trimStart?: number; trimEnd?: number;
      duration?: number; textOverlay?: string; starred?: boolean;
    }> = [];
    try {
      const raw = localStorage.getItem("cliptSettings");
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.clips)) settingsClips = s.clips;
      }
    } catch {}

    // Gather clip sources — prefer reel.files, then settingsClips blobUrls, then stored blob URLs
    let sources: Array<File | string> = reel.files.length > 0 ? reel.files : [];
    if (sources.length === 0) {
      const clipBlobUrls = settingsClips.map(c => c.blobUrl).filter(Boolean) as string[];
      if (clipBlobUrls.length > 0) {
        sources = clipBlobUrls;
      } else {
        try {
          const stored = localStorage.getItem("clipt_blob_urls");
          if (stored) {
            const parsed: string[] = JSON.parse(stored);
            if (parsed.length > 0) sources = parsed;
          }
        } catch {}
      }
    }
    if (sources.length === 0) {
      setErrMsg("No clips found — go back and upload your clips first."); setPhase("error"); setIsCreatomateRender(false); return;
    }

    // Upload clips to Cloudinary so Creatomate can access them
    let publicUrls: string[];
    try {
      const { uploadClipsToCloudinary } = await import("@/lib/cloudinaryUpload");
      publicUrls = await uploadClipsToCloudinary(sources, (pct, label) => {
        setPct(Math.round(pct * 0.35)); // 0–35% for upload phase
        setStep(label);
      });
    } catch (uploadErr) {
      setErrMsg(uploadErr instanceof Error ? uploadErr.message : "Clip upload failed — check Cloudinary config");
      setPhase("error"); setIsCreatomateRender(false); return;
    }

    if (abortRef.current) { setPhase("idle"); setIsCreatomateRender(false); return; }

    // Read all settings from cliptSettings
    let settings: Record<string, unknown> = {};
    try { settings = JSON.parse(localStorage.getItem("cliptSettings") || "{}"); } catch {}
    const sGet = <T,>(key: string, fallback: T): T => {
      const v = settings[key]; return (v !== undefined && v !== null) ? v as T : fallback;
    };

    const info = buildInfo();
    // Read music ID from legacy field for backward compat
    const musicTrackId = sGet("musicTrackId", reel.musicTrackId || "no-music") as string;

    // Build clips array with trim + category data
    const clipsWithTrim = publicUrls.map((url, i) => ({
      url,
      duration:      settingsClips[i]?.duration      ?? undefined,
      trimStart:     settingsClips[i]?.trimStart      ?? 0,
      trimEnd:       settingsClips[i]?.trimEnd        ?? undefined,
      skillCategory: (settingsClips[i] as { skillCategory?: string })?.skillCategory ?? undefined,
    }));

    // Read new cliptSettings fields (titleCard object saved by new customize page)
    const tc = (settings.titleCard as Record<string, string> | undefined) ?? {};

    // Determine music — prefer new cliptSettings.musicUrl field, fall back to legacy musicTrackId
    const settingsMusicUrl = (settings.musicUrl as string | null) ?? null;
    const settingsMusicId  = (settings.music as string | null) ?? musicTrackId;
    const legacyMusicUrl   = (settingsMusicId === "no-music" || settingsMusicId === "upload") ? undefined
      : settingsMusicId === "custom"
        ? (() => { try { return localStorage.getItem("clipt_custom_music_url") || undefined; } catch { return undefined; } })()
        : MUSIC_TRACK_URLS[settingsMusicId];
    const resolvedMusicUrl = settingsMusicUrl || legacyMusicUrl || null;
    const resolvedMusicName = (settings.musicName as string | null) ?? (MUSIC_TRACK_LABELS[settingsMusicId] ?? null);

    // Social flag — prefer forceSocial override, then cliptSettings.exportType, then aspect ratio
    const settingsExportType = (settings.exportType as string | undefined);
    const isSocial = forceSocial !== undefined
      ? forceSocial
      : (settingsExportType === "social" || aspectRatio === "9:16");

    // Full structured payload — every field passed explicitly
    const renderPayload = {
      clips: clipsWithTrim,
      titleCard: {
        firstName:    tc.firstName    || info.firstName,
        lastName:     tc.lastName     || "",
        jerseyNumber: tc.jerseyNumber || info.jerseyNumber,
        position:     tc.position     || info.position,
        sport:        tc.sport        || info.sport,
        school:       tc.school       || info.school,
        gradYear:     tc.gradYear     || info.gradYear,
        email:        tc.email        || info.email,
        coachName:    tc.coachName    || info.coachName,
        coachEmail:   tc.coachEmail   || info.coachEmail,
        // New fields from customize page
        phone:        tc.phone        || "",
        heightFt:     tc.heightFt     || "",
        heightIn:     tc.heightIn     || "",
        clubTeam:     tc.clubTeam     || "",
        city:         tc.city         || "",
        state:        tc.state        || "",
      },
      stats:    info.statsData || (settings.stats as Record<string, string>) || {},
      settings: {
        colorAccent:     accentHex,
        transition:      sGet("transition",        reel.transition        || "Hard Cut") as string,
        musicUrl:        resolvedMusicUrl,  // always pass — both 16:9 and 9:16 support music
        musicName:       resolvedMusicName,
        statsEnabled:    sGet("statsEnabled", sGet("includeStatsCard", reel.includeStatsCard ?? true)) as boolean,
        jerseyOverlay:   sGet("jerseyOverlay", sGet("showJerseyOverlay", reel.showJerseyOverlay ?? true)) as boolean,
        spotlightStyle:  sGet("spotlightStyle", "none") as string,
      },
      social: isSocial,
      aspectRatio: isSocial ? "9:16" : "16:9",
      preserveQuality: true,
    };

    // Start Creatomate render
    setPhase("processing");
    setStep("Starting server render...");
    setPct(36);

    let renderId: string;
    try {
      const resp = await fetch("/api/render-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renderPayload),
      });
      const data = await resp.json();
      if (!resp.ok || !data.renderId) {
        throw new Error(data.error || "Render start failed");
      }
      renderId = data.renderId;
    } catch (startErr) {
      setErrMsg(startErr instanceof Error ? startErr.message : "Render failed — try again");
      setPhase("error"); setIsCreatomateRender(false); return;
    }

    if (abortRef.current) { setPhase("idle"); setIsCreatomateRender(false); return; }

    // Poll for render completion every 4 seconds
    setStep("Rendering on Creatomate servers... (2–5 min)");
    const renderStartTime = Date.now();

    creatomatePollRef.current = setInterval(async () => {
      if (abortRef.current) {
        if (creatomatePollRef.current) clearInterval(creatomatePollRef.current);
        setPhase("idle"); setIsCreatomateRender(false); return;
      }
      try {
        const resp = await fetch(`/api/render-reel/status?renderId=${renderId}`);
        const status = await resp.json();

        const elapsedSec = Math.round((Date.now() - renderStartTime) / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        const elapsedS = elapsedSec % 60;
        const elapsedStr = elapsedMin > 0 ? `${elapsedMin}m ${elapsedS}s` : `${elapsedSec}s`;

        if (status.status === "rendering" || status.status === "waiting" || status.status === "planned") {
          // Animate progress 36–90% while rendering
          const animPct = Math.min(90, 36 + Math.round((elapsedSec / 300) * 54));
          setPct(animPct);
          setStep(`Rendering on server... ${elapsedStr} elapsed`);
        } else if (status.status === "succeeded" && status.url) {
          if (creatomatePollRef.current) clearInterval(creatomatePollRef.current);
          setPct(100);
          setRenderUrl(status.url);
          // Save for "Previous Reels" section
          try { localStorage.setItem("lastReelUrl", status.url); } catch {}
          setLastReelUrl(status.url);
          // Optional Supabase save — if there's an AI job in progress, update it
          try {
            const jobId = localStorage.getItem("currentJobId");
            if (jobId) {
              const { createClient } = await import("@supabase/supabase-js");
              const sb = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              );
              sb.from("processing_jobs").update({ reel_url: status.url }).eq("id", jobId).then(() => {});
            }
          } catch { /* non-fatal */ }
          const builtTrack = musicTrackId;
          setBuiltMusicTrackId(builtTrack);
          setSelectedMusicTrackId(builtTrack);
          setTimeout(() => {
            setPhase("done");
            setShowSuccess(true);
            successTimer.current = setTimeout(() => setShowSuccess(false), 4000);
          }, 400);
        } else if (status.status === "failed") {
          if (creatomatePollRef.current) clearInterval(creatomatePollRef.current);
          setErrMsg(status.error_message || "Server render failed — try again");
          setPhase("error"); setIsCreatomateRender(false);
        }
      } catch (pollErr) {
        console.warn("[Creatomate poll] error:", pollErr);
      }
    }, 4000);
  };

  const doBuild = async (forceSocial?: boolean) => {
    setDurationModal(false);

    // Try reel.files first; fall back to cliptSettings.clips blobUrls, then clipt_blob_urls
    let buildFiles: File[] = reel.files;
    let buildUrls: string[] | undefined;

    // Read cliptSettings for clip-specific config
    let settingsClips: Array<{ blobUrl?: string; trimStart?: number; trimEnd?: number; textOverlay?: string; starred?: boolean }> = [];
    try {
      const raw = localStorage.getItem("cliptSettings");
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.clips)) settingsClips = s.clips;
      }
    } catch {}

    if (buildFiles.length === 0) {
      // Try cliptSettings.clips blobUrls first
      const clipBlobUrls = settingsClips.map(c => c.blobUrl).filter(Boolean) as string[];
      if (clipBlobUrls.length > 0) {
        buildUrls = clipBlobUrls;
        console.log("[doBuild] Using", clipBlobUrls.length, "cliptSettings blob URLs");
      } else {
        // Fallback to clipt_blob_urls
        try {
          const stored = localStorage.getItem("clipt_blob_urls");
          if (stored) {
            const parsed: string[] = JSON.parse(stored);
            if (parsed.length > 0) {
              buildUrls = parsed;
              console.log("[doBuild] Using", parsed.length, "stored blob URLs from clipt_blob_urls");
            }
          }
        } catch {}
      }

      if (!buildUrls || buildUrls.length === 0) {
        setErrMsg("No clips found — go back and upload your clips first."); setPhase("error"); return;
      }
    }

    abortRef.current = false;
    setPhase("processing"); setPct(0); setStep("Starting...");
    setBuiltMusicTrackId("");

    // Build trim/overlay arrays from settingsClips if available, else fall back to reel
    const trimStarts = settingsClips.length > 0 ? settingsClips.map(c => c.trimStart ?? 0) : reel.clipTrimStarts ?? [];
    const trimEnds   = settingsClips.length > 0 ? settingsClips.map(c => c.trimEnd   ?? 0) : reel.clipTrimEnds   ?? [];
    const textOverlays = settingsClips.length > 0 ? settingsClips.map(c => c.textOverlay ?? "") : reel.clipTextOverlays ?? [];
    const starredIndices = settingsClips.length > 0
      ? settingsClips.map((c, i) => c.starred ? i : -1).filter(i => i >= 0)
      : reel.starredClipIndices ?? [];

    // Read settings preferences
    let settings: Record<string, unknown> = {};
    try { settings = JSON.parse(localStorage.getItem("cliptSettings") || "{}"); } catch {}
    const sGet = <T,>(key: string, fallback: T): T => {
      const v = settings[key]; return (v !== undefined && v !== null) ? v as T : fallback;
    };

    // Save reel profile
    try {
      const profiles = JSON.parse(localStorage.getItem("clipt_profiles") || "{}");
      const info = buildInfo();
      profiles[reelId] = {
        firstName: info.firstName, jerseyNumber: info.jerseyNumber, sport: info.sport,
        school: info.school, position: info.position, gradYear: info.gradYear,
        email: info.email, accentHex, statsData: info.statsData,
        createdAt: Date.now(),
      };
      localStorage.setItem("clipt_profiles", JSON.stringify(profiles));
    } catch {}

    try {
      // Determine format — prefer forceSocial override, then cliptSettings.exportType
      const canvasSocial = forceSocial !== undefined
        ? forceSocial
        : ((settings.exportType as string | undefined) === "social" || aspectRatio === "9:16");
      const canvasRatio: ExportAspectRatio = canvasSocial ? "9:16" : "16:9";
      const dim = getExportDim(canvasRatio, quality);
      const fps = getExportFps(quality);
      const bitrate = getExportBitrate(quality);
      // Resolve music for canvas build — prefer new musicUrl/music fields
      const canvasMusicId = (settings.music as string | undefined) || sGet("musicTrackId", reel.musicTrackId || "no-music") as string;
      const blob = await buildReel({
        files: buildFiles, clipUrls: buildUrls, info: buildInfo(), accent: accentHex,
        dim, fps, bitrate,
        musicTrackId: canvasMusicId,
        transitionStyle: sGet("transition", reel.transition || "Hard Cut"),
        includeStatsCard: sGet("statsEnabled", reel.includeStatsCard) as boolean,
        statsData: (sGet("statsData", reel.statsData) as Record<string,string>) ?? {},
        showMeasurablesCard: reel.showMeasurablesCard,
        highlightPlayer: reel.highlightPlayer,
        showJerseyOverlay: sGet("jerseyOverlay", reel.showJerseyOverlay ?? true) as boolean,
        enhanceQuality: sGet("enhanceQuality", reel.enhanceQuality ?? true) as boolean,
        titleCardTemplate: sGet("titleTemplate", reel.titleCardTemplate || "espn-classic") as TitleCardTemplate,
        introAnimation: sGet("introAnim", reel.introAnimation || "clean-cut") as string,
        trimStarts,
        trimEnds,
        textOverlays,
        intensities:   reel.clipIntensities  ?? [],
        clipPlayLabels: reel.clipPlayLabels  ?? [],
        bestPlayIndex:  reel.bestPlayIndex   ?? -1,
        highlightBestPlay: reel.highlightBestPlay ?? false,
        slowMotionReplay:  sGet("slowMotionStars", reel.slowMotionReplay ?? false) as boolean,
        starredClipIndices: starredIndices,
        starredSlowMo:      sGet("slowMotionStars", reel.starredSlowMo ?? false) as boolean,
        starredReplay:      sGet("instantReplayStars", reel.starredReplay ?? false) as boolean,
        watermarkStyle: reel.watermarkStyle || "clipt",
        isAborted: () => abortRef.current,
        onProgress: (p, t) => { setPct(p); setStep(t); },
        onMusicFailed: () => { /* silent fallback — user downloads music track separately */ },
      });

      const url = URL.createObjectURL(blob);
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = url; setBlobUrl(url); setBlobMime(blob.type); setPct(100);
      const builtTrack = canvasMusicId;
      setBuiltMusicTrackId(builtTrack);
      setSelectedMusicTrackId(builtTrack);
      setTimeout(() => {
        setPhase("done");
        setShowSuccess(true);
        successTimer.current = setTimeout(() => setShowSuccess(false), 4000);
      }, 400);
    } catch (err) {
      if (abortRef.current) { setPhase("idle"); return; }
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NO_RECORDER") { setClipsOnly(true); setPhase("done"); return; }
      setErrMsg(msg.includes("Processing failed") ? msg : "Processing failed — try uploading smaller clips");
      setPhase("error");
    }
  };

  const handleDownloadMusicTrack = () => {
    const url = builtMusicTrackId === "custom"
      ? (() => { try { return localStorage.getItem("clipt_custom_music_url") || null; } catch { return null; } })()
      : MUSIC_TRACK_URLS[builtMusicTrackId] || null;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `${baseName}-music-${builtMusicTrackId}.mp3`;
    a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 200);
  };

  const handleDownloadClips = async () => {
    for (let i = 0; i < reel.files.length; i++) {
      const f = reel.files[i];
      const url = URL.createObjectURL(f);
      triggerDownload(url, `${baseName}-clip-${String(i+1).padStart(2,"0")}-${f.name}`);
      URL.revokeObjectURL(url);
      if (i < reel.files.length - 1) await new Promise<void>((r) => setTimeout(r, 700));
    }
  };

  const handleGenerateRecruitingCard = async () => {
    setGeneratingCard(true);
    try {
      const dataUrl = await drawRecruitingCard(buildInfo(), accentHex);
      setRecruitingCardUrl(dataUrl);
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `${baseName}-recruiting-card.png`; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(() => document.body.removeChild(a), 200);
    } catch (e) { console.error("[recruitingCard]", e); }
    finally { setGeneratingCard(false); }
  };

  const handleSmartCropPreview = async () => {
    const urls: string[] = (() => {
      try { return JSON.parse(localStorage.getItem("clipt_blob_urls") || "[]"); } catch { return []; }
    })();
    const fileOrUrl = reel.files[0] ? URL.createObjectURL(reel.files[0]) : urls[0];
    if (!fileOrUrl) return;
    const vid = document.createElement("video");
    vid.src = fileOrUrl; vid.muted = true; vid.playsInline = true; vid.crossOrigin = "anonymous";

    const renderPreview = (autoCenterXPct: number) => {
      try {
        const srcW = vid.videoWidth || 1280, srcH = vid.videoHeight || 720;
        const cropW = Math.round(srcH * (9 / 16));
        // Use auto-detected center + user offset
        const autoCenterX = Math.round(srcW * autoCenterXPct);
        const offsetX = Math.round((smartCropOffsetRef.current / 100) * (srcW / 2));
        const centerX = autoCenterX + offsetX;
        const cropX = Math.max(0, Math.min(srcW - cropW, centerX - cropW / 2));
        const previewCanvas = document.createElement("canvas");
        previewCanvas.width = 270; previewCanvas.height = 480;
        const pctx = previewCanvas.getContext("2d")!;
        pctx.fillStyle = "#050A14"; pctx.fillRect(0, 0, 270, 480);
        pctx.drawImage(vid, cropX, 0, cropW, srcH, 0, 0, 270, 480);
        setSmartCropPreviewUrl(previewCanvas.toDataURL("image/jpeg", 0.8));
      } catch {}
    };

    // Analyze two frames to find motion region using 3×3 grid diff
    const analyzeMotion = (): Promise<number> => {
      return new Promise((resolve) => {
        const analyzeCanvas = document.createElement("canvas");
        analyzeCanvas.width = 160; analyzeCanvas.height = 90;
        const actx = analyzeCanvas.getContext("2d")!;

        const captureFrame = (): ImageData => {
          actx.drawImage(vid, 0, 0, 160, 90);
          return actx.getImageData(0, 0, 160, 90);
        };

        let frame1: ImageData | null = null;
        vid.onloadedmetadata = () => { vid.currentTime = Math.min(1.0, vid.duration * 0.15); };
        vid.onseeked = () => {
          if (!frame1) {
            frame1 = captureFrame();
            vid.currentTime = vid.currentTime + 0.066; // ~2 frames later
          } else {
            try {
              const frame2 = captureFrame();
              const f1 = frame1.data, f2 = frame2.data;
              // Compute motion score for 3 horizontal zones (left/center/right)
              const scores = [0, 0, 0];
              const W = 160, H = 90;
              const zoneW = Math.floor(W / 3);
              for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                  const idx = (y * W + x) * 4;
                  const diff = Math.abs(f1[idx] - f2[idx]) + Math.abs(f1[idx+1] - f2[idx+1]) + Math.abs(f1[idx+2] - f2[idx+2]);
                  const zone = Math.min(2, Math.floor(x / zoneW));
                  scores[zone] += diff;
                }
              }
              const maxZone = scores.indexOf(Math.max(...scores));
              // Return center X percentage: 0.17 (left), 0.5 (center), 0.83 (right)
              resolve([0.17, 0.50, 0.83][maxZone]);
            } catch { resolve(0.5); }
          }
        };
      });
    };

    const autoCenterX = await analyzeMotion().catch(() => 0.5);
    renderPreview(autoCenterX);
    if (fileOrUrl.startsWith("blob:") && reel.files[0]) URL.revokeObjectURL(fileOrUrl);
  };

  const handleDownloadTitlePNG = async () => {
    const canvas = document.createElement("canvas");
    const dim = { w: 1920, h: 1080 };
    canvas.width = dim.w; canvas.height = dim.h;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    await Promise.allSettled(["Inter","Oswald","Poppins","Bebas Neue"].map((f) => document.fonts.load(`bold 78px "${f}"`)));
    drawTitleFrame(ctx, buildInfo(), accentHex, dim, reel.titleCardTemplate || "espn-classic");
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png"); a.download = `${baseName}-title-card.png`; a.style.display = "none";
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 200);
  };

  const shareUrl = `https://cliptapp.com/reel/${reelId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true); copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (type: string) => {
    const name = reel.firstName || "my";
    const s = reel.sport || "Sports";
    let text = shareUrl;
    if (type === "twitter")   text = `🏀 Check out ${name}'s recruiting highlight reel! #Recruiting #${s} ${shareUrl}`;
    if (type === "instagram") text = `🔥 ${name}'s Highlight Reel — ${shareUrl} #Recruiting #Highlights #${s}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedShare(type); if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => setCopiedShare(null), 2500);
  };

  const handleStartOver = () => {
    try { localStorage.removeItem("clipt_reel"); localStorage.removeItem("aiGeneratedClips"); } catch {}
    window.location.href = "/start";
  };

  const estSizeMB = estimatedFileSizeMB(quality, reelMinutes);
  const estTimeMins = quality === "coach" ? Math.ceil(reelMinutes * 1.3) : Math.ceil(reelMinutes * 1.0);
  const compat = blobMime ? fmtCompat(blobMime) : null;
  const ext    = blobMime?.includes("mp4") ? "mp4" : "webm";
  const dLabel: Record<DeviceType, string> = { ios: "iPhone / iPad", android: "Android", desktop: "Computer" };
  const dIcon:  Record<DeviceType, string> = { ios: "📱", android: "📱", desktop: "💻" };
  const athleteNameDisp = (reel.firstName || "Athlete").toUpperCase();
  const supportedMime = typeof window !== "undefined" ? getSupportedMime() : null;
  const dimInfo = getExportDim(aspectRatio, quality);

  const handlePrimaryDownload = () => {
    if (renderUrl) {
      // Creatomate MP4 — direct link, works on every device including iOS
      triggerDownload(renderUrl, `${baseName}-reel.mp4`);
      return;
    }
    if (!blobUrl) return;
    device === "ios" ? iosOpen(blobUrl) : triggerDownload(blobUrl, `${baseName}-reel-${quality}.${ext}`);
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* Duration modal */}
      {durationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(5,10,20,0.92)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#0A1628", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}><AlertIcon /></div>
              <div><p className="text-white font-bold text-sm">Reel Too Long</p><p className="text-slate-400 text-xs">{sport} reels should be under {limitMin} minutes</p></div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">Your reel is set to <strong className="text-white">{reelMinutes} min</strong>. Most coaches stop watching after {limitMin} minutes.</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => { setDurationModal(false); router.push("/customize"); }}
                className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: accentHex, color: accentIsWhite ? "#050A14" : "#fff" }}>
                ← Fix Duration
              </button>
              <button type="button" onClick={() => doBuild()}
                className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all"
                style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                Export Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/[0.04] py-4">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between gap-4">
          <button type="button" onClick={() => router.push("/customize")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon /><span className="text-sm font-medium">Back</span>
          </button>
          <ProgressBar active={3} accent={accentHex} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Athlete header */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">{athleteNameDisp}</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {[reel.jerseyNumber ? `#${reel.jerseyNumber}` : null, reel.sport, reel.school].filter(Boolean).join(" · ")}
          </p>
          {!supportedMime && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#FBBF24" }}>
              ⚠️ Video recording not supported in this browser — clip download mode
            </div>
          )}
        </div>

        {/* Format info */}
        <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={cardBase}>
          <div className="flex-1">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-0.5">Output Format</p>
            <p className="text-white font-bold">
              {exportTypeSetting === "social" ? "9:16 Vertical — Instagram and TikTok" : "16:9 Landscape — Coach and Email"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{exportTypeSetting === "social" ? "1080×1920" : "1920×1080"} · {getExportFps(quality)}fps</p>
            <p className="text-xs font-semibold mt-1.5" style={{ color: "#22C55E" }}>
              ✓ 1080p HD · {getExportFps(quality)}fps · H.264 High Profile · AAC Audio
            </p>
          </div>
          <button type="button" onClick={() => router.push("/customize")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: `${accentHex}14`, color: accentHex, border: `1px solid ${accentHex}30` }}>
            Change →
          </button>
        </div>

        {/* ── Auto-Optimized For Coaches ── */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#22C55E" }}>
            ✓ Auto-Optimized For Coaches
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Transitions",  value: "Hard Cuts",        reason: "Coaches prefer no distractions" },
              { label: "Music",        value: "Off by default",   reason: "98% of coaches watch on mute" },
              { label: "Format",       value: "1920×1080 16:9",   reason: "Coach email & Hudl compatible" },
              { label: "Quality",      value: "Maximum",          reason: "H.264 High · 60fps · 100 quality" },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-2">
                <span className="text-xs font-bold mt-0.5" style={{ color: "#22C55E" }}>✓</span>
                <div>
                  <span className="text-xs font-semibold text-white">{row.label}: </span>
                  <span className="text-xs font-bold" style={{ color: "#22C55E" }}>{row.value}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">{row.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quality Presets ── */}
        <div className="rounded-2xl p-5" style={cardBase}>
          <p className="text-sm font-bold text-white mb-1">Export Quality</p>
          <p className="text-xs text-slate-500 mb-4">Select before building — affects file size and export time</p>
          <div className="grid grid-cols-3 gap-3">
            {QUALITY_OPTIONS.map((q) => {
              const mb  = Math.round((getExportBitrate(q.id) * (reelMinutes * 60 + 13)) / 8 / 1_000_000);
              const sel = quality === q.id;
              return (
                <button key={q.id} type="button" onClick={() => setQuality(q.id)}
                  disabled={phase === "processing"}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{
                    background: sel ? `${accentHex}14` : "rgba(255,255,255,0.03)",
                    border: sel ? `1.5px solid ${accentHex}55` : "1.5px solid rgba(255,255,255,0.06)",
                  }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {sel && <div className="w-3 h-3 rounded-full" style={{ background: accentHex }} />}
                    {q.badge && <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: `${accentHex}22`, color: accentHex }}>{q.badge}</span>}
                  </div>
                  <p className="text-xs font-bold text-white leading-tight">{q.label}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: accentHex }}>{q.sublabel}</p>
                  <p className="text-[9px] text-slate-500 mt-1">{q.desc}</p>
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[9px] text-slate-400">~{mb} MB · ~{Math.ceil(reelMinutes * (quality === "coach" ? 1.3 : 1.0))} min export</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-3">Estimated: ~{estSizeMB} MB · ~{estTimeMins} min export time at {quality} quality</p>
        </div>

        {/* ── Main Build Card ── */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={cardBase}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-bold">Build Your Reel</p>
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: `${accentHex}22`, color: accentHex }}>
                {aspectRatio} · {quality.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500">{reel.files.length || storedClipCount || "?"} clips · ~{reelMinutes} min</p>
          </div>

          {/* ── PRE-EXPORT MUSIC INFO CARD (idle state only) ── */}
          {phase === "idle" && selectedMusicTrackId && selectedMusicTrackId !== "no-music" && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,163,255,0.25)", background: "rgba(0,163,255,0.05)" }}>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 15 }}>🎵</span>
                  <span className="text-xs font-bold text-white">
                    {selectedMusicName || MUSIC_TRACK_LABELS[selectedMusicTrackId] || selectedMusicTrackId}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-auto">selected</span>
                </div>
                {device === "ios" ? (
                  <p className="text-[11px] leading-snug" style={{ color: "#94a3b8" }}>
                    You&apos;re on iPhone — your reel will download without music.<br />
                    <strong className="text-white">Use CapCut (free)</strong> to add music in 30 seconds.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 leading-snug">Music will be included in your reel automatically.</p>
                )}
              </div>
              {device === "ios" && (
                <>
                  <button type="button" onClick={() => setShowCapcutGuide(o => !o)}
                    className="w-full px-4 py-2 text-xs font-bold text-left flex items-center justify-between transition-colors"
                    style={{ background: "rgba(0,163,255,0.12)", color: "#00A3FF", borderTop: "1px solid rgba(0,163,255,0.2)" }}>
                    <span>{showCapcutGuide ? "Hide Guide" : "See How →"}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      style={{ transform: showCapcutGuide ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showCapcutGuide && (
                    <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(0,163,255,0.15)" }}>
                      {[
                        { n: "1", text: "Download your reel by clicking the button below." },
                        { n: "2", text: "Download your music track by clicking the music button below." },
                        { n: "3", text: <>Open <strong className="text-white">CapCut</strong> → tap <strong className="text-white">New Project</strong> → select your reel → tap the <strong className="text-white">Audio</strong> tab → tap <strong className="text-white">Music</strong> → tap <strong className="text-white">My Files</strong> → select the downloaded music track → trim to match reel length → tap <strong className="text-white">Export</strong>.</> },
                      ].map(({ n, text }) => (
                        <div key={n} className="flex items-start gap-3">
                          <span className="text-xl font-black leading-none shrink-0" style={{ color: "#00A3FF", lineHeight: 1.1 }}>{n}</span>
                          <p className="text-[11px] leading-snug" style={{ color: "#94a3b8" }}>{text}</p>
                        </div>
                      ))}
                      <a href="https://apps.apple.com/app/capcut-video-editor/id1500855883" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ background: "rgba(0,163,255,0.15)", color: "#00A3FF", border: "1px solid rgba(0,163,255,0.3)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                        Download CapCut — Free on App Store
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Creatomate availability badge */}
          {phase === "idle" && creatomatAvailable && (
            <div className="flex items-center gap-2 text-[10px] font-bold rounded-lg px-3 py-2"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22C55E" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Server Rendering — MP4 with music, works on every device including iPhone
            </div>
          )}

          {phase === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" onClick={() => handleBuild(false)}
                className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
                style={{ background: accentHex, color: accentIsWhite ? "#050A14" : "#ffffff" }}>
                <DownloadIcon />
                Build Coach Reel (16:9)
              </button>
              <button type="button" onClick={() => handleBuild(true)}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
                style={{ background: "rgba(255,255,255,0.06)", color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.12)" }}>
                <DownloadIcon />
                Build Social Reel (9:16)
              </button>
            </div>
          )}

          {phase === "uploading" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentHex} strokeWidth="2.5" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                <p className="text-xs font-bold text-white">Uploading clips to cloud</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 truncate pr-2">{stepText}</p>
                <p className="text-xs font-bold tabular-nums shrink-0" style={{ color: accentHex }}>{Math.floor(pct)}%</p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: accentHex }} />
              </div>
              <p className="text-slate-600 text-[10px] text-center">Uploading for server rendering — don&apos;t close this tab</p>
              <button type="button" onClick={() => { abortRef.current = true; setPhase("idle"); setIsCreatomateRender(false); if (creatomatePollRef.current) clearInterval(creatomatePollRef.current); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors self-center">Cancel</button>
            </div>
          )}

          {phase === "processing" && (
            <div className="flex flex-col gap-3">
              {isCreatomateRender && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 px-3 py-2 rounded-lg" style={{ background: "rgba(0,163,255,0.06)", border: "1px solid rgba(0,163,255,0.15)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00A3FF" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  <span>Rendering MP4 with music on Creatomate servers...</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 truncate pr-2">{stepText}</p>
                <p className="text-xs font-bold tabular-nums shrink-0" style={{ color: accentHex }}>{Math.floor(pct)}%</p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all duration-150" style={{ width: `${pct}%`, background: accentHex }} />
              </div>
              <p className="text-slate-600 text-[10px] text-center">
                {isCreatomateRender ? "Server rendering in progress — safe to minimize this tab" : `Don't close this tab · ${Math.round(pct)}% complete`}
              </p>
              <button type="button" onClick={() => { abortRef.current = true; setPhase("idle"); setIsCreatomateRender(false); if (creatomatePollRef.current) clearInterval(creatomatePollRef.current); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors self-center">Cancel</button>
            </div>
          )}

          {phase === "done" && clipsOnly && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <p className="text-xs text-[#FBBF24] font-semibold mb-1">Video recording not supported on this browser</p>
                <p className="text-[10px] text-slate-500">Download your clips to edit in CapCut or iMovie.</p>
              </div>
              <button type="button" onClick={handleDownloadClips}
                className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: accentHex, color: accentIsWhite ? "#050A14" : "#ffffff" }}>
                <DownloadIcon />Download All Clips
              </button>
            </div>
          )}

          {phase === "done" && !clipsOnly && (blobUrl || renderUrl) && (compat || renderUrl) && (
            <div className="flex flex-col gap-3">
              {/* Creatomate server render badge */}
              {renderUrl && (
                <div className="flex items-center gap-2 text-[10px] font-bold rounded-lg px-3 py-2"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22C55E" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Server rendered MP4 — plays everywhere with music baked in
                </div>
              )}

              {/* ── Green success toast ── */}
              {showSuccess && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-sm font-bold text-green-400">Your reel is ready!</p>
                </div>
              )}

              {/* ── Button 1: Download Coach Reel ── */}
              <button type="button" onClick={handlePrimaryDownload}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: "#00A3FF", color: "#050A14" }}>
                <DownloadIcon /> {renderUrl ? "Download Coach Reel (MP4)" : "Download Coach Reel"}
              </button>

              {/* WebM note for desktop non-Safari — only for canvas renders */}
              {!renderUrl && device === "desktop" && !isSafari && ext === "webm" && (
                <p className="text-[10px] leading-snug" style={{ color: "#475569" }}>
                  Downloaded as WebM · plays in Chrome &amp; Firefox.
                  To convert to MP4: <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noopener noreferrer" style={{ color: "#00A3FF" }}>cloudconvert.com</a> (free).
                </p>
              )}

              {/* iOS save hint */}
              {device === "ios" && (
                <p className="text-[10px] text-slate-500 text-center">Opens in Safari → tap Share → Save to Files</p>
              )}

              {/* ── Button 2: Download Music Track ── */}
              {builtMusicTrackId && builtMusicTrackId !== "no-music" && (MUSIC_TRACK_URLS[builtMusicTrackId] || builtMusicTrackId === "custom") && (
                <button type="button" onClick={handleDownloadMusicTrack}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: "transparent", color: "#00A3FF", border: "1.5px solid #00A3FF40" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                  Download Music · {MUSIC_TRACK_LABELS[builtMusicTrackId] ?? "Track"}
                </button>
              )}

              {/* ── iOS CapCut guide (post-download) ── */}
              {device === "ios" && builtMusicTrackId && builtMusicTrackId !== "no-music" && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,163,255,0.2)", background: "rgba(0,163,255,0.04)" }}>
                  <button type="button" onClick={() => setShowCapcutGuide(o => !o)}
                    className="w-full px-4 py-2.5 text-xs font-bold flex items-center justify-between"
                    style={{ color: "#00A3FF" }}>
                    <span>How to add music in CapCut</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      style={{ transform: showCapcutGuide ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showCapcutGuide && (
                    <div className="px-4 pb-4 flex flex-col gap-3">
                      {[
                        { n: "1", text: "Download your reel (button above) and the music track." },
                        { n: "2", text: "Download your music track (button above)." },
                        { n: "3", text: <>Open <strong className="text-white">CapCut</strong> → tap <strong className="text-white">New Project</strong> → select your reel → tap <strong className="text-white">Audio</strong> → <strong className="text-white">Music</strong> → <strong className="text-white">My Files</strong> → select the music file → trim to match reel length → <strong className="text-white">Export</strong>.</> },
                      ].map(({ n, text }) => (
                        <div key={n} className="flex items-start gap-3">
                          <span className="text-lg font-black leading-none shrink-0" style={{ color: "#00A3FF" }}>{n}</span>
                          <p className="text-[11px] leading-snug text-slate-400">{text}</p>
                        </div>
                      ))}
                      <a href="https://apps.apple.com/app/capcut-video-editor/id1500855883" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold mt-1"
                        style={{ background: "rgba(0,163,255,0.15)", color: "#00A3FF", border: "1px solid rgba(0,163,255,0.3)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                        Download CapCut — Free on App Store
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Other device buttons (small) */}
              <div className="flex gap-2">
                {(["ios", "android", "desktop"] as DeviceType[]).filter((d) => d !== device).map((d) => (
                  <button key={d} type="button"
                    onClick={() => { if (!blobUrl) return; d === "ios" ? iosOpen(blobUrl) : triggerDownload(blobUrl, `${baseName}-reel.${ext}`); }}
                    className="flex-1 py-2 rounded-xl font-semibold text-[10px] transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {dIcon[d]} {dLabel[d]}
                  </button>
                ))}
              </div>

              {/* Rebuild */}
              <button type="button" onClick={() => { setPhase("idle"); setShowSuccess(false); setRenderUrl(null); setIsCreatomateRender(false); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors self-center mt-1">
                ↺ Build Again (change quality)
              </button>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 text-xs text-[#EF4444]"><span className="shrink-0 mt-0.5"><AlertIcon /></span><span>{errMsg || "Processing failed"}</span></div>
              <button type="button" onClick={() => { setPhase("idle"); setIsCreatomateRender(false); }}
                className="w-full py-2.5 rounded-xl font-semibold text-xs"
                style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>Try Again</button>
            </div>
          )}
        </div>

        {/* ── YOUR PREVIOUS REELS ── */}
        {lastReelUrl && lastReelUrl.startsWith("http") && (
          <div className="rounded-2xl p-5" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">Your Previous Reel</p>
                <p className="text-xs text-slate-500 mt-0.5">Last server-rendered MP4 — still available for download</p>
              </div>
              <span className="text-[9px] font-black tracking-widest px-2 py-1 rounded-full"
                style={{ background: "rgba(0,163,255,0.1)", color: "#00A3FF", border: "1px solid rgba(0,163,255,0.2)" }}>
                MP4
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => triggerDownload(lastReelUrl, `${baseName}-reel-previous.mp4`)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: `${accentHex}14`, color: accentHex, border: `1px solid ${accentHex}30` }}>
                <DownloadIcon /> Download Previous Reel
              </button>
              <button type="button"
                onClick={() => { try { localStorage.removeItem("lastReelUrl"); } catch {} setLastReelUrl(null); }}
                className="px-3 py-2.5 rounded-xl text-xs transition-all"
                style={{ background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.06)" }}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── REEL ANALYSIS ── */}
        {qualityData && (() => {
          let aiVerifiedCount = 0;
          let estimatedCount = 0;
          try {
            const s = JSON.parse(localStorage.getItem("cliptSettings") || "{}");
            if (Array.isArray(s.clips)) {
              s.clips.forEach((c: { classifiedBy?: string }) => {
                if (c.classifiedBy === "google-ai") aiVerifiedCount++;
                else if (c.classifiedBy === "estimated") estimatedCount++;
              });
            }
          } catch { /* ignore */ }
          return (
          <div className="rounded-2xl p-5" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-white">Reel Analysis</p>
              {aiVerifiedCount > 0 && (
                <span className="text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                  ✓ AI Verified · {aiVerifiedCount} clips
                </span>
              )}
              {aiVerifiedCount === 0 && estimatedCount > 0 && (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ background: "rgba(251,191,36,0.10)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.2)" }}>
                  EST · {estimatedCount} clips
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">AI quality breakdown of your selected clips</p>

            {/* Average score bar */}
            <div className="flex items-center gap-3 mb-3">
              <div className="shrink-0 text-center">
                <div className="text-2xl font-black" style={{
                  color: qualityData.avg >= 75 ? "#22C55E" : qualityData.avg >= 60 ? "#00A3FF" : "#F59E0B"
                }}>{qualityData.avg}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">avg score</div>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${qualityData.avg}%`,
                      background: qualityData.avg >= 75 ? "#22C55E" : qualityData.avg >= 60 ? "#00A3FF" : "#F59E0B"
                    }} />
                </div>
                <p className="text-[10px] font-semibold" style={{
                  color: qualityData.avg >= 75 ? "#22C55E" : qualityData.avg >= 60 ? "#00A3FF" : "#F59E0B"
                }}>
                  {qualityData.avg >= 75 ? "Excellent reel — coaches will be impressed"
                    : qualityData.avg >= 60 ? "Good reel — consider replacing low scoring clips"
                    : "Needs work — go back and swap out low scoring clips for better ones"}
                </p>
              </div>
            </div>

            {/* Play type breakdown */}
            <div className="flex gap-3">
              {qualityData.elite > 0 && (
                <div className="flex-1 rounded-lg px-2 py-2 text-center" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div className="text-base font-black" style={{ color: "#FBBF24" }}>{qualityData.elite}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Elite</div>
                </div>
              )}
              {qualityData.strong > 0 && (
                <div className="flex-1 rounded-lg px-2 py-2 text-center" style={{ background: "rgba(0,163,255,0.08)", border: "1px solid rgba(0,163,255,0.2)" }}>
                  <div className="text-base font-black" style={{ color: "#00A3FF" }}>{qualityData.strong}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Strong</div>
                </div>
              )}
              {qualityData.decent > 0 && (
                <div className="flex-1 rounded-lg px-2 py-2 text-center" style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)" }}>
                  <div className="text-base font-black" style={{ color: "#94A3B8" }}>{qualityData.decent}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Decent</div>
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* ── COACH READY SCORE ── */}
        {(() => {
          const _info = buildInfo();
          let _settings: Record<string, unknown> = {};
          try { _settings = JSON.parse(localStorage.getItem("cliptSettings") || "{}"); } catch {}
          const scoreData = calcCoachReadyScore({
            reelLength: reel.reelLength || 3,
            sport: _info.sport || reel.sport || "",
            musicTrackId: (typeof _settings.musicTrackId === "string" ? _settings.musicTrackId : null) || reel.musicTrackId || "no-music",
            includeStatsCard: (typeof _settings.statsEnabled === "boolean" ? _settings.statsEnabled : null) ?? reel.includeStatsCard,
            gradYear: _info.gradYear || reel.gradYear || "",
            heightFt: _info.heightFt || reel.heightFt || "",
            weight: _info.weight || reel.weight || "",
            email: _info.email || reel.email || "",
            gpa: _info.gpa || reel.gpa || "",
            fontStyle: (typeof _settings.fontStyle === "string" ? _settings.fontStyle : null) || reel.fontStyle || "Modern",
            transition: (typeof _settings.transition === "string" ? _settings.transition : null) || reel.transition || "Hard Cut",
            firstName: _info.firstName || reel.firstName || "",
            school: _info.school || reel.school || "",
            position: _info.position || reel.position || "",
            jerseyNumber: _info.jerseyNumber || reel.jerseyNumber || "",
          });
          const gradeColor = scoreData.score >= 90 ? "#22C55E" : scoreData.score >= 80 ? "#00A3FF" : scoreData.score >= 70 ? "#F59E0B" : "#EF4444";
          const circumference = 2 * Math.PI * 44;
          const dash = (scoreData.score / 110) * circumference;
          return (
            <div className="rounded-2xl p-5" style={cardBase}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">Coach Ready Score</p>
                  <p className="text-xs text-slate-500">How professional does your reel look to coaches?</p>
                </div>
                <button type="button" onClick={() => setShowCoachScore((o) => !o)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: `${accentHex}14`, color: accentHex, border: `1px solid ${accentHex}30` }}>
                  {showCoachScore ? "Hide" : "Show Details"}
                </button>
              </div>

              {/* Score circle + grade */}
              <div className="flex items-center gap-6 mb-4">
                <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="44" fill="none" stroke={gradeColor} strokeWidth="8"
                      strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={circumference * 0.25}
                      strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease", filter: `drop-shadow(0 0 6px ${gradeColor}60)` }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{scoreData.grade}</span>
                    <span style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{scoreData.score}/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-black text-white mb-1">{scoreData.gradeLabel}</p>
                  <div className="flex flex-col gap-1">
                    {scoreData.bonuses.filter((b) => b.applies).map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-green-400">
                        <span style={{ fontSize: 10 }}>✓</span> {b.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {showCoachScore && (
                <div className="flex flex-col gap-3">
                  {scoreData.deductions.filter((d) => d.applies).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What&apos;s Hurting Your Score</p>
                      <div className="flex flex-col gap-2">
                        {scoreData.deductions.filter((d) => d.applies).map((d, i) => (
                          <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-red-400">{d.label}</span>
                              <span className="text-xs font-bold text-red-400">{d.delta}</span>
                            </div>
                            {d.fix && <p className="text-[10px] text-slate-500 leading-snug">→ {d.fix}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {scoreData.deductions.filter((d) => !d.applies).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What&apos;s Looking Good</p>
                      <div className="flex flex-col gap-1.5">
                        {scoreData.deductions.filter((d) => !d.applies).map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-green-400 pl-1">
                            <span style={{ fontSize: 10 }}>✓</span> {d.label.replace("Missing ", "Has ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 9:16 SMART CROP (social vertical export) ── */}
        {aspectRatio === "9:16" && (
          <div className="rounded-2xl p-5" style={cardBase}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white mb-0.5">Smart Crop — follows the action automatically</p>
                <p className="text-xs text-slate-500">Analyzes motion to crop the best part of each frame</p>
              </div>
              <button type="button" onClick={() => { setShowSmartCropPanel((o) => !o); if (!showSmartCropPanel) handleSmartCropPreview(); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: `${accentHex}14`, color: accentHex, border: `1px solid ${accentHex}30` }}>
                {showSmartCropPanel ? "Hide" : "Preview Crop"}
              </button>
            </div>
            {showSmartCropPanel && (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="shrink-0 rounded-xl overflow-hidden" style={{ width: 108, height: 192, background: "#0A1628", border: `1px solid ${accentHex}30` }}>
                    {smartCropPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={smartCropPreviewUrl} alt="Smart crop preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-slate-600 text-xs text-center px-2">Loading preview...</span>
                      </div>
                    )}
                  </div>
                  {/* Controls */}
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-3">Adjust crop position if the auto-crop misses the action:</p>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>← Left</span><span>Center</span><span>Right →</span>
                      </div>
                      <input type="range" min={-50} max={50} step={5} value={smartCropOffset}
                        onChange={(e) => { const v = Number(e.target.value); setSmartCropOffset(v); smartCropOffsetRef.current = v; setTimeout(handleSmartCropPreview, 50); }}
                        className="w-full" style={{ accentColor: accentHex }} />
                    </div>
                    <p className="text-xs text-slate-600 mb-3">{smartCropOffset === 0 ? "Auto center crop" : `Shifted ${Math.abs(smartCropOffset)}% ${smartCropOffset < 0 ? "left" : "right"}`}</p>
                    <button type="button" onClick={handleSmartCropPreview}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: `${accentHex}18`, color: accentHex }}>
                      Refresh Preview
                    </button>
                  </div>
                </div>
                <div className="rounded-lg px-3 py-2 text-xs text-slate-500" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  The Smart Crop offset is applied during export. Use the slider to put the athlete at the center of frame.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REEL COMPARISON ── */}
        {(() => {
          const bench = getBenchmark(reel.sport || "", reel.position || "");
          if (!bench) return null;
          const myMin = reel.reelLength || 3;
          const myClips = reel.files.length || storedClipCount || 0;
          const minDiff = myMin - bench.avgReelMin;
          const clipsInRange = myClips >= bench.idealClips[0] && myClips <= bench.idealClips[1];
          return (
            <div className="rounded-2xl p-5" style={cardBase}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">See How You Compare</p>
                  <p className="text-xs text-slate-500">Benchmarks for recruited {reel.position || "athletes"}</p>
                </div>
                <button type="button" onClick={() => setShowComparison((o) => !o)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: `${accentHex}14`, color: accentHex, border: `1px solid ${accentHex}30` }}>
                  {showComparison ? "Hide" : "Compare"}
                </button>
              </div>
              {showComparison && (
                <div className="flex flex-col gap-3">
                  {/* Reel length */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-white">Reel Length</p>
                        <p className="text-[10px] text-slate-500">Your reel: {myMin} min · Average: {bench.avgReelMin} min</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                        background: Math.abs(minDiff) <= 0.5 ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)",
                        color: Math.abs(minDiff) <= 0.5 ? "#22C55E" : "#F59E0B",
                      }}>
                        {Math.abs(minDiff) <= 0.5 ? "On target" : minDiff > 0 ? `+${minDiff.toFixed(1)} min long` : `${Math.abs(minDiff).toFixed(1)} min short`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {Math.abs(minDiff) <= 0.5
                        ? `Your reel is ${myMin} min — perfect for a ${reel.position}. Recruited ${reel.position}s average ${bench.avgReelMin} min.`
                        : minDiff > 0.5
                        ? `Your reel is ${myMin} min. Consider trimming — coaches stop watching after ${bench.avgReelMin.toFixed(1)} min for most ${reel.position}s.`
                        : `Your reel is ${myMin} min. Recruited ${reel.position}s average ${bench.avgReelMin} min — you may have room for more clips.`}
                    </p>
                  </div>
                  {/* Clip count */}
                  {myClips > 0 && (
                    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold text-white">Clip Count</p>
                          <p className="text-[10px] text-slate-500">You: {myClips} clips · Ideal range: {bench.idealClips[0]}–{bench.idealClips[1]}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                          background: clipsInRange ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)",
                          color: clipsInRange ? "#22C55E" : "#F59E0B",
                        }}>
                          {clipsInRange ? "Great range" : myClips < bench.idealClips[0] ? "Add more clips" : "Consider trimming"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        You included {myClips} clip{myClips !== 1 ? "s" : ""}. Coaches typically want {bench.idealClips[0]}–{bench.idealClips[1]} for a {reel.position}.
                      </p>
                    </div>
                  )}
                  {/* GPA benchmark */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs font-bold text-white mb-1">Average GPA of Recruited {reel.position}s</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black" style={{ color: accentHex }}>{bench.avgGpa.toFixed(1)}</span>
                      <span className="text-xs text-slate-500">{reel.gpa ? `Your GPA: ${reel.gpa}` : "Add your GPA in Customize →"}</span>
                    </div>
                  </div>
                  {/* Most wanted clips */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs font-bold text-white mb-1">Coaches Most Request</p>
                    <p className="text-xs text-slate-400">{bench.topClips}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── RECRUITING CARD ── */}
        <div className="rounded-2xl p-5" style={cardBase}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accentHex}18`, color: accentHex }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-0.5">Recruiting Card — send this to coaches with your reel</p>
              <p className="text-xs text-slate-500">One-page 1200×800 PNG with all your stats, measurables & contact info</p>
            </div>
          </div>
          {recruitingCardUrl && (
            <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${accentHex}30` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={recruitingCardUrl} alt="Recruiting card preview" className="w-full" />
            </div>
          )}
          <button type="button" onClick={handleGenerateRecruitingCard} disabled={generatingCard}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: generatingCard ? "rgba(255,255,255,0.06)" : `${accentHex}18`, color: accentHex, border: `1px solid ${accentHex}30` }}>
            {generatingCard ? (
              <><span style={{ fontSize: 14 }}>⏳</span> Generating Card...</>
            ) : (
              <><DownloadIcon /> Generate Recruiting Card</>
            )}
          </button>
          <p className="text-[10px] text-slate-600 mt-2 text-center">Downloads as PNG · share via email or DM alongside your reel</p>
        </div>

        {/* ── Title Card Preview ── */}
        <div className="rounded-2xl p-5" style={cardBase}>
          <p className="text-sm font-bold text-white mb-1">Title Card Preview</p>
          <p className="text-xs text-slate-500 mb-3">Verify your opening card before exporting</p>
          <TitleCardPreview info={buildInfo()} accent={accentHex} template={reel.titleCardTemplate || "espn-classic"} />
        </div>

        {/* ── Quick downloads ── */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleDownloadTitlePNG}
            className="rounded-xl p-4 text-left transition-all hover:bg-white/[0.04]" style={cardBase}>
            <p className="text-sm font-semibold text-white mb-0.5">Title Card PNG</p>
            <p className="text-xs text-slate-500">1920×1080 · great for social</p>
          </button>
          <button type="button" onClick={handleDownloadClips}
            className="rounded-xl p-4 text-left transition-all hover:bg-white/[0.04]" style={cardBase}>
            <p className="text-sm font-semibold text-white mb-0.5">Download All Clips</p>
            <p className="text-xs text-slate-500">Original files · {reel.files.length} clips</p>
          </button>
        </div>

        {/* ── Share Your Reel ── */}
        <div className="rounded-2xl p-5" style={cardBase}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accentHex}18`, color: accentHex }}>
              <LinkIcon />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Share Your Reel</p>
              <p className="text-xs text-slate-500">Send this link to coaches for your recruiting profile</p>
            </div>
          </div>

          {/* Link */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-xs font-mono text-slate-300 flex-1 truncate">{shareUrl}</span>
            <button type="button" onClick={handleCopy}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: accentHex, color: accentIsWhite ? "#050A14" : "#fff" }}>
              {copied ? <><CheckSmIcon /> Copied!</> : <><CopyIcon /> Copy</>}
            </button>
          </div>

          {/* Social share */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "link",      icon: <LinkIcon />,      label: "Copy Link"  },
              { key: "twitter",   icon: <TwitterIcon />,   label: "X / Twitter"},
              { key: "instagram", icon: <InstagramIcon />, label: "Instagram"  },
            ].map(({ key, icon, label }) => (
              <button key={key} type="button" onClick={() => handleShare(key)}
                className="rounded-xl py-2.5 flex items-center justify-center gap-1.5 font-semibold text-xs transition-all hover:opacity-80"
                style={{ background: copiedShare === key ? `${accentHex}18` : "rgba(255,255,255,0.05)", color: copiedShare === key ? accentHex : "#94a3b8", border: `1px solid ${copiedShare === key ? accentHex + "40" : "rgba(255,255,255,0.08)"}` }}>
                {icon}{label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-600 mt-3 text-center">
            Coaches can view your profile at this link · Profile ID: {reelId}
          </p>
        </div>

        {/* ── Tips ── */}
        <div className="rounded-2xl p-5" style={{ ...cardBase, background: "rgba(10,22,40,0.6)" }}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Pro Tips</p>
          <div className="flex flex-col gap-2">
            {[
              "Upload to Hudl or NCSA for recruiting platform integration",
              "Send via email as an attachment — keeps it easy for coaches",
              "Tag your school on social with your reel clip for visibility",
              "Update your reel each season with new stats",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ color: accentHex, fontSize: 12, marginTop: 1 }}>›</span>
                <p className="text-xs text-slate-400">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Start Over ── */}
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/[0.04]">
          <button type="button" onClick={handleStartOver}
            className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
            ↺ Start Over (clear all data)
          </button>
          <p className="text-[10px] text-slate-700">
            Powered by CLIPT · cliptapp.com
          </p>
        </div>

      </div>
    </div>
  );
}
