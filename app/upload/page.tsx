"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const ArrowLeftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

const FilmIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#00A3FF"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const XIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const steps = [
  { label: "Upload Clips", number: 1 },
  { label: "Customize", number: 2 },
  { label: "Export", number: 3 },
];

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-[#0A1628] border border-[rgba(255,255,255,0.08)] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00A3FF]/60 transition-all";

const labelClass = "block text-sm font-semibold text-white mb-2";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [sport, setSport] = useState("");
  const [school, setSchool] = useState("");

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) =>
      ["video/mp4", "video/quicktime"].includes(f.type)
    );
    setFiles((prev) => {
      const combined = [...prev, ...valid];
      return combined.slice(0, 10);
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const canContinue = files.length > 0;

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      {/* ── NAV ── */}
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mr-6"
          aria-label="Go back"
        >
          <ArrowLeftIcon />
        </button>
        <span
          className="text-2xl font-black tracking-widest"
          style={{ color: "#00A3FF" }}
        >
          CLIPT
        </span>
      </nav>

      {/* ── PROGRESS BAR ── */}
      <div className="max-w-3xl mx-auto px-6 mb-10">
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const isActive = step.number === 1;
            const isLast = i === steps.length - 1;
            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step node */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all"
                    style={
                      isActive
                        ? {
                            background: "#00A3FF",
                            borderColor: "#00A3FF",
                            color: "#050A14",
                          }
                        : {
                            background: "#0A1628",
                            borderColor: "rgba(255,255,255,0.08)",
                            color: "#64748b",
                          }
                    }
                  >
                    {step.number}
                  </div>
                  <span
                    className="text-xs font-semibold whitespace-nowrap"
                    style={{ color: isActive ? "#00A3FF" : "#64748b" }}
                  >
                    {step.label}
                  </span>
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className="flex-1 h-px mx-2 mb-5"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-3xl mx-auto px-6 pb-12">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            Upload Your Clips
          </h1>
          <p className="text-slate-400 text-sm">
            Add up to 10 clips you want in your reel.
          </p>
        </div>

        {/* ── UPLOAD ZONE ── */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="rounded-xl p-10 flex flex-col items-center text-center transition-all cursor-pointer mb-3"
          style={{
            background: "#0A1628",
            border: `2px dashed ${dragging ? "#00A3FF" : "rgba(0,163,255,0.45)"}`,
            boxShadow: dragging
              ? "0 0 32px rgba(0,163,255,0.15)"
              : "none",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="mb-5">
            <FilmIcon />
          </div>
          <p className="text-white font-bold text-lg mb-2">
            Drag and drop your clips here
          </p>
          <p className="text-slate-400 text-sm mb-6">
            MP4 or MOV &bull; Up to 500MB each
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: "#00A3FF" }}
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul className="mb-8 flex flex-col gap-2">
            {files.map((file, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{
                  background: "#0A1628",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-sm text-white truncate mr-4">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-white transition-colors shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* ── FORM FIELDS ── */}
        <div className="flex flex-col gap-5 mb-8">
          {/* First Name */}
          <div>
            <label className={labelClass}>First Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Marcus"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* Jersey Number */}
          <div>
            <label className={labelClass}>Jersey Number</label>
            <input
              type="number"
              min={1}
              max={99}
              className={inputClass}
              placeholder="1–99"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
            />
          </div>

          {/* Sport */}
          <div>
            <label className={labelClass}>Sport</label>
            <select
              className={inputClass}
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              style={{ appearance: "none" }}
            >
              <option value="" disabled hidden>
                Select a sport
              </option>
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
            </select>
          </div>

          {/* School */}
          <div>
            <label className={labelClass}>School</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. St. Mark's School of Texas"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </div>
        </div>

        {/* ── CONTINUE BUTTON ── */}
        <button
          type="button"
          disabled={!canContinue}
          className="w-full py-4 rounded-xl font-bold text-base text-white transition-all"
          style={
            canContinue
              ? {
                  background: "#00A3FF",
                  cursor: "pointer",
                }
              : {
                  background: "rgba(255,255,255,0.06)",
                  color: "#64748b",
                  cursor: "not-allowed",
                  border: "1px solid rgba(255,255,255,0.08)",
                }
          }
        >
          Continue to Step 2 →
        </button>
      </main>
    </div>
  );
}
