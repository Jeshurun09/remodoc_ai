import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeShort } from '@/lib/validators'
import { sendDoctorVerificationApprovedEmail, sendDoctorVerificationRejectedEmail } from '@/lib/email'

export async function GET(req: NextRequest, context: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const request = await prisma.doctorVerificationRequest.findUnique({ where: { id }, include: { doctor: { include: { user: true } } } })
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ request })
  } catch (error) {
    console.error('GET /admin/doctor-verifications/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, adminNotes, backgroundCheckReference } = body
    if (!action || typeof action !== 'string' || !['approve', 'reject', 'request_background_check'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (adminNotes && typeof adminNotes !== 'string') {
      return NextResponse.json({ error: 'adminNotes must be string' }, { status: 400 })
    }
    if (backgroundCheckReference && typeof backgroundCheckReference !== 'string') {
      return NextResponse.json({ error: 'backgroundCheckReference must be string' }, { status: 400 })
    }

    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const request = await prisma.doctorVerificationRequest.findUnique({ where: { id } })
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'approve') {
      const updated = await prisma.doctorVerificationRequest.update({ where: { id }, data: { status: 'APPROVED', adminNotes: adminNotes ? sanitizeShort(adminNotes) : null, reviewedBy: session.user.id, reviewedAt: new Date() } })
      await prisma.doctorProfile.update({ where: { id: request.doctorId }, data: { verificationStatus: 'VERIFIED', verifiedAt: new Date(), verifiedBy: session.user.id, verificationCompletedAt: new Date(), verificationReviewedBy: session.user.id } })
      await prisma.auditLog.create({ data: { actorId: session.user.id, action: 'APPROVE_VERIFICATION', targetType: 'DoctorVerificationRequest', targetId: id, details: JSON.stringify({ doctorId: request.doctorId }) } })
      
      // Send approval email to doctor
      try {
        const doctor = await prisma.doctorProfile.findUnique({ where: { id: request.doctorId }, include: { user: true } })
        if (doctor?.user) {
          await sendDoctorVerificationApprovedEmail(doctor.user.name || 'Doctor', doctor.user.email, id)
        }
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError)
      }
      
      return NextResponse.json({ message: 'Approved', request: updated })
    }

    if (action === 'reject') {
      const updated = await prisma.doctorVerificationRequest.update({ where: { id }, data: { status: 'REJECTED', adminNotes: adminNotes ? sanitizeShort(adminNotes) : null, reviewedBy: session.user.id, reviewedAt: new Date() } })
      await prisma.doctorProfile.update({ where: { id: request.doctorId }, data: { verificationStatus: 'REJECTED', verificationReviewedBy: session.user.id } })
      await prisma.auditLog.create({ data: { actorId: session.user.id, action: 'REJECT_VERIFICATION', targetType: 'DoctorVerificationRequest', targetId: id, details: JSON.stringify({ doctorId: request.doctorId, reason: adminNotes }) } })
      
      // Send rejection email to doctor
      try {
        const doctor = await prisma.doctorProfile.findUnique({ where: { id: request.doctorId }, include: { user: true } })
        if (doctor?.user) {
          await sendDoctorVerificationRejectedEmail(doctor.user.name || 'Doctor', doctor.user.email, id, adminNotes || 'Your documents do not meet our verification standards.')
        }
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError)
      }
      
      return NextResponse.json({ message: 'Rejected', request: updated })
    }

    if (action === 'request_background_check') {
      const updated = await prisma.doctorVerificationRequest.update({ where: { id }, data: { backgroundCheckStatus: 'PENDING', backgroundCheckReference: backgroundCheckReference ? sanitizeShort(backgroundCheckReference) : null, adminNotes: adminNotes ? sanitizeShort(adminNotes) : null } })
      await prisma.auditLog.create({ data: { actorId: session.user.id, action: 'REQUEST_BACKGROUND_CHECK', targetType: 'DoctorVerificationRequest', targetId: id, details: JSON.stringify({ doctorId: request.doctorId, reference: backgroundCheckReference }) } })
      return NextResponse.json({ message: 'Background check requested', request: updated })
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })
  } catch (error) {
    console.error('PUT /admin/doctor-verifications/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
