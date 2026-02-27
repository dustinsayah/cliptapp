"use client";

/*
 * SUPABASE TABLE REQUIRED:
 *
 * CREATE TABLE IF NOT EXISTS contact_submissions (
 *   id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name       TEXT,
 *   email      TEXT,
 *   subject    TEXT,
 *   message    TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow public insert" ON contact_submissions FOR INSERT WITH CHECK (true);
 */

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";

// ── Icons ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const CheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

// ── Constants ──────────────────────────────────────────────────────────────

const SUBJECT_OPTIONS = [
  "General Question",
  "Technical Support",
  "Partnership",
  "Feedback",
  "Other",
];

const inputClass =
  "w-full px-4 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all";
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject || !message.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const response = await supabase.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject,
      message: message.trim(),
    });

    if (response.error) {
      setSubmitError(
        "Something went wrong. Please try again or email us directly at support@cliptapp.com."
      );
    } else {
      setSubmitted(true);
    }

    setSubmitting(false);
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)";
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,163,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.022) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <main className="relative z-10 max-w-2xl mx-auto px-5 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-5"
            style={{
              background: "rgba(0,163,255,0.1)",
              border: "1px solid rgba(0,163,255,0.25)",
              color: "#00A3FF",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF]" />
            Get in Touch
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Contact Us
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            Have a question or feedback? We&apos;d love to hear from you. We respond within 24 hours.
          </p>
        </div>

        {/* Direct email fallback */}
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-xl mb-8"
          style={{
            background: "rgba(0,163,255,0.06)",
            border: "1px solid rgba(0,163,255,0.18)",
          }}
        >
          <span style={{ color: "#00A3FF" }}>
            <MailIcon />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
              Direct Email
            </p>
            <a
              href="mailto:support@cliptapp.com"
              className="text-[#00A3FF] text-sm font-semibold hover:underline"
            >
              support@cliptapp.com
            </a>
          </div>
        </div>

        {/* Form */}
        {!submitted ? (
          <div
            className="rounded-2xl p-8"
            style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  disabled={submitting}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  disabled={submitting}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Subject <span className="text-red-400">*</span>
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={submitting}
                  className={inputClass}
                  style={{
                    ...inputStyle,
                    color: subject ? "#fff" : "#64748b",
                    appearance: "none",
                    cursor: "pointer",
                  }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                >
                  <option value="" disabled style={{ background: "#0A1628" }}>
                    Select a subject
                  </option>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} style={{ background: "#0A1628", color: "#fff" }}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  required
                  disabled={submitting}
                  rows={5}
                  className="w-full px-4 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all resize-none"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {submitError && (
                <p
                  className="text-red-400 text-xs px-4 py-3 rounded-xl"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim() || !subject || !message.trim()}
                className="w-full py-4 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
                  boxShadow: "0 0 28px rgba(0,120,255,0.35)",
                }}
              >
                {submitting && <Spinner />}
                {submitting ? "Sending..." : "Send Message →"}
              </button>
            </form>
          </div>
        ) : (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: "#0A1628", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <CheckIcon />
            </div>
            <h3 className="text-xl font-black text-white mb-3">Message Sent!</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              We will get back to you within 24 hours at{" "}
              <span className="text-white font-semibold">{email}</span>.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
