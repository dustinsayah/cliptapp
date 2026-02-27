"use client";

import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

// ── Icons ──────────────────────────────────────────────────────────────────

const FilmIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="2" />
    <line x1="7" x2="7" y1="2" y2="22" /><line x1="17" x2="17" y1="2" y2="22" />
    <line x1="2" x2="22" y1="7" y2="7" /><line x1="2" x2="22" y1="12" y2="12" /><line x1="2" x2="22" y1="17" y2="17" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A3FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Data ───────────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    icon: <FilmIcon />,
    title: "Upload Your Clips",
    description:
      "Upload up to 50 clips from your phone or computer. MP4, MOV, and all major video formats supported. No file size limits.",
    details: [
      "Drag-and-drop or browse from any device",
      "Works with iPhone, Android, GoPro, and camera footage",
      "Reorder clips by dragging to set your preferred sequence",
      "Add custom clip labels to help coaches understand each play",
    ],
  },
  {
    number: "02",
    icon: <SettingsIcon />,
    title: "Customize Your Reel",
    description:
      "Add your stats, choose your music, pick your colors, set your transitions. Make it look exactly how you want coaches to see you.",
    details: [
      "ESPN-style title card with your name, school, and stats",
      "6 music styles — or no music for a clean, professional look",
      "Custom color accent to match your school colors",
      "Hard cuts, fades, and flash transitions",
      "Stats card showing your best numbers",
    ],
  },
  {
    number: "03",
    icon: <DownloadIcon />,
    title: "Download and Share",
    description:
      "Export a coach-ready 16:9 version and a social-ready 9:16 version. Share your link directly with coaches or post on social media.",
    details: [
      "1920×1080 landscape for recruiting profiles and email",
      "720×1280 portrait for Instagram and TikTok",
      "High quality 8Mbps MP4 output",
      "Export in under 2 minutes",
    ],
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  const router = useRouter();

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
            "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(0,100,255,0.18) 0%, transparent 100%)",
        }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00A3FF]/30 bg-[#00A3FF]/10 text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse" />
          Step-by-Step
        </div>

        <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-black leading-tight text-white mb-5">
          How Clipt Works
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          From raw footage to a coach-ready reel in minutes.
        </p>
        <button
          onClick={() => router.push("/start")}
          className="px-9 py-4 rounded-xl font-bold text-base text-white transition-all hover:scale-[1.04] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
            boxShadow: "0 0 40px rgba(0,120,255,0.4)",
          }}
        >
          Build Your Reel — It&apos;s Free →
        </button>
      </section>

      {/* ── STEPS ── */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <div className="flex flex-col gap-8">
          {STEPS.map((step, index) => (
            <div
              key={index}
              className="relative rounded-2xl p-8 sm:p-10 overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Step number watermark */}
              <div
                className="absolute top-6 right-8 text-[7rem] font-black leading-none select-none pointer-events-none"
                style={{ color: "rgba(0,163,255,0.04)" }}
              >
                {step.number}
              </div>

              <div className="flex flex-col sm:flex-row gap-8 items-start">
                {/* Icon + step badge */}
                <div className="flex-shrink-0 flex flex-col items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "rgba(0,163,255,0.08)",
                      border: "1px solid rgba(0,163,255,0.2)",
                      color: "#00A3FF",
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="text-xs font-black tracking-widest px-3 py-1 rounded-full"
                    style={{
                      background: "rgba(0,163,255,0.1)",
                      border: "1px solid rgba(0,163,255,0.25)",
                      color: "#00A3FF",
                    }}
                  >
                    STEP {step.number}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
                    {step.title}
                  </h2>
                  <p className="text-slate-400 text-base leading-relaxed mb-6 max-w-xl">
                    {step.description}
                  </p>

                  <ul className="flex flex-col gap-2.5">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: "rgba(0,163,255,0.1)",
                            border: "1px solid rgba(0,163,255,0.25)",
                          }}
                        >
                          <CheckIcon />
                        </div>
                        <span className="text-slate-300 text-sm leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI MODE SECTION ── */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <div
          className="rounded-2xl p-10 sm:p-14 relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0A1628 0%, #0D1D3A 100%)",
            border: "1px solid rgba(168,85,247,0.25)",
            boxShadow: "0 0 80px rgba(168,85,247,0.07)",
          }}
        >
          {/* Purple glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 70% 50%, rgba(168,85,247,0.09) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.3)",
                color: "#a855f7",
              }}
            >
              <SparkleIcon />
            </div>

            <div className="flex-1 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full mb-4"
                style={{
                  background: "rgba(249,115,22,0.12)",
                  border: "1px solid rgba(249,115,22,0.3)",
                  color: "#F97316",
                }}
              >
                Coming Soon
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
                Coming Soon — AI Mode
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-6 max-w-xl">
                Don&apos;t have your clips cut yet? Upload your full game film and let our AI do the
                work. Our system scans every frame, finds your jersey number, and automatically
                extracts your best plays — no editing required.
              </p>

              <ul className="flex flex-col gap-2.5 mb-8">
                {[
                  "Submit a YouTube link or raw game film",
                  "AI scans every frame for your jersey number",
                  "Automatically ranks plays by quality and impact",
                  "You review and approve before building your reel",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: "rgba(168,85,247,0.1)",
                        border: "1px solid rgba(168,85,247,0.3)",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push("/ai-processing")}
                className="px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #6D28D9 0%, #a855f7 100%)",
                  boxShadow: "0 0 28px rgba(168,85,247,0.3)",
                }}
              >
                Learn More About AI Mode →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="relative z-10 px-6 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Ready to build your reel?
        </h2>
        <p className="text-slate-400 text-base mb-8 max-w-md mx-auto">
          Join 2,000+ athletes already using Clipt to get noticed by coaches.
        </p>
        <button
          onClick={() => router.push("/start")}
          className="px-10 py-4 rounded-xl font-bold text-base text-white transition-all hover:scale-[1.04] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
            boxShadow: "0 0 48px rgba(0,120,255,0.4)",
          }}
        >
          Build Your Reel — It&apos;s Free →
        </button>
      </section>

      <Footer />
    </div>
  );
}
