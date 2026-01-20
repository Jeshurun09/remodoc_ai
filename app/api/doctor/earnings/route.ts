import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/promo-codes/validate
 * Validate a promo code
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, planName, purchaseAmount } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Promo code required' }, { status: 400 });
    }

    // Find promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promoCode) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 });
    }

    // Check if active
    if (!promoCode.isActive) {
      return NextResponse.json({ error: 'Promo code is no longer active' }, { status: 400 });
    }

    // Check expiry
    if (promoCode.validUntil < new Date()) {
      return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 });
    }

    // Check uses remaining
    if (promoCode.maxUses && promoCode.usesRemaining !== null && promoCode.usesRemaining <= 0) {
      return NextResponse.json({ error: 'Promo code usage limit reached' }, { status: 400 });
    }

    // Check applicable plans
    if (promoCode.applicablePlans) {
      const applicablePlans = JSON.parse(promoCode.applicablePlans);
      if (!applicablePlans.includes(planName)) {
        return NextResponse.json(
          { error: `This promo code is not applicable to ${planName} plan` },
          { status: 400 }
        );
      }
    }

    // Check minimum purchase amount
    if (promoCode.minPurchaseAmount && purchaseAmount < promoCode.minPurchaseAmount) {
      return NextResponse.json(
        { error: `Minimum purchase amount of ${promoCode.minPurchaseAmount} required` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === 'percentage') {
      discountAmount = (purchaseAmount * promoCode.discountValue) / 100;
    } else {
      discountAmount = promoCode.discountValue;
    }

    return NextResponse.json({
      success: true,
      isValid: true,
      promoCode: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount,
        specialOffer: promoCode.specialOffer,
      },
    });
  } catch (error) {
    console.error('Promo code validation error:', error);
    return NextResponse.json({ error: 'Failed to validate promo code' }, { status: 500 });
  }
}

/**
 * NOTE: This file is /api/doctor/earnings and can only export ONE GET handler.
 * The promo-codes endpoints should live under /api/promo-codes (separate route).
 */
async function getStudentPromoCodes(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'student';

    const promoCodes = await prisma.promoCode.findMany({
      where: {
        isActive: true,
        validUntil: { gt: new Date() },
        specialOffer: type,
      },
      select: {
        code: true,
        discountType: true,
        discountValue: true,
        applicablePlans: true,
        minPurchaseAmount: true,
        specialOffer: true,
      },
    });

    return NextResponse.json({
      success: true,
      promoCodes,
    });
  } catch (error) {
    console.error('Get promo codes error:', error);
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

/**
 * GET /api/doctor/earnings
 * Get doctor earnings dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = new URL(request.url).pathname;

    if (path.includes('/earnings')) {
      const period = searchParams.get('period') || 'month'; // week, month, year

      // Get doctor profile
      const doctor = await prisma.doctorProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!doctor) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }

      // Calculate date range
      let startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      // Get earnings records
      const earnings = await prisma.doctorEarningsRecord.findMany({
        where: {
          doctorId: doctor.id,
          transactionDate: { gte: startDate },
        },
        orderBy: { transactionDate: 'desc' },
      });

      // Get pending and completed payouts
      const pendingPayouts = await prisma.doctorPayout.findMany({
        where: {
          doctorId: doctor.id,
          status: 'PENDING',
        },
      });

      const totalEarnings = earnings.reduce((sum, e) => sum + e.amountEarned, 0);
      const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amountDue, 0);

      // Get performance metrics
      const metrics = await prisma.doctorPerformanceMetric.findFirst({
        where: { doctorId: doctor.id },
        orderBy: { recordedAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        dashboard: {
          period,
          totalEarnings,
          earningsCount: earnings.length,
          averagePerConsult: earnings.length > 0 ? totalEarnings / earnings.length : 0,
          pendingAmount,
          recentEarnings: earnings.slice(0, 10),
          metrics: {
            satisfactionRating: metrics?.patientSatisfactionRating || 0,
            completionRate: metrics?.appointmentCompletionRate || 0,
            averageResponseTime: metrics?.averageResponseTime || 0,
            cancellationRate: metrics?.cancellationRate || 0,
          },
        },
      });
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Earnings dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}

/**
 * Auto-notes should live under /api/doctor/auto-notes (separate route).
 */
async function getDoctorAutoNotes(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = new URL(request.url).pathname;

    if (path.includes('/auto-notes')) {
      // Get doctor profile
      const doctor = await prisma.doctorProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!doctor) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }

      const appointmentId = searchParams.get('appointmentId');

      let whereClause: any = { doctorId: doctor.id };
      if (appointmentId) {
        whereClause.appointmentId = appointmentId;
      }

      const notes = await prisma.autoGeneratedNotes.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });

      const enriched = notes.map((note) => ({
        ...note,
        keyPoints: note.keyPoints ? JSON.parse(note.keyPoints) : [],
        followUpActions: note.followUpActions ? JSON.parse(note.followUpActions) : [],
      }));

      return NextResponse.json({
        success: true,
        notes: enriched,
      });
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Auto notes fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

/**
 * PUT /api/doctor/auto-notes/:noteId/approve
 * Doctor approves/edits auto-generated notes
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { noteId, action, editedNotes } = await request.json();

    if (!noteId || !action) {
      return NextResponse.json({ error: 'Note ID and action required' }, { status: 400 });
    }

    // Get note
    const note = await prisma.autoGeneratedNotes.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.doctorId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update note
    const updated = await prisma.autoGeneratedNotes.update({
      where: { id: noteId },
      data: {
        isApproved: action === 'approve' || action === 'edit',
        approvedAt: new Date(),
        generatedNotes: action === 'edit' && editedNotes ? editedNotes : note.generatedNotes,
      },
    });

    return NextResponse.json({
      success: true,
      note: updated,
    });
  } catch (error) {
    console.error('Note update error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}
