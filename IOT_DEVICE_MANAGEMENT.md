# IoT Device Management with Bluetooth Integration

## Overview

The IoT Health Sync feature enables patients to connect their Bluetooth-enabled health devices (smartwatches, fitness bands, smart rings, etc.) and automatically sync vital signs data to their health records.

## Supported Devices

- **Smartwatches**: Apple Watch, Samsung Galaxy Watch, Garmin, Fitbit Versa
- **Fitness Bands**: Fitbit, Xiaomi Mi Band, Samsung Galaxy Fit
- **Smart Rings**: Oura Ring, Samsung Galaxy Ring
- **Blood Pressure Monitors**: Withings, Omron, Qardio
- **Weight Scales**: Withings Body Scale, Xiaomi Mi Scale
- **Glucose Meters**: Dexcom, FreeStyle Libre
- **Other**: Any device with standard Bluetooth Health services

## Features

✅ **Web Bluetooth API Integration**: Direct connection to devices without app
✅ **Multi-Device Support**: Connect multiple devices simultaneously
✅ **Automatic Vitals Sync**: Real-time data collection from devices
✅ **Device Management**: Add, remove, and configure devices
✅ **Vitals History**: Track readings over time
✅ **Battery Monitoring**: Monitor connected device battery levels
✅ **Customizable Sync Intervals**: Set sync frequency (5-60 minutes)

## Technical Architecture

### Backend Components

#### API Endpoints

**Device Management Endpoints:**
- `GET /api/iot/devices` - List all connected devices
- `POST /api/iot/devices` - Connect new device
- `GET /api/iot/devices/[id]` - Get device details
- `PUT /api/iot/devices/[id]` - Update device settings
- `DELETE /api/iot/devices/[id]` - Disconnect device

**Vitals Endpoints:**
- `GET /api/vitals` - Fetch vitals history
- `POST /api/vitals` - Save vitals reading

#### Database Schema

**IotDevice Model:**
```prisma
model IotDevice {
  id              String   @id @default(cuid()) @map("_id")
  userId          String   // User who owns the device
  deviceId        String   // Bluetooth device ID
  name            String   // User-friendly name
  type            String   // Device type (smartwatch, fitness_band, etc.)
  macAddress      String?  // Bluetooth MAC address
  manufacturer    String?  // Device manufacturer
  isConnected     Boolean  // Current connection status
  lastSync        DateTime // Last sync timestamp
  syncInterval    Int      // Sync frequency in minutes (default: 5)
  dataTypes       String   // JSON array of data types collected
  battery         Int?     // Device battery percentage
  firmwareVersion String?  // Device firmware version
  timezone        String?  // Device timezone
  createdAt       DateTime
  updatedAt       DateTime

  @@unique([userId, deviceId])
}
```

**VitalsData Model:**
```prisma
model VitalsData {
  id                      String   @id @default(cuid()) @map("_id")
  userId                  String
  heartRate               Int?
  spO2                    Float?   // Oxygen saturation
  bloodPressureSystolic   Int?
  bloodPressureDiastolic  Int?
  temperature             Float?
  glucose                 Float?
  deviceType              String?  // Device that recorded the reading
  deviceName              String?
  recordedAt              DateTime @default(now())
  createdAt               DateTime @default(now())
}
```

### Frontend Components

#### IoTDevicePairing.tsx
Handles device discovery and pairing workflow:
- Bluetooth device scanning
- Device selection and connection
- Backend registration
- Error handling and user feedback

#### IoTHealthSync.tsx
Main component displaying:
- Connected devices list with status
- Latest vitals readings
- Vitals history table
- Device management controls

### Bluetooth Utilities

**lib/bluetooth.ts** provides:
- `scanBluetoothDevices()` - Discover nearby Bluetooth devices
- `connectToDevice()` - Establish GATT connection
- `readDeviceCharacteristic()` - Read BLE characteristics
- `readHeartRate()` - Read heart rate data
- `readBloodPressure()` - Read blood pressure data
- `readTemperature()` - Read temperature data
- `readWeight()` - Read weight data
- `readGlucose()` - Read glucose data
- `getAllVitalsFromDevice()` - Collect all available vitals

## User Flow

### 1. Device Discovery
1. User clicks "Add Device" on IoT dashboard
2. Opens pairing modal
3. Clicks "Scan for Bluetooth Devices"
4. Browser prompts for Bluetooth access
5. System scans and lists nearby health devices
6. User selects their device

### 2. Device Connection
1. User clicks "Connect" on selected device
2. System establishes Bluetooth connection
3. Reads device information and capabilities
4. Registers device on backend API
5. Device appears in "Connected Devices" list

### 3. Vitals Syncing
1. System automatically syncs vitals every 5 minutes (configurable)
2. Reads available vitals from device (heart rate, BP, etc.)
3. Saves readings to backend via `/api/vitals` endpoint
4. Updates "Latest Vitals" display
5. Maintains history in vitals table

### 4. Device Management
- View connected devices status
- See last sync time and battery level
- Update device name and sync interval
- Disconnect device when no longer needed

## Browser Support

### Fully Supported
- **Chrome 56+** (Windows, macOS, Linux)
- **Edge 79+** (Windows)
- **Opera 43+** (Windows, macOS, Linux)
- **Android Chrome 57+**
- **Samsung Internet 6+** (Android)

### Limited Support
- **macOS Safari** - Requires system-level Bluetooth permissions
- **iOS Safari** - Limited to iOS 13.1+, only WebBluetooth secure contexts

### Not Supported
- **Firefox** - No Web Bluetooth API support
- **Internet Explorer** - No support
- **Older browsers** - Requires modern WebBluetooth implementation

## Setting Up IoT Devices

### Prerequisites
- Windows 10/11, macOS, or Linux with Bluetooth hardware
- Modern browser with Web Bluetooth support
- Bluetooth device with health services (BLE)
- Android 5.0+ or iOS 13.1+ for mobile

### Steps

1. **Enable Bluetooth on Device**
   - Ensure health device is powered on
   - Put device in discovery/pairing mode
   - Make sure Bluetooth is visible

2. **Access IoT Dashboard**
   - Login to patient dashboard
   - Navigate to IoT & Wearable Health Sync
   - Click "+ Add Device"

3. **Scan for Devices**
   - Click "Scan for Bluetooth Devices"
   - Allow browser Bluetooth access when prompted
   - Wait for device list to populate

4. **Connect Device**
   - Select your device from the list
   - Click "Connect"
   - Wait for connection confirmation
   - Device will appear in "Connected Devices"

5. **Configure Settings** (Optional)
   - Click device to open settings
   - Change device name if desired
   - Adjust sync interval (5-60 minutes)
   - Save changes

## API Integration Guide

### Connect a Device

**Request:**
```bash
POST /api/iot/devices
Content-Type: application/json

{
  "deviceId": "abc123def456",
  "name": "My Apple Watch",
  "type": "smartwatch",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "dataTypes": ["heart_rate", "blood_pressure", "temperature"],
  "manufacturer": "Apple",
  "timezone": "America/Chicago"
}
```

**Response:**
```json
{
  "message": "Device connected successfully",
  "device": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "deviceId": "abc123def456",
    "name": "My Apple Watch",
    "type": "smartwatch",
    "isConnected": true,
    "lastSync": "2024-01-15T10:30:00Z",
    "syncInterval": 5,
    "battery": 85,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### Save Vitals Reading

**Request:**
```bash
POST /api/vitals
Content-Type: application/json

{
  "heartRate": 72,
  "spO2": 98,
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "temperature": 98.6,
  "glucose": 105,
  "deviceType": "smartwatch",
  "deviceName": "Apple Watch Series 9"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439012",
  "heartRate": 72,
  "spO2": 98,
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "temperature": 98.6,
  "glucose": 105,
  "deviceType": "smartwatch",
  "deviceName": "Apple Watch Series 9",
  "recordedAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Update Device Settings

**Request:**
```bash
PUT /api/iot/devices/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "name": "Updated Device Name",
  "syncInterval": 10,
  "battery": 75
}
```

**Response:**
```json
{
  "message": "Device updated",
  "device": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Updated Device Name",
    "syncInterval": 10,
    "battery": 75,
    "lastSync": "2024-01-15T10:30:00Z"
  }
}
```

### Disconnect Device

**Request:**
```bash
DELETE /api/iot/devices/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "message": "Device disconnected"
}
```

## Error Handling

### Common Errors

**"No Bluetooth support"**
- Browser doesn't support Web Bluetooth API
- Solution: Use Chrome, Edge, or Opera

**"Permission denied"**
- User rejected browser Bluetooth access
- Solution: Check browser permissions, try again

**"Device not found"**
- Device is not nearby or not in discovery mode
- Solution: Enable Bluetooth on device, retry scan

**"Connection failed"**
- Device unreachable or incompatible
- Solution: Move closer to device, restart both

**"Device already connected"**
- Device is already paired to account
- Solution: Disconnect first or use different device

## Troubleshooting

### Device Not Appearing in Scan

1. **Check device is powered on** and visible
2. **Enable Bluetooth** on your computer/phone
3. **Put device in pairing mode** (varies by device)
4. **Move closer** to the device
5. **Restart browser** and try again
6. **Check browser support** - may need different browser

### Connection Keeps Failing

1. **Restart the device** - power off and on
2. **Clear browser cache** - may have outdated connection info
3. **Check browser permissions** - ensure Bluetooth is allowed
4. **Try different browser** - WebBluetooth implementation varies
5. **Update device firmware** - may have compatibility issues

### Vitals Not Syncing

1. **Check device still connected** - look at status indicator
2. **Verify connection is active** - reconnect if needed
3. **Check sync interval** - may be waiting for next sync time
4. **View device battery** - low battery may prevent sync
5. **Check browser console** for error messages

### Battery Drains Quickly

1. **Reduce sync interval** - less frequent syncing uses less battery
2. **Disable unused data types** - only collect needed vitals
3. **Check for connection issues** - retries consume battery
4. **Update device firmware** - may improve battery life

## Security & Privacy

### Data Protection

- All vitals data encrypted in transit (HTTPS/TLS)
- Data stored in secure MongoDB database
- User authentication via NextAuth on all endpoints
- Device ownership verification before operations

### Bluetooth Security

- Web Bluetooth API uses GATT protocol (industry standard)
- Device pairing creates secure connection
- No data transmitted without user authorization
- Automatic disconnection after inactivity

### Permissions

- Browser prompts for Bluetooth access (user must approve)
- Only reading health data (no write operations)
- Limited to paired devices only
- User can revoke access anytime

## Advanced Configuration

### Custom Sync Intervals

Set sync interval when connecting device (5-60 minutes):
```javascript
// Sync every 15 minutes
await connectDevice({
  ...device,
  syncInterval: 15
})
```

### Data Type Selection

Specify which vitals to collect:
```javascript
const dataTypes = [
  'heart_rate',
  'blood_pressure', 
  'temperature',
  // 'weight', 'glucose' - optional
]
```

### Batch Vitals Sync

For better performance, batch multiple readings:
```javascript
const vitals = await getAllVitalsFromDevice(gattServer)
// Returns all available vitals in single call
```

## Performance Optimization

- **Caching**: Last sync time cached to avoid redundant reads
- **Batching**: Multiple vitals collected in single connection
- **Polling**: Configurable sync intervals reduce battery drain
- **Cleanup**: Auto-disconnect after inactivity

## Future Enhancements

- [ ] iOS native app integration (bypassing WebBluetooth limitation)
- [ ] Wearable app notifications for critical vitals
- [ ] Advanced analytics and trend detection
- [ ] Integration with health insurance providers
- [ ] Doctor notifications for abnormal readings
- [ ] Machine learning for anomaly detection
- [ ] HIPAA compliance certification
- [ ] Support for additional device protocols (ANT+, Zigbee)

## Support & Resources

- **Bluetooth Specification**: https://www.bluetooth.com/
- **Web Bluetooth API Docs**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
- **Supported Services**: https://github.com/WebBluetoothCG/registries
- **Browser Compatibility**: https://caniuse.com/web-bluetooth
