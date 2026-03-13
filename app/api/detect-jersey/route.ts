import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Read at request time so Vercel env vars are always picked up
  const RAILWAY_URL = process.env.JERSEY_DETECTION_API_URL
  if (!RAILWAY_URL) {
    return NextResponse.json(
      {
        error:
          'Missing environment variable: JERSEY_DETECTION_API_URL. ' +
          'Set it in the Vercel dashboard → Settings → Environment Variables, then redeploy.',
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { videoUrl, jerseyNumber, jerseyColor, sport, position } = body as Record<string, unknown>

  if (!videoUrl || jerseyNumber === undefined || !jerseyColor || !sport) {
    return NextResponse.json(
      { error: 'Missing required fields: videoUrl, jerseyNumber, jerseyColor, sport' },
      { status: 400 }
    )
  }

  const payload: Record<string, unknown> = {
    videoUrl,
    jerseyNumber: Number(jerseyNumber),
    jerseyColor,
    sport,
  }
  if (position) payload.position = position

  console.log('CLIPT DEBUG: detect-jersey route hit, forwarding to Railway:', JSON.stringify({ videoUrl, jerseyNumber, jerseyColor, sport, position }))

  try {
    const response = await fetch(`${RAILWAY_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(150_000), // 150s — detection takes 90-120s on CPU
    })

    const data: unknown = await response.json()
    console.log('CLIPT DEBUG: Railway response status:', response.status, 'body preview:', JSON.stringify(data).slice(0, 200))

    if (response.status === 503) {
      return NextResponse.json(
        { error: 'Server is busy processing another request — please wait 30 seconds and try again.' },
        { status: 503 }
      )
    }

    if (!response.ok) {
      const errData = data as { error?: string }
      return NextResponse.json(
        { error: errData.error ?? `Detection API returned ${response.status}` },
        { status: response.status }
      )
    }

    const detections = Array.isArray(data) ? data : []

    if (detections.length === 0) {
      return NextResponse.json(
        { error: 'No detections found — jersey not detected in this clip.' },
        { status: 200 }
      )
    }

    return NextResponse.json(detections, { status: 200 })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Detection request timed out after 150 seconds.' },
        { status: 504 }
      )
    }
    const message = err instanceof Error ? err.message : 'Detection request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
