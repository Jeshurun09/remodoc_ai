'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import IoTDevicePairing from './IoTDevicePairing'
import { getDeviceIcon, getDeviceTypeName } from '@/lib/bluetooth'

interface VitalsData {
  id?: string
  heartRate?: number
  spO2?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  temperature?: number
  glucose?: number
  deviceType?: string
  deviceName?: string
  recordedAt: string
}

interface ConnectedDevice {
  id: string
  name: string
  type: string
  isConnected: boolean
  lastSync?: string
  battery?: number
  syncInterval: number
}

export default function IoTHealthSync() {
  const { data: session } = useSession()
  const [showPairing, setShowPairing] = useState(false)
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([])
  const [vitals, setVitals] = useState<VitalsData | null>(null)
  const [vitalsHistory, setVitalsHistory] = useState<VitalsData[]>([])
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch connected devices
  const fetchConnectedDevices = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const response = await fetch('/api/iot/devices')
      if (response.ok) {
        const data = await response.json()
        setConnectedDevices(data.devices || [])
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    } finally {
      setLoadingDevices(false)
    }
  }, [session?.user?.id])

  // Fetch vitals history
  const fetchVitalsHistory = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const response = await fetch('/api/vitals')
      if (response.ok) {
        const data = await response.json()
        setVitalsHistory(Array.isArray(data) ? data : data.vitals || [])
      }
    } catch (error) {
      console.error('Failed to fetch vitals history:', error)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchConnectedDevices()
    fetchVitalsHistory()
    
    // Refresh devices and vitals every 5 minutes
    const interval = setInterval(() => {
      fetchConnectedDevices()
      fetchVitalsHistory()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchConnectedDevices, fetchVitalsHistory])

  const saveVitals = async (data: VitalsData) => {
    if (!session?.user?.id) return
    try {
      const response = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        fetchVitalsHistory()
        const latest = await response.json()
        setVitals(latest)
      }
    } catch (error) {
      console.error('Failed to save vitals:', error)
    }
  }

  const handleDeviceConnected = async (device: ConnectedDevice) => {
    setConnectedDevices(prev => [...prev, device])
    setShowPairing(false)
  }

  const handleDisconnectDevice = async (deviceId: string) => {
    if (!confirm('Disconnect this device?')) return

    try {
      const response = await fetch(`/api/iot/devices/${deviceId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setConnectedDevices(prev => prev.filter(d => d.id !== deviceId))
      }
    } catch (error) {
      console.error('Failed to disconnect device:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyan-500">IoT & Wearable Health Sync</h2>
        <Link href="/premium" className="text-sm text-cyan-500 hover:underline">
          Upgrade to Premium
        </Link>
      </div>

      {/* Pairing Modal */}
      {showPairing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-h-96 overflow-y-auto">
            <IoTDevicePairing
              onDeviceConnected={handleDeviceConnected}
              onClose={() => setShowPairing(false)}
            />
          </div>
        </div>
      )}

      {/* Connected Devices Section */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-cyan-500">Connected Devices</h3>
          <button
            onClick={() => setShowPairing(true)}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm font-semibold"
          >
            + Add Device
          </button>
        </div>

        {loadingDevices ? (
          <div className="text-center py-4 text-gray-500">Loading devices...</div>
        ) : connectedDevices.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📱</div>
            <p className="text-gray-600 mb-4">No devices connected yet</p>
            <button
              onClick={() => setShowPairing(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Connect Your First Device
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Supported: Apple Watch, Fitbit, Samsung Galaxy Watch, Oura Ring, and more
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connectedDevices.map(device => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{getDeviceIcon(device.type as any)}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-600">{getDeviceTypeName(device.type as any)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          device.isConnected ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <span className="text-xs text-gray-500">
                        {device.isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                      {device.battery !== undefined && (
                        <span className="text-xs text-gray-500">
                          • Battery: {device.battery}%
                        </span>
                      )}
                      {device.lastSync && (
                        <span className="text-xs text-gray-500">
                          • Last sync: {new Date(device.lastSync).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnectDevice(device.id)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-semibold"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Vitals */}
      {vitalsHistory.length > 0 && (
        <div className="surface rounded-lg p-6 border subtle-border">
          <h3 className="text-lg font-semibold text-cyan-500 mb-4">Latest Vitals</h3>
          {vitalsHistory[0] && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {vitalsHistory[0].heartRate && (
                <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                  <div className="text-sm text-red-600 font-semibold">❤️ Heart Rate</div>
                  <div className="text-3xl font-bold text-red-600 mt-1">{vitalsHistory[0].heartRate}</div>
                  <div className="text-xs text-red-500 mt-1">bpm</div>
                </div>
              )}
              {vitalsHistory[0].spO2 && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-semibold">💨 SpO₂</div>
                  <div className="text-3xl font-bold text-blue-600 mt-1">{vitalsHistory[0].spO2}%</div>
                  <div className="text-xs text-blue-500 mt-1">Oxygen</div>
                </div>
              )}
              {vitalsHistory[0].bloodPressureSystolic && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-600 font-semibold">📊 BP</div>
                  <div className="text-2xl font-bold text-purple-600 mt-1">
                    {vitalsHistory[0].bloodPressureSystolic}/{vitalsHistory[0].bloodPressureDiastolic}
                  </div>
                  <div className="text-xs text-purple-500 mt-1">mmHg</div>
                </div>
              )}
              {vitalsHistory[0].temperature && (
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="text-sm text-orange-600 font-semibold">🌡️ Temp</div>
                  <div className="text-3xl font-bold text-orange-600 mt-1">{vitalsHistory[0].temperature}°</div>
                  <div className="text-xs text-orange-500 mt-1">°F</div>
                </div>
              )}
              {vitalsHistory[0].glucose && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-semibold">🩸 Glucose</div>
                  <div className="text-3xl font-bold text-green-600 mt-1">{vitalsHistory[0].glucose}</div>
                  <div className="text-xs text-green-500 mt-1">mg/dL</div>
                </div>
              )}
              {vitalsHistory[0].deviceName && (
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600 font-semibold">📱 Device</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">{vitalsHistory[0].deviceName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(vitalsHistory[0].recordedAt).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Vitals History Table */}
      {vitalsHistory.length > 0 && (
        <div className="surface rounded-lg p-6 border subtle-border overflow-x-auto">
          <h3 className="text-lg font-semibold text-cyan-500 mb-4">Vitals History</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3 text-cyan-600 font-semibold">Date & Time</th>
                <th className="text-left p-3 text-cyan-600 font-semibold">❤️ HR</th>
                <th className="text-left p-3 text-cyan-600 font-semibold">💨 SpO₂</th>
                <th className="text-left p-3 text-cyan-600 font-semibold">📊 BP</th>
                <th className="text-left p-3 text-cyan-600 font-semibold">🌡️ Temp</th>
                <th className="text-left p-3 text-cyan-600 font-semibold">🩸 Glucose</th>
                <th className="text-left p-3 text-cyan-600 font-semibold">Device</th>
              </tr>
            </thead>
            <tbody>
              {vitalsHistory.slice(0, 10).map((v, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-gray-700 text-xs">
                    {new Date(v.recordedAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-gray-700 font-semibold">{v.heartRate || '-'}</td>
                  <td className="p-3 text-gray-700 font-semibold">{v.spO2 ? `${v.spO2}%` : '-'}</td>
                  <td className="p-3 text-gray-700 font-semibold">
                    {v.bloodPressureSystolic && v.bloodPressureDiastolic
                      ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
                      : '-'}
                  </td>
                  <td className="p-3 text-gray-700 font-semibold">
                    {v.temperature ? `${v.temperature}°F` : '-'}
                  </td>
                  <td className="p-3 text-gray-700 font-semibold">{v.glucose || '-'}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.deviceName || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vitalsHistory.length > 10 && (
            <p className="text-center text-xs text-gray-500 mt-3">
              Showing latest 10 readings • Total: {vitalsHistory.length} readings
            </p>
          )}
        </div>
      )}
    </div>
  )
}

