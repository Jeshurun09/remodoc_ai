// Web Bluetooth API utilities for connecting and scanning devices
// Supported devices: Smartwatches, Fitness Bands, Smart Rings, Blood Pressure Monitors, etc.

export interface BluetoothDevice {
  id: string
  name: string
  type: 'smartwatch' | 'fitness_band' | 'smart_ring' | 'bp_monitor' | 'scale' | 'glucose_meter' | 'unknown'
  rssi?: number
  macAddress?: string
  // Use any for services to avoid DOM-only BluetoothServiceUUID type in server builds
  services?: any[]
}

// Standard Bluetooth Health Device Services
const BLUETOOTH_SERVICES = {
  // Heart Rate Service
  HEART_RATE: 0x180d,
  // Blood Pressure Service
  BLOOD_PRESSURE: 0x1810,
  // Temperature Service
  HEALTH_THERMOMETER: 0x1809,
  // Weight Scale
  WEIGHT_SCALE: 0x181d,
  // Continuous Glucose Monitoring
  GLUCOSE: 0x1808,
  // Device Information
  DEVICE_INFO: 0x180a,
  // Generic Access
  GENERIC_ACCESS: 0x1800
}

// Map device names to types
const DEVICE_TYPE_MAP: Record<string, BluetoothDevice['type']> = {
  'watch': 'smartwatch',
  'apple watch': 'smartwatch',
  'samsung galaxy watch': 'smartwatch',
  'garmin': 'smartwatch',
  'fitbit': 'fitness_band',
  'band': 'fitness_band',
  'oura': 'smart_ring',
  'ring': 'smart_ring',
  'withings': 'bp_monitor',
  'blood pressure': 'bp_monitor',
  'scale': 'scale',
  'glucose': 'glucose_meter',
  'dexcom': 'glucose_meter'
}

export async function scanBluetoothDevices(): Promise<BluetoothDevice[]> {
  // Check if Web Bluetooth API is supported
  if (!(navigator as any).bluetooth) {
    throw new Error('Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or Opera.')
  }

  try {
    // Request Bluetooth device discovery with specific filters
    const filters = [
      // Heart rate monitors
      { services: [BLUETOOTH_SERVICES.HEART_RATE] },
      // Blood pressure monitors
      { services: [BLUETOOTH_SERVICES.BLOOD_PRESSURE] },
      // Temperature sensors
      { services: [BLUETOOTH_SERVICES.HEALTH_THERMOMETER] },
      // Weight scales
      { services: [BLUETOOTH_SERVICES.WEIGHT_SCALE] },
      // Glucose monitors
      { services: [BLUETOOTH_SERVICES.GLUCOSE] },
      // Generic device discovery (fallback)
      { namePrefix: 'Apple' },
      { namePrefix: 'Fitbit' },
      { namePrefix: 'Samsung' },
      { namePrefix: 'Garmin' }
    ]

    const device = await (navigator as any).bluetooth.requestDevice({
      filters,
      optionalServices: [
        BLUETOOTH_SERVICES.HEART_RATE,
        BLUETOOTH_SERVICES.BLOOD_PRESSURE,
        BLUETOOTH_SERVICES.HEALTH_THERMOMETER,
        BLUETOOTH_SERVICES.WEIGHT_SCALE,
        BLUETOOTH_SERVICES.GLUCOSE,
        BLUETOOTH_SERVICES.DEVICE_INFO
      ]
    })

    if (!device) {
      throw new Error('No device selected')
    }

    const detectedDevice = parseBluetoothDevice(device)
    return [detectedDevice]
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      throw new Error('No devices found. Please ensure Bluetooth is enabled and devices are nearby.')
    }
    if (error.name === 'NotAllowedError') {
      throw new Error('Bluetooth permission was denied. Please allow Bluetooth access.')
    }
    throw error
  }
}

export async function connectToDevice(device: BluetoothDevice): Promise<any> {
  if (!(navigator as any).bluetooth) {
    throw new Error('Web Bluetooth API is not supported')
  }

  try {
    // Request device again for connection
    const btDevice = await (navigator as any).bluetooth.requestDevice({
      filters: [{ name: device.name }],
      optionalServices: Object.values(BLUETOOTH_SERVICES)
    })

    if (!btDevice) {
      throw new Error('Device selection cancelled')
    }

    // Connect to device
    const server = await btDevice.gatt?.connect()
    if (!server) {
      throw new Error('Failed to connect to GATT server')
    }

    return server
  } catch (error) {
    console.error('Failed to connect to Bluetooth device:', error)
    throw error
  }
}

export async function readDeviceCharacteristic(
  server: any,
  serviceUUID: number,
  characteristicUUID: string
): Promise<DataView | undefined> {
  try {
    const service = await server.getPrimaryService(serviceUUID)
    const characteristic = await service.getCharacteristic(characteristicUUID)
    const value = await characteristic.readValue()
    return value
  } catch (error) {
    console.error('Failed to read characteristic:', error)
    return undefined
  }
}

export async function readHeartRate(server: any): Promise<number | undefined> {
  try {
    const value = await readDeviceCharacteristic(
      server,
      BLUETOOTH_SERVICES.HEART_RATE,
      'heart_rate_measurement'
    )

    if (!value || value.byteLength === 0) return undefined

    // Heart Rate Measurement characteristic format
    const flags = value.getUint8(0)
    const is16Bit = flags & 0x01

    if (is16Bit) {
      return value.getUint16(1, true)
    } else {
      return value.getUint8(1)
    }
  } catch (error) {
    console.error('Failed to read heart rate:', error)
    return undefined
  }
}

export async function readBloodPressure(
  server: any
): Promise<{ systolic: number; diastolic: number; map: number } | undefined> {
  try {
    const value = await readDeviceCharacteristic(
      server,
      BLUETOOTH_SERVICES.BLOOD_PRESSURE,
      'blood_pressure_measurement'
    )

    if (!value || value.byteLength < 7) return undefined

    // Blood Pressure Measurement characteristic format (IEEE 11073 format)
    const flags = value.getUint8(0)
    const systolic = value.getInt16(1, true) / 256
    const diastolic = value.getInt16(3, true) / 256
    const map = value.getInt16(5, true) / 256

    return { systolic, diastolic, map }
  } catch (error) {
    console.error('Failed to read blood pressure:', error)
    return undefined
  }
}

export async function readTemperature(server: any): Promise<number | undefined> {
  try {
    const value = await readDeviceCharacteristic(
      server,
      BLUETOOTH_SERVICES.HEALTH_THERMOMETER,
      'temperature_measurement'
    )

    if (!value || value.byteLength < 5) return undefined

    // Temperature Measurement characteristic format (IEEE 11073 format)
    const flags = value.getUint8(0)
    const temp = value.getInt32(1, true) / 10000
    return temp
  } catch (error) {
    console.error('Failed to read temperature:', error)
    return undefined
  }
}

export async function readWeight(server: any): Promise<number | undefined> {
  try {
    const value = await readDeviceCharacteristic(
      server,
      BLUETOOTH_SERVICES.WEIGHT_SCALE,
      'weight_measurement'
    )

    if (!value || value.byteLength < 3) return undefined

    // Weight Measurement characteristic format
    const flags = value.getUint8(0)
    const weight = value.getUint16(1, true) / 200 // Kg
    return weight
  } catch (error) {
    console.error('Failed to read weight:', error)
    return undefined
  }
}

export async function readGlucose(server: any): Promise<number | undefined> {
  try {
    const value = await readDeviceCharacteristic(
      server,
      BLUETOOTH_SERVICES.GLUCOSE,
      'glucose_measurement'
    )

    if (!value || value.byteLength < 3) return undefined

    // Glucose Measurement characteristic format
    const flags = value.getUint8(0)
    const glucose = value.getUint16(1, true) / 256 // mg/dL
    return glucose
  } catch (error) {
    console.error('Failed to read glucose:', error)
    return undefined
  }
}

export async function getAllVitalsFromDevice(server: any): Promise<{
  heartRate?: number | undefined
  systolic?: number | undefined
  diastolic?: number | undefined
  temperature?: number | undefined
  weight?: number | undefined
  glucose?: number | undefined
}> {
  const heartRate = await readHeartRate(server)
  const bp = await readBloodPressure(server)
  const temperature = await readTemperature(server)
  const weight = await readWeight(server)
  const glucose = await readGlucose(server)

  return {
    heartRate: heartRate ?? undefined,
    systolic: bp?.systolic ?? undefined,
    diastolic: bp?.diastolic ?? undefined,
    temperature: temperature ?? undefined,
    weight: weight ?? undefined,
    glucose: glucose ?? undefined
  }
}

function parseBluetoothDevice(btDevice: any): BluetoothDevice {
  const name = btDevice.name || 'Unknown Device'
  const nameLower = name.toLowerCase()

  // Determine device type
  let type: BluetoothDevice['type'] = 'unknown'
  for (const [key, value] of Object.entries(DEVICE_TYPE_MAP)) {
    if (nameLower.includes(key)) {
      type = value
      break
    }
  }

  return {
    id: btDevice.id,
    name,
    type,
    macAddress: btDevice.address
  }
}

export function getDeviceIcon(deviceType: BluetoothDevice['type']): string {
  const icons: Record<BluetoothDevice['type'], string> = {
    smartwatch: '⌚',
    fitness_band: '📟',
    smart_ring: '💍',
    bp_monitor: '💓',
    scale: '⚖️',
    glucose_meter: '💉',
    unknown: '🔷'
  }
  return icons[deviceType] || icons.unknown
}

export function getDeviceTypeName(deviceType: BluetoothDevice['type']): string {
  const names: Record<BluetoothDevice['type'], string> = {
    smartwatch: 'Smartwatch',
    fitness_band: 'Fitness Band',
    smart_ring: 'Smart Ring',
    bp_monitor: 'Blood Pressure Monitor',
    scale: 'Smart Scale',
    glucose_meter: 'Glucose Meter',
    unknown: 'Bluetooth Device'
  }
  return names[deviceType] || names.unknown
}
