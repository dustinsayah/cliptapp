"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveToWaitlist } from "@/lib/supabase";

// ── Icons ──────────────────────────────────────────────────────────────────

const FilmIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="2" />
    <line x1="7" x2="7" y1="2" y2="22" /><line x1="17" x2="17" y1="2" y2="22" />
    <line x1="2" x2="22" y1="7" y2="7" /><line x1="2" x2="22" y1="12" y2="12" /><line x1="2" x2="22" y1="17" y2="17" />
  </svg>
);

const SparkleIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const PeopleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
);

const ClockStatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────

export default function StartPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const result = await saveToWaitlist(email.trim(), "start_page_modal");
      if (result.success) {
        setSubmitted(true);
        setAlreadyExists(result.alreadyExists);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEmail("");
    setSubmitted(false);
    setAlreadyExists(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
      {/* CSS keyframes for animated gradients */}
      <style>{`
        @keyframes blue-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes purple-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.1); }
        }
      `}</style>

      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `linear-gradient(rgba(0,163,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.025) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(0,80,255,0.14) 0%, transparent 100%)",
      }} />

      <main className="relative z-10 flex flex-col items-center px-6 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00A3FF]/30 bg-[#00A3FF]/10 text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse" />
            Let&apos;s Get Started
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            How would you like to build
            <br />
            <span style={{ background: "linear-gradient(135deg, #ffffff 0%, #7EC8FF 40%, #00A3FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              your reel?
            </span>
          </h1>
          <p className="text-slate-400 mt-5 text-lg max-w-md mx-auto">
            Choose the option that matches what you have ready.
          </p>
        </div>

        {/* Thin separator */}
        <div className="w-full max-w-4xl h-px mb-10" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

        {/* ── Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

          {/* Card 1 — I Have My Clips */}
          <div
            className="relative group cursor-pointer rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] overflow-hidden"
            style={{ border: "1.5px solid #00A3FF", minHeight: "340px" }}
            onClick={() => router.push("/upload")}
          >
            {/* Animated background glow */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(0,163,255,0.14) 0%, transparent 70%)",
                animation: "blue-pulse 4s ease-in-out infinite",
              }}
            />
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              background: "linear-gradient(145deg, rgba(0,163,255,0.06) 0%, rgba(0,163,255,0.01) 100%)",
            }} />
            {/* Hover inner glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: "inset 0 0 60px rgba(0,163,255,0.12), 0 0 60px rgba(0,163,255,0.2)" }} />

            {/* Available Now badge */}
            <span className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full z-10"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22C55E" }}>
              Available Now
            </span>

            {/* Icon */}
            <div className="text-[#00A3FF] mb-7 relative z-10 mt-1">
              <FilmIcon size={40} />
            </div>

            {/* Text */}
            <h2 className="text-2xl font-black text-white mb-3 relative z-10">I Have My Clips</h2>
            <p className="text-slate-400 text-[15px] leading-relaxed relative z-10 max-w-[320px]">
              Upload clips you already cut and build your reel in minutes.
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-2 mt-10 relative z-10">
              <span className="text-sm font-bold text-[#00A3FF]">Start Building</span>
              <span className="text-[#00A3FF] transition-transform duration-200 group-hover:translate-x-1" style={{ display: "inline-block" }}>→</span>
            </div>
          </div>

          {/* Card 2 — AI Finds Your Best Plays */}
          <div
            className="relative group cursor-pointer rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] overflow-hidden"
            style={{ border: "1.5px solid rgba(168,85,247,0.35)", minHeight: "340px" }}
            onClick={() => setShowModal(true)}
          >
            {/* Animated purple background glow */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(168,85,247,0.12) 0%, transparent 70%)",
                animation: "purple-pulse 4.5s ease-in-out infinite",
              }}
            />
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
              background: "linear-gradient(145deg, rgba(168,85,247,0.04) 0%, rgba(255,255,255,0.005) 100%)",
            }} />
            {/* Hover inner glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: "inset 0 0 60px rgba(168,85,247,0.1), 0 0 60px rgba(168,85,247,0.15)" }} />

            {/* Coming Soon badge */}
            <span className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full z-10"
              style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#F97316" }}>
              Coming Soon
            </span>

            {/* Icon */}
            <div className="mb-7 relative z-10 mt-1 transition-colors duration-300"
              style={{ color: "#a855f7" }}>
              <SparkleIcon size={40} />
            </div>

            {/* Text */}
            <h2 className="text-2xl font-black text-white mb-3 relative z-10">AI Finds Your Best Plays</h2>
            <p className="text-slate-400 text-[15px] leading-relaxed relative z-10 max-w-[320px]">
              Submit a YouTube link or full game film. Our AI scans for your jersey number and pulls your best plays automatically.
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-2 mt-10 relative z-10">
              <span className="text-sm font-bold text-slate-500 group-hover:text-[#a855f7] transition-colors duration-300">Get Notified</span>
              <span className="text-slate-500 group-hover:text-[#a855f7] transition-all duration-200 group-hover:translate-x-1" style={{ display: "inline-block" }}>→</span>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          {[
            { icon: <PeopleIcon />, value: "500+", label: "Athletes" },
            { icon: <TrophyIcon />, value: "2",    label: "Sports" },
            { icon: <ClockStatIcon />, value: "3 Min", label: "Avg Reel" },
          ].map(({ icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="text-slate-500">{icon}</div>
              <span className="text-xl font-black text-white">{value}</span>
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(5,10,20,0.88)", backdropFilter: "blur(10px)" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="relative w-full max-w-md rounded-2xl p-8"
            style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 0 100px rgba(0,80,255,0.18), 0 40px 80px rgba(0,0,0,0.6)" }}>
            <button onClick={closeModal}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {!submitted ? (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7" }}>
                  <SparkleIcon size={22} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">This feature is almost ready.</h3>
                <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                  Drop your email to get notified when AI processing launches.
                </p>
                <form onSubmit={handleNotify} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    disabled={loading}
                    className="px-4 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all disabled:opacity-60"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 28px rgba(0,120,255,0.4)" }}>
                    {loading ? <Spinner /> : null}
                    {loading ? "Saving..." : "Notify Me →"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <CheckIcon />
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                  {alreadyExists ? "You're already on the list!" : "You're on the list!"}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {alreadyExists
                    ? "We already have your email. We'll notify you when AI processing launches."
                    : <>We&apos;ll notify you at <span className="text-white font-semibold">{email}</span></>}
                </p>
                <button onClick={closeModal}
                  className="mt-7 px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
