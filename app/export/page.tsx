"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReel } from "../providers";
import type { ColorAccent, FontStyle, MusicStyle, TransitionStyle } from "../providers";

// ── Dimensions ────────────────────────────────────────────────────────────────
type Dim = { w: number; h: number };
const DIM_LANDSCAPE: Dim = { w: 1920, h: 1080 };
const DIM_PORTRAIT:  Dim = { w: 720,  h: 1280 };
const TITLE_MS  = 4000;
const STATS_MS  = 4000;
const END_MS    = 5000;
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
  email: string; coachName: string; coachEmail: string;
  statsData: Record<string, string>;
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
  const cx = dim.w / 2;
  const ff = info.fontFamily || "Arial";
  const ffs = `"${ff}", Arial, sans-serif`;

  // Background
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawGrid(ctx, dim);
  const grd = ctx.createRadialGradient(cx, dim.h * 0.42, 0, cx, dim.h * 0.42, Math.min(dim.w, dim.h) * 0.55);
  grd.addColorStop(0, accent + "28"); grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);

  // Top 8px accent stripe
  ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w, 8);
  // Bottom 4px accent stripe
  ctx.fillStyle = accent; ctx.fillRect(0, dim.h - 4, dim.w, 4);

  // Scale all sizes relative to canvas height (designed for 1080h)
  const s = dim.h / 1080;
  const nameSize   = Math.round(64 * s);
  const jerseySize = Math.round(48 * s);
  const posSize    = Math.round(28 * s);
  const schoolSize = Math.round(24 * s);
  const gradSize   = Math.round(20 * s);
  const metaSize   = Math.round(18 * s);
  const emailSize  = Math.round(16 * s);
  const gap = Math.round(14 * s);

  // Build lines array
  type Line = { text: string; size: number; color: string; bold?: boolean; ls?: string };
  const lines: Line[] = [];
  lines.push({ text: (info.firstName || "ATHLETE").toUpperCase(), size: nameSize, color: "#FFFFFF", bold: ff !== "Bebas Neue", ls: ff === "Bebas Neue" ? "6px" : "3px" });
  if (info.jerseyNumber) lines.push({ text: `#${info.jerseyNumber}`, size: jerseySize, color: accent, bold: true });
  const posSport = [info.position, info.sport].filter(Boolean).join("  ·  ");
  if (posSport) lines.push({ text: posSport.toUpperCase(), size: posSize, color: "#e2e8f0", bold: true, ls: "4px" });
  if (info.school) lines.push({ text: info.school.toUpperCase(), size: schoolSize, color: "#94a3b8" });
  if (info.gradYear) lines.push({ text: `CLASS OF ${info.gradYear}`, size: gradSize, color: "#64748b" });
  const metaParts = [
    info.heightFt ? `${info.heightFt}'${info.heightIn || "0"}"` : null,
    info.weight   ? `${info.weight} LBS` : null,
    info.gpa      ? `${info.gpa} GPA`   : null,
  ].filter(Boolean).join("  ·  ");
  if (metaParts) lines.push({ text: metaParts, size: metaSize, color: "#475569", ls: "2px" });
  if (info.email) lines.push({ text: info.email, size: emailSize, color: accent + "99" });

  // Measure total block height (each line + gap, plus separator after first line)
  const sepH = 3 + gap; // separator height
  const totalH = lines.reduce((sum, l, i) => sum + l.size + (i < lines.length - 1 ? gap : 0), 0) + sepH;
  let y = Math.round((dim.h - totalH) / 2);

  // Draw name
  const first = lines[0];
  ctx.save();
  ctx.font = `${first.bold ? "bold " : ""}${first.size}px ${ffs}`;
  ctx.fillStyle = first.color; ctx.textAlign = "center"; ctx.textBaseline = "top";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = first.ls ?? "0px";
  ctx.fillText(first.text, cx, y);
  ctx.restore();
  y += first.size + gap;

  // Accent separator
  const sepW = Math.round(96 * s);
  ctx.fillStyle = accent; ctx.fillRect(cx - sepW / 2, y, sepW, 3);
  y += sepH;

  // Draw remaining lines
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    ctx.save();
    ctx.font = `${ln.bold ? "bold " : ""}${ln.size}px ${i === 0 ? ffs : "Arial, sans-serif"}`;
    ctx.fillStyle = ln.color; ctx.textAlign = "center"; ctx.textBaseline = "top";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = ln.ls ?? "0px";
    ctx.fillText(ln.text, cx, y);
    ctx.restore();
    y += ln.size + (i < lines.length - 1 ? gap : 0);
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

function drawDiagonalPattern(ctx: CanvasRenderingContext2D, dim: Dim, accent: string) {
  ctx.save();
  ctx.strokeStyle = accent + "0D"; // 5% opacity
  ctx.lineWidth = 1;
  const step = Math.round(dim.w * 0.025);
  for (let x = -dim.h; x < dim.w + dim.h; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + dim.h, dim.h); ctx.stroke();
  }
  ctx.restore();
}

function drawStatsFrame(ctx: CanvasRenderingContext2D, statsData: Record<string, string>, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2, cy = dim.h / 2;
  const s = dim.h / 1080;
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);

  // Diagonal accent pattern at 5% opacity
  drawDiagonalPattern(ctx, dim, accent);

  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(dim.w, dim.h) * 0.5);
  grd.addColorStop(0, accent + "1A"); grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);

  // Top accent border line
  ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w, 6);

  // Header: SEASON STATS label
  const hY = Math.round(dim.h * 0.14);
  ctx.save();
  ctx.font = `bold ${Math.round(24 * s)}px Arial, sans-serif`;
  ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("SEASON STATS", cx, hY); ctx.restore();

  // Accent separator
  ctx.fillStyle = accent; ctx.fillRect(cx - Math.round(40 * s), hY + Math.round(24 * s), Math.round(80 * s), 2);

  // Athlete name
  ctx.save();
  ctx.font = `bold ${Math.round(48 * s)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, hY + Math.round(72 * s)); ctx.restore();

  // Stats grid — 3 columns
  const entries = Object.entries(statsData).filter(([, v]) => v.trim()).slice(0, 6);
  if (entries.length > 0) {
    const cols = 3;
    const cw = Math.round(dim.w * 0.24), ch = Math.round(dim.h * 0.2);
    const gx = Math.round(dim.w * 0.03), gy = Math.round(dim.h * 0.025);
    const rows = Math.ceil(entries.length / cols);
    const totalGridW = cols * cw + (cols - 1) * gx;
    const totalGridH = rows * ch + (rows - 1) * gy;
    const sx = cx - totalGridW / 2;
    const sy = cy - totalGridH / 2 + Math.round(60 * s);

    entries.forEach(([label, value], idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = sx + col * (cw + gx), y = sy + row * (ch + gy);

      // Card background with accent border
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      rrect(ctx, x, y, cw, ch, Math.round(12 * s)); ctx.fill();
      ctx.strokeStyle = accent + "35"; ctx.lineWidth = 1;
      rrect(ctx, x, y, cw, ch, Math.round(12 * s)); ctx.stroke();

      // Value (52px equivalent)
      ctx.save(); ctx.font = `bold ${Math.round(52 * s)}px Arial, sans-serif`;
      ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(value, x + cw / 2, y + ch * 0.42); ctx.restore();

      // Label (18px equivalent)
      ctx.save(); ctx.font = `${Math.round(18 * s)}px Arial, sans-serif`;
      ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px";
      ctx.fillText(label.toUpperCase(), x + cw / 2, y + ch * 0.78); ctx.restore();
    });
  }

  stamp(ctx, dim);
}

function drawEndFrame(ctx: CanvasRenderingContext2D, info: TitleInfo, accent: string, dim: Dim) {
  const cx = dim.w / 2;
  const s = dim.h / 1080;
  ctx.fillStyle = "#050A14"; ctx.fillRect(0, 0, dim.w, dim.h);
  drawGrid(ctx, dim);
  drawDiagonalPattern(ctx, dim, accent);
  const grd = ctx.createRadialGradient(cx, dim.h * 0.4, 0, cx, dim.h * 0.4, Math.min(dim.w, dim.h) * 0.5);
  grd.addColorStop(0, accent + "22"); grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, dim.w, dim.h);

  // Top 8px accent stripe
  ctx.fillStyle = accent; ctx.fillRect(0, 0, dim.w, 8);
  // Bottom 4px stripe
  ctx.fillStyle = accent; ctx.fillRect(0, dim.h - 4, dim.w, 4);

  // "CONTACT ME" heading
  const headingY = Math.round(dim.h * 0.14);
  ctx.save();
  ctx.font = `bold ${Math.round(22 * s)}px Arial, sans-serif`;
  ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "8px";
  ctx.fillText("CONTACT ME", cx, headingY); ctx.restore();
  ctx.fillStyle = accent; ctx.fillRect(cx - Math.round(36 * s), headingY + Math.round(20 * s), Math.round(72 * s), 2);

  // Athlete name
  const nameY = headingY + Math.round(70 * s);
  ctx.save();
  ctx.font = `bold ${Math.round(56 * s)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText((info.firstName || "ATHLETE").toUpperCase(), cx, nameY); ctx.restore();

  // Position · sport
  const sub = [info.position, info.sport].filter(Boolean).join("  ·  ");
  if (sub) {
    ctx.save();
    ctx.font = `bold ${Math.round(26 * s)}px Arial, sans-serif`;
    ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText(sub.toUpperCase(), cx, nameY + Math.round(48 * s)); ctx.restore();
  }

  // Separator
  const sepY = nameY + Math.round(80 * s);
  ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(Math.round(dim.w * 0.25), sepY, Math.round(dim.w * 0.5), 1);

  // Contact info block (email + coach info)
  let infoY = sepY + Math.round(28 * s);
  const contactLines: Array<{ text: string; color: string; size: number }> = [];
  if (info.email) contactLines.push({ text: info.email, color: "#e2e8f0", size: Math.round(22 * s) });
  if (info.school) contactLines.push({ text: info.school.toUpperCase(), color: "#94a3b8", size: Math.round(20 * s) });
  const metaMini = [
    info.jerseyNumber ? `#${info.jerseyNumber}` : null,
    info.gradYear ? `Class of ${info.gradYear}` : null,
    info.heightFt ? `${info.heightFt}'${info.heightIn || "0"}"` : null,
  ].filter(Boolean).join("  ·  ");
  if (metaMini) contactLines.push({ text: metaMini.toUpperCase(), color: "#64748b", size: Math.round(18 * s) });

  contactLines.forEach((cl) => {
    ctx.save();
    ctx.font = `${cl.size}px Arial, sans-serif`;
    ctx.fillStyle = cl.color; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(cl.text, cx, infoY);
    ctx.restore();
    infoY += cl.size + Math.round(10 * s);
  });

  // Recruiting URL
  const urlY = Math.round(dim.h * 0.82);
  ctx.save();
  ctx.font = `bold ${Math.round(16 * s)}px 'Courier New', monospace`;
  ctx.fillStyle = "#00A3FF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";
  ctx.fillText("POWERED BY CLIPT · CLIPTAPP.COM", cx, urlY); ctx.restore();

  // Top 3 stats summary (if available)
  const topStats = Object.entries(info.statsData || {}).filter(([, v]) => v.trim()).slice(0, 3);
  if (topStats.length > 0) {
    const statsY = urlY + Math.round(40 * s);
    const cw = Math.round(160 * s), ch = Math.round(70 * s);
    const gx = Math.round(20 * s);
    const totalW = topStats.length * cw + (topStats.length - 1) * gx;
    const sx = cx - totalW / 2;
    topStats.forEach(([label, value], i) => {
      const x = sx + i * (cw + gx);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      rrect(ctx, x, statsY, cw, ch, Math.round(8 * s)); ctx.fill();
      ctx.save(); ctx.font = `bold ${Math.round(28 * s)}px Arial, sans-serif`;
      ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(value, x + cw / 2, statsY + ch * 0.42); ctx.restore();
      ctx.save(); ctx.font = `${Math.round(14 * s)}px Arial, sans-serif`;
      ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label.toUpperCase(), x + cw / 2, statsY + ch * 0.78); ctx.restore();
    });
  }

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
  showJerseyOverlay: boolean; enhanceQuality: boolean;
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

        // Build canvas filter: quality enhancement + per-clip intensity
        const filters: string[] = [];
        if (opts.enhanceQuality) filters.push("contrast(1.1) saturate(1.15) brightness(1.03)");
        if (opts.intensity > 0) filters.push(`saturate(${(1 + opts.intensity * 0.01).toFixed(3)}) contrast(${(1 + opts.intensity * 0.003).toFixed(3)})`);
        if (filters.length > 0) ctx.filter = filters.join(" ");
        drawVideoFrame(ctx, vid, opts.dim, opts.accent);
        ctx.filter = "none";

        // Overlays
        if (opts.coachMode) {
          drawLowerThird(ctx, opts.info, opts.accent, opts.dim);
        } else {
          if (opts.showJerseyOverlay) drawLowerThird(ctx, opts.info, opts.accent, opts.dim);
          if (opts.textOverlay) drawTextOverlay(ctx, opts.textOverlay, opts.info.fontFamily, opts.dim);
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
  highlightPlayer: boolean; showJerseyOverlay: boolean; enhanceQuality: boolean;
  trimStarts:    number[]; trimEnds:      number[];
  textOverlays:  string[]; intensities:   number[];
  isAborted: () => boolean; onProgress: (pct: number, text: string) => void;
}

async function buildReel(cfg: BuildConfig): Promise<Blob> {
  const { files, info, accent, isPortrait, coachMode, musicStyle,
          transitionStyle, includeStatsCard, statsData, highlightPlayer,
          showJerseyOverlay, enhanceQuality,
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
      gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 2);
      audioDest = audioCtx.createMediaStreamDestination();
      src.connect(gainNode); gainNode.connect(audioDest); src.start();
    } catch { audioCtx = null; gainNode = null; audioDest = null; }
  }

  const vTracks = canvas.captureStream(30).getVideoTracks();
  const aTracks = audioDest ? audioDest.stream.getAudioTracks() : [];
  const stream  = new MediaStream([...vTracks, ...aTracks]);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
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
        dim, coachMode, highlightPlayer, showJerseyOverlay, enhanceQuality, info, accent,
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
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
      await new Promise<void>((r) => setTimeout(r, 3000));
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

const TwitterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);

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
  const [copiedShare, setCopiedShare] = useState<"link" | "twitter" | "instagram" | null>(null);
  const copyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duration enforcement
  const [durationModal, setDurationModal] = useState<{ isPortrait: boolean } | null>(null);

  // Sport-specific limit check
  const sport = reel.sport || "";
  const reelMinutes = reel.reelLength || 3;
  const limitMin = sport === "Basketball" ? 4 : sport === "Football" ? 5 : 5;
  const warnMin  = sport === "Basketball" ? 3.5 : sport === "Football" ? 4.5 : 5;
  const isOverLimit = reelMinutes > limitMin;
  const isNearLimit = reelMinutes >= warnMin && !isOverLimit;

  useEffect(() => {
    return () => {
      cAbortRef.current = true; sAbortRef.current = true;
      if (cBlobRef.current) URL.revokeObjectURL(cBlobRef.current);
      if (sBlobRef.current) URL.revokeObjectURL(sBlobRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    };
  }, []);

  const buildInfo = (): TitleInfo => ({
    firstName: reel.firstName, jerseyNumber: reel.jerseyNumber,
    sport: reel.sport, school: reel.school, position: reel.position,
    fontFamily: CANVAS_FONT_MAP[reel.fontStyle] ?? "Arial",
    gradYear: reel.gradYear, heightFt: reel.heightFt, heightIn: reel.heightIn,
    weight: reel.weight, gpa: reel.gpa,
    email: reel.email, coachName: reel.coachName, coachEmail: reel.coachEmail,
    statsData: reel.statsData ?? {},
  });

  const baseName = (reel.firstName || "reel").toLowerCase().replace(/\s+/g, "-");

  const handleBuildConfirmed = async (isPortrait: boolean) => {
    setDurationModal(null);
    await handleBuild(isPortrait);
  };

  const handleBuildWithDurationCheck = (isPortrait: boolean) => {
    if (isOverLimit && (sport === "Basketball" || sport === "Football")) {
      setDurationModal({ isPortrait });
      return;
    }
    handleBuild(isPortrait);
  };

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
        showJerseyOverlay: coachMode ? true : (reel.showJerseyOverlay ?? true),
        enhanceQuality: reel.enhanceQuality ?? true,
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
  const shareUrl  = `https://cliptapp.com/reel/${shareSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true); copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (type: "link" | "twitter" | "instagram") => {
    const name = reel.firstName || "my";
    const sport = reel.sport || "Sports";
    let text = shareUrl;
    if (type === "twitter") {
      text = `🏀 Check out ${name}'s recruiting highlight reel! #Recruiting #${sport} ${shareUrl}`;
    } else if (type === "instagram") {
      text = `🔥 ${name}'s Highlight Reel — ${shareUrl} #Recruiting #Highlights #${sport}`;
    }
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedShare(type);
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    shareTimerRef.current = setTimeout(() => setCopiedShare(null), 2500);
  };

  const handleStartOver = () => {
    try {
      localStorage.removeItem("clipt_reel");
      localStorage.removeItem("aiGeneratedClips");
    } catch { /* ignore */ }
    window.location.href = "/start";
  };

  const anyDone = cPhase === "done" || sPhase === "done";
  const anyProcessing = cPhase === "processing" || sPhase === "processing";
  const athleteNameDisp = (reel.firstName || "Athlete").toUpperCase();
  const athleteSub = [reel.jerseyNumber ? `#${reel.jerseyNumber}` : null, reel.sport || null, reel.school || null].filter(Boolean).join(" · ");
  const supportedMime = typeof window !== "undefined" ? getSupportedMime() : null;
  const hasEdits = (reel.clipTrimStarts?.some(t => t > 0)) || (reel.clipTrimEnds?.some(t => t > 0)) || (reel.clipTextOverlays?.some(t => t)) || (reel.clipIntensities?.some(t => t > 0));
  const estSizeMB = Math.round((reel.reelLength || 3) * 65); // ~65MB/min at 8Mbps 1080p

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* ── Duration Enforcement Modal ── */}
      {durationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(5,10,20,0.92)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#0A1628", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
                <AlertIcon />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Reel Too Long</p>
                <p className="text-slate-400 text-xs mt-0.5">{sport} reels should be under {limitMin} minutes</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Your reel is set to <strong className="text-white">{reelMinutes} minutes</strong>, which exceeds the {sport === "Basketball" ? "4-minute" : "5-minute"} coach-recommended limit. Most coaches stop watching after {limitMin} minutes.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { setDurationModal(null); router.push("/customize"); }}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: accentHex, color: accentIsWhite ? "#050A14" : "#ffffff" }}
              >
                ← Trim My Reel
              </button>
              <button
                type="button"
                onClick={() => handleBuildConfirmed(durationModal.isPortrait)}
                className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Export Anyway
              </button>
            </div>
          </div>
        </div>
      )}

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
          {/* ── Premium Athlete Summary ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#0A1628", border: `1px solid ${accentHex}35` }}>
            {/* Accent header strip */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${accentHex}, ${accentHex}40)` }} />
            <div className="p-6">
              <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: accentHex }}>Your Reel is Ready to Build</p>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-white font-black text-2xl leading-tight">{athleteNameDisp}</p>
                  <p className="text-slate-400 text-sm mt-1">{athleteSub || "Upload clips to get started"}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${accentHex}18`, border: `1px solid ${accentHex}40` }}>
                  <div className="w-5 h-5 rounded-full" style={{ background: accentHex }} />
                </div>
              </div>

              <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />

              <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Clips</p>
                  <p className="text-white text-sm font-semibold">{reel.files.length} video{reel.files.length !== 1 ? "s" : ""}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Music</p>
                  <p className="text-white text-sm font-semibold">{reel.musicStyle || "No Music"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Color</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: accentHex, border: "1px solid rgba(255,255,255,0.2)" }} />
                    <p className="text-white text-sm font-semibold truncate">{reel.colorAccent || "Electric Blue"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Transition</p>
                  <p className="text-white text-sm font-semibold">{reel.transition || "Hard Cut"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Font</p>
                  <p className="text-white text-sm font-semibold">{reel.fontStyle || "Modern"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Stats Card</p>
                  <p className="text-white text-sm font-semibold">{reel.includeStatsCard ? "Included" : "Off"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit clips button */}
          <button type="button" onClick={() => router.push("/editor")}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: `${accentHex}12`, color: accentHex, border: `1px solid ${accentHex}35` }}>
            <EditIcon />
            {hasEdits ? "Edit Clips · Edits Applied ✓" : "Edit Clips — Trim, Reorder, Add Text"}
          </button>

          {/* Coach Mode Banner */}
          {coachMode && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: `${accentHex}10`, border: `1px solid ${accentHex}35` }}>
              <span className="text-lg">🎓</span>
              <div>
                <p className="text-sm font-bold" style={{ color: accentHex }}>Coach Mode Active</p>
                <p className="text-xs text-slate-400">No music · Hard cuts · Jersey overlay on all clips · Landscape only</p>
              </div>
            </div>
          )}

          {/* Duration warning */}
          {(isOverLimit || isNearLimit) && (sport === "Basketball" || sport === "Football") && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: isOverLimit ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${isOverLimit ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}` }}>
              <span className="text-sm shrink-0 mt-0.5">{isOverLimit ? "⛔" : "⚠️"}</span>
              <p className="text-xs" style={{ color: isOverLimit ? "#EF4444" : "#F59E0B" }}>
                {isOverLimit
                  ? `${reelMinutes}-minute reel exceeds the ${limitMin}-minute ${sport} limit. Coaches will likely stop watching early.`
                  : `${reelMinutes} minutes is near the ${limitMin}-minute ${sport} limit. Consider trimming your weakest clips.`}
              </p>
            </div>
          )}

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
            <FormatCard title="Coach Version" aspectLabel="16:9 Landscape" aspectDesc={`1920×1080 · ~${estSizeMB} MB`} badge="COACHES ✓"
              phase={cPhase} pct={cPct} stepText={cText} blobUrl={cBlob} blobMime={cMime} clipsOnly={cOnly}
              errMsg={cErr} accent={accentHex} accentIsWhite={accentIsWhite} device={device}
              fileName={`${baseName}-coach-16x9-clipt`}
              onBuild={() => handleBuildWithDurationCheck(false)} onRetry={() => { setCPhase("idle"); setCErr(""); setCOnly(false); }}
              onDownloadClips={handleDownloadClips} />
            <FormatCard title="Social Version" aspectLabel="9:16 Portrait" aspectDesc={`720×1280 · ~${estSizeMB} MB`} badge="SOCIAL ✓"
              phase={sPhase} pct={sPct} stepText={sText} blobUrl={sBlob} blobMime={sMime} clipsOnly={sOnly}
              errMsg={sErr} accent={accentHex} accentIsWhite={accentIsWhite} device={device}
              fileName={`${baseName}-social-9x16-clipt`}
              onBuild={() => handleBuildWithDurationCheck(true)} onRetry={() => { setSPhase("idle"); setSErr(""); setSOnly(false); }}
              onDownloadClips={handleDownloadClips} />
          </div>

          {/* ── Share Options ── */}
          <div className="rounded-2xl p-5" style={cardBase}>
            <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: accentHex }}>Share Your Reel</p>
            <div className="flex gap-2">
              {/* Copy Link */}
              <button type="button" onClick={() => handleShare("link")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 active:scale-[0.98]"
                style={copiedShare === "link"
                  ? { background: `${accentHex}18`, color: accentHex, border: `1px solid ${accentHex}55` }
                  : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                {copiedShare === "link" ? <CheckSmIcon /> : <LinkIcon />}
                {copiedShare === "link" ? "Copied!" : "Copy Link"}
              </button>

              {/* Twitter */}
              <button type="button" onClick={() => handleShare("twitter")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 active:scale-[0.98]"
                style={copiedShare === "twitter"
                  ? { background: "rgba(29,161,242,0.15)", color: "#1DA1F2", border: "1px solid rgba(29,161,242,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                {copiedShare === "twitter" ? <CheckSmIcon /> : <TwitterIcon />}
                {copiedShare === "twitter" ? "Copied!" : "Twitter"}
              </button>

              {/* Instagram */}
              <button type="button" onClick={() => handleShare("instagram")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 active:scale-[0.98]"
                style={copiedShare === "instagram"
                  ? { background: "rgba(225,48,108,0.15)", color: "#E1306C", border: "1px solid rgba(225,48,108,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                {copiedShare === "instagram" ? <CheckSmIcon /> : <InstagramIcon />}
                {copiedShare === "instagram" ? "Copied!" : "Instagram"}
              </button>
            </div>
            {copiedShare && (
              <p className="text-center text-[10px] text-slate-500 mt-2">
                {copiedShare === "link" ? "URL copied to clipboard" : "Message + URL copied — paste it to share!"}
              </p>
            )}
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
                <p className="text-sm font-semibold text-white mb-2">Direct Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-400 truncate select-all" style={cardBase}>
                    cliptapp.com/reel/{shareSlug}
                  </div>
                  <button type="button" onClick={handleCopy}
                    className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all"
                    style={copied ? { background: `${accentHex}15`, color: accentHex, border: `1px solid ${accentHex}55` } : { background: "#0A1628", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {copied ? <CheckSmIcon /> : <CopyIcon />}{copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Start Over ── */}
          <div className="h-px mt-2" style={{ background: "rgba(255,255,255,0.05)" }} />
          <button
            type="button"
            disabled={anyProcessing}
            onClick={handleStartOver}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: "#64748b", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <RefreshIcon />
            Start Over — Clear and build a new reel
          </button>
        </div>
      </main>
    </div>
  );
}
