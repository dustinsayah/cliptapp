/**
 * YouTube URL utilities for Clipt video processing.
 * Used by both the client (URL validation) and server (video download pipeline).
 */

/** Regex patterns covering all standard YouTube URL formats */
const YT_PATTERNS = [
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})(?:&.*)?$/,
  // Short URL: youtu.be/VIDEO_ID
  /^https?:\/\/youtu\.be\/([\w-]{11})(?:\?.*)?$/,
  // Shorts URL: youtube.com/shorts/VIDEO_ID
  /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{11})(?:\?.*)?$/,
  // Embed URL: youtube.com/embed/VIDEO_ID
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})(?:\?.*)?$/,
  // Mobile URL: m.youtube.com/watch?v=VIDEO_ID
  /^https?:\/\/m\.youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})(?:&.*)?$/,
];

/**
 * Extracts the 11-character video ID from any supported YouTube URL format.
 * Returns null if the URL is not a recognized YouTube URL.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  for (const pattern of YT_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

/**
 * Returns true if the given URL is a valid YouTube URL in any supported format.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Returns the highest-resolution available thumbnail URL for a YouTube video.
 * Falls back through quality levels: maxresdefault → hqdefault → mqdefault
 * Note: maxresdefault may 404 for older videos — use hqdefault as reliable fallback.
 */
export function getYouTubeThumbnail(
  url: string,
  quality: "maxres" | "hq" | "mq" | "sd" = "maxres"
): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;

  const qualityMap = {
    maxres: "maxresdefault",
    hq: "hqdefault",
    mq: "mqdefault",
    sd: "sddefault",
  };

  return `https://img.youtube.com/vi/${id}/${qualityMap[quality]}.jpg`;
}

/**
 * Builds the canonical YouTube watch URL from a video ID.
 */
export function buildYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * YouTube oEmbed response shape.
 * See: https://www.youtube.com/oembed?url=URL&format=json
 */
export interface YouTubeOEmbedData {
  title: string;
  author_name: string;
  author_url: string;
  type: string;
  height: number;
  width: number;
  version: string;
  provider_name: string;
  provider_url: string;
  thumbnail_height: number;
  thumbnail_width: number;
  thumbnail_url: string;
  html: string;
}
