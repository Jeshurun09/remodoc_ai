import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

    if (!name || !email || !password) {
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
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and role-specific profile in a transaction to avoid partial data
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role
        }
      })

      if (role === 'PATIENT') {
        await tx.patientProfile.create({
          data: {
            userId: createdUser.id
          }
        })
      } else if (role === 'DOCTOR') {
        await tx.doctorProfile.create({
          data: {
            userId: createdUser.id,
            licenseNumber,
            specialization,
            yearsExperience: 0
          }
        })
      }

      return createdUser
    })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

