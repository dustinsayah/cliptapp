export async function POST(request: Request) {
  const RAILWAY_URL = process.env.JERSEY_DETECTION_API_URL
  if (!RAILWAY_URL) {
    return Response.json({ error: 'Missing environment variable: JERSEY_DETECTION_API_URL' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { videoUrl, jerseyNumber, jerseyColor, sport, position } = body

  console.log('PROXY RECEIVED FROM FRONTEND:', JSON.stringify({
    videoUrl: typeof videoUrl === 'string' ? videoUrl.slice(-40) : videoUrl,
    jerseyNumber,
    jerseyNumberType: typeof jerseyNumber,
    jerseyColor,
    sport,
    position,
  }))

  if (!videoUrl) {
    return Response.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  const railwayPayload: Record<string, unknown> = {
    videoUrl,
    jerseyNumber: Number(jerseyNumber),
    jerseyColor: jerseyColor || 'white',
    sport: sport || 'basketball',
  }
  if (position && typeof position === 'string' && position.trim() !== '') {
    railwayPayload.position = position.trim()
  }

  console.log('PROXY FORWARDING TO RAILWAY:', JSON.stringify(railwayPayload))

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 150000)

    const railwayResponse = await fetch(`${RAILWAY_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(railwayPayload),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    console.log('PROXY RAILWAY RESPONSE STATUS:', railwayResponse.status)

    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text().catch(() => 'unknown')
      console.error('PROXY RAILWAY ERROR:', railwayResponse.status, errorText.slice(0, 300))
      return Response.json(
        { error: `Detection API returned ${railwayResponse.status}` },
        { status: railwayResponse.status }
      )
    }

    const data: unknown = await railwayResponse.json()
    console.log('PROXY RAILWAY DATA:', JSON.stringify(data).slice(0, 300))

    if (!Array.isArray(data) || data.length === 0) {
      return Response.json(
        { error: 'No detections found — jersey not detected in this clip.' },
        { status: 200 }
      )
    }

    return Response.json(data)

  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'Detection timed out after 150 seconds — try again or mark manually.' },
        { status: 504 }
      )
    }
    console.error('PROXY UNEXPECTED ERROR:', err)
    return Response.json({ error: 'Unexpected error in detection proxy.' }, { status: 500 })
  }
}
