"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";

// ── Icons ──────────────────────────────────────────────────────────────────

const SparkleIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ListIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
);

const CheckSquareIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ── Feature cards data ──────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <EyeIcon />,
    title: "Jersey Detection",
    description:
      "AI finds your jersey number and color on screen using computer vision. Works across different camera angles, lighting conditions, and crowd backgrounds.",
  },
  {
    icon: <ListIcon />,
    title: "Play Classification",
    description:
      "Automatically identifies scoring plays, assists, defensive stops, and more. Supports Basketball, Football, and Lacrosse.",
  },
  {
    icon: <TrophyIcon />,
    title: "Smart Ranking",
    description:
      "Sorts your clips by quality and impact so your best plays come first. Confidence scores let you see exactly how the AI rated each clip.",
  },
  {
    icon: <CheckSquareIcon />,
    title: "Review and Approve",
    description:
      "You see every clip the AI found and choose what goes in your reel. Drag to reorder, filter by play type, and preview before building.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function AiProcessingPage() {
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
      .insert({ email: email.trim().toLowerCase(), source: "ai_processing_page" });

    if (response.error) {
      if (response.error.code === "23505") {
        setSubmitted(true);
        setAlreadyExists(true);
      } else {
        setSubmitError("Something went wrong. Please try again.");
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
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,163,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* ── HERO ── */}
      <section
        className="relative z-10 text-center px-6 pt-20 pb-20"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(100,40,200,0.18) 0%, transparent 100%)",
        }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 text-[#a855f7] text-xs font-bold tracking-widest uppercase mb-8">
          <SparkleIcon size={12} />
          Coming Soon
        </div>

        <h1 className="text-[clamp(2.2rem,7vw,5rem)] font-black leading-tight text-white mb-5 max-w-3xl mx-auto">
          AI-Powered Highlight Detection
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your full game film. Our AI scans every frame for your jersey number and pulls your
          best plays automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push("/start")}
            className="px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
              boxShadow: "0 0 28px rgba(0,120,255,0.35)",
            }}
          >
            Build My Reel Now (Manual) →
          </button>
          <a
            href="#early-access"
            className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.03]"
            style={{
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#a855f7",
            }}
          >
            Get Early Access →
          </a>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="relative z-10 px-6 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Four steps. Zero editing.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              className="relative group rounded-2xl p-7 overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: "inset 0 0 50px rgba(168,85,247,0.06)" }}
              />

              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 relative z-10"
                style={{
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  color: "#a855f7",
                }}
              >
                {feature.icon}
              </div>

              <h3 className="text-xl font-black text-white mb-3 relative z-10">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed relative z-10">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4-STEP FLOW ── */}
      <section className="relative z-10 px-6 py-16 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white">The AI Flow</h2>
        </div>

        <div className="flex flex-col gap-0">
          {[
            { label: "Submit Game Film", desc: "Paste a YouTube link or upload a raw video file." },
            { label: "AI Finds Your Clips", desc: "Our model scans every frame for your jersey number." },
            { label: "Review & Approve", desc: "Preview each clip and choose what makes your reel." },
            { label: "Build Your Reel", desc: "Customize and export your coach-ready highlight video." },
          ].map((step, i) => (
            <div key={step.label} className="flex gap-5 items-start">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                  style={{
                    background: "rgba(168,85,247,0.15)",
                    border: "1.5px solid rgba(168,85,247,0.4)",
                    color: "#a855f7",
                  }}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className="w-px flex-1 my-1"
                    style={{
                      background: "linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(168,85,247,0.05) 100%)",
                      height: "40px",
                    }}
                  />
                )}
              </div>
              <div className="pb-8 pt-1.5">
                <p className="font-bold text-white text-base">{step.label}</p>
                <p className="text-slate-500 text-sm mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EARLY ACCESS FORM ── */}
      <section id="early-access" className="relative z-10 px-6 py-20">
        <div
          className="max-w-xl mx-auto rounded-2xl p-10 sm:p-14 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0A1628 0%, #0D1D3A 100%)",
            border: "1px solid rgba(168,85,247,0.2)",
            boxShadow: "0 0 80px rgba(100,40,200,0.1)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(100,40,200,0.1) 0%, transparent 70%)",
            }}
          />

          <div
            className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: "rgba(168,85,247,0.1)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#a855f7",
            }}
          >
            <SparkleIcon size={28} />
          </div>

          <h2 className="relative z-10 text-2xl sm:text-3xl font-black text-white mb-3">
            Get Early Access
          </h2>
          <p className="relative z-10 text-slate-400 text-base mb-8 leading-relaxed max-w-md mx-auto">
            Be the first to know when AI processing launches. We&apos;ll email you the moment
            it&apos;s ready.
          </p>

          {!submitted ? (
            <form
              onSubmit={handleWaitlistSubmit}
              className="relative z-10 flex flex-col gap-3 max-w-sm mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={submitting}
                className="px-5 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all disabled:opacity-60"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              {submitError && <p className="text-red-400 text-xs text-left">{submitError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #6D28D9 0%, #a855f7 100%)",
                  boxShadow: "0 0 28px rgba(168,85,247,0.35)",
                }}
              >
                {submitting && <Spinner />}
                {submitting ? "Saving..." : "Notify Me When It Launches →"}
              </button>
              <p className="text-slate-600 text-xs">No spam. Unsubscribe any time.</p>
            </form>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                <CheckIcon />
              </div>
              <p className="font-black text-white text-lg">
                {alreadyExists ? "Already on the list!" : "You're on the list!"}
              </p>
              <p className="text-slate-400 text-sm">
                {alreadyExists
                  ? "We already have your email. We'll reach out when AI processing launches."
                  : "We'll email you the moment AI processing is ready."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── MANUAL FALLBACK CTA ── */}
      <section className="relative z-10 px-6 py-10 text-center">
        <p className="text-slate-500 text-sm mb-4">
          Want to build your reel today? The manual upload tool is live right now.
        </p>
        <button
          onClick={() => router.push("/start")}
          className="px-8 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
            boxShadow: "0 0 24px rgba(0,120,255,0.3)",
          }}
        >
          Build My Reel Now →
        </button>
      </section>

      <Footer />
    </div>
  );
}
