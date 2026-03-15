"use client";

export interface TitleCardPreviewProps {
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  position: string;
  sport: string;
  school: string;
  gradYear: string;
  heightFt?: string;
  heightIn?: string;
  weight?: string;
  gpa?: string;
  email?: string;
  phone?: string;
  coachName?: string;
  coachEmail?: string;
  clubTeam?: string;
  location?: string;
  achievement?: string;
  socialHandle?: string;
  accentColor: string;
  // Up to 4 stats shown on right side (2×2 grid)
  statsData?: Record<string, string>;
}

// ── TitleCardPreview ──────────────────────────────────────────────────────────
//
// Pixel-for-pixel match of the Remotion title card layout.
// All positions are expressed as percentage of the 16:9 container — matching
// the exact x/y/width values used in ReelComposition.tsx.
//
// Left half (0–50%): athlete identity, left-anchored at x 8%
// Right half (52–100%): SEASON STATS + 2×2 stat grid
// Vertical divider: x 52%, y 25%–92%

export function TitleCardPreview({
  firstName,
  lastName,
  jerseyNumber,
  position,
  sport,
  school,
  gradYear,
  heightFt,
  heightIn,
  weight,
  gpa,
  email,
  phone,
  accentColor,
  statsData,
}: TitleCardPreviewProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ").toUpperCase() || "YOUR NAME";
  const subLine = [position, sport].filter(Boolean).join(" · ").toUpperCase() || "POSITION · SPORT";

  const heightStr = heightFt ? `${heightFt}'${heightIn || "0"}"` : "";
  const weightStr = weight ? `${weight} lbs` : "";
  const heightWeight = [heightStr, weightStr].filter(Boolean).join(" — ");

  const gpaNum = parseFloat(gpa || "");
  const showGpa = gpa && !isNaN(gpaNum) && gpaNum >= 3.0;

  const gradGpaLine = [
    gradYear ? `Class of ${gradYear}` : null,
    showGpa  ? `GPA ${gpa}`           : null,
  ].filter(Boolean).join("  ·  ");

  // Up to 4 filled stats for the right-side 2×2 grid
  const statEntries = statsData
    ? Object.entries(statsData).filter(([, v]) => v?.trim()).slice(0, 4)
    : [];

  // Stat positions match Remotion layout exactly (% of full 1920×1080 frame):
  //   Top-left  value: x 63%, y 45%  — label: y 53%
  //   Top-right value: x 83%, y 45%  — label: y 53%
  //   Bot-left  value: x 63%, y 65%  — label: y 73%
  //   Bot-right value: x 83%, y 65%  — label: y 73%
  const statPositions = [
    { left: "63%", valTop: "45%", lblTop: "53%" },
    { left: "83%", valTop: "45%", lblTop: "53%" },
    { left: "63%", valTop: "65%", lblTop: "73%" },
    { left: "83%", valTop: "65%", lblTop: "73%" },
  ];

  return (
    <div style={{
      aspectRatio: "16/9",
      background: "#050A14",
      borderRadius: 10,
      overflow: "hidden",
      position: "relative",
      fontFamily: "Inter, sans-serif",
      border: `1px solid ${accentColor}25`,
    }}>
      {/* Top accent bar — matches Remotion 20px / 1080 ≈ 1.85% */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.85%", background: accentColor }} />
      {/* Bottom accent bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1.85%", background: accentColor }} />

      {/* Vertical divider — x 52%, spanning y 25%–92% */}
      <div style={{
        position: "absolute",
        left: "52%",
        top: "25%",
        bottom: "8%",          // 100% − 92% = 8% from bottom
        width: 1,
        background: "#1E2530",
      }} />

      {/* ── LEFT HALF: athlete identity ────────────────────────────────────── */}

      {/* Jersey # decoration — faint texture, x 8%, y 35%, opacity 0.15 */}
      {jerseyNumber && (
        <div style={{
          position: "absolute",
          left: "8%",
          top: "35%",
          transform: "translateY(-50%)",
          fontSize: "clamp(18px, 9vw, 78px)",
          fontWeight: 900,
          color: accentColor,
          opacity: 0.15,
          fontFamily: "Oswald, sans-serif",
          lineHeight: 1,
          pointerEvents: "none",
          userSelect: "none" as const,
        }}>
          #{jerseyNumber}
        </div>
      )}

      {/* Athlete full name — x 8%, y 38%, Oswald bold white */}
      <div style={{
        position: "absolute",
        left: "8%",
        top: "38%",
        transform: "translateY(-50%)",
        width: "44%",
        fontSize: "clamp(7px, 2vw, 18px)",
        fontWeight: 700,
        color: "#FFFFFF",
        fontFamily: "Oswald, sans-serif",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {name}
      </div>

      {/* Position · Sport — x 8%, y 52%, Montserrat, accentColor, uppercase */}
      <div style={{
        position: "absolute",
        left: "8%",
        top: "52%",
        transform: "translateY(-50%)",
        width: "44%",
        fontSize: "clamp(4px, 1vw, 9px)",
        color: accentColor,
        fontFamily: "Montserrat, Inter, sans-serif",
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {subLine}
      </div>

      {/* School — x 8%, y 61%, Montserrat, white */}
      {school && (
        <div style={{
          position: "absolute",
          left: "8%",
          top: "61%",
          transform: "translateY(-50%)",
          width: "44%",
          fontSize: "clamp(4px, 0.9vw, 8px)",
          color: "#FFFFFF",
          fontFamily: "Montserrat, Inter, sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {school}
        </div>
      )}

      {/* Grad year + GPA — x 8%, y 69%, #9CA3AF */}
      {gradGpaLine && (
        <div style={{
          position: "absolute",
          left: "8%",
          top: "69%",
          transform: "translateY(-50%)",
          width: "44%",
          fontSize: "clamp(3px, 0.8vw, 7px)",
          color: "#9CA3AF",
          fontFamily: "Montserrat, Inter, sans-serif",
        }}>
          {gradGpaLine}
        </div>
      )}

      {/* Height + Weight — x 8%, y 76%, #9CA3AF */}
      {heightWeight && (
        <div style={{
          position: "absolute",
          left: "8%",
          top: "76%",
          transform: "translateY(-50%)",
          width: "44%",
          fontSize: "clamp(3px, 0.8vw, 7px)",
          color: "#9CA3AF",
          fontFamily: "Montserrat, Inter, sans-serif",
        }}>
          {heightWeight}
        </div>
      )}

      {/* Email — x 8%, y 84%, accentColor */}
      {email && (
        <div style={{
          position: "absolute",
          left: "8%",
          top: "84%",
          transform: "translateY(-50%)",
          width: "44%",
          fontSize: "clamp(3px, 0.75vw, 7px)",
          color: accentColor,
          fontFamily: "Montserrat, Inter, sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {email}
        </div>
      )}

      {/* Phone — x 8%, y 91%, white */}
      {phone && (
        <div style={{
          position: "absolute",
          left: "8%",
          top: "91%",
          transform: "translateY(-50%)",
          width: "44%",
          fontSize: "clamp(3px, 0.75vw, 7px)",
          color: "#FFFFFF",
          fontFamily: "Montserrat, Inter, sans-serif",
        }}>
          {phone}
        </div>
      )}

      {/* ── RIGHT HALF: season stats ────────────────────────────────────────── */}
      {statEntries.length > 0 && (
        <>
          {/* SEASON STATS label — x 74% (centered), y 32% */}
          <div style={{
            position: "absolute",
            left: "74%",
            top: "32%",
            transform: "translate(-50%, -50%)",
            textAlign: "center" as const,
            fontSize: "clamp(3px, 0.7vw, 6px)",
            color: accentColor,
            fontFamily: "Montserrat, Inter, sans-serif",
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}>
            SEASON STATS
          </div>

          {/* Stat cells — positioned at Remotion x/y coordinates */}
          {statEntries.map(([label, value], idx) => {
            const pos = statPositions[idx];
            if (!pos) return null;
            return (
              <div key={label}>
                {/* Stat value — Oswald bold, accentColor */}
                <div style={{
                  position: "absolute",
                  left: pos.left,
                  top: pos.valTop,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center" as const,
                  fontSize: "clamp(5px, 1.5vw, 13px)",
                  fontWeight: 900,
                  color: accentColor,
                  fontFamily: "Oswald, sans-serif",
                  lineHeight: 1,
                }}>
                  {value}
                </div>
                {/* Stat label — Montserrat, #9CA3AF, uppercase */}
                <div style={{
                  position: "absolute",
                  left: pos.left,
                  top: pos.lblTop,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center" as const,
                  fontSize: "clamp(2.5px, 0.6vw, 5px)",
                  color: "#9CA3AF",
                  fontFamily: "Montserrat, Inter, sans-serif",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}>
                  {label}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* CLIPT watermark — centered at bottom */}
      <div style={{
        position: "absolute",
        bottom: "3%",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "clamp(3px, 0.6vw, 5px)",
        color: "#334155",
        fontWeight: 700,
        letterSpacing: "0.1em",
        whiteSpace: "nowrap",
      }}>
        POWERED BY CLIPT
      </div>
    </div>
  );
}
