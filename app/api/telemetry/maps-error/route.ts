import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Minimal server-side logging for diagnostics. In production, replace with structured logging or analytics.
    console.warn('[maps-telemetry] client reported maps load error:', JSON.stringify(body))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[maps-telemetry] failed to parse request', err)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
