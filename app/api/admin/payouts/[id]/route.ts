import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { markPayoutAsApproved, triggerPayout, getPayoutById } from '@/lib/payouts';
import { requireAdmin } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET(req: Request, context: any) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id
    const payout = await getPayoutById(id);
    if (!payout) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: payout });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, context: any) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const action = body.action as string;
    const bodyAdminId = body.adminId as string | undefined;
    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    if (action === 'approve') {
      const updated = await markPayoutAsApproved(id, bodyAdminId || admin.id);
      return NextResponse.json({ ok: true, data: updated });
    }

    if (action === 'trigger') {
      const result = await triggerPayout(id);
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === 'manual') {
      // manual status update
      const updated = await prisma.doctorPayout.update({ where: { id }, data: body.data });
      return NextResponse.json({ ok: true, data: updated });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
