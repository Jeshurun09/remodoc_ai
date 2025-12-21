'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GoogleMap, useLoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api'
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
  const [mapError, setMapError] = useState<string | null>(null)

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Use useLoadScript hook instead of LoadScript component to prevent multiple script loads
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey,
    id: 'google-map-script' // Unique ID to prevent duplicate loads
  })

  const center = useMemo(() => {
    if (location) {
      return { lat: location.lat, lng: location.lng }
    }
    return defaultCenter
  }, [location])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    // Clear any previous errors if map loads successfully
    setMapError(null)
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

  useEffect(() => {
    // Handle load errors from useLoadScript
    if (loadError) {
      const errorMessage = loadError.message || String(loadError)
      if (errorMessage.includes('BillingNotEnabled') || errorMessage.includes('BillingNotEnabledMapError')) {
        setMapError('Google Maps billing is not enabled. Please enable billing in your Google Cloud Console.')
      } else {
        setMapError(`Failed to load Google Maps: ${errorMessage}`)
      }
    }

    // Intercept console.error to catch Google Maps billing errors (only for Google Maps related errors)
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      const message = args.join(' ')
      // Only intercept if it's a Google Maps billing error
      if (message.includes('BillingNotEnabledMapError') || 
          (message.includes('Google Maps') && message.includes('BillingNotEnabled'))) {
        setMapError('Google Maps billing is not enabled. Please enable billing in your Google Cloud Console.')
        // Suppress the console error since we're showing a user-friendly message
        return
      }
      // For all other errors, log normally
      originalConsoleError.apply(console, args)
    }

    // Listen for Google Maps API errors from window error events
    const handleMapError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.message || String(event.error || '')
      if (errorMessage.includes('BillingNotEnabledMapError') || 
          (errorMessage.includes('Google Maps') && errorMessage.includes('BillingNotEnabled'))) {
        setMapError('Google Maps billing is not enabled. Please enable billing in your Google Cloud Console.')
        // Prevent the error from appearing in console
        event.preventDefault()
        return false
      }
    }

    // Also listen for unhandled promise rejections that might contain Google Maps errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason || '')
      if (errorMessage.includes('BillingNotEnabledMapError') || 
          (errorMessage.includes('Google Maps') && errorMessage.includes('BillingNotEnabled'))) {
        setMapError('Google Maps billing is not enabled. Please enable billing in your Google Cloud Console.')
        event.preventDefault()
      }
    }

    window.addEventListener('error', handleMapError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleMapError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      // Restore original console.error
      console.error = originalConsoleError
    }
  }, [loadError])

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

  if (mapError) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold mb-2">Google Maps Error</p>
          <p className="text-red-700 text-sm">{mapError}</p>
          <p className="text-red-600 text-xs mt-2">
            <a 
              href="https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Learn how to fix this
            </a>
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
        {!isLoaded ? (
          <div className="h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-600">Loading map...</p>
          </div>
        ) : (
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
        )}
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
