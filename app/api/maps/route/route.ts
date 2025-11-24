import { NextResponse } from 'next/server'

// Simple in-memory rate limiter (best-effort; for production use a shared store)
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 60 // max requests per window
const ipCounters: Map<string, { count: number; windowStart: number }> = new Map()

// Simple in-memory cache with TTL for route responses
const routeCache: Map<string, { expires: number; data: any }> = new Map()
const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

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

  // Use a cache key based on coordinates to avoid repeated external calls
  const cacheKey = `${originLat},${originLng}:${destLat},${destLng}`
  const cached = routeCache.get(cacheKey)
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.data)
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

  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN
  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY
  try {
    // Prefer Google Directions if key provided
    if (GOOGLE_MAPS_KEY) {
      const gUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&key=${GOOGLE_MAPS_KEY}`
      const res = await fetch(gUrl)
      const data = await res.json()
      if (!data || !data.routes || data.routes.length === 0) {
        return NextResponse.json({ error: 'No route from Google Directions' }, { status: 502 })
      }
      const stepsRaw = data.routes[0].legs[0].steps || []
      const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '')
      const steps = stepsRaw.map((s: any) => ({ distance: s.distance?.value ?? 0, instruction: stripHtml(s.html_instructions || '') }))
      const result = { provider: 'google', steps }
      routeCache.set(cacheKey, { expires: Date.now() + ROUTE_CACHE_TTL_MS, data: result })
      return NextResponse.json(result)
    }

    // Prefer Mapbox if token provided
    if (MAPBOX_TOKEN) {
      const mbUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
      const res = await fetch(mbUrl)
      const data = await res.json()
      if (!data || !data.routes || data.routes.length === 0) {
        return NextResponse.json({ error: 'No route from Mapbox' }, { status: 502 })
      }
      const stepsRaw = data.routes[0].legs[0].steps || []
      const steps = stepsRaw.map((s: any) => ({ distance: s.distance, instruction: s.maneuver?.instruction || s.name || '' }))
      const result = { provider: 'mapbox', steps }
      routeCache.set(cacheKey, { expires: Date.now() + ROUTE_CACHE_TTL_MS, data: result })
      return NextResponse.json(result)
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
    const result = { provider: 'osrm', steps }
    routeCache.set(cacheKey, { expires: Date.now() + ROUTE_CACHE_TTL_MS, data: result })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Routing proxy error', err)
    return NextResponse.json({ error: 'Routing error' }, { status: 500 })
  }
}
