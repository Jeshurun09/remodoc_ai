import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/doctors/availability
 * Get list of available doctors with live status and map data
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get('specialization');
    const includeOnlineOnly = searchParams.get('onlineOnly') === 'true';
    const latitude = searchParams.get('lat');
    const longitude = searchParams.get('lng');
    const radiusKm = parseInt(searchParams.get('radius') || '50');

    let whereClause: any = {};
    
    if (includeOnlineOnly) {
      whereClause.isOnline = true;
    }

    // Get doctor availability data
    const availabilities = await prisma.doctorAvailability.findMany({
      where: whereClause,
      include: {
        doctor: {
          select: {
            id: true,
            userId: true,
            specialization: true,
            subspecialty: true,
            yearsExperience: true,
            verificationStatus: true,
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
            appointments: { where: { status: 'CONFIRMED' }, select: { id: true } },
            credentials: {
              select: { autoVerified: true, manualVerified: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { currentlyAvailable: 'desc' },
    });

    // Filter by specialization if provided
    let filtered = availabilities;
    if (specialization) {
      filtered = filtered.filter((av) =>
        av.doctor.specialization.toLowerCase().includes(specialization.toLowerCase())
      );
    }

    // Calculate distance and sort if coordinates provided
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      filtered = filtered
        .map((av) => ({
          ...av,
          distance: calculateDistance(lat, lng, 0, 0),
        }))
        .filter((av) => av.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
    }

    // Format response
    const doctors = filtered.map((av) => ({
      id: av.doctorId,
      name: av.doctor.user.name,
      email: av.doctor.user.email,
      phone: av.doctor.user.phone,
      specialization: av.doctor.specialization,
      subspecialty: av.doctor.subspecialty,
      experience: av.doctor.yearsExperience,
      isOnline: av.isOnline,
      isAvailable: av.currentlyAvailable,
      availableUntil: av.availableUntil,
      location: av.location ? JSON.parse(av.location) : null,
      waitTime: av.waitingTime,
      avgResponseTime: av.responseTime,
      acceptanceRate: av.acceptanceRate,
      cancellationRate: av.cancellationRate,
      currentAppointments: av.doctor.appointments.length,
      verified: av.doctor.verificationStatus === 'VERIFIED',
      credentialVerified: av.doctor.credentials[0]?.autoVerified || av.doctor.credentials[0]?.manualVerified,
    }));

    return NextResponse.json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error('Availability fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/doctors/availability
 * Update doctor's availability status (doctor only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a doctor
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Not authorized as doctor' }, { status: 403 })
    }

    const { isOnline, isAvailable, availableUntil, location, waitingTime } = await req.json()

    // Update or create availability
    const availability = await prisma.doctorAvailability.upsert({
      where: { doctorId: doctorProfile.id },
      create: {
        doctorId: doctorProfile.id,
        isOnline: isOnline !== undefined ? isOnline : false,
        currentlyAvailable: isAvailable !== undefined ? isAvailable : false,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        location: location ? JSON.stringify(location) : null,
        waitingTime: waitingTime || 0,
        lastStatusUpdate: new Date(),
      },
      update: {
        isOnline: isOnline !== undefined ? isOnline : undefined,
        currentlyAvailable: isAvailable !== undefined ? isAvailable : undefined,
        availableUntil: availableUntil ? new Date(availableUntil) : undefined,
        location: location ? JSON.stringify(location) : undefined,
        waitingTime: waitingTime !== undefined ? waitingTime : undefined,
        lastStatusUpdate: new Date(),
      },
    });

    // Log audit
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'AVAILABILITY_UPDATED',
        resource: 'DOCTOR_AVAILABILITY',
        resourceId: availability.id,
        details: JSON.stringify({ isOnline, isAvailable, availableUntil }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({
      success: true,
      availability,
    })
  } catch (error) {
    console.error('Availability update error:', error)
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    )
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
