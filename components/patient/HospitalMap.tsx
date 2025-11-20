'use client'

import { useState, useEffect } from 'react'
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
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

export default function HospitalMap({ location }: HospitalMapProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [loading, setLoading] = useState(false)
  const [emergencyOnly, setEmergencyOnly] = useState(false)

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

  const center = location || { lat: 37.7749, lng: -122.4194 }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Hospitals</h2>
          <p className="text-gray-600">Locate nearby hospitals and medical facilities</p>
        </div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={emergencyOnly}
            onChange={(e) => setEmergencyOnly(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Emergency only</span>
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
          <p className="text-gray-600">Loading hospitals...</p>
        </div>
      )}

      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={location ? 12 : 8}
          >
            {location && (
              <Marker
                position={location}
                title="Your Location"
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />
            )}
            {hospitals.map((hospital) => (
              <Marker
                key={hospital.id}
                position={{ lat: hospital.latitude, lng: hospital.longitude }}
                title={hospital.name}
                onClick={() => setSelectedHospital(hospital)}
                icon={{
                  url: hospital.emergency
                    ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }}
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
                <div className="p-2">
                  <h3 className="font-bold text-lg mb-2">{selectedHospital.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{selectedHospital.address}</p>
                  <p className="text-sm text-gray-600 mb-2">Phone: {selectedHospital.phone}</p>
                  {selectedHospital.emergency && (
                    <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">
                      Emergency Services
                    </span>
                  )}
                  <div className="mt-2">
                    <a
                      href={getDirectionsUrl(
                        selectedHospital.latitude,
                        selectedHospital.longitude,
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
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      ) : (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {hospitals.slice(0, 6).map((hospital) => (
          <div
            key={hospital.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{hospital.name}</h3>
              {hospital.emergency && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  Emergency
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{hospital.address}</p>
            <p className="text-sm text-gray-600 mb-2">Phone: {hospital.phone}</p>
            {hospital.distance && (
              <p className="text-sm text-gray-500 mb-2">
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

