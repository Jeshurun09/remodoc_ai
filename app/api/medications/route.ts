import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/medications - Get medications (admin) or patient's medications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    // If admin, can view all or specific patient
    // If doctor, can view their patients' medications
    // If patient, can only view their own
    let where: any = {};

    if (session.user.role === 'ADMIN') {
      if (patientId) {
        where.patientId = patientId;
      }
    } else if (session.user.role === 'DOCTOR') {
      if (patientId) {
        // Verify doctor has access to this patient
        const doctorProfile = await prisma.doctorProfile.findUnique({
          where: { userId: session.user.id },
        });
        where.doctorId = doctorProfile?.id;
        where.patientId = patientId;
      } else {
        const doctorProfile = await prisma.doctorProfile.findUnique({
          where: { userId: session.user.id },
        });
        where.doctorId = doctorProfile?.id;
      }
    } else {
      // Patient can only see their own
      const patientProfile = await prisma.patientProfile.findUnique({
        where: { userId: session.user.id },
      });
      where.patientId = patientProfile?.id;
    }

    const prescriptions = await prisma.medicationPrescription.findMany({
      where,
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
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        medication: true,
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
          },
        },
        reminders: {
          where: {
            scheduledTime: {
              gte: new Date(),
            },
          },
          orderBy: {
            scheduledTime: 'asc',
          },
        },
      },
      orderBy: {
        prescribedAt: 'desc',
      },
    });

    return NextResponse.json(prescriptions);

  } catch (error) {
    console.error('Get medications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/medications - Create prescription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !['DOCTOR', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      patientId,
      medicationId,
      dosage,
      frequency,
      duration,
      quantity,
      instructions,
      refillsAllowed,
      appointmentId,
      notes,
    } = await request.json();

    if (!patientId || !medicationId || !dosage || !frequency || !duration || !quantity || !instructions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get doctor profile
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 400 });
    }

    // Verify medication exists
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 400 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const prescription = await prisma.medicationPrescription.create({
      data: {
        patientId,
        doctorId: doctorProfile.id,
        appointmentId,
        medicationId,
        dosage,
        frequency,
        duration,
        quantity,
        instructions,
        refillsAllowed: refillsAllowed || 0,
        expiresAt,
        notes,
      },
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
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        medication: true,
      },
    });

    // Create initial reminders based on frequency
    await createMedicationReminders(prescription.id, frequency, duration);

    // Log prescription creation
    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'PRESCRIPTION_CREATED',
        resource: 'MEDICATION_PRESCRIPTION',
        resourceId: prescription.id,
        details: { patientId, medicationId, duration },
      },
    });

    // Create notification for patient
    await prisma.notification.create({
      data: {
        userId: prescription.patient.user.id,
        type: 'PRESCRIPTION',
        title: 'New Prescription',
        message: `Dr. ${prescription.doctor.user.name} has prescribed ${prescription.medication.name}`,
        data: JSON.stringify({
          prescriptionId: prescription.id,
          medicationName: prescription.medication.name,
        }),
        channels: ['IN_APP', 'PUSH'],
      },
    });

    return NextResponse.json(prescription);

  } catch (error) {
    console.error('Create prescription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create medication reminders
async function createMedicationReminders(prescriptionId: string, frequency: string, duration: number) {
  const reminders = [];
  const now = new Date();

  // Parse frequency (e.g., "twice daily", "every 8 hours", "once daily")
  const frequencyLower = frequency.toLowerCase();

  let intervalHours: number;
  let dosesPerDay: number;

  if (frequencyLower.includes('twice') || frequencyLower.includes('2 times')) {
    intervalHours = 12;
    dosesPerDay = 2;
  } else if (frequencyLower.includes('three') || frequencyLower.includes('3 times')) {
    intervalHours = 8;
    dosesPerDay = 3;
  } else if (frequencyLower.includes('four') || frequencyLower.includes('4 times')) {
    intervalHours = 6;
    dosesPerDay = 4;
  } else if (frequencyLower.includes('every 6 hours')) {
    intervalHours = 6;
    dosesPerDay = 4;
  } else if (frequencyLower.includes('every 8 hours')) {
    intervalHours = 8;
    dosesPerDay = 3;
  } else if (frequencyLower.includes('every 12 hours')) {
    intervalHours = 12;
    dosesPerDay = 2;
  } else {
    // Default to once daily
    intervalHours = 24;
    dosesPerDay = 1;
  }

  // Create reminders for the duration
  for (let day = 0; day < duration; day++) {
    for (let dose = 0; dose < dosesPerDay; dose++) {
      const reminderTime = new Date(now);
      reminderTime.setDate(reminderTime.getDate() + day);
      reminderTime.setHours(9 + (dose * intervalHours), 0, 0, 0); // Start at 9 AM

      if (reminderTime > now) {
        reminders.push({
          prescriptionId,
          scheduledTime: reminderTime,
        });
      }
    }
  }

  if (reminders.length > 0) {
    await prisma.medicationReminder.createMany({
      data: reminders,
    });
  }
}