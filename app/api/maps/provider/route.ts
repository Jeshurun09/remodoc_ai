import { NextResponse } from 'next/server'

export async function GET() {
  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN

  if (GOOGLE_MAPS_KEY) return NextResponse.json({ provider: 'google' })
  if (MAPBOX_TOKEN) return NextResponse.json({ provider: 'mapbox' })
  return NextResponse.json({ provider: 'osrm' })
}
