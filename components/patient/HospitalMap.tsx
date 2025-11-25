'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api'
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

const mapContainerStyle = {
  width: '100%',
  height: '500px'
}

const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194
}

export default function HospitalMap({ location }: HospitalMapProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [emergencyOnly, setEmergencyOnly] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const center = useMemo(() => {
    if (location) {
      return { lat: location.lat, lng: location.lng }
    }
    return defaultCenter
  }, [location])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  useEffect(() => {
    if (location) {
      fetchHospitals()
    }
  }, [location, emergencyOnly])

  useEffect(() => {
    if (map && location) {
      map.setCenter({ lat: location.lat, lng: location.lng })
      map.setZoom(12)
    }
  }, [map, location])

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

  const createIcon = (color: string, scale: number = 10) => {
    if (typeof window !== 'undefined' && window.google?.maps) {
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: scale,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    }
    return undefined
  }

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  if (!googleMapsApiKey) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.
          </p>
        </div>
      </div>
    )
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

      <div className="w-full rounded-lg overflow-hidden">
        <LoadScript googleMapsApiKey={googleMapsApiKey}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={location ? 12 : 7}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: true
            }}
          >
            {location && (
              <Marker
                position={{ lat: location.lat, lng: location.lng }}
                icon={createIcon('#2563eb', 12)}
                title="You are here"
              />
            )}

            {location && (
              <Circle
                center={{ lat: location.lat, lng: location.lng }}
                radius={10000}
                options={{
                  fillColor: '#2563eb',
                  fillOpacity: 0.1,
                  strokeColor: '#2563eb',
                  strokeOpacity: 0.3,
                  strokeWeight: 2
                }}
              />
            )}

            {hospitals.map((hospital) => (
              <Marker
                key={hospital.id}
                position={{ lat: hospital.latitude, lng: hospital.longitude }}
                icon={hospital.emergency ? createIcon('#dc2626') : createIcon('#16a34a')}
                onClick={() => setSelectedHospital(hospital)}
              />
            ))}

            {selectedHospital && (
              <InfoWindow
                position={{
                  lat: selectedHospital.latitude,
                  lng: selectedHospital.longitude
                }}
                onCloseClick={() => setSelectedHospital(null)}
              >
                <div className="p-1" style={{ minWidth: '200px' }}>
                  <h3 className="font-bold text-base mb-1">{selectedHospital.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{selectedHospital.address}</p>
                  <p className="text-sm text-gray-600 mb-1">Phone: {selectedHospital.phone}</p>
                  {selectedHospital.emergency && (
                    <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">
                      Emergency Services
                    </span>
                  )}
                  <a
                    href={getDirectionsUrl(
                      selectedHospital.latitude,
                      selectedHospital.longitude,
                      location?.lat,
                      location?.lng
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium block mt-2"
                  >
                    Get Directions →
                  </a>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
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
