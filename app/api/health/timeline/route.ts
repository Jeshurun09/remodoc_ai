import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/health/timeline
 * Get medical history timeline for a patient
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const eventType = searchParams.get('eventType');
    const category = searchParams.get('category');
    const patientId = searchParams.get('patientId') || session.user.id;

    // Verify access
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Only patient themselves or authorized doctor can access
    if (patientId !== session.user.id) {
      const doctorCheck = await prisma.doctorProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!doctorCheck) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Build where clause
    let whereClause: any = { patientId: patient.id };
    if (eventType) whereClause.eventType = eventType;
    if (category) whereClause.category = category;

    // Get timeline events
    const timeline = await prisma.healthTimeline.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await prisma.healthTimeline.count({ where: whereClause });

    // Enrich timeline with related data
    const enrichedTimeline = await Promise.all(
      timeline.map(async (event) => {
        let relatedData: any = null;

        switch (event.eventType) {
          case 'appointment':
            if (event.eventId) {
              relatedData = await prisma.appointment.findUnique({
                where: { id: event.eventId },
                include: { doctor: { select: { user: { select: { name: true } } } } },
              });
            }
            break;
          case 'medication':
            if (event.eventId) {
              relatedData = await prisma.medicationPrescription.findUnique({
                where: { id: event.eventId },
                include: { medication: { select: { name: true, strength: true } } },
              });
            }
            break;
          case 'symptom':
            if (event.eventId) {
              relatedData = await prisma.symptomReport.findUnique({
                where: { id: event.eventId },
              });
            }
            break;
        }

        return {
          ...event,
          relatedData,
        };
      })
    );

    return NextResponse.json({
      success: true,
      timeline: enrichedTimeline,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    console.error('Timeline fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}

/**
 * POST /api/health/timeline
 * Create a timeline event (automated system mostly, but can be called manually)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventType, title, description, date, category, eventId, metadata } = await request.json();

    if (!eventType || !title) {
      return NextResponse.json({ error: 'Event type and title required' }, { status: 400 });
    }

    // Get patient profile
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Create timeline event
    const event = await prisma.healthTimeline.create({
      data: {
        patientId: patient.id,
        eventType,
        title,
        description,
        date: date ? new Date(date) : new Date(),
        category,
        eventId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Log audit
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'TIMELINE_EVENT_CREATED',
        resource: 'HEALTH_TIMELINE',
        resourceId: event.id,
        details: JSON.stringify({ eventType, title }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Timeline create error:', error);
    return NextResponse.json({ error: 'Failed to create timeline event' }, { status: 500 });
  }
}

// Summary view should live in /api/health/timeline/summary (separate route file).
async function getTimelineSummary(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = new URL(request.url).pathname;

    if (path.includes('/summary')) {
      // Get patient
      const patient = await prisma.patientProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      // Get events grouped by category
      const events = await prisma.healthTimeline.findMany({
        where: { patientId: patient.id },
        orderBy: { date: 'desc' },
        take: 100,
      });

      // Group by category
      const grouped: Record<string, typeof events> = {};
      events.forEach((event) => {
        const cat = event.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(event);
      });

      return NextResponse.json({
        success: true,
        summary: grouped,
        totalEvents: events.length,
      });
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Timeline summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline summary' }, { status: 500 });
  }
}
