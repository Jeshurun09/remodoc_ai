import { NextRequest, NextResponse } from 'next/server'
import { findNearestHospitals } from '@/lib/maps'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseInt(searchParams.get('radius') || '5000')
    const emergencyOnly = searchParams.get('emergency') === 'true'

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude required' },
        { status: 400 }
      )
    }

    const hospitals = await findNearestHospitals(lat, lng, radius, emergencyOnly)

    return NextResponse.json({ hospitals })
  } catch (error) {
    console.error('Hospital search error:', error)
    return NextResponse.json(
      { error: 'Failed to find hospitals' },
      { status: 500 }
    )
  }
}

