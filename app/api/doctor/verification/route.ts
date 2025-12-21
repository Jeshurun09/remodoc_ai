import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidEmail, isValidUrl, isLikelyNationalId, sanitizeShort } from '@/lib/validators'
import { sendDoctorVerificationSubmittedEmail, sendAdminDoctorVerificationSubmittedEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { doctorProfile: true }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!user.doctorProfile) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

    const reqs = await prisma.doctorVerificationRequest.findMany({ where: { doctorId: user.doctorProfile.id }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ requests: reqs })
  } catch (error) {
    console.error('GET /doctor/verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { doctorProfile: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!user.doctorProfile) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

    const payload = await req.json()
    const {
      fullLegalName,
      nationalId,
      registrationNumber,
      registrationStatusUrl,
      licenseUrl,
      degreeUrl,
      internshipLetterUrl,
      postgraduateUrl,
      facilityName,
      facilityAddress,
      facilityOfficialEmail,
      passportPhotoUrl,
      phoneNumber,
      signedOathUrl,
      optionalDocuments
    } = payload

    if (!fullLegalName || typeof fullLegalName !== 'string' || fullLegalName.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid fullLegalName' }, { status: 400 })
    }
    if (!nationalId || typeof nationalId !== 'string' || !isLikelyNationalId(nationalId)) {
      return NextResponse.json({ error: 'Invalid nationalId format' }, { status: 400 })
    }
    if (!registrationNumber || typeof registrationNumber !== 'string' || registrationNumber.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid registrationNumber' }, { status: 400 })
    }
    if (facilityOfficialEmail && !isValidEmail(facilityOfficialEmail)) {
      return NextResponse.json({ error: 'Invalid facilityOfficialEmail' }, { status: 400 })
    }
    if (registrationStatusUrl && !isValidUrl(registrationStatusUrl)) {
      return NextResponse.json({ error: 'Invalid registrationStatusUrl' }, { status: 400 })
    }
    if (licenseUrl && !isValidUrl(licenseUrl)) {
      return NextResponse.json({ error: 'Invalid licenseUrl' }, { status: 400 })
    }
    if (degreeUrl && !isValidUrl(degreeUrl)) {
      return NextResponse.json({ error: 'Invalid degreeUrl' }, { status: 400 })
    }
    if (internshipLetterUrl && !isValidUrl(internshipLetterUrl)) {
      return NextResponse.json({ error: 'Invalid internshipLetterUrl' }, { status: 400 })
    }
    if (postgraduateUrl && !isValidUrl(postgraduateUrl)) {
      return NextResponse.json({ error: 'Invalid postgraduateUrl' }, { status: 400 })
    }
    if (passportPhotoUrl && !isValidUrl(passportPhotoUrl)) {
      return NextResponse.json({ error: 'Invalid passportPhotoUrl' }, { status: 400 })
    }
    if (signedOathUrl && !isValidUrl(signedOathUrl)) {
      return NextResponse.json({ error: 'Invalid signedOathUrl' }, { status: 400 })
    }

    const verification = await prisma.doctorVerificationRequest.create({
      data: {
        doctorId: user.doctorProfile.id,
        fullLegalName: sanitizeShort(fullLegalName),
        nationalId: sanitizeShort(nationalId),
        registrationNumber: sanitizeShort(registrationNumber),
        registrationStatusUrl: registrationStatusUrl || null,
        licenseUrl: licenseUrl || null,
        degreeUrl: degreeUrl || null,
        internshipLetterUrl: internshipLetterUrl || null,
        postgraduateUrl: postgraduateUrl || null,
        facilityName: facilityName ? sanitizeShort(facilityName) : null,
        facilityAddress: facilityAddress ? sanitizeShort(facilityAddress) : null,
        facilityOfficialEmail: facilityOfficialEmail || null,
        passportPhotoUrl: passportPhotoUrl || null,
        phoneNumber: phoneNumber || null,
        signedOathUrl: signedOathUrl || null,
        optionalDocuments: optionalDocuments ? JSON.stringify(optionalDocuments) : null,
        status: 'PENDING'
      }
    })

    // update doctor profile to reflect pending verification
    await prisma.doctorProfile.update({ where: { id: user.doctorProfile.id }, data: { verificationStatus: 'PENDING' } })

    // Send confirmation email to doctor
    try {
      await sendDoctorVerificationSubmittedEmail(user.name || 'Doctor', user.email, verification.id)
    } catch (emailError) {
      console.error('Failed to send doctor verification confirmation email:', emailError)
    }

    // Send notification to all admins
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } })
      const dashboardLink = `${process.env.NEXTAUTH_URL}/dashboard/admin?tab=verifications&id=${verification.id}`
      for (const admin of admins) {
        await sendAdminDoctorVerificationSubmittedEmail(admin.email, user.name || 'Doctor', user.email, verification.id, dashboardLink)
      }
    } catch (emailError) {
      console.error('Failed to send admin notification emails:', emailError)
    }

    return NextResponse.json({ message: 'Verification submitted', verification }, { status: 201 })
  } catch (error) {
    console.error('POST /doctor/verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
