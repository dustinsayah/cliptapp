export interface MusicTrack {
  id: string
  name: string
  description: string
  url: string | null
  emoji: string
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "no-music",
    name: "No Music",
    description: "Clean — coaches prefer no music",
    url: null,
    emoji: "🔇"
  },
  {
    id: "energetic",
    name: "Energetic",
    description: "Classic energetic hip hop",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500403/skilsel-energetic-hip-hop-8303_jfhbjh.mp3",
    emoji: "⚡"
  },
  {
    id: "orchestral",
    name: "Orchestral",
    description: "Epic orchestral sport hip hop",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500403/lightbeatsmusic-epic-hip-hop-sport-orchestral-443439_nem0zk.mp3",
    emoji: "🎼"
  },
  {
    id: "drill",
    name: "Drill",
    description: "Hard hitting drill instrumental",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500402/kontraa-hype-drill-music-438398_czzcri.mp3",
    emoji: "🔊"
  },
  {
    id: "motivational",
    name: "Motivational",
    description: "Powerful motivational sport beat",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500401/audiorezout-workout-kings-powerful-motivational-epic-sports-hip-hop-beat-music-185606_hty425.mp3",
    emoji: "💪"
  },
  {
    id: "epic",
    name: "Epic",
    description: "Epic motivational hip hop",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500401/playsound-epic-motivational-sport-hip-hop-161522_yqqazt.mp3",
    emoji: "🏆"
  },
  {
    id: "rock",
    name: "Rock",
    description: "Energetic hip hop rock fusion",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500400/audioknap-sport-energetic-hip-hop-rock-413262_zbxqcy.mp3",
    emoji: "🎸"
  },
  {
    id: "military",
    name: "Military",
    description: "Powerful urban sport vlog beat",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500400/audiorezout-military-powerful-motivational-urban-sport-vlog-hip-hop-beat-music-188339_deswyp.mp3",
    emoji: "🪖"
  },
  {
    id: "trap",
    name: "Trap",
    description: "Dark trap instrumental",
    url: "https://res.cloudinary.com/dc33vjyyv/video/upload/v1772500400/audioknap-epic-hip-hop-trap-424552_a1yr47.mp3",
    emoji: "🎵"
  },
  {
    id: "custom",
    name: "Upload My Own",
    description: "MP3, WAV or M4A up to 15MB",
    url: null,
    emoji: "📁"
  }
]
