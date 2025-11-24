import { NextResponse } from 'next/server'
import Redis from 'ioredis'

let redisClient: Redis | null = null
function getRedis(): Redis | null {
  if (redisClient) return redisClient
  const url = process.env.REDIS_URL
  if (!url) return null
  redisClient = new Redis(url)
  return redisClient
}

export async function GET() {
  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN

  const provider = GOOGLE_MAPS_KEY ? 'google' : MAPBOX_TOKEN ? 'mapbox' : 'osrm'

  const redis = getRedis()
  if (redis) {
    try {
      await redis.set('maps:provider', provider, 'EX', 60)
    } catch (err) {
      console.warn('Redis write failed for provider', err)
    }
  }

  return NextResponse.json({ provider })
}
