import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmergencySMS } from '@/lib/sms'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message, location } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        patientProfile: {
          include: {
            emergencyContacts: {
              where: { isPrimary: true }
            }
          }
        }
      }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // Get primary emergency contact or fallback to legacy contact info
    const primaryContact = user.patientProfile.emergencyContacts[0]
    
    if (!primaryContact) {
      return NextResponse.json(
        { error: 'No emergency contact configured. Please add one in settings.' },
        { status: 400 }
      )
    }

    const emergencyMessage = message || 
      `EMERGENCY ALERT from ${user.name}. Please respond immediately. Location: https://maps.google.com/?q=${location?.lat || 'unknown'},${location?.lng || 'unknown'}`

    const notificationResults = {
      sms_sent: false,
      email_sent: false,
      errors: [] as string[]
    }

    // Send via phone if preference includes PHONE
    if ((primaryContact.notificationPreference === 'PHONE' || primaryContact.notificationPreference === 'BOTH') && primaryContact.phone) {
      try {
        await sendEmergencySMS(primaryContact.phone, emergencyMessage, location)
        notificationResults.sms_sent = true
      } catch (error) {
        console.error('SMS sending failed:', error)
        notificationResults.errors.push('Failed to send SMS')
      }
    }

    // Send via email if preference includes EMAIL
    if ((primaryContact.notificationPreference === 'EMAIL' || primaryContact.notificationPreference === 'BOTH') && primaryContact.email) {
      try {
        await sendEmail({
          to: primaryContact.email,
          subject: '🚨 EMERGENCY ALERT - RemoDoc',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY ALERT</h1>
              </div>
              <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">
                  <strong>${user.name}</strong> has triggered an emergency beacon and needs immediate assistance.
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0;">
                  <p style="margin: 0; color: #b91c1c;"><strong>Message:</strong></p>
                  <p style="margin: 10px 0 0 0; color: #374151;">${emergencyMessage}</p>
                </div>
                ${location ? `
                  <div style="margin: 15px 0;">
                    <p style="margin: 0 0 10px 0; color: #333;"><strong>📍 Location:</strong></p>
                    <a href="https://maps.google.com/?q=${location.lat},${location.lng}" style="color: #2563eb; text-decoration: none; word-break: break-all;">
                      View on Maps
                    </a>
                  </div>
                ` : ''}
                <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
                  Please contact them immediately or take appropriate action.
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                  Time: ${new Date().toLocaleString()}
                </p>
              </div>
            </div>
          `
        })
        notificationResults.email_sent = true
      } catch (error) {
        console.error('Email sending failed:', error)
        notificationResults.errors.push('Failed to send email')
      }
    }

    // Ensure at least one notification was sent
    if (!notificationResults.sms_sent && !notificationResults.email_sent) {
      return NextResponse.json(
        { error: 'Failed to send emergency notification. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Emergency beacon sent successfully',
      notifications: notificationResults
    })
  } catch (error) {
    console.error('Emergency beacon error:', error)
    return NextResponse.json(
      { error: 'Failed to send emergency beacon' },
      { status: 500 }
    )
  }
}

