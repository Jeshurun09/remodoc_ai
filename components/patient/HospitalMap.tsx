'use client'

import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getDirectionsUrl } from '@/lib/maps'

interface HospitalMapProps {
  location: { lat: number; lng: number } | null
}

interface Hospital {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  phone: string
  emergency: boolean
  specialties: string[]
  distance?: number
}

const mapContainerStyle = { width: '100%', height: '500px' }
const defaultCenter: [number, number] = [37.7749, -122.4194]

function RecenterMap({ location }: HospitalMapProps) {
  const map = useMap()

  useEffect(() => {
    if (location) map.setView([location.lat, location.lng], 12)
  }, [location, map])

  return null
}

function pinIcon(color: string, size = 18) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

export default function HospitalMap({ location }: HospitalMapProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [emergencyOnly, setEmergencyOnly] = useState(false)

  const center = useMemo<[number, number]>(() => (
    location ? [location.lat, location.lng] : defaultCenter
  ), [location])

  useEffect(() => {
    if (!location) return

    const fetchHospitals = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/hospitals/nearby?lat=${location.lat}&lng=${location.lng}&radius=10000&emergency=${emergencyOnly}`
        )
        const data = await response.json()
        if (response.ok) setHospitals(data.hospitals || [])
      } catch (error) {
        console.error('Error fetching hospitals:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchHospitals()
  }, [location, emergencyOnly])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cyan-500 mb-2">Find Hospitals</h2>
          <p className="text-cyan-500">Locate nearby hospitals and medical facilities</p>
        </div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={emergencyOnly}
            onChange={(event) => setEmergencyOnly(event.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-cyan-500">Emergency only</span>
        </label>
      </div>

      {!location && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please enable location access to find nearby hospitals.</p>
        </div>
      )}

      {loading && <div className="text-center py-8"><p className="text-cyan-500">Loading hospitals...</p></div>}

      <div className="w-full rounded-lg overflow-hidden" style={mapContainerStyle}>
        <MapContainer center={center} zoom={location ? 12 : 7} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap location={location} />

          {location && (
            <>
              <Marker position={[location.lat, location.lng]} icon={pinIcon('#2563eb', 22)}>
                <Popup>You are here</Popup>
              </Marker>
              <Circle
                center={[location.lat, location.lng]}
                radius={10000}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.1 }}
              />
            </>
          )}

          {hospitals.map((hospital) => (
            <Marker
              key={hospital.id}
              position={[hospital.latitude, hospital.longitude]}
              icon={pinIcon(hospital.emergency ? '#dc2626' : '#16a34a')}
            >
              <Popup>
                <div className="p-1" style={{ minWidth: '200px' }}>
                  <h3 className="font-bold text-base mb-1">{hospital.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{hospital.address}</p>
                  <p className="text-sm text-gray-600 mb-1">Phone: {hospital.phone}</p>
                  {hospital.emergency && <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">Emergency Services</span>}
                  <a
                    href={getDirectionsUrl(hospital.latitude, hospital.longitude, location?.lat, location?.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium block mt-2"
                  >
                    Get Directions
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {hospitals.slice(0, 6).map((hospital) => (
          <div key={hospital.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-cyan-500">{hospital.name}</h3>
              {hospital.emergency && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Emergency</span>}
            </div>
            <p className="text-sm text-cyan-500 mb-2">{hospital.address}</p>
            <p className="text-sm text-cyan-500 mb-2">Phone: {hospital.phone}</p>
            {hospital.distance != null && <p className="text-sm text-cyan-500 mb-2">{Math.round(hospital.distance / 1000)} km away</p>}
            <a
              href={getDirectionsUrl(hospital.latitude, hospital.longitude, location?.lat, location?.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Get Directions
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
