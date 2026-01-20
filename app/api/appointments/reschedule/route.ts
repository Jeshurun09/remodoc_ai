import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/appointments/reschedule
 * Request to reschedule an appointment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId, proposedDateTime, reason } = await request.json();

    if (!appointmentId || !proposedDateTime) {
      return NextResponse.json(
        { error: 'Appointment ID and proposed date/time required' },
        { status: 400 }
      );
    }

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify user is patient or doctor of this appointment
    const isPatient = appointment.patientId === session.user.id;
    const isDoctor = appointment.doctorId && appointment.doctorId === session.user.id;

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: 'Unauthorized to reschedule this appointment' }, { status: 403 });
    }

    const proposedDate = new Date(proposedDateTime);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours to respond

    // Create reschedule request
    const reschedule = await prisma.appointmentReschedule.create({
      data: {
        appointmentId,
        requestedBy: session.user.id,
        originalDateTime: appointment.scheduledAt || new Date(),
        proposedDateTime: proposedDate,
        reason: reason || 'Reschedule requested',
        status: 'PENDING',
        expiresAt,
      },
    });

    // Send notification to other party
    const recipientId = isPatient ? appointment.doctorId : appointment.patientId;
    if (recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'APPOINTMENT_CONFIRMED',
          title: 'Appointment Reschedule Request',
          message: `${session.user.name || 'A user'} requested to reschedule the appointment`,
          data: JSON.stringify({
            appointmentId,
            rescheduleId: reschedule.id,
            proposedDateTime: proposedDate,
          }),
          channels: ['PUSH', 'EMAIL', 'IN_APP'],
          expiresAt,
        },
      });
    }

    // Log audit
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'APPOINTMENT_RESCHEDULE_REQUESTED',
        resource: 'APPOINTMENT',
        resourceId: appointmentId,
        details: JSON.stringify({
          originalTime: appointment.scheduledAt,
          proposedTime: proposedDate,
          reason,
        }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({
      success: true,
      reschedule,
      message: 'Reschedule request sent. Waiting for confirmation.',
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json({ error: 'Failed to create reschedule request' }, { status: 500 });
  }
}

/**
 * PUT /api/appointments/reschedule/:rescheduleId
 * Accept or reject a reschedule request
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rescheduleId, action } = await request.json();

    if (!rescheduleId || !['ACCEPTED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get reschedule request
    const reschedule = await prisma.appointmentReschedule.findUnique({
      where: { id: rescheduleId },
      include: { appointment: { include: { patient: true, doctor: true } } },
    });

    if (!reschedule) {
      return NextResponse.json({ error: 'Reschedule request not found' }, { status: 404 });
    }

    // Verify user is authorized
    const appointment = reschedule.appointment;
    const isPatient = appointment.patientId === session.user.id;
    const isDoctor = appointment.doctorId === session.user.id;
    const isRequester = reschedule.requestedBy === session.user.id;

    if (isRequester) {
      return NextResponse.json(
        { error: 'Cannot respond to your own reschedule request' },
        { status: 400 }
      );
    }

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update appointment if accepted
    if (action === 'ACCEPTED') {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          scheduledAt: reschedule.proposedDateTime,
          updatedAt: new Date(),
        },
      });
    }

    // Update reschedule status
    const updated = await prisma.appointmentReschedule.update({
      where: { id: rescheduleId },
      data: {
        status: action,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // Notify both parties
    const notificationMessage =
      action === 'ACCEPTED'
        ? 'Your reschedule request was accepted'
        : 'Your reschedule request was declined';

    await prisma.notification.create({
      data: {
        userId: reschedule.requestedBy,
        type: 'APPOINTMENT_CONFIRMED',
        title: `Reschedule ${action === 'ACCEPTED' ? 'Accepted' : 'Declined'}`,
        message: notificationMessage,
        data: JSON.stringify({ appointmentId: appointment.id, rescheduleId }),
        channels: ['PUSH', 'EMAIL', 'IN_APP'],
      },
    });

    // Log audit
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: `APPOINTMENT_RESCHEDULE_${action}`,
        resource: 'APPOINTMENT',
        resourceId: appointment.id,
        details: JSON.stringify({ rescheduleId, newTime: reschedule.proposedDateTime }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({
      success: true,
      reschedule: updated,
      message: `Reschedule request ${action.toLowerCase()}`,
    });
  } catch (error) {
    console.error('Reschedule update error:', error);
    return NextResponse.json({ error: 'Failed to update reschedule' }, { status: 500 });
  }
}

/**
 * GET /api/appointments/reschedule
 * Get pending reschedule requests for user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    // Get appointments for current user
    const userAppointments = await prisma.appointment.findMany({
      where: {
        OR: [{ patientId: session.user.id }, { doctorId: session.user.id }],
      },
      select: { id: true },
    });

    const appointmentIds = userAppointments.map((a: { id: string }) => a.id);

    // Get reschedule requests for these appointments
    const reschedules = await prisma.appointmentReschedule.findMany({
      where: {
        appointmentId: { in: appointmentIds },
        status,
      },
      include: {
        appointment: {
          include: {
            patient: { select: { user: { select: { name: true, email: true } } } },
            doctor: { select: { user: { select: { name: true, email: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      reschedules,
    });
  } catch (error) {
    console.error('Get reschedules error:', error);
    return NextResponse.json({ error: 'Failed to fetch reschedule requests' }, { status: 500 });
  }
}
