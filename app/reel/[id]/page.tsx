"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReelProfile {
  firstName:         string;
  jerseyNumber:      string;
  sport:             string;
  school:            string;
  position:          string;
  gradYear:          string;
  email:             string;
  accentHex:         string;
  statsData:         Record<string, string>;
  titleCardTemplate: string;
  fontStyle:         string;
  createdAt:         number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isLightColor(hex: string): boolean {
  const h = (hex || "#000").replace("#","");
  const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
  return (0.299*r + 0.587*g + 0.114*b) > 0.6;
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)  return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReelProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;

  const [profile, setProfile]       = useState<ReelProfile | null>(null);
  const [notFound, setNotFound]     = useState(false);
  const [requested, setRequested]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [contactEmail, setContactEmail]  = useState("");
  const [contactMsg, setContactMsg]      = useState("");
  const [msgSent, setMsgSent]            = useState(false);

  useEffect(() => {
    if (!id) return;
    try {
      const profiles = JSON.parse(localStorage.getItem("clipt_profiles") || "{}");
      const p = profiles[id] as ReelProfile | undefined;
      if (p) setProfile(p);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    }
  }, [id]);

  if (!profile && !notFound) {
    return (
      <div className="min-h-screen bg-[#050A14] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#00A3FF] animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#050A14] text-white flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-5xl mb-2">🏀</div>
        <h1 className="text-2xl font-black">Reel Not Found</h1>
        <p className="text-slate-400 max-w-sm">
          This reel profile isn&apos;t available on this device. The athlete needs to build and share their reel first.
        </p>
        <button type="button" onClick={() => router.push("/")}
          className="px-6 py-3 rounded-xl font-bold text-sm bg-[#00A3FF] text-[#050A14] transition-all hover:opacity-90">
          Create Your Own Reel
        </button>
        <p className="text-xs text-slate-600 mt-2">Profile ID: {id}</p>
      </div>
    );
  }

  const accent   = profile.accentHex || "#00A3FF";
  const isLight  = isLightColor(accent);
  const btnColor = isLight ? "#050A14" : "#ffffff";
  const name     = (profile.firstName || "ATHLETE").toUpperCase();
  const topStats = Object.entries(profile.statsData || {}).filter(([,v]) => v.trim()).slice(0, 6);
  const shareUrl = `https://cliptapp.com/reel/${id}`;

  const handleRequestReel = () => {
    setRequested(true);
    // In a real app, this would send a notification. For now, open mail client.
    if (profile.email) {
      const subject = encodeURIComponent(`Recruiting Reel Request — ${profile.firstName}`);
      const body    = encodeURIComponent(`Hi ${profile.firstName},\n\nI saw your Clipt recruiting profile and would like to request your full highlight reel.\n\nPlease send it to me at your earliest convenience.\n\nThank you!`);
      window.open(`mailto:${profile.email}?subject=${subject}&body=${body}`, "_blank");
    } else {
      setShowEmailForm(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would POST to an API.
    setMsgSent(true);
    setShowEmailForm(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white">

      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: accent }} />

      {/* Header */}
      <div className="border-b border-white/[0.04] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <span className="font-black text-xs" style={{ color: btnColor }}>C</span>
          </div>
          <span className="text-sm font-bold text-white">CLIPT</span>
        </div>
        <button type="button" onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ShareIcon />
          {copied ? "Copied!" : "Share"}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">

        {/* ── Hero Title Card ── */}
        <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: "16/9", background: "#050A14", border: `1px solid ${accent}30` }}>
          {/* Background layers */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(255,255,255,0.018) 29px, rgba(255,255,255,0.018) 30px), repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(255,255,255,0.018) 29px, rgba(255,255,255,0.018) 30px)` }} />
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${accent}20 0%, transparent 65%)` }} />
          {/* Top stripe */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: accent }} />
          {/* Bottom stripe */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: accent }} />
          {/* Content */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
            <div style={{ width: 48, height: 3, background: accent, borderRadius: 2, marginBottom: 12 }} />
            <h1 style={{ fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 900, color: "#fff", letterSpacing: "0.03em", lineHeight: 1, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              {name}
            </h1>
            {profile.jerseyNumber && (
              <p style={{ fontSize: "clamp(14px, 2.5vw, 24px)", fontWeight: 700, color: accent, marginTop: 8, letterSpacing: "0.05em" }}>
                #{profile.jerseyNumber}
              </p>
            )}
            {(profile.position || profile.sport) && (
              <p style={{ fontSize: "clamp(10px, 1.6vw, 16px)", fontWeight: 600, color: "#e2e8f0", letterSpacing: "0.18em", marginTop: 8, textTransform: "uppercase" }}>
                {[profile.position, profile.sport].filter(Boolean).join("  ·  ")}
              </p>
            )}
            {profile.school && (
              <p style={{ fontSize: "clamp(9px, 1.3vw, 13px)", color: "#94a3b8", letterSpacing: "0.12em", marginTop: 4, textTransform: "uppercase" }}>
                {profile.school}
              </p>
            )}
            {profile.gradYear && (
              <p style={{ fontSize: "clamp(8px, 1.1vw, 11px)", color: "#64748b", letterSpacing: "0.1em", marginTop: 3 }}>
                CLASS OF {profile.gradYear}
              </p>
            )}
          </div>
          {/* CLIPT badge */}
          <div style={{ position: "absolute", bottom: 8, right: 12, fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 700, color: `${accent}65`, letterSpacing: "0.18em" }}>
            CLIPT
          </div>
          {/* Created time */}
          <div style={{ position: "absolute", top: 10, right: 12, fontSize: 8, color: "rgba(255,255,255,0.2)" }}>
            {timeAgo(profile.createdAt)}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={handleRequestReel}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: accent, color: btnColor }}>
            {requested ? <><CheckIcon /> Request Sent!</> : <><MailIcon /> Request Full Reel</>}
          </button>
          <button type="button" onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ShareIcon />
            {copied ? "Copied!" : "Share Profile"}
          </button>
        </div>

        {/* Email form (when no email in profile) */}
        {showEmailForm && !msgSent && (
          <form onSubmit={handleSendMessage} className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm font-bold text-white">Send a message to {profile.firstName}</p>
            <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <textarea value={contactMsg} onChange={(e) => setContactMsg(e.target.value)}
              placeholder="Hi, I watched your reel and would like to see more…"
              rows={3}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <button type="submit"
              className="py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: accent, color: btnColor }}>
              Send Request
            </button>
          </form>
        )}

        {msgSent && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <span className="text-green-400"><CheckIcon /></span>
            <p className="text-sm text-green-400 font-semibold">Request sent! The athlete will be in touch.</p>
          </div>
        )}

        {/* ── Stats Grid ── */}
        {topStats.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
              <p className="text-sm font-bold text-white">Season Stats</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {topStats.map(([key, val]) => (
                <div key={key} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}20` }}>
                  <p className="text-2xl font-black" style={{ color: accent }}>{val}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-semibold">{key}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Profile Details ── */}
        <div className="rounded-2xl p-5" style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
            <p className="text-sm font-bold text-white">Athlete Profile</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Name",     value: profile.firstName            },
              { label: "Jersey",   value: profile.jerseyNumber ? `#${profile.jerseyNumber}` : null },
              { label: "Sport",    value: profile.sport               },
              { label: "Position", value: profile.position            },
              { label: "School",   value: profile.school              },
              { label: "Class",    value: profile.gradYear ? `Class of ${profile.gradYear}` : null },
            ].filter((r) => r.value).map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{row.label}</span>
                <span className="text-sm text-white font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recruiting CTA Banner ── */}
        <div className="rounded-2xl p-5 text-center" style={{ background: `${accent}0E`, border: `1px solid ${accent}25` }}>
          <div className="flex items-center justify-center gap-1 mb-2">
            <span style={{ color: accent }}><StarIcon /></span>
            <span style={{ color: accent }}><StarIcon /></span>
            <span style={{ color: accent }}><StarIcon /></span>
          </div>
          <p className="text-sm font-bold text-white mb-1">
            Interested in {profile.firstName}?
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Request the full highlight reel and get in touch directly with the athlete.
          </p>
          <button type="button" onClick={handleRequestReel}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: accent, color: btnColor }}>
            {requested ? "✓ Request Sent" : "Request Full Reel"}
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="text-center flex flex-col gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs text-slate-600">
            Recruiting profile powered by{" "}
            <a href="https://cliptapp.com" target="_blank" rel="noopener" className="font-bold" style={{ color: accent }}>
              CLIPT
            </a>
          </p>
          <p className="text-[10px] text-slate-700">Profile ID: {id}</p>
        </div>

      </div>
    </div>
  );
}
