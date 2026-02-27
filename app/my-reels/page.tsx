"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

interface JobRow {
  id: string;
  status: string;
  sport: string | null;
  position: string | null;
  jersey_number: number | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  result_clips: unknown[] | null;
  error_message: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  queued:      "#22C55E",
  downloading: "#60A5FA",
  scanning:    "#A78BFA",
  identifying: "#FBBF24",
  building:    "#F97316",
  complete:    "#F59E0B",
  failed:      "#EF4444",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94A3B8";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {status}
    </span>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Icons ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const FilmIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(0,163,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="2" />
    <line x1="7" x2="7" y1="2" y2="22" /><line x1="17" x2="17" y1="2" y2="22" />
    <line x1="2" x2="22" y1="7" y2="7" /><line x1="2" x2="22" y1="12" y2="12" /><line x1="2" x2="22" y1="17" y2="17" />
  </svg>
);

// ── Page ───────────────────────────────────────────────────────────────────

export default function MyReelsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setJobs(null);

    try {
      const { data, error } = await supabase
        .from("processing_jobs")
        .select("id,status,sport,position,jersey_number,first_name,last_name,created_at,result_clips,error_message")
        .eq("email", email.trim().toLowerCase())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setError(error.message ?? "Failed to look up reels. Please try again.");
        setJobs([]);
      } else {
        setJobs((data as JobRow[]) ?? []);
      }
    } catch {
      setError("Network error — please check your connection and try again.");
      setJobs([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const loadClips = (job: JobRow) => {
    if (!job.result_clips || job.result_clips.length === 0) return;

    const aiClips = job.result_clips.map((clip: unknown, i: number) => {
      const c = clip as {
        startTime?: number;
        endTime?: number;
        confidence?: number;
        playType?: string;
        jerseyVisible?: boolean;
      };
      return {
        id: `ai-clip-${i + 1}`,
        clipNumber: i + 1,
        playType: c.playType ?? "Highlight Play",
        startTime: c.startTime ?? 0,
        endTime: c.endTime ?? 10,
        duration: (c.endTime ?? 10) - (c.startTime ?? 0),
        confidenceScore: c.confidence ?? 0.85,
        jerseyVisible: c.jerseyVisible ?? true,
        aiPicked: true,
        sport: job.sport ?? "",
        jerseyNumber: job.jersey_number ?? 0,
        thumbnailUrl: null,
      };
    });

    localStorage.setItem("aiGeneratedClips", JSON.stringify(aiClips));
    localStorage.setItem(
      "aiJobMeta",
      JSON.stringify({
        jerseyNumber: job.jersey_number,
        firstName: job.first_name,
        sport: job.sport,
      })
    );
    localStorage.setItem("clipSource", "ai");
    router.push("/customize");
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,163,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.018) 1px, transparent 1px)`,
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
            My Reels
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Find Your Reels
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            Enter the email you used when submitting your game film. We&apos;ll show all your past
            AI processing jobs and any clips we found.
          </p>
        </div>

        {/* Search form */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full px-4 py-3.5 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,163,255,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-50 whitespace-nowrap"
              style={{
                background: "linear-gradient(135deg, #0055EE, #00A3FF)",
                boxShadow: "0 0 24px rgba(0,120,255,0.3)",
              }}
            >
              {loading ? <Spinner /> : null}
              {loading ? "Searching..." : "Find My Reels"}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm text-red-400"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {jobs !== null && searched && (
          <>
            {jobs.length === 0 ? (
              <div
                className="rounded-2xl p-10 text-center"
                style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex justify-center mb-4">
                  <FilmIcon />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No reels found</h3>
                <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
                  No reels found for{" "}
                  <span className="text-slate-300">{email}</span>.{" "}
                  Make sure you are using the same email you submitted with.
                </p>
                <p className="text-slate-600 text-sm mb-6">
                  New here? Build your first reel below.
                </p>
                <button
                  onClick={() => router.push("/start")}
                  className="px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #0055EE, #00A3FF)",
                    boxShadow: "0 0 20px rgba(0,120,255,0.3)",
                  }}
                >
                  Build Your First Reel →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-slate-500 text-sm">
                  Found{" "}
                  <span className="text-white font-bold">
                    {jobs.length} reel{jobs.length !== 1 ? "s" : ""}
                  </span>{" "}
                  for {email}
                </p>
                {jobs.map((job) => {
                  const clipCount = job.result_clips?.length ?? 0;
                  const isComplete = job.status === "complete";
                  const isFailed = job.status === "failed";
                  const isActive = !isComplete && !isFailed;

                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl p-5"
                      style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-white text-sm">
                              {[job.first_name, job.last_name].filter(Boolean).join(" ") ||
                                "Unknown"}
                            </span>
                            {job.jersey_number !== null && (
                              <span className="font-black text-[#00A3FF] text-sm">
                                #{job.jersey_number}
                              </span>
                            )}
                            {job.sport && (
                              <span className="text-xs text-slate-500">{job.sport}</span>
                            )}
                            {job.position && (
                              <span className="text-xs text-slate-600">{job.position}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{fmtDate(job.created_at)}</p>
                        </div>
                        <StatusBadge status={job.status} />
                      </div>

                      {isComplete && (
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="flex-1 px-3 py-2 rounded-lg text-center"
                            style={{
                              background: "rgba(245,158,11,0.07)",
                              border: "1px solid rgba(245,158,11,0.2)",
                            }}
                          >
                            <div className="text-lg font-black text-[#F59E0B]">{clipCount}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Clips Found</div>
                          </div>
                        </div>
                      )}

                      {isFailed && job.error_message && (
                        <p
                          className="text-xs text-red-400 mb-3 px-3 py-2 rounded-lg"
                          style={{
                            background: "rgba(239,68,68,0.06)",
                            border: "1px solid rgba(239,68,68,0.15)",
                          }}
                        >
                          {job.error_message}
                        </p>
                      )}

                      {isActive && (
                        <p className="text-xs text-slate-500 mb-3">
                          Still processing — check back soon.
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        {isComplete && clipCount > 0 && (
                          <button
                            onClick={() => loadClips(job)}
                            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.01]"
                            style={{
                              background: "linear-gradient(135deg, #0055EE, #00A3FF)",
                              boxShadow: "0 0 20px rgba(0,120,255,0.3)",
                            }}
                          >
                            Load These Clips →
                          </button>
                        )}
                        {isFailed && (
                          <button
                            onClick={() => router.push("/ai-processing")}
                            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                            style={{ background: "linear-gradient(135deg, #0055EE, #00A3FF)" }}
                          >
                            Try Again →
                          </button>
                        )}
                        <button
                          onClick={() => router.push("/upload")}
                          className="flex-1 py-2.5 rounded-xl font-bold text-sm text-slate-400 transition-all hover:text-white"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.09)",
                          }}
                        >
                          Upload Manually
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Initial state hint */}
        {!searched && (
          <div className="text-center text-slate-600 text-sm mt-8">
            <p>Previously submitted a game film? Your clips are stored by email.</p>
            <p className="mt-1">
              New here?{" "}
              <button
                onClick={() => router.push("/start")}
                className="text-[#00A3FF] hover:underline"
              >
                Build your reel now →
              </button>
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
