import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendEmergencySMS(
  phoneNumber: string,
  message: string,
  location?: { lat: number; lng: number }
): Promise<void> {
  try {
    const locationText = location
      ? `\nLocation: https://www.google.com/maps?q=${location.lat},${location.lng}`
      : ''
    
    await client.messages.create({
      body: `🚨 EMERGENCY ALERT 🚨\n\n${message}${locationText}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })
  } catch (error) {
    console.error('SMS Error:', error)
    throw new Error('Failed to send emergency SMS')
  }
}

