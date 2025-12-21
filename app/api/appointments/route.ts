import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendAppointmentReminder } from '@/lib/sms'

// Ensure this route always returns JSON
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Wrapper to ensure we always return JSON
async function handleGetRequest(req: NextRequest): Promise<NextResponse> {
  try {
    // Check if Prisma is available
    if (!prisma) {
      console.error('Prisma client is not available')
      return NextResponse.json(
        { error: 'Database connection error', appointments: [] },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let session
    try {
      session = await getServerSession(authOptions)
    } catch (sessionError: any) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let user
    try {
      // Fetch user without nested appointments to avoid potential relation errors
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          patientProfile: true,
          doctorProfile: true
        }
      })
    } catch (userError: any) {
      console.error('User fetch error:', userError)
      console.error('User fetch error details:', {
        message: userError?.message,
        code: userError?.code,
        name: userError?.name,
        stack: userError?.stack
      })
      return NextResponse.json(
        { error: 'Failed to fetch user data', appointments: [] },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let appointments = []
    try {
      // Ensure we have the necessary profile for the user's role
      if (session.user.role === 'PATIENT') {
        if (!user.patientProfile) {
          // Patient user without patient profile - return empty array
          console.warn(`User ${session.user.id} has PATIENT role but no patientProfile`)
          appointments = []
        } else {
        // Fetch appointments with minimal includes first
        let rawAppointments = []
        try {
          rawAppointments = await prisma.appointment.findMany({
            where: { patientId: user.patientProfile.id },
            include: {
              doctor: true,
              symptomReport: true
            },
            orderBy: { createdAt: 'desc' }
          })
        } catch (findError: any) {
          console.error('Error fetching appointments for patient:', findError)
          // If the query fails, try without includes
          try {
            rawAppointments = await prisma.appointment.findMany({
              where: { patientId: user.patientProfile.id },
              orderBy: { createdAt: 'desc' }
            })
          } catch (fallbackError: any) {
            console.error('Fallback query also failed:', fallbackError)
            rawAppointments = []
          }
        }

        // Then fetch user data for each doctor separately to handle missing users gracefully
        // Use Promise.allSettled to handle individual failures gracefully
        const appointmentResults = await Promise.allSettled(
          rawAppointments.map(async (apt: any) => {
            try {
              let doctorWithUser = null
              if (apt.doctor) {
                try {
                  const doctorUser = await prisma.user.findUnique({
                    where: { id: apt.doctor.userId }
                  })
                  if (doctorUser) {
                    doctorWithUser = {
                      ...apt.doctor,
                      user: doctorUser
                    }
                  }
                } catch (err) {
                  // If user doesn't exist, skip this appointment
                  console.warn(`User not found for doctor ${apt.doctor.id}`)
                  return null
                }
              }
              
              // Return null if doctor exists but has no user (will be filtered out)
              if (apt.doctor && !doctorWithUser) {
                return null
              }

              return {
                ...apt,
                doctor: doctorWithUser
              }
            } catch (err: any) {
              console.warn(`Error processing appointment ${apt.id}:`, err)
              return null
            }
          })
        )
        
        // Extract successful results and filter out nulls
        appointments = appointmentResults
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
          .filter(apt => apt !== null)
        }
      } else if (session.user.role === 'DOCTOR') {
        if (!user.doctorProfile) {
          // Doctor user without doctor profile - return empty array
          console.warn(`User ${session.user.id} has DOCTOR role but no doctorProfile`)
          appointments = []
        } else {
        // Fetch appointments with minimal includes first
        let rawAppointments = []
        try {
          // Try to fetch appointments, but handle any relation errors
          rawAppointments = await prisma.appointment.findMany({
            where: { doctorId: user.doctorProfile.id },
            include: {
              patient: true,
              symptomReport: true
            },
            orderBy: { createdAt: 'desc' }
          })
        } catch (findError: any) {
          console.error('Error fetching appointments for doctor:', findError)
          // If the query fails, try without includes
          try {
            rawAppointments = await prisma.appointment.findMany({
              where: { doctorId: user.doctorProfile.id },
              orderBy: { createdAt: 'desc' }
            })
          } catch (fallbackError: any) {
            console.error('Fallback query also failed:', fallbackError)
            rawAppointments = []
          }
        }

        // Then fetch user data for each patient separately to handle missing users gracefully
        // Use Promise.allSettled to handle individual failures gracefully
        const appointmentResults = await Promise.allSettled(
          rawAppointments.map(async (apt: any) => {
            try {
              let patientWithUser = null
              if (apt.patient) {
                try {
                  const patientUser = await prisma.user.findUnique({
                    where: { id: apt.patient.userId }
                  })
                  if (patientUser) {
                    patientWithUser = {
                      ...apt.patient,
                      user: patientUser
                    }
                  }
                } catch (err) {
                  // If user doesn't exist, skip this appointment
                  console.warn(`User not found for patient ${apt.patient.id}`)
                  return null
                }
              }
              
              // Return null if patient exists but has no user (will be filtered out)
              if (apt.patient && !patientWithUser) {
                return null
              }

              return {
                ...apt,
                patient: patientWithUser
              }
            } catch (err: any) {
              console.warn(`Error processing appointment ${apt.id}:`, err)
              return null
            }
          })
        )
        
        // Extract successful results and filter out nulls
        appointments = appointmentResults
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
          .filter(apt => apt !== null)
        }
      } else {
        // User has a role that doesn't match PATIENT or DOCTOR
        console.warn(`User ${session.user.id} has role ${session.user.role} which doesn't have appointments`)
        appointments = []
      }
    } catch (queryError: any) {
      // If there's a Prisma query error (like missing relations), log it and return empty array
      console.error('Appointments query error:', queryError)
      console.error('Query error details:', {
        message: queryError?.message,
        code: queryError?.code,
        name: queryError?.name,
        meta: queryError?.meta,
        stack: queryError?.stack
      })
      // Return empty appointments array instead of failing
      appointments = []
    }

    // Ensure appointments is always an array
    if (!Array.isArray(appointments)) {
      appointments = []
    }

    try {
      return NextResponse.json(
        { appointments },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (jsonError: any) {
      // If JSON serialization fails, return error
      console.error('JSON serialization error:', jsonError)
      return NextResponse.json(
        { error: 'Failed to serialize response', appointments: [] },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error: any) {
    // Catch-all for any unexpected errors
    console.error('Appointments fetch error:', error)
    const errorMessage = error?.message || 'Failed to fetch appointments'
    try {
      return NextResponse.json(
        { error: errorMessage },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (responseError: any) {
      // Last resort - create a plain text JSON response
      console.error('Failed to create JSON response:', responseError)
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

// Export the handler with error boundary
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    return await handleGetRequest(req)
  } catch (error: any) {
    // Ultimate fallback - if even our error handler fails, return JSON
    console.error('Fatal error in appointments GET handler:', error)
    try {
      return NextResponse.json(
        { error: 'Internal server error', appointments: [] },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch {
      // If even JSON creation fails, return plain text JSON
      return new NextResponse(
        '{"error":"Internal server error","appointments":[]}',
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { symptomReportId, doctorId, scheduledAt, notes } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    if (doctorId) {
      const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } })
      if (!doctor) {
        return NextResponse.json({ error: 'Selected doctor not found' }, { status: 404 })
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.patientProfile.id,
        doctorId: doctorId || null,
        symptomReportId: symptomReportId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes || null,
        status: 'PENDING'
      },
      include: {
        doctor: { include: { user: true } },
        symptomReport: true
      }
    })

    if (appointment.scheduledAt) {
      const reminders: Promise<void>[] = []

      if (user.phone) {
        reminders.push(
          sendAppointmentReminder({
            to: user.phone,
            recipientName: user.name,
            counterpartName: appointment.doctor?.user?.name || 'your care team',
            scheduledAt: appointment.scheduledAt,
            role: 'patient'
          })
        )
      }

      if (appointment.doctor?.user?.phone) {
        reminders.push(
          sendAppointmentReminder({
            to: appointment.doctor.user.phone,
            recipientName: appointment.doctor.user.name,
            counterpartName: user.name,
            scheduledAt: appointment.scheduledAt,
            role: 'doctor'
          })
        )
      }

      if (reminders.length > 0) {
        await Promise.allSettled(reminders)
      }
    }

    return NextResponse.json({ appointment })
  } catch (error: any) {
    console.error('Appointment creation error:', error)
    const errorMessage = error?.message || 'Failed to create appointment'
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

