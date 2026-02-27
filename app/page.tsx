"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Icons ──────────────────────────────────────────────────────────────────

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" /><path d="m16 16-4-4-4 4" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);
const ReelIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
    <path d="M12 9V3" /><path d="M12 21v-6" /><path d="M9 12H3" /><path d="M21 12h-6" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const CheckIcon = ({ size = 18, color = "#00A3FF" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const features = [
  { step: "01", icon: <UploadIcon />, title: "Upload Your Clips or Submit Game Film", description: "Drop in your own cut clips, or paste a YouTube link to let our AI scan your full game film for you." },
  { step: "02", icon: <SparkleIcon />, title: "Customize Your Reel", description: "Add a title card, pick your music, set your color accent, reorder clips, and fine-tune every detail." },
  { step: "03", icon: <ReelIcon />, title: "Download and Send to Coaches", description: "Export a coach-optimized MP4 in minutes. Share the link directly to recruiting profiles or DMs." },
];

const avatarColors = [["#0066FF","#0099FF"],["#0099FF","#00BFFF"],["#1E40AF","#3B82F6"],["#3B82F6","#60B3FF"],["#00BFFF","#60B3FF"]];
const avatarInitials = ["JD","MR","TW","AJ","KS"];

const BUILT_FOR_FEATURES = [
  "Professional title card with your stats",
  "Coach-optimized formatting",
  "Hard cuts preferred by coaches",
  "Social version for TikTok & Instagram",
  "Shareable link for recruiting profiles",
];

// ── Mock phone component ───────────────────────────────────────────────────

function MockPhone() {
  return (
    <div className="relative mx-auto" style={{ width: "200px" }}>
      {/* Phone outer frame */}
      <div
        className="relative rounded-[2.5rem] overflow-hidden"
        style={{
          width: "200px",
          height: "400px",
          background: "#1a1a2e",
          border: "4px solid #2a2a4a",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[8px] text-slate-400 font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          </div>
        </div>
        {/* Screen content */}
        <div className="px-3 py-2">
          {/* App header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black tracking-widest" style={{ color: "#00A3FF" }}>CLIPT</span>
            <div className="w-5 h-5 rounded-full bg-[#00A3FF]/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#00A3FF]" />
            </div>
          </div>
          {/* Title card preview */}
          <div
            className="w-full rounded-lg mb-3 flex items-center justify-center"
            style={{ height: "80px", background: "#050A14", border: "1px solid rgba(0,163,255,0.3)" }}
          >
            <div className="text-center">
              <div className="text-[11px] font-black text-white tracking-wide">MARCUS J.</div>
              <div className="text-[7px] font-bold tracking-widest mt-0.5" style={{ color: "#00A3FF" }}>POINT GUARD</div>
              <div className="text-[6px] text-slate-500 mt-0.5">#23 · LAKEVIEW HIGH</div>
            </div>
          </div>
          {/* Clip list */}
          {["Mid Range Jumper","Drive to Basket","Three Pointer","Fast Break"].map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-2 mb-1.5 px-2 py-1.5 rounded-lg"
              style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="w-10 h-6 rounded flex items-center justify-center shrink-0" style={{ background: "#0A1628", border: "1px solid rgba(0,163,255,0.2)" }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#00A3FF"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[7px] text-slate-300 truncate font-semibold">{name}</div>
                <div className="text-[6px] text-slate-600 mt-0.5">
                  <span style={{ color: "#00A3FF", fontSize: "6px" }} className="font-bold">AI PICK</span>
                  {" · "}Clip {i + 1}
                </div>
              </div>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: i < 2 ? "#22C55E" : "rgba(255,255,255,0.1)" }} />
            </div>
          ))}
        </div>
        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around py-3 px-4" style={{ background: "#0A1628", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {["🎬","⚡","📤"].map((icon, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-xs">{icon}</span>
              <div className={`w-1 h-1 rounded-full ${i === 0 ? "" : ""}`} style={{ background: i === 0 ? "#00A3FF" : "transparent" }} />
            </div>
          ))}
        </div>
      </div>
      {/* Glow under phone */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full blur-xl" style={{ background: "rgba(0,163,255,0.2)" }} />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const response = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase(), source: "homepage" });

    console.log("[Clipt] Supabase waitlist response:", response);

    if (response.error) {
      if (response.error.code === "23505") {
        setSubmitted(true);
        setAlreadyExists(true);
      } else {
        setSubmitError("Something went wrong, try again.");
      }
    } else {
      setSubmitted(true);
      setAlreadyExists(false);
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `linear-gradient(rgba(0,163,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.025) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }} />

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-32" style={{
        background: "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(0,100,255,0.22) 0%, transparent 100%)",
      }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00A3FF]/30 bg-[#00A3FF]/10 text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse" />
          AI-Powered Highlight Reels
        </div>

        <h1 className="text-[clamp(3.5rem,10vw,7rem)] font-black tracking-tight leading-[0.92] mb-8 max-w-4xl">
          <span className="block text-white">Your Game.</span>
          <span className="block" style={{ background: "linear-gradient(135deg, #ffffff 0%, #7EC8FF 40%, #00A3FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Your Reel.
          </span>
          <span className="block text-white">Your Future.</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Stop letting your best plays go unnoticed. Clipt uses AI to automatically find and compile your most impressive moments into a professional recruiting reel — in minutes, not hours.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => router.push("/start")}
          className="px-10 py-4 rounded-xl font-bold text-base text-white transition-all hover:scale-[1.04] active:scale-[0.98] mb-8"
          style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 48px rgba(0,120,255,0.45)" }}
        >
          Build Your Reel — It&apos;s Free →
        </button>

        {/* Waitlist separator */}
        <div className="flex items-center gap-4 mb-6 w-full max-w-md">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-600 text-xs font-semibold">or join the waitlist</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Waitlist form */}
        {!submitted ? (
          <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={submitting}
              className="flex-1 px-5 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all disabled:opacity-60"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3.5 rounded-xl font-bold text-sm text-white whitespace-nowrap transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60 flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 24px rgba(0,120,255,0.35)" }}
            >
              {submitting ? <Spinner /> : null}
              {submitting ? "Saving..." : "Get Early Access"}
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3 px-8 py-3.5 rounded-xl border border-[#00A3FF]/40" style={{ background: "rgba(0,163,255,0.08)" }}>
            <CheckIcon size={18} color="#00A3FF" />
            <span className="text-[#00A3FF] font-semibold text-sm">
              {alreadyExists ? "You are already on the list!" : "You are on the list!"}
            </span>
          </div>
        )}
        {submitError && <p className="text-red-400 text-xs mt-2">{submitError}</p>}

        <div className="flex items-center gap-5 mt-6 text-slate-500 text-xs">
          <span className="flex items-center gap-1.5"><ShieldIcon />No credit card required</span>
          <span className="w-px h-3.5 bg-slate-700" />
          <span className="flex items-center gap-1.5"><ClockIcon />Early access coming soon</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative z-10 px-6 py-28 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-4">How It Works</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            From raw footage to{" "}
            <span style={{ background: "linear-gradient(135deg, #7EC8FF 0%, #00A3FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              recruiting gold
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <div key={index} className="relative group p-8 rounded-2xl border border-white/[0.07] hover:border-[#00A3FF]/40 transition-all duration-300 overflow-hidden"
              style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%)" }}>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: "inset 0 0 50px rgba(0,100,255,0.09)" }} />
              <div className="absolute top-4 right-5 text-8xl font-black leading-none select-none pointer-events-none text-white/[0.04] group-hover:text-[#00A3FF]/[0.07] transition-colors duration-300">
                {feature.step}
              </div>
              <div className="text-[#00A3FF] mb-6 relative z-10">{feature.icon}</div>
              <h3 className="text-lg font-bold text-white mb-3 relative z-10">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed relative z-10">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto rounded-3xl p-14 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #0A1628 0%, #0C1D3A 50%, #0A1628 100%)", border: "1px solid rgba(0,163,255,0.18)", boxShadow: "0 0 80px rgba(0,100,255,0.1)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(0,80,255,0.13) 0%, transparent 70%)" }} />
          <div className="flex items-center justify-center mb-6 relative z-10">
            {avatarInitials.map((initials, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050A14] flex items-center justify-center text-[10px] font-black"
                style={{ background: `linear-gradient(135deg, ${avatarColors[i][0]} 0%, ${avatarColors[i][1]} 100%)`, marginLeft: i === 0 ? 0 : "-10px", zIndex: 5 - i }}>
                {initials}
              </div>
            ))}
            <div className="w-10 h-10 rounded-full border-2 border-[#050A14] flex items-center justify-center text-[10px] font-semibold text-slate-400"
              style={{ background: "#0D1F3C", marginLeft: "-10px", zIndex: 0 }}>+495</div>
          </div>
          <div className="flex items-center justify-center gap-1 mb-6 relative z-10">
            {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
          </div>
          <p className="text-5xl sm:text-6xl font-black text-white mb-4 relative z-10 leading-none">
            Join{" "}
            <span style={{ background: "linear-gradient(135deg, #7EC8FF 0%, #00A3FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>500+</span>{" "}
            athletes
          </p>
          <p className="text-slate-400 text-lg max-w-xl mx-auto relative z-10 leading-relaxed">
            High school football and basketball players across the country are building their reels. Don&apos;t get left behind.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap relative z-10">
            {["Basketball","Football","Multi-Sport"].map((tag) => (
              <span key={tag} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400 font-medium">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILT FOR ATHLETES ── */}
      <section className="relative z-10 px-6 py-28 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-4">Everything You Need</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Built for{" "}
            <span style={{ background: "linear-gradient(135deg, #7EC8FF 0%, #00A3FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              athletes
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center max-w-5xl mx-auto">
          {/* Left: feature checklist */}
          <div className="flex flex-col gap-5">
            {BUILT_FOR_FEATURES.map((feat) => (
              <div key={feat} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(0,163,255,0.12)", border: "1px solid rgba(0,163,255,0.3)" }}>
                  <CheckIcon size={13} color="#00A3FF" />
                </div>
                <p className="text-white font-semibold text-base leading-snug">{feat}</p>
              </div>
            ))}
            <button
              onClick={() => router.push("/start")}
              className="mt-4 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.98] w-fit"
              style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 28px rgba(0,120,255,0.35)" }}
            >
              Start Building →
            </button>
          </div>

          {/* Right: mock phone */}
          <div className="flex items-center justify-center">
            <MockPhone />
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="relative z-10 px-6 py-20 text-center">
        <p className="text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-5">Ready to Get Recruited?</p>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">Make coaches stop scrolling.</h2>
        <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
          Your next opportunity starts with the right reel. Upload your clips and go from raw footage to a coach-ready highlight reel in minutes.
        </p>
        <button
          onClick={() => router.push("/start")}
          className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-base text-white transition-all hover:scale-[1.04] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)", boxShadow: "0 0 48px rgba(0,120,255,0.4)" }}
        >
          Build Your Reel — It&apos;s Free →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 pt-16 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Top row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="text-xl font-black tracking-widest block mb-3" style={{ color: "#00A3FF" }}>CLIPT</span>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">Your Game. Your Reel. Your Future. AI-powered highlight reels for the next generation of athletes.</p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">Product</p>
              <ul className="flex flex-col gap-2.5">
                {[["Create Reel", "/start"], ["AI Processing", "/process"], ["How It Works", "/#how-it-works"]].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-slate-500 text-sm hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">Support</p>
              <ul className="flex flex-col gap-2.5">
                {[["FAQ", "/faq"], ["My Reels", "/history"], ["Contact", "#"]].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-slate-500 text-sm hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">Legal</p>
              <ul className="flex flex-col gap-2.5">
                {[["Privacy Policy", "#"], ["Terms of Service", "#"]].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-slate-500 text-sm hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-600 text-sm">&copy; 2026 Clipt. All rights reserved.</p>
            <p className="text-slate-600 text-sm">Made for athletes by athletes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
