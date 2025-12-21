'use client'

import { useState, useCallback, useEffect } from 'react'
import { scanBluetoothDevices, connectToDevice, BluetoothDevice, getDeviceIcon, getDeviceTypeName } from '@/lib/bluetooth'

interface IoTDevicePairingProps {
  onDeviceConnected?: (device: any) => void
  onClose?: () => void
}

export default function IoTDevicePairing({ onDeviceConnected, onClose }: IoTDevicePairingProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [connectedDevices, setConnectedDevices] = useState<any[]>([])
  const [loadingDevices, setLoadingDevices] = useState(true)

  // Fetch already connected devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/iot/devices')
        if (response.ok) {
          const data = await response.json()
          setConnectedDevices(data.devices || [])
        }
      } catch (err) {
        console.error('Failed to fetch devices:', err)
      } finally {
        setLoadingDevices(false)
      }
    }

    fetchDevices()
  }, [])

  const handleScan = useCallback(async () => {
    setIsScanning(true)
    setError(null)
    setSuccess(null)
    setDevices([])

    try {
      const scannedDevices = await scanBluetoothDevices()
      setDevices(scannedDevices)
      if (scannedDevices.length === 0) {
        setError('No Bluetooth devices found. Please make sure your device is nearby and discoverable.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan for Bluetooth devices')
    } finally {
      setIsScanning(false)
    }
  }, [])

  const handleConnect = useCallback(async (device: BluetoothDevice) => {
    setIsConnecting(true)
    setError(null)
    setSuccess(null)

    try {
      // Connect via Bluetooth
      const gattServer = await connectToDevice(device)

      // Register device on backend
      const response = await fetch('/api/iot/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: device.id,
          name: device.name,
          type: device.type,
          macAddress: device.macAddress,
          manufacturer: device.name?.split(' ')[0],
          dataTypes: ['heart_rate', 'blood_pressure', 'temperature']
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to register device')
      }

      const connectedData = await response.json()
      setSuccess(`${device.name} connected successfully!`)
      setSelectedDevice(null)
      setDevices([])

      // Update connected devices list
      setConnectedDevices(prev => [...prev, connectedData.device])

      // Call callback if provided
      if (onDeviceConnected) {
        onDeviceConnected(connectedData.device)
      }

      // Auto-close after success
      setTimeout(() => {
        if (onClose) onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to connect device')
    } finally {
      setIsConnecting(false)
    }
  }, [onDeviceConnected, onClose])

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Connect IoT Device</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pair your health device via Bluetooth to sync vitals automatically
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 flex items-center gap-2">
            <span className="text-xl">⚠️</span> {error}
          </p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 flex items-center gap-2">
            <span className="text-xl">✓</span> {success}
          </p>
        </div>
      )}

      {/* Scan Button */}
      <div className="mb-6">
        <button
          onClick={handleScan}
          disabled={isScanning || isConnecting}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <span className="animate-spin">🔄</span>
              Scanning for devices...
            </>
          ) : (
            <>
              <span>📡</span>
              Scan for Bluetooth Devices
            </>
          )}
        </button>
      </div>

      {/* Device List */}
      {devices.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Found Devices ({devices.length})</h3>
          <div className="space-y-2">
            {devices.map(device => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{getDeviceIcon(device.type)}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-600">{getDeviceTypeName(device.type)}</p>
                    {device.macAddress && (
                      <p className="text-xs text-gray-500">{device.macAddress}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(device)}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-2"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Devices */}
      {!loadingDevices && connectedDevices.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Connected Devices ({connectedDevices.length})</h3>
          <div className="space-y-2">
            {connectedDevices.map(device => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-transparent"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">✓</span>
                  <div>
                    <p className="font-semibold text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-600">{getDeviceTypeName(device.type)}</p>
                    {device.lastSync && (
                      <p className="text-xs text-gray-500">
                        Last synced: {new Date(device.lastSync).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                {device.isConnected && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Connected
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Information */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <p className="font-semibold mb-2 text-blue-900">💡 How it works:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>Click "Scan for Bluetooth Devices" to find nearby health devices</li>
          <li>Select your device from the list and click "Connect"</li>
          <li>Allow Bluetooth access when prompted by your browser</li>
          <li>Your vitals will sync automatically every 5 minutes</li>
          <li>Supported devices: Apple Watch, Fitbit, Samsung Galaxy Watch, and more</li>
        </ul>
      </div>

      {/* Browser Support Info */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
        <p>
          <strong>Note:</strong> Web Bluetooth API requires Chrome, Edge, or Opera on Windows/Mac/Linux, or Android.
          iOS support is limited. Ensure Bluetooth is enabled on your device.
        </p>
      </div>
    </div>
  )
}
