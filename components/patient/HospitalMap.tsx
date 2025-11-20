'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import type { LatLngExpression, DivIcon } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

const createMarkerIcon = (color: string): DivIcon =>
  L.divIcon({
    html: `<span style="
      background:${color};
      width:1.5rem;
      height:1.5rem;
      display:inline-block;
      border-radius:9999px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.2);
    "></span>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })

function RecenterMap({ center }: { center: LatLngExpression }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center)
  }, [center, map])

  return null
}

export default function HospitalMap({ location }: HospitalMapProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [emergencyOnly, setEmergencyOnly] = useState(false)

  const userPosition: LatLngExpression | null = location ? [location.lat, location.lng] : null
  const defaultCenter: LatLngExpression = userPosition ?? [37.7749, -122.4194]

  const emergencyIcon = useMemo(() => createMarkerIcon('#dc2626'), [])
  const standardIcon = useMemo(() => createMarkerIcon('#16a34a'), [])

  useEffect(() => {
    if (location) {
      fetchHospitals()
    }
  }, [location, emergencyOnly])

  const fetchHospitals = async () => {
    if (!location) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/hospitals/nearby?lat=${location.lat}&lng=${location.lng}&radius=10000&emergency=${emergencyOnly}`
      )
      const data = await response.json()
      if (response.ok) {
        setHospitals(data.hospitals || [])
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error)
    } finally {
      setLoading(false)
    }
  }

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
            onChange={(e) => setEmergencyOnly(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-cyan-500">Emergency only</span>
        </label>
      </div>

      {!location && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please enable location access to find nearby hospitals.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <p className="text-cyan-500">Loading hospitals...</p>
        </div>
      )}

      <div className="w-full h-[500px] rounded-lg overflow-hidden">
        <MapContainer
          center={defaultCenter}
          zoom={location ? 12 : 7}
          className="h-full w-full"
          scrollWheelZoom
        >
          <RecenterMap center={defaultCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {userPosition && (
            <CircleMarker center={userPosition} pathOptions={{ color: '#2563eb' }} radius={10}>
              <Popup>You are here</Popup>
            </CircleMarker>
          )}

          {hospitals.map((hospital) => (
            <Marker
              key={hospital.id}
              position={[hospital.latitude, hospital.longitude]}
              icon={hospital.emergency ? emergencyIcon : standardIcon}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-base mb-1">{hospital.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{hospital.address}</p>
                  <p className="text-sm text-gray-600 mb-1">Phone: {hospital.phone}</p>
                  {hospital.emergency && (
                    <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">
                      Emergency Services
                    </span>
                  )}
                  <a
                    href={getDirectionsUrl(
                      hospital.latitude,
                      hospital.longitude,
                      location?.lat,
                      location?.lng
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Get Directions →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {hospitals.slice(0, 6).map((hospital) => (
          <div
            key={hospital.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-cyan-500">{hospital.name}</h3>
              {hospital.emergency && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  Emergency
                </span>
              )}
            </div>
            <p className="text-sm text-cyan-500 mb-2">{hospital.address}</p>
            <p className="text-sm text-cyan-500 mb-2">Phone: {hospital.phone}</p>
            {hospital.distance && (
              <p className="text-sm text-cyan-500 mb-2">
                {Math.round(hospital.distance / 1000)} km away
              </p>
            )}
            <a
              href={getDirectionsUrl(
                hospital.latitude,
                hospital.longitude,
                location?.lat,
                location?.lng
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Get Directions →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

