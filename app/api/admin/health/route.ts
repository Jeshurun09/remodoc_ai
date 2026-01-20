import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/dashboard
 * Real-time system health and metrics dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This route file can only export one GET handler.
    // If clients need fraud-detection, use /api/admin/fraud-detection (split route) instead.

    // Get system metrics
    const metrics = await prisma.systemHealthMetric.findMany({
      orderBy: { recordedAt: 'desc' },
      distinct: ['metricName'],
      take: 20,
    });

    // Get fraud alerts
    const fraudAlerts = await prisma.fraudDetectionAlert.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get doctor performance
    const topDoctors = await prisma.doctorPerformanceMetric.findMany({
      orderBy: { patientSatisfactionRating: 'desc' },
      take: 5,
      include: { doctor: { select: { user: { select: { name: true } } } } },
    });

    // Get system stats
    const totalUsers = await prisma.user.count();
    const totalDoctors = await prisma.doctorProfile.count();
    const totalPatients = await prisma.patientProfile.count();
    const verifiedDoctors = await prisma.doctorProfile.count({
      where: { verificationStatus: 'VERIFIED' },
    });
    const totalAppointments = await prisma.appointment.count();
    const completedAppointments = await prisma.appointment.count({
      where: { status: 'COMPLETED' },
    });

    const systemHealth = {
      userBase: { total: totalUsers, doctors: totalDoctors, patients: totalPatients },
      doctorMetrics: {
        total: totalDoctors,
        verified: verifiedDoctors,
        pendingVerification: totalDoctors - verifiedDoctors,
      },
      appointmentMetrics: {
        total: totalAppointments,
        completed: completedAppointments,
        completionRate: (completedAppointments / Math.max(totalAppointments, 1)) * 100,
      },
      systemMetrics: metrics.map((m: any) => ({
        name: m.metricName,
        value: m.metricValue,
        status: m.status,
      })),
    };

    return NextResponse.json({
      success: true,
      dashboard: {
        systemHealth,
        fraudAlerts: fraudAlerts.length,
        recentAlerts: fraudAlerts,
        topPerformers: topDoctors,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}

/**
 * POST /api/admin/health
 * (Legacy) Create fraud alert — should live in /api/admin/fraud-detection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, ruleTriggered, severity, action, details } = await request.json();

    if (!ruleTriggered || !severity) {
      return NextResponse.json({ error: 'Rule and severity required' }, { status: 400 });
    }

    // Create fraud alert
    const alert = await prisma.fraudDetectionAlert.create({
      data: {
        userId,
        ruleTriggered,
        severity,
        details: details ? JSON.stringify(details) : null,
        action,
      },
    });

    // Log audit
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'FRAUD_ALERT_CREATED',
        resource: 'FRAUD_DETECTION',
        resourceId: alert.id,
        details: JSON.stringify({ userId, ruleTriggered, severity }),
        severity: 'CRITICAL',
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Fraud alert create error:', error);
    return NextResponse.json({ error: 'Failed to create fraud alert' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/fraud-detection/:alertId
 * Resolve a fraud alert
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId, action, notes } = await request.json();

    if (!alertId || !action) {
      return NextResponse.json({ error: 'Alert ID and action required' }, { status: 400 });
    }

    // Update alert
    const alert = await prisma.fraudDetectionAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        action,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      },
    });

    // Log audit
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'FRAUD_ALERT_RESOLVED',
        resource: 'FRAUD_DETECTION',
        resourceId: alert.id,
        details: JSON.stringify({ action, notes }),
        severity: 'WARNING',
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Fraud alert update error:', error);
    return NextResponse.json({ error: 'Failed to update fraud alert' }, { status: 500 });
  }
}
