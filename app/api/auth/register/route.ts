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
      specialization,
      adminAccessCode
    } = body

    const normalizedEmail = (email as string | undefined)?.trim().toLowerCase()

    if (!name || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const allowedRoles = ['PATIENT', 'DOCTOR', 'ADMIN']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 })
    }

    if (role === 'DOCTOR' && (!licenseNumber || !specialization)) {
      return NextResponse.json(
        { error: 'License number and specialization are required for doctors' },
        { status: 400 }
      )
    }

    if (role === 'ADMIN') {
      const adminSecret = process.env.ADMIN_REGISTRATION_CODE
      if (!adminSecret) {
        return NextResponse.json(
          { error: 'Admin registration is not configured. Contact support.' },
          { status: 500 }
        )
      }
      if (!adminAccessCode || adminAccessCode !== adminSecret) {
        return NextResponse.json(
          { error: 'Invalid admin access code' },
          { status: 403 }
        )
      }
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
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || null,
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
    
    // Handle specific error types
    if (error instanceof Error) {
      // Prisma unique constraint violation (duplicate email)
      if (error.message.includes('Unique constraint') || error.message.includes('duplicate')) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      }
      
      // Email configuration error
      if (error.message.includes('Email transport is not configured')) {
        return NextResponse.json(
          {
            error:
              'Email delivery is not configured. Please set SMTP_* and EMAIL_FROM environment variables before registering users.'
          },
          { status: 500 }
        )
      }
      
      // Database connection error
      if (error.message.includes('connect') || error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection error. Please try again later.' },
          { status: 500 }
        )
      }
      
      // Log the full error for debugging
      console.error('Full registration error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}

