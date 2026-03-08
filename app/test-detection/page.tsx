"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Detection {
  timestamp?: number;
  confidence?: number;
  bbox?: {
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  };
  [key: string]: unknown;
}

interface Results {
  detections: Detection[];
  elapsed: string;
}

// ── Icons ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function confidenceColor(conf: number): string {
  if (conf >= 75) return "#22c55e";
  if (conf >= 50) return "#eab308";
  return "#ef4444";
}

function calcCenter(bbox: Detection["bbox"]): { cx: number; cy: number } | null {
  if (!bbox) return null;
  const x1 = bbox.x1 ?? 0;
  const y1 = bbox.y1 ?? 0;
  const x2 = bbox.x2 ?? 0;
  const y2 = bbox.y2 ?? 0;
  return { cx: Math.round((x1 + x2) / 2), cy: Math.round((y1 + y2) / 2) };
}

// ── Input style ────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "#050A14",
  border: "1px solid #1E2530",
  color: "#fff",
  fontSize: 14,
  borderRadius: 8,
  padding: "10px 14px",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  display: "block",
  color: "#9CA3AF",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function TestDetectionPage() {
  const ACCENT = "#00A3FF";

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [jerseyColor, setJerseyColor] = useState("");
  const [sport, setSport] = useState("basketball");
  const [position, setPosition] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rawResponse = useRef<unknown>(null);

  // Persist API URL
  useEffect(() => {
    const saved = localStorage.getItem("detection_api_url");
    if (saved) setApiBaseUrl(saved);
  }, []);

  useEffect(() => {
    if (apiBaseUrl) localStorage.setItem("detection_api_url", apiBaseUrl);
  }, [apiBaseUrl]);

  // Timer
  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const requestBody = {
    videoUrl,
    jerseyNumber: Number(jerseyNumber),
    jerseyColor,
    sport,
    ...(position ? { position } : {}),
  };

  const runDetection = async () => {
    setLoading(true);
    setResults(null);
    setError(null);
    rawResponse.current = null;
    const startTime = Date.now();

    try {
      const response = await fetch('/api/detect-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiBaseUrl,
          videoUrl,
          jerseyNumber: Number(jerseyNumber),
          jerseyColor,
          sport,
          position: position || undefined
        })
      });

      const data: unknown = await response.json();
      rawResponse.current = data;
      const elapsedStr = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!response.ok) {
        const errData = data as { error?: string };
        setError(errData.error ?? "Unknown error");
      } else {
        const detections = Array.isArray(data) ? (data as Detection[]) : [];
        setResults({ detections, elapsed: elapsedStr });
      }
    } catch {
      setError("Network error — is the API running and is the base URL correct?");
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(rawResponse.current, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(
      `POST ${apiBaseUrl}/detect\n${JSON.stringify(requestBody, null, 2)}`
    );
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const clearResults = () => {
    setResults(null);
    setError(null);
    rawResponse.current = null;
  };

  const canRun = apiBaseUrl.trim() && videoUrl.trim() && jerseyNumber !== "" && jerseyColor.trim();

  // Stats
  const bestConf =
    results && results.detections.length > 0
      ? Math.max(...results.detections.map((d) => (d.confidence ?? 0) * 100))
      : null;
  const avgConf =
    results && results.detections.length > 0
      ? results.detections.reduce((sum, d) => sum + (d.confidence ?? 0) * 100, 0) /
        results.detections.length
      : null;

  return (
    <div style={{ background: "#050A14", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: 0 }}>
            Jersey Detection Tester
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, margin: "6px 0 0" }}>
            Internal tool — test Ali&apos;s API against real game footage
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: "#0D1117",
            border: "1px solid #1E2530",
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
          }}
        >
          {/* API Base URL */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>API Base URL</label>
            <input
              style={INPUT}
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://your-app.up.railway.app"
            />
          </div>

          {/* Video URL */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Video URL</label>
            <input
              style={INPUT}
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste Cloudinary URL or direct video URL"
            />
            <p style={{ color: "#6B7280", fontSize: 12, margin: "6px 0 0" }}>
              Use a direct video URL (Cloudinary, MP4 link) — YouTube URLs are not supported
            </p>
          </div>

          {/* Jersey Number + Jersey Color */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={LABEL}>Jersey Number</label>
              <input
                style={INPUT}
                type="number"
                min={0}
                max={99}
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="23"
              />
            </div>
            <div>
              <label style={LABEL}>Jersey Color</label>
              <input
                style={INPUT}
                type="text"
                value={jerseyColor}
                onChange={(e) => setJerseyColor(e.target.value)}
                placeholder="e.g. white, red, navy blue"
              />
            </div>
          </div>

          {/* Sport + Position */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={LABEL}>Sport</label>
              <select
                style={{ ...INPUT, cursor: "pointer" }}
                value={sport}
                onChange={(e) => setSport(e.target.value)}
              >
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
                <option value="lacrosse">Lacrosse</option>
              </select>
            </div>
            <div>
              <label style={LABEL}>Position</label>
              <input
                style={INPUT}
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. guard, quarterback (optional)"
              />
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={runDetection}
            disabled={loading || !canRun}
            style={{
              width: "100%",
              background: canRun && !loading ? ACCENT : "#1E2530",
              color: canRun && !loading ? "#fff" : "#4B5563",
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 12,
              padding: "14px 0",
              border: "none",
              cursor: canRun && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "background 0.2s",
            }}
          >
            {loading ? (
              <>
                <Spinner />
                Running...
              </>
            ) : (
              "Run Detection →"
            )}
          </button>
        </div>

        {/* Video preview */}
        {videoUrl.trim() && (
          <video
            src={videoUrl}
            controls
            style={{ width: "100%", borderRadius: 12, marginBottom: 20, background: "#000" }}
          />
        )}

        {/* Loading state */}
        {loading && (
          <div
            style={{
              background: "#0D1117",
              border: "1px solid #1E2530",
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}
          >
            {/* Indeterminate progress bar */}
            <div
              style={{
                height: 4,
                background: "#1E2530",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: ACCENT,
                  borderRadius: 4,
                  animation: "indeterminate 1.5s ease-in-out infinite",
                }}
              />
            </div>
            <style>{`
              @keyframes indeterminate {
                0% { width: 0%; margin-left: 0%; }
                50% { width: 60%; margin-left: 20%; }
                100% { width: 0%; margin-left: 100%; }
              }
            `}</style>
            <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>
              Processing video...
            </p>
            <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 12px" }}>
              This can take 2-5 minutes for long game footage
            </p>
            <p style={{ color: ACCENT, fontSize: 14, margin: "0 0 6px" }}>
              Elapsed: {formatTime(elapsed)}
            </p>
            <p style={{ color: "#f97316", fontSize: 12, margin: 0 }}>Do not close this tab</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#1a0a0a",
              border: "1px solid #7f1d1d",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              color: "#fca5a5",
              fontSize: 14,
            }}
          >
            <strong style={{ color: "#ef4444" }}>Error: </strong>
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div
            style={{
              background: "#0D1117",
              border: "1px solid #1E2530",
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}
          >
            {/* Summary */}
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                marginBottom: 24,
                paddingBottom: 20,
                borderBottom: "1px solid #1E2530",
              }}
            >
              {[
                { label: "Total Detections", value: results.detections.length },
                {
                  label: "Best Confidence",
                  value: bestConf !== null ? `${bestConf.toFixed(0)}%` : "—",
                },
                {
                  label: "Avg Confidence",
                  value: avgConf !== null ? `${avgConf.toFixed(0)}%` : "—",
                },
                { label: "Time", value: `${results.elapsed}s` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ color: "#6B7280", fontSize: 12, marginBottom: 2 }}>{label}</div>
                  <div style={{ color: ACCENT, fontSize: 18, fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Detection cards */}
            {results.detections.length === 0 ? (
              <div
                style={{
                  background: "#1a1000",
                  border: "1px solid #92400e",
                  borderRadius: 10,
                  padding: 16,
                  color: "#fbbf24",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                No detections found. Try adjusting jersey color description or number.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {results.detections.map((det, i) => {
                  const conf = (det.confidence ?? 0) * 100;
                  const center = calcCenter(det.bbox);
                  return (
                    <div
                      key={i}
                      style={{
                        background: "#050A14",
                        border: "1px solid #1E2530",
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                        Detection #{i + 1}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                        {det.timestamp !== undefined && (
                          <div>
                            <span style={{ color: "#6B7280" }}>Timestamp: </span>
                            <span style={{ color: "#fff" }}>{det.timestamp}s</span>
                          </div>
                        )}
                        <div>
                          <span style={{ color: "#6B7280" }}>Confidence: </span>
                          <span style={{ color: confidenceColor(conf), fontWeight: 700 }}>
                            {conf.toFixed(0)}%
                          </span>
                        </div>
                        {det.bbox && (
                          <div>
                            <span style={{ color: "#6B7280" }}>Bbox pixels: </span>
                            <span style={{ color: "#fff" }}>
                              x1:{det.bbox.x1 ?? "?"} y1:{det.bbox.y1 ?? "?"} x2:{det.bbox.x2 ?? "?"} y2:
                              {det.bbox.y2 ?? "?"}
                            </span>
                          </div>
                        )}
                        {center && (
                          <>
                            <div>
                              <span style={{ color: "#6B7280" }}>Center: </span>
                              <span style={{ color: "#fff" }}>
                                x:{center.cx}px y:{center.cy}px
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "#6B7280" }}>Estimated %: </span>
                              <span style={{ color: "#fff" }}>
                                x:{((center.cx / 1920) * 100).toFixed(0)}% y:
                                {((center.cy / 1080) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={copyJson}
                style={{
                  background: "#1E2530",
                  color: copied ? "#22c55e" : "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {copied ? "Copied ✓" : "Copy Full JSON"}
              </button>
              <button
                onClick={clearResults}
                style={{
                  background: "transparent",
                  color: "#6B7280",
                  border: "1px solid #1E2530",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Clear Results
              </button>
            </div>
          </div>
        )}

        {/* Request log */}
        {(results || error) && (
          <div
            style={{
              background: "#0D1117",
              border: "1px solid #1E2530",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setReqOpen((o) => !o)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#9CA3AF",
                fontSize: 14,
                padding: "14px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Request Details</span>
              <ChevronDown open={reqOpen} />
            </button>
            {reqOpen && (
              <div style={{ borderTop: "1px solid #1E2530", padding: 20 }}>
                <pre
                  style={{
                    background: "#050A14",
                    border: "1px solid #1E2530",
                    borderRadius: 8,
                    padding: 16,
                    color: "#e2e8f0",
                    fontSize: 12,
                    fontFamily: "monospace",
                    overflowX: "auto",
                    margin: 0,
                  }}
                >
                  {`POST ${apiBaseUrl}/detect\n${JSON.stringify(requestBody, null, 2)}`}
                </pre>
                <button
                  onClick={copyCode}
                  style={{
                    marginTop: 10,
                    background: "#1E2530",
                    color: codeCopied ? "#22c55e" : "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {codeCopied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
