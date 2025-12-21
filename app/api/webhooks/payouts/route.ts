import { NextResponse } from 'next/server';
import { PrismaClient, PayoutStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Generic webhook endpoint for payout provider callbacks.
// Providers should POST { payoutId, status, providerReference, meta? }

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { payoutId, status, providerReference, meta } = body;
    if (!payoutId || !status) return NextResponse.json({ ok: false, error: 'Missing payoutId or status' }, { status: 400 });

    // Map provider status to local PayoutStatus where possible
    let newStatus: PayoutStatus = PayoutStatus.FAILED;
    if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'PAID') newStatus = PayoutStatus.PAID;
    if (status === 'PROCESSING' || status === 'PENDING') newStatus = PayoutStatus.PROCESSING;
    if (status === 'FAILED' || status === 'ERROR') newStatus = PayoutStatus.FAILED;

    const updated = await prisma.doctorPayout.update({
      where: { id: payoutId },
      data: { status: newStatus, providerReference: providerReference || undefined, processedAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
