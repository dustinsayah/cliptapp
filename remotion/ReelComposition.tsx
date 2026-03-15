import React from 'react'
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import type { ReelCompositionProps, ClipInput } from './types'

// ── Timing constants ────────────────────────────────────────────────────────
export const TITLE_FRAMES = 6 * 30   // 6s
export const STATS_FRAMES = 5 * 30   // 5s
export const END_FRAMES   = 5 * 30   // 5s
const FPS = 30

export function calcClipFrames(clip: ClipInput): number {
  if (clip.trimDuration != null) return Math.round(clip.trimDuration * FPS)
  const s = clip.trimStart ?? 0
  const e = clip.trimEnd   ?? (clip.duration ?? 10)
  return Math.round(Math.max(e - s, 1) * FPS)
}

export function calcTotalFrames(props: ReelCompositionProps): number {
  const statsFrames = Object.values(props.statsData ?? {}).some(v => v?.trim())
    ? STATS_FRAMES : 0
  const clipsFrames = (props.clips ?? []).reduce(
    (sum, c) => sum + calcClipFrames(c), 0
  )
  return TITLE_FRAMES + statsFrames + clipsFrames + END_FRAMES
}

// ── Dark background color ───────────────────────────────────────────────────
const BG = '#050A14'

// ── Shared accent bar ───────────────────────────────────────────────────────
function AccentBars({ accent, h }: { accent: string; h: number }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, background: accent }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: accent }} />
    </>
  )
}

// ── Title Card ──────────────────────────────────────────────────────────────
function TitleCard({ props, w, h }: { props: ReelCompositionProps; w: number; h: number }) {
  const frame = useCurrentFrame()
  const s = h / 1080

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })

  const {
    firstName, lastName, jerseyNumber, sport, school, position,
    gradYear, gpa, email, phone, heightFt, heightIn, weight,
    statsData, accentHex,
  } = props

  const fullName  = [firstName, lastName].filter(Boolean).join(' ').toUpperCase()
  const subLine   = [position, sport].filter(Boolean).join(' · ').toUpperCase()
  const hwStr     = [
    heightFt ? `${heightFt}'${heightIn || '0'}"` : null,
    weight   ? `${weight} lbs`                    : null,
  ].filter(Boolean).join('  ·  ')

  const gpaNum   = parseFloat(gpa || '')
  const showGpa  = gpa && !isNaN(gpaNum) && gpaNum >= 3.0
  const gradLine = [
    gradYear ? `Class of ${gradYear}` : null,
    showGpa  ? `GPA ${gpa}`           : null,
  ].filter(Boolean).join('  ·  ')

  const statsEntries = Object.entries(statsData ?? {})
    .filter(([, v]) => v?.trim())
    .slice(0, 4)

  const statPositions = [
    { x: '63%', y: '45%' }, { x: '83%', y: '45%' },
    { x: '63%', y: '65%' }, { x: '83%', y: '65%' },
  ]

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {/* Background */}
      <AbsoluteFill style={{ background: BG }} />
      <AccentBars accent={accentHex} h={h} />

      {/* Jersey watermark */}
      {jerseyNumber && (
        <div style={{
          position: 'absolute', left: '5%', top: '20%',
          fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(280 * s),
          fontWeight: 700, color: accentHex, opacity: 0.12, lineHeight: 1,
          userSelect: 'none',
        }}>
          #{jerseyNumber}
        </div>
      )}

      {/* Left column */}
      <div style={{
        position: 'absolute', left: '8%', top: '30%', width: '42%',
        display: 'flex', flexDirection: 'column', gap: Math.round(8 * s),
      }}>
        <div style={{
          fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(80 * s),
          fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1,
        }}>{fullName}</div>

        {subLine && (
          <div style={{
            fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(38 * s),
            fontWeight: 600, color: accentHex, letterSpacing: '0.08em',
          }}>{subLine}</div>
        )}

        {school && (
          <div style={{
            fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(34 * s),
            fontWeight: 500, color: '#FFFFFF',
          }}>{school}</div>
        )}

        {gradLine && (
          <div style={{
            fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(28 * s),
            color: '#9CA3AF',
          }}>{gradLine}</div>
        )}

        {hwStr && (
          <div style={{
            fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(28 * s),
            color: '#9CA3AF',
          }}>{hwStr}</div>
        )}

        {email && (
          <div style={{
            fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(26 * s),
            color: accentHex,
          }}>{email}</div>
        )}

        {phone && (
          <div style={{
            fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(26 * s),
            color: '#FFFFFF',
          }}>{phone}</div>
        )}
      </div>

      {/* Vertical divider */}
      <div style={{
        position: 'absolute', left: '52%', top: '25%', width: 2, height: '67%',
        background: '#1E2530',
      }} />

      {/* Right column — stats */}
      <div style={{
        position: 'absolute', left: '74%', top: '28%',
        transform: 'translateX(-50%)',
        fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(22 * s),
        fontWeight: 600, color: accentHex, letterSpacing: '0.12em',
      }}>SEASON STATS</div>

      {statsEntries.map(([label, value], i) => {
        const pos = statPositions[i]
        if (!pos) return null
        return (
          <React.Fragment key={label}>
            <div style={{
              position: 'absolute', left: pos.x, top: pos.y,
              transform: 'translateX(-50%) translateY(-50%)',
              fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(60 * s),
              fontWeight: 700, color: accentHex, textAlign: 'center',
            }}>{value}</div>
            <div style={{
              position: 'absolute', left: pos.x,
              top: `${parseFloat(pos.y) + 8}%`,
              transform: 'translateX(-50%)',
              fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(20 * s),
              fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em', textAlign: 'center',
            }}>{label.toUpperCase()}</div>
          </React.Fragment>
        )
      })}

      {/* Watermark */}
      <div style={{
        position: 'absolute', bottom: Math.round(30 * s), left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(22 * s),
        fontWeight: 700, color: '#334155',
      }}>POWERED BY CLIPT</div>
    </AbsoluteFill>
  )
}

// ── Stats Card ──────────────────────────────────────────────────────────────
function StatsCard({ props, w, h }: { props: ReelCompositionProps; w: number; h: number }) {
  const frame = useCurrentFrame()
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const s = h / 1080
  const { statsData, accentHex, firstName, lastName } = props
  const fullName = [firstName, lastName].filter(Boolean).join(' ').toUpperCase()

  const validStats = Object.entries(statsData ?? {})
    .filter(([, v]) => v?.trim() && v !== '0')
    .slice(0, 9)

  const statPositions = [
    { x: '18%', y: '40%' }, { x: '50%', y: '40%' }, { x: '82%', y: '40%' },
    { x: '18%', y: '60%' }, { x: '50%', y: '60%' }, { x: '82%', y: '60%' },
    { x: '18%', y: '80%' }, { x: '50%', y: '80%' }, { x: '82%', y: '80%' },
  ]

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <AbsoluteFill style={{ background: BG }} />
      <AccentBars accent={accentHex} h={h} />

      <div style={{
        position: 'absolute', left: 0, right: 0, top: '14%',
        textAlign: 'center',
        fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(28 * s),
        fontWeight: 700, color: accentHex, letterSpacing: '0.10em',
      }}>SEASON STATS</div>

      <div style={{
        position: 'absolute', left: 0, right: 0, top: '24%',
        textAlign: 'center',
        fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(48 * s),
        fontWeight: 700, color: '#FFFFFF',
      }}>{fullName}</div>

      {validStats.map(([label, value], i) => {
        const pos = statPositions[i]
        if (!pos) return null
        return (
          <React.Fragment key={label}>
            <div style={{
              position: 'absolute', left: pos.x, top: pos.y,
              transform: 'translateX(-50%) translateY(-50%)',
              fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(72 * s),
              fontWeight: 700, color: accentHex, textAlign: 'center',
            }}>{value}</div>
            <div style={{
              position: 'absolute', left: pos.x,
              top: `${parseFloat(pos.y) + 7}%`,
              transform: 'translateX(-50%)',
              fontFamily: 'Montserrat, Arial, sans-serif', fontSize: Math.round(22 * s),
              fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em', textAlign: 'center',
            }}>{label.toUpperCase()}</div>
          </React.Fragment>
        )
      })}

      <div style={{
        position: 'absolute', bottom: Math.round(30 * s), left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(22 * s),
        fontWeight: 700, color: '#334155',
      }}>POWERED BY CLIPT</div>
    </AbsoluteFill>
  )
}

// ── Spotlight Circle Overlay ─────────────────────────────────────────────────
function SpotlightCircle({
  markX, markY, accentHex, w, h,
}: {
  markX: number; markY: number; accentHex: string; w: number; h: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scaleValue = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 400, mass: 0.5 },
    from: 1.5,
    to: 1.0,
  })

  const opacity = interpolate(
    frame,
    [0, Math.round(fps * 0.8), Math.round(fps * 1.2)],
    [1, 1, 0],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  )

  const circleW = w * 0.08
  // Maintain circle shape: height matches width
  const circleH = circleW

  return (
    <div style={{
      position: 'absolute',
      left: `${markX}%`,
      top: `${markY}%`,
      transform: `translate(-50%, -50%) scale(${scaleValue})`,
      opacity,
      width:  circleW,
      height: circleH,
      borderRadius: '50%',
      border: `${Math.round(w * 0.003)}px solid #FFFFFF`,
      boxSizing: 'border-box',
      background: 'transparent',
    }} />
  )
}

// ── Single Clip ──────────────────────────────────────────────────────────────
function ClipSection({
  clip, spotlightStyle, accentHex, w, h,
}: {
  clip: ClipInput; spotlightStyle: 'circle' | 'none'; accentHex: string; w: number; h: number
}) {
  const { fps } = useVideoConfig()
  const trimStartFrames = Math.round((clip.trimStart ?? 0) * fps)
  const clipDurationFrames = calcClipFrames(clip)

  const markX = typeof clip.markX === 'number' ? clip.markX : 50
  const markY = typeof clip.markY === 'number' ? clip.markY : 38

  const showCircle =
    spotlightStyle === 'circle' &&
    typeof clip.markX === 'number' && typeof clip.markY === 'number'

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <OffthreadVideo
        src={clip.url}
        startFrom={trimStartFrames}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      {showCircle && (
        <SpotlightCircle
          markX={markX}
          markY={markY}
          accentHex={accentHex}
          w={w}
          h={h}
        />
      )}
    </AbsoluteFill>
  )
}

// ── End Card ─────────────────────────────────────────────────────────────────
function EndCard({ props, w, h }: { props: ReelCompositionProps; w: number; h: number }) {
  const frame = useCurrentFrame()
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const s = h / 1080

  const {
    firstName, lastName, jerseyNumber, sport, school, position,
    email, phone, statsData, accentHex, coachName, coachEmail,
  } = props

  const fullName     = [firstName, lastName].filter(Boolean).join(' ').toUpperCase()
  const jerseyPosLine = [
    jerseyNumber ? `#${jerseyNumber}` : null,
    [position, sport].filter(Boolean).join(' · ').toUpperCase(),
  ].filter(Boolean).join('  ·  ')

  const topStats = Object.entries(statsData ?? {})
    .filter(([, v]) => v?.trim())
    .slice(0, 3)

  const colXMap: Record<number, string[]> = {
    0: [], 1: ['50%'], 2: ['25%', '75%'], 3: ['22%', '50%', '78%'],
  }
  const colXs = colXMap[topStats.length] ?? []

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <AbsoluteFill style={{ background: BG }} />

      {/* Diagonal pattern */}
      <AbsoluteFill style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 40px,
          ${accentHex}08 40px,
          ${accentHex}08 41px
        )`,
      }} />

      {/* Radial glow */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 40%, ${accentHex}22 0%, transparent 70%)`,
      }} />

      {/* Top + bottom accent stripes */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Math.round(16 * s), background: accentHex,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Math.round(16 * s), background: accentHex,
      }} />

      {/* CONTACT ME */}
      <div style={{
        position: 'absolute', top: '11%', left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(36 * s),
        fontWeight: 700, color: accentHex, letterSpacing: '0.12em',
      }}>CONTACT ME</div>

      {/* Full name */}
      <div style={{
        position: 'absolute', top: '18%', left: '5%', right: '5%',
        textAlign: 'center',
        fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(88 * s),
        fontWeight: 900, color: '#FFFFFF',
      }}>{fullName}</div>

      {/* Jersey + position */}
      {jerseyPosLine && (
        <div style={{
          position: 'absolute', top: '31%', left: '5%', right: '5%',
          textAlign: 'center',
          fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(40 * s),
          fontWeight: 700, color: accentHex,
        }}>{jerseyPosLine}</div>
      )}

      {/* School */}
      {school && (
        <div style={{
          position: 'absolute', top: '40%', left: '5%', right: '5%',
          textAlign: 'center',
          fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(40 * s),
          color: '#FFFFFF',
        }}>{school}</div>
      )}

      {/* Divider */}
      <div style={{
        position: 'absolute', top: '50%', left: '10%', right: '10%',
        height: Math.max(1, Math.round(2 * s)),
        background: accentHex, opacity: 0.4,
      }} />

      {/* Email */}
      {email && (
        <div style={{
          position: 'absolute', top: '58%', left: '5%', right: '5%',
          textAlign: 'center',
          fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(48 * s),
          color: accentHex,
        }}>✉  {email}</div>
      )}

      {/* Phone */}
      {phone && (
        <div style={{
          position: 'absolute', top: '67%', left: '5%', right: '5%',
          textAlign: 'center',
          fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(44 * s),
          color: '#FFFFFF',
        }}>{phone}</div>
      )}

      {/* Coach contact */}
      {(coachName || coachEmail) && (
        <div style={{
          position: 'absolute', top: '74%', left: '10%', right: '10%',
          textAlign: 'center',
          fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(28 * s),
          color: '#94a3b8',
        }}>
          {[coachName, coachEmail].filter(Boolean).join('  —  ')}
        </div>
      )}

      {/* Top 3 stats */}
      {topStats.map(([label, value], i) => {
        const xPos = colXs[i]
        if (!xPos) return null
        return (
          <React.Fragment key={label}>
            <div style={{
              position: 'absolute', top: '80%', left: xPos,
              transform: 'translateX(-50%)',
              fontFamily: 'Oswald, Arial, sans-serif', fontSize: Math.round(54 * s),
              fontWeight: 900, color: accentHex, textAlign: 'center',
            }}>{value}</div>
            <div style={{
              position: 'absolute', top: '88%', left: xPos,
              transform: 'translateX(-50%)',
              fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(26 * s),
              color: '#64748b', textAlign: 'center',
            }}>{label.toUpperCase()}</div>
          </React.Fragment>
        )
      })}

      {/* POWERED BY CLIPT */}
      <div style={{
        position: 'absolute', bottom: Math.round(30 * s), left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'Inter, Arial, sans-serif', fontSize: Math.round(22 * s),
        fontWeight: 700, color: '#334155',
      }}>POWERED BY CLIPT  ·  CLIPTAPP.COM</div>
    </AbsoluteFill>
  )
}

// ── Main Composition ──────────────────────────────────────────────────────────
export function ReelComposition(props: ReelCompositionProps) {
  const { fps, width: w, height: h, durationInFrames } = useVideoConfig()

  const {
    statsData, clips, musicUrl, music, accentHex, spotlightStyle,
  } = props

  const hasStats = Object.values(statsData ?? {}).some(v => v?.trim())

  // Calculate timing offsets
  const statsFrames = hasStats ? STATS_FRAMES : 0

  let clipOffset = TITLE_FRAMES + statsFrames
  const clipOffsets: number[] = []
  for (const clip of clips ?? []) {
    clipOffsets.push(clipOffset)
    clipOffset += calcClipFrames(clip)
  }

  const shouldPlayMusic =
    !!(musicUrl && musicUrl.length > 0 && music !== 'no-music' && music !== null)

  return (
    <>
      {/* Section 1 — Title Card */}
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard props={props} w={w} h={h} />
      </Sequence>

      {/* Section 2 — Stats Card */}
      {hasStats && (
        <Sequence from={TITLE_FRAMES} durationInFrames={STATS_FRAMES}>
          <StatsCard props={props} w={w} h={h} />
        </Sequence>
      )}

      {/* Section 3 — Clips */}
      {(clips ?? []).map((clip, i) => (
        <Sequence
          key={i}
          from={clipOffsets[i]}
          durationInFrames={calcClipFrames(clip)}
        >
          <ClipSection
            clip={clip}
            spotlightStyle={spotlightStyle ?? 'none'}
            accentHex={accentHex ?? '#00A3FF'}
            w={w}
            h={h}
          />
        </Sequence>
      ))}

      {/* Section 4 — End Card */}
      <Sequence from={clipOffset} durationInFrames={END_FRAMES}>
        <EndCard props={props} w={w} h={h} />
      </Sequence>

      {/* Section 5 — Music */}
      {shouldPlayMusic && musicUrl && (
        <Audio
          src={musicUrl}
          volume={(f) =>
            interpolate(
              f,
              [0, fps, durationInFrames - fps * 3, durationInFrames],
              [0, 0.4, 0.4, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
          }
        />
      )}
    </>
  )
}
