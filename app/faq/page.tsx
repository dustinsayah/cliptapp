"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.22s ease", flexShrink: 0 }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "How long should my reel be?",
    a: (
      <div className="flex flex-col gap-2 text-slate-400 text-sm leading-relaxed">
        <p>
          <strong className="text-white">3–5 minutes is the sweet spot.</strong> College coaches watch hundreds of reels and have very little time. The goal is to show your best plays — not every play.
        </p>
        <ul className="flex flex-col gap-1 pl-4">
          <li className="list-disc"><strong className="text-slate-300">Basketball:</strong> 3–4 minutes is ideal. Anything over 4 minutes risks losing the coach&apos;s attention.</li>
          <li className="list-disc"><strong className="text-slate-300">Football:</strong> 3–5 minutes is standard. Position-specific reels can go slightly longer.</li>
        </ul>
        <p>
          Studies show coaches make a decision about an athlete within the <strong className="text-white">first 30–60 seconds</strong>. Put your single best play first, not second.
        </p>
      </div>
    ),
  },
  {
    q: "What clips should I include?",
    a: (
      <div className="flex flex-col gap-2 text-slate-400 text-sm leading-relaxed">
        <p>
          <strong className="text-white">Quality over quantity.</strong> 8–12 elite plays beat 25 average ones every time. Here&apos;s what coaches want to see:
        </p>
        <ul className="flex flex-col gap-1.5 pl-4">
          <li className="list-disc"><strong className="text-slate-300">Lead with your best:</strong> Don&apos;t save your top play for the end. Coaches may never get there.</li>
          <li className="list-disc"><strong className="text-slate-300">Show variety:</strong> Mix offense and defense. Show different situations — not just one type of play repeated.</li>
          <li className="list-disc"><strong className="text-slate-300">Hustle plays count:</strong> Coaches love seeing effort — diving for loose balls, sprinting back on defense, boxing out hard.</li>
          <li className="list-disc"><strong className="text-slate-300">Game film only:</strong> Skip practice drills. Real game situations show you can perform under pressure.</li>
          <li className="list-disc"><strong className="text-slate-300">Avoid team highlight clips:</strong> Make sure YOU are clearly visible in every clip.</li>
        </ul>
      </div>
    ),
  },
  {
    q: "Will coaches actually watch this?",
    a: (
      <div className="flex flex-col gap-2 text-slate-400 text-sm leading-relaxed">
        <p>
          <strong className="text-white">Yes — highlight reels are the primary recruiting tool coaches use.</strong>
        </p>
        <p>
          According to NCSA research, over <strong className="text-white">80% of college coaches</strong> say highlight reels are one of the most important factors when evaluating a recruit. Most coaches review reels <em>before</em> deciding whether to invite an athlete to a camp or make contact.
        </p>
        <p>
          The key is making the reel easy to watch: clear video quality, the athlete clearly identified, and concise length. A well-made 3-minute reel will get watched. A 15-minute raw game dump will not.
        </p>
        <p className="text-slate-500 text-xs border-l-2 border-slate-700 pl-3 italic">
          Tip: Always email the reel directly to the coach with a short, personal message — not just a link dump.
        </p>
      </div>
    ),
  },
  {
    q: "What format do coaches prefer?",
    a: (
      <div className="flex flex-col gap-2 text-slate-400 text-sm leading-relaxed">
        <p>
          Coaches have strong preferences that most athletes don&apos;t know about:
        </p>
        <ul className="flex flex-col gap-1.5 pl-4">
          <li className="list-disc"><strong className="text-slate-300">No music:</strong> Most college coaches prefer <strong className="text-white">no background music</strong>. They want to hear the game — the crowd, the whistle, the play call. Music can feel unprofessional in a recruiting context. Clipt defaults to No Music for this reason.</li>
          <li className="list-disc"><strong className="text-slate-300">Landscape (16:9):</strong> Send the landscape version for email and recruiting platforms. Coaches watch on laptops and desktops, not phones.</li>
          <li className="list-disc"><strong className="text-slate-300">Hard cuts:</strong> Clean, instant cuts between clips. Fancy fades and effects look amateur to coaches who watch 50 reels a week.</li>
          <li className="list-disc"><strong className="text-slate-300">Jersey visible:</strong> Make sure your jersey number is on screen and readable. Coaches can&apos;t evaluate you if they can&apos;t find you.</li>
        </ul>
      </div>
    ),
  },
  {
    q: "Can I update my reel?",
    a: (
      <div className="flex flex-col gap-2 text-slate-400 text-sm leading-relaxed">
        <p>
          <strong className="text-white">Yes, absolutely.</strong> You should update your reel every season — or even mid-season after a strong stretch of games. Coaches are actively recruiting throughout the year, and a fresh reel can reignite interest from programs you&apos;ve already contacted.
        </p>
        <p>
          With Clipt, building a new reel takes minutes. Simply come back, upload your new clips, and rebuild. Your previous settings (name, sport, color, music) will be saved so you don&apos;t have to re-enter everything.
        </p>
        <p className="text-slate-500 text-xs border-l-2 border-slate-700 pl-3 italic">
          Tip: When you email an updated reel to a coach, mention what&apos;s new — &quot;Wanted to share my updated reel after a strong junior season&quot; — so they know to open it again.
        </p>
      </div>
    ),
  },
  {
    q: "Is Clipt free?",
    a: (
      <div className="flex flex-col gap-2 text-slate-400 text-sm leading-relaxed">
        <p>
          <strong className="text-white">Yes — Clipt is completely free for athletes.</strong>
        </p>
        <p>
          We believe every athlete deserves a professional recruiting reel, regardless of their budget. Building, customizing, and downloading your highlight reel costs nothing.
        </p>
        <p>
          There are no watermarks on the coach version. No hidden fees. No subscription required.
        </p>
        <p className="text-slate-500 text-xs">
          We&apos;re working on premium features like AI-powered clip detection and automatic game film analysis. Those will be optional paid upgrades — but the core reel builder will always be free.
        </p>
      </div>
    ),
  },
];

function FaqCard({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: "#0A1628",
        border: open ? "1px solid rgba(0,163,255,0.3)" : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-white font-semibold text-sm sm:text-base leading-snug">{item.q}</span>
        <span style={{ color: open ? "#00A3FF" : "#64748b" }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Collapsible body */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.28s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="px-6 pb-6">
            <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />
            {item.a}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex flex-col">
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `linear-gradient(rgba(0,163,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 70% 30% at 50% -5%, rgba(0,80,255,0.1) 0%, transparent 100%)",
      }} />

      <main className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 pt-12 pb-24">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00A3FF]/30 bg-[#00A3FF]/10 text-[#00A3FF] text-xs font-bold tracking-widest uppercase mb-6">
            Athlete Resources
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Frequently Asked
            <br />
            <span style={{ background: "linear-gradient(135deg, #ffffff 0%, #7EC8FF 40%, #00A3FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Questions
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Everything you need to know about building a recruiting reel that gets results.
          </p>
        </div>

        {/* Thin separator */}
        <div className="h-px mb-10" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

        {/* FAQ List */}
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => (
            <FaqCard key={item.q} item={item} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-2xl p-8 text-center"
          style={{ background: "rgba(0,163,255,0.06)", border: "1px solid rgba(0,163,255,0.2)" }}>
          <p className="text-white font-bold text-lg mb-2">Ready to build your reel?</p>
          <p className="text-slate-400 text-sm mb-6">It takes 5 minutes. No account required.</p>
          <button
            onClick={() => router.push("/start")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
              boxShadow: "0 0 32px rgba(0,120,255,0.3)",
            }}
          >
            Build Your Reel — It&apos;s Free →
          </button>
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
