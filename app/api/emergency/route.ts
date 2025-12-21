import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/emergency - Get emergency records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');

    let where: any = {};

    if (session.user.role === 'ADMIN') {
      if (patientId) where.patientId = patientId;
      if (status) where.status = status;
    } else if (session.user.role === 'DOCTOR') {
      // Doctors can see emergencies for their patients
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: session.user.id },
      });
      where.patient = {
        appointments: {
          some: {
            doctorId: doctorProfile?.id,
          },
        },
      };
      if (status) where.status = status;
    } else {
      // Patients can only see their own emergencies
      const patientProfile = await prisma.patientProfile.findUnique({
        where: { userId: session.user.id },
      });
      where.patientId = patientProfile?.id;
    }

    const emergencies = await prisma.emergency.findMany({
      where,
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        emergencyContacts: {
          include: {
            contact: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(emergencies);

  } catch (error) {
    console.error('Get emergencies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/emergency - Create emergency alert
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      type,
      severity,
      description,
      location,
      symptoms,
      medicalConditions,
      medications,
      allergies,
      contactIds,
    } = await request.json();

    if (!type || !severity || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get patient profile
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 400 });
    }

    const emergency = await prisma.emergency.create({
      data: {
        patientId: patientProfile.id,
        type,
        severity,
        description,
        location: location || null,
        symptoms: symptoms || [],
        medicalConditions: medicalConditions || [],
        medications: medications || [],
        allergies: allergies || [],
        status: 'ACTIVE',
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Link emergency contacts if provided
    if (contactIds && contactIds.length > 0) {
      await prisma.emergencyContactRelation.createMany({
        data: contactIds.map((contactId: string) => ({
          emergencyId: emergency.id,
          contactId,
        })),
      });
    }

    // Notify emergency contacts
    if (contactIds && contactIds.length > 0) {
      const contacts = await prisma.emergencyContact.findMany({
        where: {
          id: { in: contactIds },
          patientId: patientProfile.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      for (const contact of contacts) {
        await prisma.notification.create({
          data: {
            userId: contact.user.id,
            type: 'EMERGENCY',
            title: 'Emergency Alert',
            message: `${emergency.patient.user.name} has triggered an emergency alert: ${emergency.description}`,
            data: JSON.stringify({
              emergencyId: emergency.id,
              patientName: emergency.patient.user.name,
              severity: emergency.severity,
              location: emergency.location,
            }),
            channels: ['IN_APP', 'PUSH', 'SMS'],
          },
        });
      }
    }

    // Notify nearby doctors and hospitals
    await notifyNearbyMedicalProviders(emergency);

    // Log emergency creation
    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'EMERGENCY_CREATED',
        resource: 'EMERGENCY',
        resourceId: emergency.id,
        details: { type, severity, location },
      },
    });

    return NextResponse.json(emergency);

  } catch (error) {
    console.error('Create emergency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/emergency/[id] - Update emergency status
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: 'Emergency ID required' }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !['DOCTOR', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, response, resolvedAt } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status required' }, { status: 400 });
    }

    const updateData: any = { status };
    if (response) updateData.response = response;
    if (resolvedAt) updateData.resolvedAt = new Date(resolvedAt);

    const emergency = await prisma.emergency.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Notify patient of status update
    await prisma.notification.create({
      data: {
        userId: emergency.patient.user.id,
        type: 'EMERGENCY_UPDATE',
        title: 'Emergency Status Update',
        message: `Your emergency alert status has been updated to: ${status}`,
        data: JSON.stringify({
          emergencyId: emergency.id,
          status,
          response,
        }),
        channels: ['IN_APP', 'PUSH'],
      },
    });

    // Log status update
    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'EMERGENCY_UPDATED',
        resource: 'EMERGENCY',
        resourceId: emergency.id,
        details: { status, response },
      },
    });

    return NextResponse.json(emergency);

  } catch (error) {
    console.error('Update emergency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to notify nearby medical providers
async function notifyNearbyMedicalProviders(emergency: any) {
  try {
    // Find doctors within reasonable distance (simplified - in real app would use geolocation)
    const doctors = await prisma.doctorProfile.findMany({
      where: {
        user: {
          role: 'DOCTOR',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 5, // Limit to prevent spam
    });

    for (const doctor of doctors) {
      await prisma.notification.create({
        data: {
          userId: doctor.user.id,
          type: 'EMERGENCY',
          title: 'Emergency Alert - Medical Assistance Needed',
          message: `Emergency alert from ${emergency.patient.user.name}: ${emergency.description}`,
          data: JSON.stringify({
            emergencyId: emergency.id,
            patientName: emergency.patient.user.name,
            severity: emergency.severity,
            location: emergency.location,
            symptoms: emergency.symptoms,
          }),
          channels: ['IN_APP', 'PUSH'],
        },
      });
    }
  } catch (error) {
    console.error('Error notifying medical providers:', error);
  }
}