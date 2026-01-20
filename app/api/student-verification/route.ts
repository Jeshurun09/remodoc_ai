import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  verifyWithSheerID,
  verifyWithUNiDAYS,
  verifyWithStudentBeans,
  recordStudentVerification,
  getStudentVerificationStatus,
  revokeStudentVerification,
  isStudentVerificationValid,
} from '@/lib/student-verification'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get verification status
    const status = await getStudentVerificationStatus(session.user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting student verification status:', error)
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, accessToken, firstName, lastName, email } = body

    if (!provider || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: provider and accessToken' },
        { status: 400 }
      )
    }

    let verificationResult

    switch (provider) {
      case 'SheerID':
        if (!firstName || !lastName || !email) {
          return NextResponse.json(
            { error: 'SheerID requires: firstName, lastName, email' },
            { status: 400 }
          )
        }
        verificationResult = await verifyWithSheerID(
          accessToken,
          email,
          firstName,
          lastName
        )
        break

      case 'UNiDAYS':
        if (!email) {
          return NextResponse.json(
            { error: 'UNiDAYS requires: email' },
            { status: 400 }
          )
        }
        verificationResult = await verifyWithUNiDAYS(accessToken, email)
        break

      case 'StudentBeans':
        if (!email) {
          return NextResponse.json(
            { error: 'Student Beans requires: email' },
            { status: 400 }
          )
        }
        verificationResult = await verifyWithStudentBeans(accessToken, email)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid provider. Use: SheerID, UNiDAYS, or StudentBeans' },
          { status: 400 }
        )
    }

    if (verificationResult.verified) {
      // Record the verification and upgrade plan
      await recordStudentVerification(session.user.id, verificationResult)

      return NextResponse.json({
        success: true,
        verified: true,
        provider: verificationResult.provider,
        message: 'Student verification successful! Your plan has been upgraded to STUDENT.',
        expiryDate: verificationResult.expiryDate,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Student verification failed. Please check your information and try again.',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error verifying student:', error)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Revoke student verification
    await revokeStudentVerification(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Student verification revoked.',
    })
  } catch (error) {
    console.error('Error revoking student verification:', error)
    return NextResponse.json(
      { error: 'Failed to revoke verification' },
      { status: 500 }
    )
  }
}
