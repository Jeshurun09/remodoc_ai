import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/retention/streaks
 * Get health streaks for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streaks = await prisma.healthStreak.findMany({
      where: { patientId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      streaks: streaks.map((s: any) => ({
        ...s,
        badges: s.badges ? JSON.parse(s.badges) : [],
      })),
    });
  } catch (error) {
    console.error('Streaks error:', error);
    return NextResponse.json({ error: 'Failed to fetch streaks' }, { status: 500 });
  }
}

/**
 * POST /api/retention/streaks/:streakType/update
 * Update health streak
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const streakType = pathParts[pathParts.length - 2];

    if (!streakType) {
      return NextResponse.json({ error: 'Streak type required' }, { status: 400 });
    }

    // Get or create streak
    let streak = await prisma.healthStreak.findUnique({
      where: {
        patientId_streakType: {
          patientId: session.user.id,
          streakType,
        },
      },
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (!streak) {
      // Create new streak
      streak = await prisma.healthStreak.create({
        data: {
          patientId: session.user.id,
          streakType,
          currentStreak: 1,
          longestStreak: 1,
          lastAction: now,
          startedAt: now,
          badges: JSON.stringify([]),
        },
      });
    } else if (!streak.lastAction || streak.lastAction < yesterday) {
      // Streak broken - reset
      streak = await prisma.healthStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: 1,
          lastAction: now,
          startedAt: now,
        },
      });
    } else {
      // Continue streak
      const newStreak = streak.currentStreak + 1;
      const badges = JSON.parse(streak.badges || '[]');

      // Award badges at milestones
      if (newStreak === 7) badges.push('week_warrior');
      if (newStreak === 30) badges.push('month_master');
      if (newStreak === 100) badges.push('century_champ');
      if (newStreak === 365) badges.push('yearly_hero');

      streak = await prisma.healthStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(streak.longestStreak, newStreak),
          lastAction: now,
          badges: JSON.stringify(badges),
        },
      });
    }

    return NextResponse.json({
      success: true,
      streak: {
        ...streak,
        badges: JSON.parse(streak.badges || '[]'),
      },
    });
  } catch (error) {
    console.error('Streak update error:', error);
    return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 });
  }
}

// Family profiles should live under /api/family (separate route).
async function getFamilyProfiles(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = new URL(request.url).pathname;

    if (path.includes('/family')) {
      // Get patient profile
      const patient = await prisma.patientProfile.findUnique({
        where: { userId: session.user.id },
        include: { familyMembers: true },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      // Get subscription to check if family plan
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
      });

      if (!subscription || subscription.plan !== 'FAMILY') {
        return NextResponse.json({
          error: 'Family profiles only available with family plan',
        });
      }

      return NextResponse.json({
        success: true,
        familyMembers: patient.familyMembers,
      });
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Family profiles error:', error);
    return NextResponse.json({ error: 'Failed to fetch family profiles' }, { status: 500 });
  }
}

// Add family member should live under /api/family (separate route).
async function addFamilyMember(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, relationship, email, phone, dateOfBirth, canAccessRecords } =
      await request.json();

    if (!name || !relationship) {
      return NextResponse.json({ error: 'Name and relationship required' }, { status: 400 });
    }

    // Get patient profile
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Create family member
    const member = await prisma.familyMember.create({
      data: {
        patientId: patient.id,
        name,
        relationship,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        canAccessRecords: canAccessRecords || false,
      },
    });

    // Log audit
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_MEMBER_ADDED',
        resource: 'FAMILY_MEMBER',
        resourceId: member.id,
        details: JSON.stringify({ name, relationship }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Add family member error:', error);
    return NextResponse.json({ error: 'Failed to add family member' }, { status: 500 });
  }
}

// Emergency shortcut should live under /api/emergency (separate route).
async function getEmergencyShortcut(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = new URL(request.url).pathname;

    if (path.includes('/emergency')) {
      let shortcut = await prisma.emergencyShortcut.findUnique({
        where: { patientId: session.user.id },
        include: {
          emergencyContacts: {
            include: { patient: { select: { id: true } } },
          },
        },
      });

      if (!shortcut) {
        // Create default
        shortcut = await prisma.emergencyShortcut.create({
          data: {
            patientId: session.user.id,
            emergencyContacts: JSON.stringify([]),
          },
        });
      }

      return NextResponse.json({
        success: true,
        shortcut: {
          ...shortcut,
          emergencyContacts: shortcut.emergencyContacts
            ? JSON.parse(shortcut.emergencyContacts)
            : [],
        },
      });
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Emergency shortcut error:', error);
    return NextResponse.json({ error: 'Failed to fetch emergency shortcut' }, { status: 500 });
  }
}

// Emergency trigger should live under /api/emergency (separate route).
async function triggerEmergency(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emergencyType, location, description } = await request.json();

    if (!emergencyType) {
      return NextResponse.json({ error: 'Emergency type required' }, { status: 400 });
    }

    // Get patient
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      include: { emergencyContacts: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Create emergency record
    const emergency = await prisma.emergency.create({
      data: {
        patientId: patient.id,
        reportedBy: session.user.id,
        type: emergencyType,
        severity: 'CRITICAL',
        description: description || emergencyType,
        location: location ? JSON.stringify(location) : null,
      },
    });

    // Send notifications to emergency contacts
    for (const contact of patient.emergencyContacts) {
      if (contact.isPrimary || contact.verified) {
        // In production, send SMS/email here
        console.log(`Sending emergency alert to ${contact.name} at ${contact.phone}`);
      }
    }

    // Create audit log
    await prisma.enhancedAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'EMERGENCY_TRIGGERED',
        resource: 'EMERGENCY',
        resourceId: emergency.id,
        details: JSON.stringify({ type: emergencyType, location }),
        severity: 'CRITICAL',
      },
    });

    return NextResponse.json({
      success: true,
      emergency,
      message: 'Emergency alert sent to your contacts. Help is on the way!',
    });
  } catch (error) {
    console.error('Emergency trigger error:', error);
    return NextResponse.json({ error: 'Failed to trigger emergency' }, { status: 500 });
  }
}
