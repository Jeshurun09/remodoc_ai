import { NextResponse } from 'next/server'

// Simple in-memory rate limiter (best-effort; for production use a shared store)
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 60 // max requests per window
const ipCounters: Map<string, { count: number; windowStart: number }> = new Map()

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const originLat = url.searchParams.get('originLat')
  const originLng = url.searchParams.get('originLng')
  const destLat = url.searchParams.get('destLat')
  const destLng = url.searchParams.get('destLng')

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  const ip = getClientIp(req)
  const now = Date.now()
  const entry = ipCounters.get(ip)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipCounters.set(ip, { count: 1, windowStart: now })
  } else {
    entry.count += 1
    if (entry.count > RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    ipCounters.set(ip, entry)
  }

  // Prefer Mapbox if token provided
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN
  try {
    if (MAPBOX_TOKEN) {
      const mbUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
      const res = await fetch(mbUrl)
      const data = await res.json()
      if (!data || !data.routes || data.routes.length === 0) {
        return NextResponse.json({ error: 'No route from Mapbox' }, { status: 502 })
      }
      const stepsRaw = data.routes[0].legs[0].steps || []
      const steps = stepsRaw.map((s: any) => ({ distance: s.distance, instruction: s.maneuver?.instruction || s.name || '' }))
      return NextResponse.json({ provider: 'mapbox', steps })
    }

    // Fallback to OSRM public server
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false&steps=true&annotations=distance`
    const res = await fetch(osrmUrl)
    const data = await res.json()
    if (!data || !data.routes || data.routes.length === 0) {
      return NextResponse.json({ error: 'No route from OSRM' }, { status: 502 })
    }
    const stepsRaw = data.routes[0].legs[0].steps || []
    const steps = stepsRaw.map((s: any) => {
      const maneuver = s.maneuver || {}
      const modifier = maneuver.modifier ? `${maneuver.modifier} ` : ''
      const name = s.name || ''
      const instruction = maneuver.instruction || `Turn ${modifier}onto ${name}`.trim()
      return { distance: s.distance, instruction }
    })
    return NextResponse.json({ provider: 'osrm', steps })
  } catch (err) {
    console.error('Routing proxy error', err)
    return NextResponse.json({ error: 'Routing error' }, { status: 500 })
  }
}
