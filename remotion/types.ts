export interface ClipInput {
  url: string
  duration?: number
  trimStart?: number
  trimEnd?: number
  trimDuration?: number
  markX?: number
  markY?: number
  skillCategory?: string
}

export interface ReelCompositionProps {
  firstName: string
  lastName: string
  jerseyNumber: string
  sport: string
  school: string
  position: string
  gradYear: string
  email: string
  phone: string
  heightFt: string
  heightIn: string
  weight: string
  gpa: string
  coachName: string
  coachEmail: string
  statsData: Record<string, string>
  clips: ClipInput[]
  musicUrl: string | null
  music: string | null
  accentHex: string
  width: number
  height: number
  spotlightStyle: 'circle' | 'none'
  exportType: 'coach' | 'social'
}
