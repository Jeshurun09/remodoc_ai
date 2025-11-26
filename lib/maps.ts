// Client-safe utility functions only
// Server-side functions that use Prisma are in lib/maps-server.ts

export function getDirectionsUrl(
  destinationLat: number,
  destinationLng: number,
  originLat?: number,
  originLng?: number
): string {
  if (originLat != null && originLng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destinationLat},${destinationLng}`
  }

  return `https://www.google.com/maps/search/?api=1&query=${destinationLat},${destinationLng}`
}

