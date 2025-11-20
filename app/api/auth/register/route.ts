import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      email,
      password,
      phone,
      role = 'PATIENT',
      licenseNumber,
      specialization
    } = body

    const normalizedEmail = (email as string | undefined)?.trim().toLowerCase()

    if (!name || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (role === 'DOCTOR' && (!licenseNumber || !specialization)) {
      return NextResponse.json(
        { error: 'License number and specialization are required for doctors' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000)

    // Create user first, then role-specific profile (MongoDB doesn't support cross-collection transactions on standalone instances)
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phone,
        role,
        verificationCode,
        verificationExpires,
        isVerified: false
      }
    })

    let createdPatientProfileId: string | null = null
    let createdDoctorProfileId: string | null = null

    try {
      if (role === 'PATIENT') {
        const profile = await prisma.patientProfile.create({
          data: {
            userId: user.id
          }
        })
        createdPatientProfileId = profile.id
      } else if (role === 'DOCTOR') {
        const profile = await prisma.doctorProfile.create({
          data: {
            userId: user.id,
            licenseNumber,
            specialization,
            yearsExperience: 0
          }
        })
        createdDoctorProfileId = profile.id
      }
    } catch (profileError) {
      // Clean up orphaned user if profile creation fails
      await prisma.user.delete({ where: { id: user.id } })
      throw profileError
    }

    try {
      await sendVerificationEmail(normalizedEmail, verificationCode)
    } catch (emailError) {
      if (createdPatientProfileId) {
        await prisma.patientProfile.delete({ where: { id: createdPatientProfileId } })
      }
      if (createdDoctorProfileId) {
        await prisma.doctorProfile.delete({ where: { id: createdDoctorProfileId } })
      }
      await prisma.user.delete({ where: { id: user.id } })
      throw emailError
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email. Please verify to activate your account.'
    })
  } catch (error) {
    console.error('Registration error:', error)
    if (
      error instanceof Error &&
      error.message.includes('Email transport is not configured')
    ) {
      return NextResponse.json(
        {
          error:
            'Email delivery is not configured. Please set SMTP_* and EMAIL_FROM environment variables before registering users.'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

