// Client-safe utility functions only
// Server-side functions that use Prisma are in lib/maps-server.ts

export function getDirectionsUrl(
  destinationLat: number,
  destinationLng: number,
  originLat?: number,
  originLng?: number
): string {
  if (originLat != null && originLng != null) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${originLat},${originLng};${destinationLat},${destinationLng}`
  }

  return `https://www.openstreetmap.org/?mlat=${destinationLat}&mlon=${destinationLng}#map=16/${destinationLat}/${destinationLng}`
}

