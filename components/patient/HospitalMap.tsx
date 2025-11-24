 'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import type { LatLngExpression, DivIcon } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { getDirectionsUrl } from '@/lib/maps'
import { useLoadScript, GoogleMap, Marker as GMarker, InfoWindow } from '@react-google-maps/api'

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
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [routeSteps, setRouteSteps] = useState<string[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingHospital, setPendingHospital] = useState<Hospital | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Auto-clear toasts after a short time
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  const userPosition: LatLngExpression | null = location ? [location.lat, location.lng] : null
  const defaultCenter: LatLngExpression = userPosition ?? [37.7749, -122.4194]

  const emergencyIcon = useMemo(() => createMarkerIcon('#dc2626'), [])
  const standardIcon = useMemo(() => createMarkerIcon('#16a34a'), [])

  useEffect(() => {
    if (location) {
      fetchHospitals()
    }
  }, [location, emergencyOnly])

  // Fetch provider info for a small badge
  const [provider, setProvider] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/maps/provider')
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setProvider(data.provider)
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  // Client-side Google Maps key (must be exposed as NEXT_PUBLIC_...)
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const useGoogle = Boolean(googleKey && provider === 'google')
  const { isLoaded: googleLoaded } = useLoadScript({
    googleMapsApiKey: googleKey
  })

  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)

  // One-tap navigate to nearest hospital
  const navigateToNearest = async () => {
    if (!location) {
      setToast('Enable location access to find nearby hospitals.')
      return
    }

    if (loading) {
      setToast('Searching for nearby hospitals — please wait.')
      return
    }

    // Try current list first
    let list = hospitals
    if (!list || list.length === 0) {
      list = await fetchHospitals()
    }

    // If still empty, try expanding search radius progressively
    if (!list || list.length === 0) {
      const radii = [10000, 20000, 50000]
      for (const r of radii) {
        setToast(`No hospitals nearby — expanding search to ${(r / 1000).toFixed(0)} km...`)
        const found = await fetchHospitals(r)
        if (found && found.length > 0) {
          list = found
          break
        }
      }
    }

    if (!list || list.length === 0) {
      // If user requested emergency-only results but none found, try again without that filter
      if (emergencyOnly) {
        setToast('No emergency hospitals found nearby — expanding search to include all hospitals...')
        const found = await fetchHospitals(10000 /* default radius */)
        if (found && found.length > 0) {
          list = found
        } else {
          // As before, try increasing radii without emergency-only filter
          const radii = [10000, 20000, 50000]
          for (const r of radii) {
            setToast(`No hospitals nearby — expanding search to ${(r / 1000).toFixed(0)} km...`)
            const found2 = await fetchHospitals(r)
            if (found2 && found2.length > 0) {
              list = found2
              break
            }
          }
        }
      }

      if (!list || list.length === 0) {
        setToast('No nearby hospitals found to navigate to.')
        return
      }
    }

    const nearest = list[0]
    setPendingHospital(nearest)
    const dontAsk = typeof window !== 'undefined' && localStorage.getItem('remodocAudioNavDontAsk') === '1'
    if (dontAsk) {
      startAudioNavigation(nearest)
    } else {
      setShowConfirm(true)
    }
  }

  const fetchHospitals = async (radius = 10000) => {
    if (!location) return []

    setLoading(true)
    try {
      const response = await fetch(
        `/api/hospitals/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}&emergency=${emergencyOnly}`
      )
      const data = await response.json()
      if (response.ok) {
        setHospitals(data.hospitals || [])
        return data.hospitals || []
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error)
    } finally {
      setLoading(false)
    }
    return []
  }

  // Helpers for audio navigation using OSRM + Web Speech API
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${Math.round(meters)} m`
  }

  const getStepText = (step: any) => {
    // Prefer any rendered instruction if available, otherwise build from maneuver
    const maneuver = step.maneuver || {}
    if (step.instruction) return step.instruction
    if (maneuver.instruction) return maneuver.instruction

    const modifier = maneuver.modifier ? `${maneuver.modifier} ` : ''
    const name = step.name || 'the road'
    return `Turn ${modifier}onto ${name}`
  }

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setNavigatingId(null)
    setRouteSteps([])
  }

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    if (synth.speaking && !synth.paused) {
      synth.pause()
      setIsSpeaking(false)
      return
    }
    if (synth.paused) {
      synth.resume()
      setIsSpeaking(true)
      return
    }

    // If not speaking, start from beginning of available routeSteps
    if (routeSteps.length > 0) {
      speakSteps(routeSteps)
    }
  }

  const speakSteps = (steps: string[]) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    synth.cancel()
    let index = 0

    const speakNext = () => {
      if (index >= steps.length) {
        setIsSpeaking(false)
        return
      }
      const utter = new SpeechSynthesisUtterance(steps[index])
      utter.onend = () => {
        index += 1
        speakNext()
      }
      utter.onerror = () => {
        index += 1
        speakNext()
      }
      synth.speak(utter)
      setIsSpeaking(true)
    }

    speakNext()
  }

  const startAudioNavigation = async (hospital: Hospital) => {
    if (!location) {
      setToast('Enable location access to start navigation.')
      return
    }

    // Ensure `window` is available in this runtime (TypeScript narrowing lost across awaits)
    const win = (typeof window !== 'undefined' ? window : undefined) as Window | undefined
    if (!win) {
      setToast('Unable to open directions in this environment.')
      return
    }

    // If the browser doesn't support speech synthesis, open external directions instead
    if (!('speechSynthesis' in win)) {
      ;(win as any).open(getDirectionsUrl(hospital.latitude, hospital.longitude, location.lat, location.lng), '_blank')
      return
    }

    // Stop any existing speech
    if ('speechSynthesis' in win) (win as any).speechSynthesis.cancel()

    // OSRM expects lon,lat order
    const originLon = location.lng
    const originLat = location.lat
    const destLon = hospital.longitude
    const destLat = hospital.latitude

    try {
      const proxyUrl = `/api/maps/route?originLat=${originLat}&originLng=${originLon}&destLat=${destLat}&destLng=${destLon}`
      const res = await fetch(proxyUrl)
      const data = await res.json()
      if (!data || !data.steps || data.steps.length === 0) {
        setToast('Could not fetch route. Opening directions in a new tab.')
        ;(win as any).open(getDirectionsUrl(hospital.latitude, hospital.longitude, location.lat, location.lng), '_blank')
        return
      }

      const stepsText: string[] = data.steps.map((s: any) => `${formatDistance(s.distance || 0)}: ${s.instruction}`)
      stepsText.push('You have arrived at your destination.')

      setRouteSteps(stepsText)
      setNavigatingId(hospital.id)
      setShowConfirm(false)

      // Start speaking
      speakSteps(stepsText)
    } catch (err) {
      console.error('Error fetching route from proxy:', err)
      setToast('Unable to fetch route. Opening directions in a new tab.')
      ;(win as any).open(getDirectionsUrl(hospital.latitude, hospital.longitude, location.lat, location.lng), '_blank')
    }
  }

  return (
    <div className="space-y-4">
      {provider && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-right mb-2">
            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">Directions: {provider.toUpperCase()}</span>
          </div>
        </div>
      )}

      {provider === 'google' && !googleKey && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-right mb-2">
            <div className="inline-block px-2 py-1 text-xs rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
              Google Directions are enabled on the server, but client Google Maps key is missing.
              To render the map with Google Maps (and remove OpenStreetMap tiles legally), set
              <code className="ml-1 px-1 py-0.5 bg-white rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment.
            </div>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cyan-500 mb-2">Find Hospitals</h2>
          <p className="text-cyan-500">Locate nearby hospitals and medical facilities</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={navigateToNearest}
            disabled={!location || loading}
            className={`px-3 py-1 rounded text-sm ${!location || loading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-cyan-500 text-white hover:bg-cyan-600'}`}
            title={!location ? 'Enable location to navigate' : loading ? 'Searching for hospitals...' : 'Navigate to nearest'}
          >
            {loading ? 'Searching…' : 'Navigate to nearest'}
          </button>
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
        {useGoogle && googleLoaded ? (
          <GoogleMap
            mapContainerClassName="h-full w-full"
            center={{ lat: defaultCenter[0] as number, lng: defaultCenter[1] as number }}
            zoom={location ? 12 : 7}
          >
            {userPosition && (
              <GMarker position={{ lat: (userPosition as number[])[0], lng: (userPosition as number[])[1] }} />
            )}

            {hospitals.map((hospital) => (
              <GMarker
                key={hospital.id}
                position={{ lat: hospital.latitude, lng: hospital.longitude }}
                onClick={() => setSelectedHospital(hospital)}
              />
            ))}

            {selectedHospital && (
              <InfoWindow
                position={{ lat: selectedHospital.latitude, lng: selectedHospital.longitude }}
                onCloseClick={() => setSelectedHospital(null)}
              >
                <div className="p-1 max-w-xs">
                  <h3 className="font-bold text-base mb-1">{selectedHospital.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{selectedHospital.address}</p>
                  <p className="text-sm text-gray-600 mb-1">Phone: {selectedHospital.phone}</p>
                  {selectedHospital.emergency && (
                    <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">Emergency Services</span>
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
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Get Directions →
                  </a>
                  <div className="mt-2 flex space-x-2">
                    <button type="button" onClick={() => startAudioNavigation(selectedHospital)} className="px-3 py-1 bg-cyan-500 text-white text-sm rounded hover:bg-cyan-600">Navigate (Audio)</button>
                    <a href={getDirectionsUrl(selectedHospital.latitude, selectedHospital.longitude, location?.lat, location?.lng)} target="_blank" rel="noopener noreferrer" className="px-3 py-1 border border-gray-200 text-sm rounded hover:bg-gray-50">Open Directions</a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
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
                      <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">Emergency Services</span>
                    )}
                    <a href={getDirectionsUrl(hospital.latitude, hospital.longitude, location?.lat, location?.lng)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Get Directions →</a>
                    <div className="mt-2 flex space-x-2">
                      <button type="button" onClick={() => startAudioNavigation(hospital)} className="px-3 py-1 bg-cyan-500 text-white text-sm rounded hover:bg-cyan-600">Navigate (Audio)</button>
                      <a href={getDirectionsUrl(hospital.latitude, hospital.longitude, location?.lat, location?.lng)} target="_blank" rel="noopener noreferrer" className="px-3 py-1 border border-gray-200 text-sm rounded hover:bg-gray-50">Open Directions</a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
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
            <div className="flex items-center space-x-3">
              <button
                onClick={() => startAudioNavigation(hospital)}
                className="px-3 py-1 bg-cyan-500 text-white text-sm rounded hover:bg-cyan-600"
              >
                Navigate (Audio)
              </button>
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
          </div>
        ))}
      </div>

      {/* Audio navigation pane */}
      {navigatingId && (
        <div className="fixed bottom-6 right-6 w-96 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <strong className="text-sm">Audio Navigation</strong>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleSpeech}
                className="px-3 py-1 bg-gray-100 rounded text-sm"
              >
                {isSpeaking ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={stopSpeech}
                className="px-3 py-1 bg-red-50 text-red-600 rounded text-sm"
              >
                Stop
              </button>
            </div>
          </div>
          <div className="max-h-56 overflow-auto text-sm space-y-2">
            {routeSteps.length === 0 ? (
              <p className="text-gray-500">Preparing route...</p>
            ) : (
              routeSteps.map((s, i) => (
                <div key={i} className="text-gray-700">
                  <span className="font-semibold mr-2">{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Confirmation modal */}
      {showConfirm && pendingHospital && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 max-w-md">
            <h3 className="text-lg font-semibold mb-2">Start Audio Navigation</h3>
            <p className="text-sm text-gray-700 mb-4">Start audio directions to <strong>{pendingHospital.name}</strong>?</p>
            <div className="flex items-center mb-4">
              <input id="dontask" type="checkbox" className="mr-2" onChange={(e) => {
                if (typeof window !== 'undefined') {
                  if (e.target.checked) localStorage.setItem('remodocAudioNavDontAsk', '1')
                  else localStorage.removeItem('remodocAudioNavDontAsk')
                }
              }} />
              <label htmlFor="dontask" className="text-sm text-gray-600">Don't ask again</label>
            </div>
            <div className="flex justify-end space-x-2">
              <button className="px-3 py-1 text-sm rounded" onClick={() => { setShowConfirm(false); setPendingHospital(null) }}>Cancel</button>
              <button className="px-3 py-1 bg-cyan-500 text-white rounded text-sm" onClick={() => pendingHospital && startAudioNavigation(pendingHospital)}>Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

