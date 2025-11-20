export interface HospitalLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  phone: string
  emergency: boolean
  specialties: string[]
}

export async function findNearestHospitals(
  lat: number,
  lng: number,
  radius: number = 5000, // 5km default
  emergencyOnly: boolean = false
): Promise<HospitalLocation[]> {
  // This would typically use Google Places API
  // For now, we'll use the database
  const { prisma } = await import('./prisma')
  
  const hospitals = await prisma.hospital.findMany({
    where: {
      active: true,
      ...(emergencyOnly && { emergency: true })
    }
  })

  // Calculate distances and sort
  const hospitalsWithDistance = hospitals.map(hospital => {
    const distance = calculateDistance(
      lat,
      lng,
      hospital.latitude,
      hospital.longitude
    )
    return {
      id: hospital.id,
      name: hospital.name,
      address: hospital.address,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      phone: hospital.phone,
      emergency: hospital.emergency,
      specialties: JSON.parse(hospital.specialties || '[]') as string[],
      distance
    }
  })

  return hospitalsWithDistance
    .filter(h => h.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance, ...hospital }) => hospital)
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export function getDirectionsUrl(
  destinationLat: number,
  destinationLng: number,
  originLat?: number,
  originLng?: number
): string {
  if (originLat && originLng) {
    return `https://www.google.com/maps/dir/${originLat},${originLng}/${destinationLat},${destinationLng}`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`
}

