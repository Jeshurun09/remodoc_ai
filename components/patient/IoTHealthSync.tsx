'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface VitalsData {
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

export default function IoTHealthSync() {
  const { data: session } = useSession()
  const [isScanning, setIsScanning] = useState(false)
  const [connectedDevices, setConnectedDevices] = useState<string[]>([])
  const [vitals, setVitals] = useState<VitalsData | null>(null)
  const [vitalsHistory, setVitalsHistory] = useState<VitalsData[]>([])

  useEffect(() => {
    fetchVitalsHistory()
  }, [])

  const scanForDevices = async () => {
    setIsScanning(true)
    try {
      // Simulate Bluetooth device scanning
      // In a real implementation, this would use Web Bluetooth API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock devices
      const mockDevices = [
        'Apple Watch Series 9',
        'Fitbit Charge 6',
        'Samsung Galaxy Watch',
        'Oura Ring Gen 3'
      ]
      
      setConnectedDevices(mockDevices)
      alert('Found ' + mockDevices.length + ' devices. Click "Connect" to sync data.')
    } catch (error) {
      console.error('Failed to scan devices:', error)
      alert('Bluetooth scanning failed. Please ensure Bluetooth is enabled.')
    } finally {
      setIsScanning(false)
    }
  }

  const connectDevice = async (deviceName: string) => {
    try {
      // Simulate device connection and data sync
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock vitals data
      const mockVitals: VitalsData = {
        heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
        spO2: Math.floor(Math.random() * 5) + 95, // 95-100%
        bloodPressureSystolic: Math.floor(Math.random() * 30) + 110, // 110-140
        bloodPressureDiastolic: Math.floor(Math.random() * 20) + 70, // 70-90
        temperature: Math.floor(Math.random() * 20) + 97, // 97-99°F
        glucose: Math.floor(Math.random() * 40) + 80, // 80-120 mg/dL
        deviceType: deviceName.includes('Watch') ? 'smartwatch' : 
                   deviceName.includes('Ring') ? 'smart_ring' : 'fitness_band',
        deviceName,
        recordedAt: new Date().toISOString()
      }
      
      setVitals(mockVitals)
      await saveVitals(mockVitals)
      alert(`Successfully synced data from ${deviceName}`)
    } catch (error) {
      console.error('Failed to connect device:', error)
      alert('Failed to connect device')
    }
  }

  const saveVitals = async (data: VitalsData) => {
    if (!session?.user?.id) return
    try {
      const res = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        fetchVitalsHistory()
      }
    } catch (error) {
      console.error('Failed to save vitals:', error)
    }
  }

  const fetchVitalsHistory = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch('/api/vitals')
      if (res.ok) {
        const data = await res.json()
        setVitalsHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch vitals history:', error)
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

      {/* Device Scanning */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Connect Devices</h3>
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={scanForDevices}
            disabled={isScanning}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Scan for Devices'}
          </button>
          <p className="text-sm text-cyan-500">
            Connect via Bluetooth: Smartwatches, Fitness Bands, Smart Rings
          </p>
        </div>

        {connectedDevices.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-cyan-500 mb-2">Available Devices:</p>
            {connectedDevices.map((device, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <div className="font-semibold text-cyan-500">{device}</div>
                  <div className="text-xs text-gray-500">
                    {device.includes('Watch') ? 'Smartwatch' : 
                     device.includes('Ring') ? 'Smart Ring' : 'Fitness Band'}
                  </div>
                </div>
                <button
                  onClick={() => connectDevice(device)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Vitals */}
      {vitals && (
        <div className="surface rounded-lg p-6 border subtle-border">
          <h3 className="text-lg font-semibold text-cyan-500 mb-4">Latest Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {vitals.heartRate && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Heart Rate</div>
                <div className="text-2xl font-bold text-cyan-500">{vitals.heartRate}</div>
                <div className="text-xs text-gray-500">bpm</div>
              </div>
            )}
            {vitals.spO2 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">SpO₂</div>
                <div className="text-2xl font-bold text-cyan-500">{vitals.spO2}%</div>
                <div className="text-xs text-gray-500">Oxygen Saturation</div>
              </div>
            )}
            {vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Blood Pressure</div>
                <div className="text-2xl font-bold text-cyan-500">
                  {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}
                </div>
                <div className="text-xs text-gray-500">mmHg</div>
              </div>
            )}
            {vitals.temperature && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Temperature</div>
                <div className="text-2xl font-bold text-cyan-500">{vitals.temperature}°F</div>
                <div className="text-xs text-gray-500">Body Temp</div>
              </div>
            )}
            {vitals.glucose && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Glucose</div>
                <div className="text-2xl font-bold text-cyan-500">{vitals.glucose}</div>
                <div className="text-xs text-gray-500">mg/dL</div>
              </div>
            )}
            {vitals.deviceName && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Device</div>
                <div className="text-lg font-semibold text-cyan-500">{vitals.deviceName}</div>
                <div className="text-xs text-gray-500">
                  {new Date(vitals.recordedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vitals History */}
      {vitalsHistory.length > 0 && (
        <div className="surface rounded-lg p-6 border subtle-border">
          <h3 className="text-lg font-semibold text-cyan-500 mb-4">Vitals History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-cyan-500">Date</th>
                  <th className="text-left p-2 text-cyan-500">HR</th>
                  <th className="text-left p-2 text-cyan-500">SpO₂</th>
                  <th className="text-left p-2 text-cyan-500">BP</th>
                  <th className="text-left p-2 text-cyan-500">Temp</th>
                  <th className="text-left p-2 text-cyan-500">Glucose</th>
                </tr>
              </thead>
              <tbody>
                {vitalsHistory.map((v, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 text-cyan-500">
                      {new Date(v.recordedAt).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-cyan-500">{v.heartRate || '-'}</td>
                    <td className="p-2 text-cyan-500">{v.spO2 ? `${v.spO2}%` : '-'}</td>
                    <td className="p-2 text-cyan-500">
                      {v.bloodPressureSystolic && v.bloodPressureDiastolic
                        ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
                        : '-'}
                    </td>
                    <td className="p-2 text-cyan-500">{v.temperature ? `${v.temperature}°F` : '-'}</td>
                    <td className="p-2 text-cyan-500">{v.glucose || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

