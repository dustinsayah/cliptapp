"use client";

import { useState } from "react";
import { saveToWaitlist, type WaitlistSource } from "@/lib/supabase";

// ── Icons ───────────────────────────────────────────────────────────────────

const SparkleIcon = ({ size = 22 }: { size?: number }) => (
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

// ── Component ────────────────────────────────────────────────────────────────

export interface ComingSoonModalProps {
  source: WaitlistSource;
  onClose: () => void;
}

export default function ComingSoonModal({ source, onClose }: ComingSoonModalProps) {
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
      const result = await saveToWaitlist(email.trim(), source);
      if (result.success) {
        setSubmitted(true);
        setAlreadyExists(result.alreadyExists ?? false);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,10,20,0.88)", backdropFilter: "blur(10px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8"
        style={{
          background: "#0A1628",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 100px rgba(0,80,255,0.18), 0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* X button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {!submitted ? (
          <>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7" }}
            >
              <SparkleIcon size={22} />
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              AI Processing — Coming Soon
            </h3>
            <p className="text-slate-400 text-sm mb-7 leading-relaxed">
              Our AI will scan your full game film frame by frame, find your jersey number, and automatically pull your best plays. No editing required.
            </p>

            <form onSubmit={handleNotify} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email to get notified"
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
                style={{
                  background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
                  boxShadow: "0 0 28px rgba(0,120,255,0.4)",
                }}
              >
                {loading && <Spinner />}
                {loading ? "Saving..." : "Notify Me →"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <CheckIcon />
            </div>
            <h3 className="text-xl font-black text-white mb-2">
              {alreadyExists ? "You're already on the list!" : "You are on the list!"}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {alreadyExists
                ? "We already have your email. We'll notify you when AI processing launches."
                : "We will email you the moment AI processing launches."}
            </p>
            <button
              onClick={onClose}
              className="mt-7 px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
