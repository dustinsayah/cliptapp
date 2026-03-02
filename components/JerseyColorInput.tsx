"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Fallback color when field is empty or value cannot be parsed
const FALLBACK_HEX = "#6B7280";

// ── Comprehensive color map ───────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  // Reds
  red: "#DC2626",
  crimson: "#9B1C1C",
  maroon: "#7F1D1D",
  scarlet: "#FF2400",
  "dark red": "#7F1D1D",
  "bright red": "#DC2626",
  burgundy: "#800020",
  cardinal: "#C41E3A",
  "cherry red": "#DC143C",

  // Blues
  "royal blue": "#1E40AF",
  royal: "#1E40AF",
  navy: "#1E3A5F",
  "navy blue": "#1E3A5F",
  "light blue": "#38BDF8",
  "sky blue": "#0EA5E9",
  "carolina blue": "#4B9CD3",
  "columbia blue": "#75B2DD",
  cobalt: "#0047AB",
  "cobalt blue": "#0047AB",
  blue: "#2563EB",
  "dark blue": "#1E3A5F",
  "powder blue": "#B0D4E8",
  "baby blue": "#89CFF0",
  "slate blue": "#6A7BB5",
  dodger: "#1E90FF",
  "dodger blue": "#1E90FF",
  indigo: "#4338CA",
  "electric blue": "#0050D0",
  "french blue": "#0072BB",
  "true blue": "#0073CF",
  "persian blue": "#1C39BB",
  aquamarine: "#7FFFD4",
  "medium blue": "#0000CD",

  // Blacks / Grays / Whites
  black: "#111827",
  "jet black": "#111827",
  "matte black": "#1C1C1C",
  white: "#FFFFFF",
  gray: "#6B7280",
  grey: "#6B7280",
  silver: "#94A3B8",
  charcoal: "#374151",
  "dark gray": "#374151",
  "dark grey": "#374151",
  "light gray": "#9CA3AF",
  "light grey": "#9CA3AF",
  "slate gray": "#708090",
  "slate grey": "#708090",
  ash: "#B2BEB5",
  graphite: "#474747",
  "heather gray": "#A0A0A0",
  "heather grey": "#A0A0A0",

  // Greens
  green: "#16A34A",
  "forest green": "#166534",
  forest: "#166534",
  "kelly green": "#4ADE80",
  kelly: "#4ADE80",
  "dark green": "#14532D",
  "lime green": "#65A30D",
  lime: "#84CC16",
  "hunter green": "#355E3B",
  hunter: "#355E3B",
  "olive green": "#6B7C45",
  olive: "#808000",
  emerald: "#059669",
  mint: "#3EB489",
  "bright green": "#39FF14",
  teal: "#0D9488",
  "midnight green": "#004953",
  "pine green": "#01796F",
  "sage green": "#77815C",

  // Oranges
  orange: "#EA580C",
  "burnt orange": "#BF5700",
  "dark orange": "#BF5700",
  "bright orange": "#FF6700",
  "safety orange": "#FF6700",
  tangerine: "#F28500",
  "tennessee orange": "#FF8200",
  "clemson orange": "#F66733",

  // Golds / Yellows
  gold: "#D97706",
  yellow: "#CA8A04",
  "vegas gold": "#C5A028",
  "old gold": "#CFB53B",
  "dark gold": "#B8860B",
  "bright gold": "#FFD700",
  amber: "#F59E0B",
  "maize and blue": "#FFCB05",
  maize: "#FFCB05",
  "antique gold": "#B8860B",
  "metallic gold": "#D4AF37",
  "athletic gold": "#FFBC00",

  // Purples
  purple: "#7C3AED",
  violet: "#6D28D9",
  lavender: "#A78BFA",
  "dark purple": "#4C1D95",
  "light purple": "#9333EA",
  plum: "#673147",
  eggplant: "#614051",
  grape: "#6F2DA8",
  "royal purple": "#7851A9",
  orchid: "#DA70D6",
  "deep purple": "#4C1D95",
  amethyst: "#9966CC",

  // Pinks
  pink: "#EC4899",
  "hot pink": "#DB2777",
  "light pink": "#F9A8D4",
  magenta: "#FF00FF",
  fuchsia: "#FF0090",
  rose: "#FB7185",

  // Browns / Tans
  brown: "#92400E",
  tan: "#D4A574",
  copper: "#B87333",
  bronze: "#CD7F32",
  caramel: "#C68642",
  chocolate: "#7B3F00",
  khaki: "#C3B091",
  sand: "#C2B280",
  mocha: "#967969",

  // Turquoise / Teals
  turquoise: "#0891B2",
  aqua: "#00B5AD",
  cyan: "#06B6D4",
  "dark teal": "#005F60",
  "light teal": "#5EEAD4",

  // Misc
  "columbia gold": "#B3A369",
  cream: "#FFFDD0",
  ivory: "#FFFFF0",
};

// Alternative aliases for common misspellings/abbreviations
const ALIASES: Record<string, string> = {
  "dk blue": "dark blue",
  "lt blue": "light blue",
  "dk green": "dark green",
  "lt green": "light green",
  "dk red": "dark red",
  "dk gray": "dark gray",
  "dk grey": "dark grey",
  "lt gray": "light gray",
  "lt grey": "light grey",
  "dk purple": "dark purple",
  "dk orange": "dark orange",
  nvy: "navy",
  roy: "royal blue",
  "roy blue": "royal blue",
  pur: "purple",
  grn: "green",
  blk: "black",
  wht: "white",
  gld: "gold",
  org: "orange",
  "lite blue": "light blue",
  "lite green": "light green",
  "dk bl": "dark blue",
};

function resolveAlias(input: string): string {
  return ALIASES[input] ?? input;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  try {
    if (!hex || typeof hex !== "string") return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : null;
  } catch {
    return null;
  }
}

function isValidHex(str: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(str);
}

// Returns a hex string — FALLBACK_HEX for empty input, null for no match
function textToHex(text: string | null | undefined): string | null {
  try {
    const clean = (text ?? "").trim().toLowerCase();
    if (!clean) return FALLBACK_HEX;

    // Direct hex input
    if (/^#[0-9a-f]{6}$/i.test(clean)) return clean.toUpperCase();
    if (/^[0-9a-f]{6}$/i.test(clean)) return `#${clean.toUpperCase()}`;

    // Alias resolution
    const resolved = resolveAlias(clean);

    // Exact match
    if (COLOR_MAP[resolved]) return COLOR_MAP[resolved];
    if (COLOR_MAP[clean]) return COLOR_MAP[clean];

    // Partial/fuzzy match
    const matches = fuzzyMatches(clean);
    if (matches.length > 0) return COLOR_MAP[matches[0].name];

    return null;
  } catch {
    return FALLBACK_HEX;
  }
}

interface ColorMatch {
  name: string;
  hex: string;
  score: number;
}

function fuzzyMatches(input: string): ColorMatch[] {
  try {
    const clean = resolveAlias((input ?? "").trim().toLowerCase());
    if (!clean) return [];

    const results: ColorMatch[] = [];

    for (const [name, hex] of Object.entries(COLOR_MAP)) {
      if (name === clean) {
        results.push({ name, hex, score: 100 });
        continue;
      }
      if (name.startsWith(clean)) {
        results.push({ name, hex, score: 90 - (name.length - clean.length) });
        continue;
      }
      if (name.includes(clean)) {
        results.push({ name, hex, score: 70 - (name.length - clean.length) });
        continue;
      }
      const words = name.split(" ");
      for (const word of words) {
        if (word.startsWith(clean)) {
          results.push({ name, hex, score: 60 - Math.abs(word.length - clean.length) });
          break;
        }
      }
    }

    const seen = new Set<string>();
    const unique: ColorMatch[] = [];
    for (const m of results.sort((a, b) => b.score - a.score)) {
      if (!seen.has(m.name)) {
        seen.add(m.name);
        unique.push(m);
      }
    }
    return unique.slice(0, 4);
  } catch {
    return [];
  }
}

// ── Component Props ───────────────────────────────────────────────────────
interface JerseyColorInputProps {
  value: string;        // hex value stored externally
  onChange: (hex: string) => void;
  label?: string;
  required?: boolean;
}

export default function JerseyColorInput({ value, onChange, label = "Jersey Color", required = false }: JerseyColorInputProps) {
  const [text, setText] = useState<string>(() => {
    try {
      if (!value || !value.trim()) return "";
      const entry = Object.entries(COLOR_MAP).find(([, h]) => h.toLowerCase() === value.toLowerCase());
      return entry ? capitalize(entry[0]) : value;
    } catch {
      return "";
    }
  });

  const [suggestions, setSuggestions]   = useState<ColorMatch[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [detectedHex, setDetectedHex]   = useState<string | null>(() => {
    try {
      return (value && isValidHex(value)) ? value : null;
    } catch {
      return null;
    }
  });

  // Stable outer container ref — never changes
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  function capitalize(s: string): string {
    return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Whether the dropdown should actually be visible
  const dropdownVisible = showDropdown && text.trim().length > 0 && suggestions.length > 0;

  const handleTextChange = useCallback((raw: string) => {
    // Entire handler wrapped in try/catch — never throws
    try {
      setText(raw);

      const clean = (raw ?? "").trim().toLowerCase();

      if (!clean) {
        setSuggestions([]);
        setDetectedHex(null);
        setShowDropdown(false);
        onChange(FALLBACK_HEX);
        return;
      }

      // Direct hex input
      if (isValidHex(raw.trim()) || /^[0-9a-f]{6}$/i.test(raw.trim())) {
        const hex = isValidHex(raw.trim()) ? raw.trim().toUpperCase() : `#${raw.trim().toUpperCase()}`;
        setDetectedHex(hex);
        setSuggestions([]);
        setShowDropdown(false);
        onChange(hex);
        return;
      }

      // Name/alias lookup
      const hex = textToHex(clean);
      setDetectedHex(hex);
      if (hex) onChange(hex);

      const matches = fuzzyMatches(clean);
      setSuggestions(matches);
      setShowDropdown(matches.length > 0);

    } catch {
      setSuggestions([]);
      setDetectedHex(null);
      setShowDropdown(false);
      onChange(FALLBACK_HEX);
    }
  }, [onChange]);

  const selectSuggestion = useCallback((match: ColorMatch) => {
    try {
      setText(capitalize(match.name));
      setDetectedHex(match.hex);
      setSuggestions([]);
      setShowDropdown(false);
      onChange(match.hex);
    } catch {
      onChange(FALLBACK_HEX);
    }
  }, [onChange]);

  // Close dropdown on outside click — no direct DOM manipulation, just state
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Safe derived values ───────────────────────────────────────────────────
  const swatchColor = (() => {
    try {
      return (!detectedHex || !detectedHex.trim()) ? FALLBACK_HEX : detectedHex;
    } catch {
      return FALLBACK_HEX;
    }
  })();

  const boxShadow = (() => {
    try {
      return detectedHex ? `0 0 12px ${swatchColor}55` : "none";
    } catch {
      return "none";
    }
  })();

  // ── Single stable outer div — never unmounts ─────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-white mb-2">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Input + swatch row */}
      <div className="flex items-center gap-2">
        {/* Color swatch — always renders with a valid background color */}
        <div
          className="shrink-0 rounded-xl transition-all"
          style={{
            width: 44,
            height: 44,
            background: swatchColor,
            border: detectedHex
              ? "2px solid rgba(255,255,255,0.25)"
              : "2px solid rgba(255,255,255,0.08)",
            boxShadow,
          }}
          aria-label={`Color preview: ${detectedHex ?? "none selected"}`}
        />

        {/* Text input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onFocus={() => {
              if (text.trim() && suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Type your jersey color (e.g. royal blue, red, black)"
            className="w-full px-4 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
            style={{
              height: 44,
              background: "#0A1628",
              border: `1px solid ${detectedHex ? "rgba(0,163,255,0.4)" : "rgba(255,255,255,0.08)"}`,
              fontSize: 14,
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Hex display */}
      <p className="text-xs mt-1.5 ml-1" style={{ color: "#64748b" }}>
        {detectedHex
          ? <><span>Detected: </span><span className="font-mono" style={{ color: "#94a3b8" }}>{detectedHex}</span></>
          : "Type a color name above"
        }
      </p>

      {/*
        Dropdown — ALWAYS rendered in the DOM, visibility controlled by CSS only.
        Never conditionally mount/unmount — that causes removeChild reconciliation crashes.
      */}
      <div
        className="absolute left-0 right-0 rounded-xl z-50 overflow-hidden"
        style={{
          display: dropdownVisible ? "block" : "none",
          top: "calc(100% - 12px)",
          background: "#0A1628",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {suggestions.map((match) => (
          <button
            key={match.name}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(match); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
          >
            <div
              className="shrink-0 rounded-md border border-white/15"
              style={{
                width: 28,
                height: 28,
                background: match.hex || FALLBACK_HEX,
                flexShrink: 0,
              }}
            />
            <span className="text-white">{capitalize(match.name)}</span>
            <span className="ml-auto font-mono text-xs text-slate-500">{match.hex}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
