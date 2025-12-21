import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications/preferences - Get user notification preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!preferences) {
      // Return default preferences
      return NextResponse.json({
        appointmentReminders: true,
        prescriptionAlerts: true,
        labResults: true,
        paymentNotifications: true,
        emergencyAlerts: true,
        marketingEmails: false,
        smsEnabled: true,
        pushEnabled: true,
        emailDigest: 'DAILY',
        quietHoursStart: null,
        quietHoursEnd: null,
      });
    }

    return NextResponse.json(preferences);

  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        appointmentReminders: data.appointmentReminders,
        prescriptionAlerts: data.prescriptionAlerts,
        labResults: data.labResults,
        paymentNotifications: data.paymentNotifications,
        emergencyAlerts: data.emergencyAlerts,
        marketingEmails: data.marketingEmails,
        smsEnabled: data.smsEnabled,
        pushEnabled: data.pushEnabled,
        emailDigest: data.emailDigest,
        quietHoursStart: data.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd,
      },
      create: {
        userId: session.user.id,
        appointmentReminders: data.appointmentReminders ?? true,
        prescriptionAlerts: data.prescriptionAlerts ?? true,
        labResults: data.labResults ?? true,
        paymentNotifications: data.paymentNotifications ?? true,
        emergencyAlerts: data.emergencyAlerts ?? true,
        marketingEmails: data.marketingEmails ?? false,
        smsEnabled: data.smsEnabled ?? true,
        pushEnabled: data.pushEnabled ?? true,
        emailDigest: data.emailDigest ?? 'DAILY',
        quietHoursStart: data.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd,
      },
    });

    // Log preference update
    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'NOTIFICATION_PREFERENCES_UPDATED',
        resource: 'USER',
        resourceId: session.user.id,
        details: { preferences: data },
      },
    });

    return NextResponse.json(preferences);

  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}