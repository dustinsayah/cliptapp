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
}

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
  coachName,
  coachEmail,
  clubTeam,
  location,
  achievement,
  socialHandle,
  accentColor,
}: TitleCardPreviewProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ").toUpperCase() || "YOUR NAME";
  const subLine = [position, sport].filter(Boolean).join("  ·  ").toUpperCase() || "POSITION · SPORT";
  const heightStr = heightFt ? `${heightFt}'${heightIn || "0"}"` : "";
  const weightStr = weight ? `${weight} lbs` : "";
  const heightWeight = [heightStr, weightStr].filter(Boolean).join(" · ");
  const gpaNum = parseFloat(gpa || "");
  const showGpa = gpa && !isNaN(gpaNum) && gpaNum >= 3.0;

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
      {/* Top accent stripe — 1.5% */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.5%", background: accentColor }} />
      {/* Bottom accent stripe — 1.5% */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1.5%", background: accentColor }} />

      {/* Jersey # watermark — faint large background (falls back to sport text) */}
      {(jerseyNumber || sport) && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: jerseyNumber ? "clamp(40px,18vw,160px)" : "clamp(30px,12vw,100px)", fontWeight: 900,
          color: "#FFFFFF", opacity: 0.03,
          pointerEvents: "none", userSelect: "none" as const,
          fontFamily: "Oswald, sans-serif",
        }}>
          {jerseyNumber ? `#${jerseyNumber}` : sport.toUpperCase()}
        </div>
      )}

      {/* Content — vertical stack */}
      <div style={{
        position: "absolute", inset: "4% 8%",
        display: "flex", flexDirection: "column" as const,
        alignItems: "center", justifyContent: "center",
        gap: "1.5%", overflow: "hidden",
      }}>
        {achievement && (
          <div style={{ fontSize: "clamp(4px, 1vw, 9px)", color: accentColor, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", textAlign: "center" as const }}>
            {achievement}
          </div>
        )}

        <div style={{ fontSize: "clamp(12px, 3vw, 28px)", fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.02em", textTransform: "uppercase" as const, fontFamily: "Oswald, sans-serif", textAlign: "center" as const }}>
          {name}
        </div>

        {jerseyNumber && (
          <div style={{ fontSize: "clamp(12px, 3vw, 28px)", fontWeight: 900, color: accentColor, fontFamily: "Oswald, sans-serif", lineHeight: 1 }}>
            #{jerseyNumber}
          </div>
        )}

        <div style={{ width: "50%", height: 1, background: accentColor, opacity: 0.3 }} />

        <div style={{ fontSize: "clamp(5px, 1.2vw, 11px)", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.08em", textAlign: "center" as const }}>
          {subLine}
        </div>

        {school && (
          <div style={{ fontSize: "clamp(4px, 1vw, 9px)", color: "#FFFFFF", textTransform: "uppercase" as const, letterSpacing: "0.06em", textAlign: "center" as const }}>
            {school}{gradYear ? ` · Class of ${gradYear}` : ""}
          </div>
        )}

        {clubTeam && (
          <div style={{ fontSize: "clamp(4px, 0.9vw, 8px)", color: "#64748b", textAlign: "center" as const }}>
            {clubTeam}
          </div>
        )}

        {location && (
          <div style={{ fontSize: "clamp(4px, 0.9vw, 8px)", color: "#64748b", textAlign: "center" as const }}>
            {location}
          </div>
        )}

        {heightWeight && (
          <div style={{ fontSize: "clamp(4px, 0.9vw, 8px)", color: "#94a3b8", textAlign: "center" as const }}>
            {heightWeight}
          </div>
        )}

        {showGpa && (
          <div style={{ fontSize: "clamp(4px, 0.9vw, 8px)", color: "#FFFFFF", textAlign: "center" as const }}>
            GPA {gpa}
          </div>
        )}

        {(email || socialHandle) && (
          <div style={{ display: "flex", gap: "4%", flexWrap: "wrap" as const, justifyContent: "center" as const }}>
            {email && <div style={{ fontSize: "clamp(3px, 0.8vw, 7px)", color: accentColor }}>{email}</div>}
            {socialHandle && <div style={{ fontSize: "clamp(3px, 0.8vw, 7px)", color: accentColor }}>{socialHandle}</div>}
          </div>
        )}

        {phone && (
          <div style={{ fontSize: "clamp(3px, 0.8vw, 7px)", color: "#64748b", textAlign: "center" as const }}>
            {phone}
          </div>
        )}

        {(coachName || coachEmail) && (
          <div style={{ fontSize: "clamp(3px, 0.8vw, 7px)", color: "#64748b", textAlign: "center" as const }}>
            Coach: {[coachName, coachEmail].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {/* CLIPT watermark */}
      <div style={{ position: "absolute", bottom: "3%", right: "3%", fontSize: "clamp(4px,0.8vw,7px)", color: "#334155", fontWeight: 700, letterSpacing: "0.1em" }}>
        CLIPT
      </div>
    </div>
  );
}
