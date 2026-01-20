import { prisma } from './prisma'

export interface StudentVerificationResult {
  verified: boolean
  provider: 'SheerID' | 'UNiDAYS' | 'StudentBeans' | null
  email: string
  name?: string
  school?: string
  expiryDate?: Date
}

/**
 * SheerID Integration
 * https://developer.sheerid.com/docs
 */
export async function verifyWithSheerID(
  accessToken: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<StudentVerificationResult> {
  try {
    // SheerID verification endpoint
    const response = await fetch('https://services.sheerid.com/rest/0.5/verification/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SHEERID_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        firstName,
        lastName,
        email,
        verificationTypes: 'STUDENT',
      }).toString(),
    })

    if (!response.ok) {
      throw new Error('SheerID verification failed')
    }

    const data = await response.json()

    // Check verification status
    if (data.result === 'APPROVED') {
      return {
        verified: true,
        provider: 'SheerID',
        email,
        name: `${firstName} ${lastName}`,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      }
    }

    return {
      verified: false,
      provider: null,
      email,
    }
  } catch (error) {
    console.error('SheerID verification error:', error)
    throw error
  }
}

/**
 * UNiDAYS Integration
 * https://developers.myunidays.com/
 */
export async function verifyWithUNiDAYS(
  accessToken: string,
  email: string
): Promise<StudentVerificationResult> {
  try {
    // UNiDAYS verification endpoint
    const response = await fetch('https://api.myunidays.com/api/verify/Student/Me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('UNiDAYS verification failed')
    }

    const data = await response.json()

    if (data.StudentStatus === 'Verified') {
      return {
        verified: true,
        provider: 'UNiDAYS',
        email: data.Email || email,
        name: data.Name,
        school: data.Institution,
        expiryDate: data.VerificationExpiryDate
          ? new Date(data.VerificationExpiryDate)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    }

    return {
      verified: false,
      provider: null,
      email,
    }
  } catch (error) {
    console.error('UNiDAYS verification error:', error)
    throw error
  }
}

/**
 * Student Beans Integration
 * https://studentbeans.com/partner-login
 */
export async function verifyWithStudentBeans(
  accessToken: string,
  email: string
): Promise<StudentVerificationResult> {
  try {
    // Student Beans verification endpoint
    const response = await fetch('https://api.studentbeans.com/v1/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STUDENT_BEANS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
        email,
      }),
    })

    if (!response.ok) {
      throw new Error('Student Beans verification failed')
    }

    const data = await response.json()

    if (data.verified) {
      return {
        verified: true,
        provider: 'StudentBeans',
        email: data.email || email,
        name: data.name,
        school: data.school,
        expiryDate: data.expiryDate
          ? new Date(data.expiryDate)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    }

    return {
      verified: false,
      provider: null,
      email,
    }
  } catch (error) {
    console.error('Student Beans verification error:', error)
    throw error
  }
}

/**
 * Record student verification in database
 */
export async function recordStudentVerification(
  userId: string,
  result: StudentVerificationResult
): Promise<void> {
  if (!result.verified) {
    throw new Error('Cannot record unverified status')
  }

  try {
    // Update user with student verification
    await prisma.user.update({
      where: { id: userId },
      data: {
        studentVerified: true,
        studentVerificationProvider: result.provider,
        studentVerificationExpiryDate: result.expiryDate,
      },
    })

    // If not already on STUDENT plan, upgrade them
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (subscription && subscription.plan !== 'STUDENT') {
      await prisma.subscription.update({
        where: { userId },
        data: { plan: 'STUDENT' },
      })
    }

    // Log verification
    await prisma.aILog.create({
      data: {
        userId,
        model: 'student-verification',
        prompt: `Student verified via ${result.provider}`,
        response: JSON.stringify(result),
        tokens: 0,
      },
    })
  } catch (error) {
    console.error('Error recording student verification:', error)
    throw error
  }
}

/**
 * Check if student verification is still valid
 */
export async function isStudentVerificationValid(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user?.studentVerified) {
      return false
    }

    if (user.studentVerificationExpiryDate && user.studentVerificationExpiryDate < new Date()) {
      // Verification expired
      await prisma.user.update({
        where: { id: userId },
        data: { studentVerified: false },
      })
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking student verification:', error)
    return false
  }
}

/**
 * Revoke student verification
 */
export async function revokeStudentVerification(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        studentVerified: false,
        studentVerificationProvider: null,
        studentVerificationExpiryDate: null,
      },
    })
  } catch (error) {
    console.error('Error revoking student verification:', error)
    throw error
  }
}

/**
 * Get student verification status
 */
export async function getStudentVerificationStatus(userId: string): Promise<{
  verified: boolean
  provider?: string
  expiryDate?: Date
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        studentVerified: true,
        studentVerificationProvider: true,
        studentVerificationExpiryDate: true,
      },
    })

    if (!user) {
      return { verified: false }
    }

    const isValid = await isStudentVerificationValid(userId)

    return {
      verified: isValid,
      provider: user.studentVerificationProvider || undefined,
      expiryDate: user.studentVerificationExpiryDate || undefined,
    }
  } catch (error) {
    console.error('Error getting student verification status:', error)
    return { verified: false }
  }
}
