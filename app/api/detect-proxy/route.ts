import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { apiBaseUrl, ...detectPayload } = body

    if (!apiBaseUrl) {
      return NextResponse.json({ error: 'API base URL is required' }, { status: 400 })
    }

    const response = await fetch(`${apiBaseUrl}/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(detectPayload),
      // Long timeout for video processing
      signal: AbortSignal.timeout(300000) // 5 minutes
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy request failed'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
