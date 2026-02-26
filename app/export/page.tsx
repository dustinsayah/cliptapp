"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type { ColorAccent, FontStyle, MusicStyle, TransitionStyle } from "../providers";

// ── Dimensions ────────────────────────────────────────────────────────────────
type Dim = { w: number; h: number };
const DIM_LANDSCAPE: Dim = { w: 1280, h: 720 };
const DIM_PORTRAIT:  Dim = { w: 720,  h: 1280 };
const TITLE_MS  = 4000;
const STATS_MS  = 4000;
const END_MS    = 4000;
const PLAYER_MS = 800;

// ── Maps ──────────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<ColorAccent, string> = {
  "Electric Blue": "#00A3FF",
  "Red":           "#EF4444",
  "Gold":          "#FBBF24",
  "Green":         "#22C55E",
  "Purple":        "#A855F7",
  "White":         "#F1F5F9",
};
const CANVAS_FONT_MAP: Record<FontStyle, string> = {
  Modern:   "Inter",
  Bold:     "Oswald",
  Clean:    "Poppins",
  Athletic: "Bebas Neue",
};
const MUSIC_URLS: Partial<Record<MusicStyle, string>> = {
  Hype:      "https://assets.mixkit.co/music/370/370.mp3",
  Cinematic: "https://assets.mixkit.co/music/614/614.mp3",
  Trap:      "https://assets.mixkit.co/music/267/267.mp3",
  Drill:     "https://assets.mixkit.co/music/400/400.mp3",
  Piano:     "https://assets.mixkit.co/music/738/738.mp3",
  LoFi:      "https://assets.mixkit.co/music/282/282.mp3",
};
const STEPS = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize",    number: 2 },
  { label: "Export",       number: 3 },
];

// ── Device & format helpers ───────────────────────────────────────────────────
type DeviceType = "ios" | "android" | "desktop";
function detectDevice(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !/Windows Phone/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
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
function fmtLabel(mime: string): string {
  if (mime.includes("mp4")) return "MP4";
  if (mime.includes("vp9")) return "WebM VP9";
  if (mime.includes("vp8")) return "WebM VP8";
  return "WebM";
}
function fmtCompat(mime: string) {
  const mp4 = mime.includes("mp4");
  return { label: mp4 ? "MP4" : "WebM", ios: mp4, android: true, desktop: true };
}
function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => document.body.removeChild(a), 200);
}
function iosOpen(url: string) { window.open(url, "_blank", "noopener"); }

// ── Icons ─────────────────────────────────────────────────────────────────────
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
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckSmIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CheckMdIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ── Canvas types ──────────────────────────────────────────────────────────────
interface TitleInfo {
  firstName: string; jerseyNumber: string; sport: string; school: string;
  position: string; fontFamily: string; gradYear: string;
  heightFt: string; heightIn: string; weight: string; gpa: string;
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────

function stamp(ctx: CanvasRenderingContext2D, dim: Dim) {
  ctx.save();
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillStyle = "rgba(0,163,255,0.72)";
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("CLIPT", dim.w - 14, dim.h - 10);
  ctx.restore();
}

/**
 * Draw a video frame onto ctx, preserving aspect ratio with letterboxing.
 * - Landscape video in landscape canvas: fills canvas normally.
 * - Vertical/portrait video in landscape canvas: letterboxed (bars on sides).
 * - Landscape video in portrait canvas: center-cropped.
 * - Vertical video in portrait canvas: fills normally.
 */
function drawVideoFrame(ctx: CanvasRenderingContext2D, vid: HTMLVideoElement, dim: Dim, accent = "#0A1628") {
  const srcW = vid.videoWidth  || 1280;
  const srcH = vid.videoHeight || 720;
  const srcAspect = srcW / srcH;
  const dstAspect = dim.w / dim.h;
  const TOL = 0.06;

  // Fill background first (always)
  ctx.fillStyle = "#0A1628";
  ctx.fillRect(0, 0, dim.w, dim.h);

  if (srcAspect > dstAspect + TOL) {
    // Source WIDER than destination
    if (dim.w < dim.h) {
      // Portrait canvas, landscape source → center-crop
      const cropW = Math.round(srcH * dstAspect);
      const cropX = Math.round((srcW - cropW) / 2);
      ctx.drawImage(vid, cropX, 0, cropW, srcH, 0, 0, dim.w, dim.h);
    } else {
      // Landscape canvas, ultra-wide source → letterbox top/bottom
      const drawH = Math.round(srcH * (dim.w / srcW));
      const y = Math.round((dim.h - drawH) / 2);
      ctx.drawImage(vid, 0, y, dim.w, drawH);
    }
  } else if (srcAspect < dstAspect - TOL) {
    // Source NARROWER/TALLER than destination (vertical phone video)
    // Letterbox: fit height, add bars on left and right
    const drawW = Math.round(srcW * (dim.h / srcH));
    const x = Math.round((dim.w - drawW) / 2);

    if (x > 4) {
      // Accent-tinted gradient bars
      const gl = ctx.createLinearGradient(0, 0, x * 1.6, 0);
      gl.addColorStop(0, "#050A14");
      gl.addColorStop(1, accent + "18");
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, x, dim.h);

      const gr = ctx.createLinearGradient(dim.w, 0, dim.w - x * 1.6, 0);
      gr.addColorStop(0, "#050A14");
      gr.addColorStop(1, accent + "18");
      ctx.fillStyle = gr;
      ctx.fillRect(x + drawW, 0, dim.w - (x + drawW), dim.h);
    }
    ctx.drawImage(vid, x, 0, drawW, dim.h);
  } else {
    // Same aspect (within tolerance) → fill canvas
    ctx.drawImage(vid, 0, 0, dim.w, dim.h);
  }
}

function drawLowerThird(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim) {
  const barH = Math.round(dim.h * 0.1);
  const y = dim.h - barH;
  ctx.fillStyle = "rgba(5,10,20,0.93)";
  ctx.fillRect(0, y, dim.w, barH);
  ctx.fillStyle = accent; ctx.fillRect(0, y, 4, barH);
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = `bold ${Math.round(barH * 0.38)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF"; ctx.textBaseline = "middle";
  ctx.fillText(`${(info.firstName || "ATHLETE").toUpperCase()}${info.jerseyNumber ? `  #${info.jerseyNumber}` : ""}`, 16, y + barH * 0.35);
  ctx.restore();
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = `${Math.round(barH * 0.27)}px Arial, sans-serif`;
  ctx.fillStyle = accent; ctx.textBaseline = "middle";
  ctx.fillText([info.sport, info.position, info.school].filter(Boolean).join(" · ").toUpperCase(), 16, y + barH * 0.72);
  ctx.restore();
}

function drawTextOverlay(ctx: CanvasRenderingContext2D, text: string, fontFamily: string, dim: Dim) {
  if (!text.trim()) return;
  const barH = Math.round(dim.h * 0.092);
  const y = dim.h - barH;
  ctx.fillStyle = "rgba(5,10,20,0.82)";
  ctx.fillRect(0, y, dim.w, barH);
  ctx.save();
  ctx.font = `bold ${Math.round(barH * 0.48)}px "${fontFamily}", Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 30), dim.w / 2, y + barH / 2);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, dim: Dim) {
  ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1;
  for (let x = 0; x <= dim.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dim.h); ctx.stroke(); }
  for (let y = 0; y <= dim.h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dim.w, y); ctx.stroke(); }
}

function drawTitleFrame(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2, cy = dim.h / 2;
  const ff = info.fontFamily || "Arial";
  const ffs = `"${ff}", Arial, sans-serif`;
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawGrid(ctx, dim);
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(dim.w, dim.h) * 0.52);
  grd.addColorStop(0, accent + "28"); grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);
  const bw = Math.round(dim.w * 0.07);
  ctx.fillStyle = accent; ctx.fillRect(cx - bw / 2, cy - Math.round(dim.h * 0.135), bw, 3);
  const ns = Math.round(Math.min(dim.w * 0.062, 78));
  ctx.save();
  ctx.font = `${ff === "Bebas Neue" ? "" : "bold "}${ns}px ${ffs}`;
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = ff === "Bebas Neue" ? "4px" : "2px";
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, cy - Math.round(dim.h * 0.014));
  ctx.restore();
  ctx.save();
  ctx.font = `bold ${Math.round(ns * 0.28)}px ${ffs}`;
  ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
  ctx.fillText(([info.sport, info.position].filter(Boolean).join(" · ") || "ATHLETE").toUpperCase(), cx, cy + Math.round(dim.h * 0.064));
  ctx.restore();
  const meta = [
    info.jerseyNumber ? `#${info.jerseyNumber}` : null,
    info.school || null,
    info.gradYear ? `'${info.gradYear.slice(-2)}` : null,
    info.heightFt ? `${info.heightFt}'${info.heightIn || "0"}"` : null,
    info.weight ? `${info.weight} lbs` : null,
    info.gpa ? `${info.gpa} GPA` : null,
  ].filter(Boolean).join("  ·  ");
  if (meta) {
    ctx.save();
    ctx.font = `500 ${Math.round(ns * 0.21)}px Arial, sans-serif`;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px";
    ctx.fillText(meta.toUpperCase(), cx, cy + Math.round(dim.h * 0.117));
    ctx.restore();
  }
  stamp(ctx, dim);
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawStatsFrame(ctx: CanvasRenderingContext2D, statsData: Record<string, string>, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2, cy = dim.h / 2;
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawGrid(ctx, dim);
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(dim.w, dim.h) * 0.45);
  grd.addColorStop(0, accent + "20"); grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);
  const hY = Math.round(dim.h * 0.17);
  ctx.save();
  ctx.font = `bold ${Math.round(dim.h * 0.026)}px Arial, sans-serif`;
  ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("SEASON STATS", cx, hY); ctx.restore();
  ctx.fillStyle = accent; ctx.fillRect(cx - 36, hY + Math.round(dim.h * 0.03), 72, 2);
  ctx.save();
  ctx.font = `bold ${Math.round(dim.h * 0.048)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, hY + Math.round(dim.h * 0.082)); ctx.restore();
  const entries = Object.entries(statsData).filter(([, v]) => v.trim()).slice(0, 6);
  if (entries.length > 0) {
    const cw = Math.round(dim.w * 0.3), ch = Math.round(dim.h * 0.18);
    const gx = Math.round(dim.w * 0.045), gy = Math.round(dim.h * 0.022);
    const rows = Math.ceil(entries.length / 2);
    const sx = cx - (2 * cw + gx) / 2, sy = cy - (rows * ch + (rows - 1) * gy) / 2 + Math.round(dim.h * 0.07);
    entries.forEach(([label, value], idx) => {
      const col = idx % 2, row = Math.floor(idx / 2);
      const x = sx + col * (cw + gx), y = sy + row * (ch + gy);
      ctx.fillStyle = "rgba(255,255,255,0.04)"; rrect(ctx, x, y, cw, ch, 10); ctx.fill();
      ctx.save(); ctx.font = `bold ${Math.round(dim.h * 0.062)}px Arial, sans-serif`;
      ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(value, x + cw / 2, y + ch * 0.42); ctx.restore();
      ctx.save(); ctx.font = `${Math.round(dim.h * 0.021)}px Arial, sans-serif`;
      ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px";
      ctx.fillText(label.toUpperCase(), x + cw / 2, y + ch * 0.77); ctx.restore();
    });
  }
  stamp(ctx, dim);
}

function drawEndFrame(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2, cy = dim.h / 2;
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawGrid(ctx, dim);
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(dim.w, dim.h) * 0.45);
  grd.addColorStop(0, accent + "22"); grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);
  const ns = Math.round(Math.min(dim.w * 0.058, 72));
  ctx.save(); ctx.font = `bold ${ns}px Arial, sans-serif`; ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, cy - Math.round(dim.h * 0.06)); ctx.restore();
  const sub = [info.position, info.sport].filter(Boolean).join(" · ");
  if (sub) {
    ctx.save(); ctx.font = `bold ${Math.round(ns * 0.29)}px Arial, sans-serif`; ctx.fillStyle = accent;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText(sub.toUpperCase(), cx, cy); ctx.restore();
  }
  const meta = [info.jerseyNumber ? `#${info.jerseyNumber}` : null, info.school || null, info.gradYear ? `Class of ${info.gradYear}` : null].filter(Boolean).join("  ·  ");
  if (meta) {
    ctx.save(); ctx.font = `${Math.round(ns * 0.21)}px Arial, sans-serif`; ctx.fillStyle = "#64748b";
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(meta.toUpperCase(), cx, cy + Math.round(dim.h * 0.068)); ctx.restore();
  }
  ctx.fillStyle = accent + "40"; ctx.fillRect(cx - 60, cy + Math.round(dim.h * 0.105), 120, 1);
  ctx.save(); ctx.font = `bold ${Math.round(ns * 0.19)}px 'Courier New', monospace`; ctx.fillStyle = "#00A3FF";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";
  ctx.fillText("POWERED BY CLIPT", cx, cy + Math.round(dim.h * 0.155)); ctx.restore();
  stamp(ctx, dim);
}

// ── Animation runners ──────────────────────────────────────────────────────────
function runCard(drawFn: () => void, ms: number, isAborted: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      if (isAborted() || now - t0 >= ms) { resolve(); return; }
      drawFn(); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const runTitleCard = (ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim, ab: () => boolean) =>
  runCard(() => drawTitleFrame(ctx, info, accent, dim), TITLE_MS, ab);
const runStatsCard = (ctx: CanvasRenderingContext2D, stats: Record<string, string>, info: TitleInfo, accent: string, dim: Dim, ab: () => boolean) =>
  runCard(() => drawStatsFrame(ctx, stats, info, accent, dim), STATS_MS, ab);
const runEndCard = (ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim, ab: () => boolean) =>
  runCard(() => drawEndFrame(ctx, info, accent, dim), END_MS, ab);

function runPlayerIDOverlay(ctx: CanvasRenderingContext2D, vid: HTMLVideoElement, accent: string, dim: Dim, ab: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const cx = dim.w / 2, cy = dim.h / 2, r = Math.round(Math.min(dim.w, dim.h) * 0.09);
    const tick = (now: number) => {
      const el = now - t0;
      if (ab() || el >= PLAYER_MS) { resolve(); return; }
      const pulse = Math.sin((el / PLAYER_MS) * Math.PI * 3) * 0.3 + 0.7;
      const cr = r * (0.9 + pulse * 0.15);
      drawVideoFrame(ctx, vid, dim, accent);
      ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 18 * pulse; ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45 * pulse;
      ctx.beginPath(); ctx.arc(cx, cy, cr * 0.68, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      const ay = cy + cr + Math.round(dim.h * 0.022), as_ = Math.round(dim.h * 0.024);
      ctx.save(); ctx.fillStyle = accent; ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.moveTo(cx - as_, ay); ctx.lineTo(cx + as_, ay); ctx.lineTo(cx, ay + as_ * 1.1); ctx.closePath(); ctx.fill(); ctx.restore();
      stamp(ctx, dim); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function runTransition(ctx: CanvasRenderingContext2D, type: TransitionStyle, dim: Dim, ab: () => boolean): Promise<void> {
  if (type === "Hard Cut") return Promise.resolve();
  const ms = type === "Flash Cut" ? 220 : type === "Crossfade" ? 400 : 500;
  const color = type === "Flash Cut" ? "#FFFFFF" : "#000000";
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      if (ab() || el >= ms) { ctx.globalAlpha = 1; resolve(); return; }
      const alpha = type === "Flash Cut" ? Math.sin((el / ms) * Math.PI) : el / ms;
      ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fillRect(0, 0, dim.w, dim.h); ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

interface ClipOpts {
  dim: Dim; coachMode: boolean; highlightPlayer: boolean;
  info: TitleInfo; accent: string;
  trimStart: number; trimEnd: number;   // 0/0 means use full clip
  textOverlay: string; intensity: number;
  onPct: (p: number) => void;
}

function runClip(file: File, ctx: CanvasRenderingContext2D, isAborted: () => boolean, opts: ClipOpts): Promise<void> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.src = url; vid.muted = true; vid.playsInline = true;
    let raf = 0;
    const cleanup = () => { cancelAnimationFrame(raf); URL.revokeObjectURL(url); };

    vid.onloadedmetadata = async () => {
      const dur = vid.duration;
      const tStart = opts.trimStart > 0 ? opts.trimStart : 0;
      const tEnd   = (opts.trimEnd > 0 && opts.trimEnd <= dur) ? opts.trimEnd : dur;

      // Seek to trim start
      if (tStart > 0) {
        await new Promise<void>((res) => { vid.onseeked = () => res(); vid.currentTime = tStart; });
      }

      try { await vid.play(); } catch { cleanup(); reject(new Error("Processing failed — try uploading smaller clips")); return; }

      if (opts.highlightPlayer && !opts.coachMode) {
        await runPlayerIDOverlay(ctx, vid, opts.accent, opts.dim, isAborted);
      }

      const tick = () => {
        if (isAborted() || vid.ended || vid.currentTime >= tEnd) { cleanup(); resolve(); return; }

        // Apply intensity filter
        if (opts.intensity > 0) {
          ctx.filter = `saturate(${(1 + opts.intensity * 0.01).toFixed(3)}) contrast(${(1 + opts.intensity * 0.003).toFixed(3)})`;
        }
        drawVideoFrame(ctx, vid, opts.dim, opts.accent);
        ctx.filter = "none";

        if (opts.coachMode) {
          drawLowerThird(ctx, opts.info, opts.accent, opts.dim);
        } else if (opts.textOverlay) {
          drawTextOverlay(ctx, opts.textOverlay, opts.info.fontFamily, opts.dim);
        }

        stamp(ctx, opts.dim);
        const elapsed = vid.currentTime - tStart;
        const total   = tEnd - tStart;
        if (total > 0) opts.onPct(elapsed / total);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    vid.onended   = () => { cleanup(); resolve(); };
    vid.onerror   = () => { cleanup(); reject(new Error("Processing failed — try uploading smaller clips")); };
  });
}

// ── Build reel ─────────────────────────────────────────────────────────────────
interface BuildConfig {
  files: File[]; info: TitleInfo; accent: string;
  isPortrait: boolean; coachMode: boolean;
  musicStyle: MusicStyle; transitionStyle: TransitionStyle;
  includeStatsCard: boolean; statsData: Record<string, string>;
  highlightPlayer: boolean;
  trimStarts:    number[]; trimEnds:      number[];
  textOverlays:  string[]; intensities:   number[];
  isAborted: () => boolean; onProgress: (pct: number, text: string) => void;
}

async function buildReel(cfg: BuildConfig): Promise<Blob> {
  const { files, info, accent, isPortrait, coachMode, musicStyle,
          transitionStyle, includeStatsCard, statsData, highlightPlayer,
          trimStarts, trimEnds, textOverlays, intensities,
          isAborted, onProgress } = cfg;

  const mime = getSupportedMime();
  if (!mime) throw new Error("NO_RECORDER");

  const dim = isPortrait ? DIM_PORTRAIT : DIM_LANDSCAPE;
  const canvas = document.createElement("canvas");
  canvas.width = dim.w; canvas.height = dim.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Processing failed — try uploading smaller clips");

  // Audio
  let audioCtx: AudioContext | null = null, gainNode: GainNode | null = null, audioDest: MediaStreamAudioDestinationNode | null = null;
  const musicUrl = !coachMode ? MUSIC_URLS[musicStyle] : undefined;
  if (musicUrl) {
    try {
      audioCtx = new AudioContext();
      const resp = await fetch(musicUrl, { mode: "cors" });
      const buf  = await audioCtx.decodeAudioData(await resp.arrayBuffer());
      const src  = audioCtx.createBufferSource();
      src.buffer = buf; src.loop = true;
      gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 2);
      audioDest = audioCtx.createMediaStreamDestination();
      src.connect(gainNode); gainNode.connect(audioDest); src.start();
    } catch { audioCtx = null; gainNode = null; audioDest = null; }
  }

  const vTracks = canvas.captureStream(30).getVideoTracks();
  const aTracks = audioDest ? audioDest.stream.getAudioTracks() : [];
  const stream  = new MediaStream([...vTracks, ...aTracks]);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(100);

  try {
    onProgress(0, "Loading fonts...");
    if (info.fontFamily && info.fontFamily !== "Arial") {
      try { await document.fonts.load(`bold 78px "${info.fontFamily}"`); await document.fonts.load(`78px "${info.fontFamily}"`); } catch { /* fallback */ }
    }
    onProgress(4, "Drawing title card...");
    await runTitleCard(ctx, info, accent, dim, isAborted);

    if (!isAborted() && includeStatsCard) {
      onProgress(13, "Drawing stats card...");
      await runStatsCard(ctx, statsData, info, accent, dim, isAborted);
    }

    const effTrans: TransitionStyle = coachMode ? "Hard Cut" : transitionStyle;
    for (let i = 0; i < files.length; i++) {
      if (isAborted()) break;
      const base = 21 + (i / files.length) * 61, range = 61 / files.length;
      onProgress(base, `Processing clip ${i + 1} of ${files.length}...`);
      if (i > 0) await runTransition(ctx, effTrans, dim, isAborted);
      await runClip(files[i], ctx, isAborted, {
        dim, coachMode, highlightPlayer, info, accent,
        trimStart:   trimStarts[i]   ?? 0,
        trimEnd:     trimEnds[i]     ?? 0,
        textOverlay: textOverlays[i] ?? "",
        intensity:   intensities[i]  ?? 0,
        onPct: (p) => onProgress(base + p * range, `Processing clip ${i + 1} of ${files.length}...`),
      });
    }

    if (!isAborted()) {
      onProgress(82, "Drawing end card...");
      if (!coachMode) await runTransition(ctx, "Fade to Black", dim, isAborted);
      await runEndCard(ctx, info, accent, dim, isAborted);
    }

    if (!isAborted() && gainNode && audioCtx) {
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
      await new Promise<void>((r) => setTimeout(r, 1500));
    }
    onProgress(96, "Encoding...");
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    audioCtx?.close();
  }

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      if (!chunks.length) { reject(new Error("Processing failed — try uploading smaller clips")); return; }
      resolve(new Blob(chunks, { type: mime }));
    };
    recorder.onerror = () => reject(new Error("Processing failed — try uploading smaller clips"));
  });
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
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
              {!isLast && <div className="flex-1 h-px mx-2 mb-5 transition-all duration-500" style={{ background: completed ? `${accent}70` : "rgba(255,255,255,0.08)" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardBase: React.CSSProperties = { background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" };

// ── FormatCard ─────────────────────────────────────────────────────────────────
type Phase = "idle" | "processing" | "done" | "error";

interface FormatCardProps {
  title: string; aspectLabel: string; aspectDesc: string; badge?: string;
  phase: Phase; pct: number; stepText: string;
  blobUrl: string | null; blobMime: string; clipsOnly: boolean;
  errMsg: string; accent: string; accentIsWhite: boolean;
  device: DeviceType; fileName: string;
  onBuild: () => void; onRetry: () => void; onDownloadClips: () => void;
}

function FormatCard({ title, aspectLabel, aspectDesc, badge, phase, pct, stepText,
  blobUrl, blobMime, clipsOnly, errMsg, accent, accentIsWhite, device, fileName, onBuild, onRetry, onDownloadClips }: FormatCardProps) {
  const compat = blobMime ? fmtCompat(blobMime) : null;
  const ext = blobMime?.includes("mp4") ? "mp4" : "webm";
  const handlePrimary = () => { if (!blobUrl) return; device === "ios" ? iosOpen(blobUrl) : triggerDownload(blobUrl, `${fileName}.${ext}`); };
  const handleSecondary = (d: DeviceType) => { if (!blobUrl) return; d === "ios" ? iosOpen(blobUrl) : triggerDownload(blobUrl, `${fileName}.${ext}`); };
  const dLabel: Record<DeviceType, string> = { ios: "iPhone / iPad", android: "Android", desktop: "Computer" };
  const dIcon:  Record<DeviceType, string> = { ios: "📱", android: "📱", desktop: "💻" };

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={cardBase}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white font-bold text-sm">{title}</p>
          {badge && <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: `${accent}22`, color: accent }}>{badge}</span>}
        </div>
        <p className="text-xs font-bold" style={{ color: accent }}>{aspectLabel}</p>
        <p className="text-slate-500 text-xs mt-0.5">{aspectDesc}</p>
      </div>

      {phase === "idle" && (
        <button type="button" onClick={onBuild} className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ background: accent, color: accentIsWhite ? "#050A14" : "#ffffff" }}>Build →</button>
      )}

      {phase === "processing" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 truncate pr-2">{stepText}</p>
            <p className="text-xs font-bold tabular-nums shrink-0" style={{ color: accent }}>{Math.floor(pct)}%</p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-150" style={{ width: `${pct}%`, background: accent }} />
          </div>
          <p className="text-slate-600 text-[10px] text-center">Don&apos;t close this tab</p>
        </div>
      )}

      {phase === "done" && clipsOnly && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <p className="text-xs text-[#FBBF24] font-semibold mb-1">Video recording not supported on this browser</p>
            <p className="text-[10px] text-slate-500">Download your clips individually to edit in iMovie, CapCut, or any video editor.</p>
          </div>
          <button type="button" onClick={onDownloadClips} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: accent, color: accentIsWhite ? "#050A14" : "#ffffff" }}>
            <DownloadIcon />Download All Clips
          </button>
        </div>
      )}

      {phase === "done" && !clipsOnly && blobUrl && compat && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg px-3 py-2 flex items-center gap-3 text-[10px]" style={{ background: "rgba(255,255,255,0.04)" }}>
            <span className="text-slate-500">Format:</span>
            <span className="font-bold" style={{ color: accent }}>{compat.label}</span>
            <span className={compat.ios ? "text-green-400" : "text-red-400"}>iPhone {compat.ios ? "✓" : "✗"}</span>
            <span className="text-green-400">Android ✓</span>
            <span className="text-green-400">PC ✓</span>
          </div>
          <button type="button" onClick={handlePrimary} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: accent, color: accentIsWhite ? "#050A14" : "#ffffff" }}>
            <DownloadIcon />{dIcon[device]} Download for {dLabel[device]}
          </button>
          <div className="flex gap-2">
            {(["ios", "android", "desktop"] as DeviceType[]).filter((d) => d !== device).map((d) => (
              <button key={d} type="button" onClick={() => handleSecondary(d)} className="flex-1 py-2 rounded-xl font-semibold text-[10px] transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                {dIcon[d]} {dLabel[d]}
              </button>
            ))}
          </div>
          {device === "ios" && <p className="text-[10px] text-slate-600 text-center">Opens in Safari → tap Share → Save to Files</p>}
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 text-xs text-[#EF4444]"><span className="shrink-0 mt-0.5"><AlertIcon /></span><span>{errMsg || "Processing failed"}</span></div>
          <button type="button" onClick={onRetry} className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all hover:opacity-90"
            style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>Try Again</button>
        </div>
      )}
    </div>
  );
}

// ── ExportPage ─────────────────────────────────────────────────────────────────
export default function ExportPage() {
  const router = useRouter();
  const reel   = useReel();
  const accentHex    = COLOR_MAP[reel.colorAccent] ?? "#00A3FF";
  const accentIsWhite = reel.colorAccent === "White";

  const [device, setDevice] = useState<DeviceType>("desktop");
  useEffect(() => { setDevice(detectDevice()); }, []);

  const [cPhase, setCPhase] = useState<Phase>("idle"); const [cPct, setCPct] = useState(0);
  const [cText,  setCText]  = useState("");             const [cBlob, setCBlob] = useState<string | null>(null);
  const [cMime,  setCMime]  = useState("");             const [cErr,  setCErr]  = useState(""); const [cOnly, setCOnly] = useState(false);
  const cAbortRef = useRef(false), cBlobRef = useRef<string | null>(null);

  const [sPhase, setSPhase] = useState<Phase>("idle"); const [sPct, setSPct] = useState(0);
  const [sText,  setSText]  = useState("");             const [sBlob, setSBlob] = useState<string | null>(null);
  const [sMime,  setSMime]  = useState("");             const [sErr,  setSErr]  = useState(""); const [sOnly, setSOnly] = useState(false);
  const sAbortRef = useRef(false), sBlobRef = useRef<string | null>(null);

  const [coachMode, setCoachMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      cAbortRef.current = true; sAbortRef.current = true;
      if (cBlobRef.current) URL.revokeObjectURL(cBlobRef.current);
      if (sBlobRef.current) URL.revokeObjectURL(sBlobRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const buildInfo = (): TitleInfo => ({
    firstName: reel.firstName, jerseyNumber: reel.jerseyNumber,
    sport: reel.sport, school: reel.school, position: reel.position,
    fontFamily: CANVAS_FONT_MAP[reel.fontStyle] ?? "Arial",
    gradYear: reel.gradYear, heightFt: reel.heightFt, heightIn: reel.heightIn,
    weight: reel.weight, gpa: reel.gpa,
  });

  const baseName = (reel.firstName || "reel").toLowerCase().replace(/\s+/g, "-");

  const handleBuild = async (isPortrait: boolean) => {
    const abortRef = isPortrait ? sAbortRef : cAbortRef;
    const blobRef  = isPortrait ? sBlobRef  : cBlobRef;
    const setPhase = isPortrait ? setSPhase : setCPhase;
    const setPct   = isPortrait ? setSPct   : setCPct;
    const setText  = isPortrait ? setSText  : setCText;
    const setBlob  = isPortrait ? setSBlob  : setCBlob;
    const setMime  = isPortrait ? setSMime  : setCMime;
    const setErr   = isPortrait ? setSErr   : setCErr;
    const setOnly  = isPortrait ? setSOnly  : setCOnly;

    if (reel.files.length === 0) { setErr("No clips found — go back and upload your clips first."); setPhase("error"); return; }

    abortRef.current = false;
    setPhase("processing"); setPct(0); setText("Starting...");

    try {
      const blob = await buildReel({
        files: reel.files, info: buildInfo(), accent: accentHex,
        isPortrait, coachMode, musicStyle: reel.musicStyle,
        transitionStyle: reel.transition, includeStatsCard: reel.includeStatsCard,
        statsData: reel.statsData, highlightPlayer: reel.highlightPlayer,
        trimStarts:   reel.clipTrimStarts   ?? [],
        trimEnds:     reel.clipTrimEnds     ?? [],
        textOverlays: reel.clipTextOverlays ?? [],
        intensities:  reel.clipIntensities  ?? [],
        isAborted: () => abortRef.current,
        onProgress: (p, t) => { setPct(p); setText(t); },
      });

      const url = URL.createObjectURL(blob);
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = url; setBlob(url); setMime(blob.type); setPct(100);
      setTimeout(() => setPhase("done"), 400);
    } catch (err) {
      if (abortRef.current) { setPhase("idle"); return; }
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NO_RECORDER") { setOnly(true); setPhase("done"); return; }
      setErr(msg.includes("Processing failed") ? msg : "Processing failed — try uploading smaller clips");
      setPhase("error");
    }
  };

  const handleDownloadClips = async () => {
    for (let i = 0; i < reel.files.length; i++) {
      const f = reel.files[i];
      const url = URL.createObjectURL(f);
      triggerDownload(url, `${baseName}-clip-${String(i + 1).padStart(2, "0")}-${f.name}`);
      URL.revokeObjectURL(url);
      if (i < reel.files.length - 1) await new Promise<void>((r) => setTimeout(r, 700));
    }
  };

  const handleDownloadTitlePNG = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = DIM_LANDSCAPE.w; canvas.height = DIM_LANDSCAPE.h;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const info = buildInfo();
    if (info.fontFamily !== "Arial") {
      try { await document.fonts.load(`bold 78px "${info.fontFamily}"`); await document.fonts.load(`78px "${info.fontFamily}"`); } catch { /* fallback */ }
    }
    drawTitleFrame(ctx, info, accentHex, DIM_LANDSCAPE);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png"); a.download = `${baseName}-title-card.png`; a.style.display = "none";
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 200);
  };

  const shareSlug = `${reel.firstName || "athlete"}-${reel.jerseyNumber || "00"}`.toLowerCase().replace(/\s+/g, "-");
  const handleCopy = () => {
    navigator.clipboard.writeText(`https://clipt.app/reel/${shareSlug}`).catch(() => {});
    setCopied(true); copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const anyDone = cPhase === "done" || sPhase === "done";
  const athleteNameDisp = (reel.firstName || "Athlete").toUpperCase();
  const athleteSub = [reel.jerseyNumber ? `#${reel.jerseyNumber}` : null, reel.sport || null, reel.school || null].filter(Boolean).join(" · ");
  const supportedMime = typeof window !== "undefined" ? getSupportedMime() : null;
  const hasEdits = (reel.clipTrimStarts?.some(t => t > 0)) || (reel.clipTrimEnds?.some(t => t > 0)) || (reel.clipTextOverlays?.some(t => t)) || (reel.clipIntensities?.some(t => t > 0));

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <button onClick={() => cPhase !== "processing" && sPhase !== "processing" && router.push("/customize")}
          disabled={cPhase === "processing" || sPhase === "processing"}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6 disabled:opacity-30 disabled:cursor-not-allowed">
          <ArrowLeftIcon />
        </button>
        <span className="text-2xl font-black tracking-widest" style={{ color: accentHex }}>CLIPT</span>
      </nav>

      <ProgressBar active={anyDone ? 4 : 3} accent={accentHex} />

      <main className="max-w-3xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Export Your Reel</h1>
          <p className="text-slate-400 text-sm">Build your highlight reel in 16:9 for coaches or 9:16 for social media.</p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Athlete summary */}
          <div className="rounded-2xl p-6" style={cardBase}>
            <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: accentHex }}>Reel Summary</p>
            <p className="text-white font-black text-xl mb-1">{athleteNameDisp}</p>
            <p className="text-slate-400 text-sm mb-4">{athleteSub}</p>
            <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Clips",      value: `${reel.files.length} video${reel.files.length !== 1 ? "s" : ""}` },
                { label: "Music",      value: reel.musicStyle },
                { label: "Color",      value: reel.colorAccent },
                { label: "Transition", value: reel.transition },
                { label: "Font",       value: reel.fontStyle },
                { label: "Stats Card", value: reel.includeStatsCard ? "On" : "Off" },
              ].map(({ label, value }) => (
                <div key={label}><p className="text-slate-500 text-xs mb-0.5">{label}</p><p className="text-white text-sm font-semibold">{value}</p></div>
              ))}
            </div>
          </div>

          {/* Edit clips button */}
          <button type="button" onClick={() => router.push("/editor")}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: `${accentHex}12`, color: accentHex, border: `1px solid ${accentHex}35` }}>
            <EditIcon />
            {hasEdits ? "Edit Clips · Edits Applied ✓" : "Edit Clips — Trim, Reorder, Add Text"}
          </button>

          {/* Browser support */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background: supportedMime ? "rgba(34,197,94,0.07)" : "rgba(251,191,36,0.07)", border: `1px solid ${supportedMime ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)"}` }}>
            <span className="text-sm">{supportedMime ? "✓" : "⚠"}</span>
            <p className="text-xs" style={{ color: supportedMime ? "#22C55E" : "#FBBF24" }}>
              {supportedMime ? `Your browser supports ${fmtLabel(supportedMime)} recording` : "Your browser doesn't support video recording — clips will download individually"}
            </p>
          </div>

          {reel.files.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <span className="text-[#EF4444]">⚠</span>
              <p className="text-sm text-[#EF4444]">No clips loaded. Go back and upload your clips first.</p>
            </div>
          )}

          {/* Coach Mode */}
          <div className="rounded-2xl p-5 flex items-center justify-between" style={cardBase}>
            <div>
              <p className="text-white font-bold text-sm mb-0.5">Coach Mode</p>
              <p className="text-slate-500 text-xs">No music · Hard cuts · Jersey bar on every clip</p>
            </div>
            <button type="button" onClick={() => setCoachMode((v) => !v)}
              className="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200"
              style={{ background: coachMode ? accentHex : "rgba(255,255,255,0.1)" }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: coachMode ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>

          {/* Format cards */}
          <div className="grid grid-cols-2 gap-4">
            <FormatCard title="Coach Version" aspectLabel="16:9 Landscape" aspectDesc="1280×720 · email & recruiting platforms" badge="COACHES ✓"
              phase={cPhase} pct={cPct} stepText={cText} blobUrl={cBlob} blobMime={cMime} clipsOnly={cOnly}
              errMsg={cErr} accent={accentHex} accentIsWhite={accentIsWhite} device={device}
              fileName={`${baseName}-coach-16x9-clipt`}
              onBuild={() => handleBuild(false)} onRetry={() => { setCPhase("idle"); setCErr(""); setCOnly(false); }}
              onDownloadClips={handleDownloadClips} />
            <FormatCard title="Social Version" aspectLabel="9:16 Portrait" aspectDesc="720×1280 · Instagram & TikTok" badge="SOCIAL ✓"
              phase={sPhase} pct={sPct} stepText={sText} blobUrl={sBlob} blobMime={sMime} clipsOnly={sOnly}
              errMsg={sErr} accent={accentHex} accentIsWhite={accentIsWhite} device={device}
              fileName={`${baseName}-social-9x16-clipt`}
              onBuild={() => handleBuild(true)} onRetry={() => { setSPhase("idle"); setSErr(""); setSOnly(false); }}
              onDownloadClips={handleDownloadClips} />
          </div>

          {/* Title card PNG */}
          <button type="button" onClick={handleDownloadTitlePNG}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
            <DownloadIcon />Preview Title Card as PNG
          </button>

          {anyDone && (
            <>
              <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="rounded-2xl px-6 py-5 flex items-center gap-4"
                style={{ background: `${accentHex}12`, border: `1px solid ${accentHex}45` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accentHex}25` }}>
                  <CheckMdIcon />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-0.5">Reel complete!</p>
                  <p className="text-slate-400 text-xs">Your highlight reel is ready to share with coaches.</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-2">Share Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-400 truncate select-all" style={cardBase}>
                    clipt.app/reel/{shareSlug}
                  </div>
                  <button type="button" onClick={handleCopy}
                    className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all"
                    style={copied ? { background: `${accentHex}15`, color: accentHex, border: `1px solid ${accentHex}55` } : { background: "#0A1628", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {copied ? <CheckSmIcon /> : <CopyIcon />}{copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => router.push("/upload")}
                className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors text-center py-1">
                Create a new reel →
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
