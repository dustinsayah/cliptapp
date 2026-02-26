/**
 * GET /api/youtube-info?url=YOUTUBE_URL
 *
 * Proxies the YouTube oEmbed API to avoid CORS issues on the client.
 * Returns video title, author, and thumbnail URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidYouTubeUrl } from "@/lib/youtubeUtils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isValidYouTubeUrl(url)) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  const oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  try {
    const res = await fetch(oembedEndpoint, {
      headers: { "User-Agent": "Clipt/1.0" },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not fetch video info. The video may be private or unavailable." },
        { status: 400 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach YouTube. Check your connection." },
      { status: 500 }
    );
  }
}
