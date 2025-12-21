import twilio from 'twilio'
import { getDirectionsUrl } from './maps'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

// Internal Twilio sender is implemented below as `sendSMSInternal` and an exported
// `sendSMS` wrapper is provided for callers. This avoids exporting internal helpers
// directly and keeps the signature stable.

export async function sendSMS(to: string, body: string) {
  return sendSMSInternal(to, body)
}

// internal implementation to avoid name collision when exporting
async function sendSMSInternal(to: string, body: string) {
  if (!twilioPhoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured')
  }

  await client.messages.create({
    body,
    from: twilioPhoneNumber,
    to
  })
}

export async function sendEmergencySMS(
  phoneNumber: string,
  message: string,
  location?: { lat: number; lng: number }
): Promise<void> {
  try {
    const locationText = location
      ? `\nLocation: ${getDirectionsUrl(location.lat, location.lng)}`
      : ''

    await sendSMS(
      phoneNumber,
      `🚨 EMERGENCY ALERT 🚨\n\n${message}${locationText}`
    )
  } catch (error) {
    console.error('SMS Error:', error)
    throw new Error('Failed to send emergency SMS')
  }
}

interface ReminderOptions {
  to: string
  recipientName: string
  counterpartName: string
  scheduledAt: Date
  role: 'patient' | 'doctor'
}

export async function sendAppointmentReminder({
  to,
  recipientName,
  counterpartName,
  scheduledAt,
  role
}: ReminderOptions) {
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(scheduledAt)

  const body = `Hi ${recipientName}, this is a reminder about your ${
    role === 'patient' ? 'appointment with' : 'upcoming visit from'
  } ${counterpartName} on ${date}. Reply STOP to opt out.`

  try {
    await sendSMS(to, body)
  } catch (error) {
    console.error('Failed to send appointment reminder:', error)
    throw error
  }
}
