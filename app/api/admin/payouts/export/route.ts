import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const payouts = await prisma.doctorPayout.findMany({ where, include: { doctor: { include: { user: true } }, items: true }, orderBy: { periodStart: 'desc' } });

    // Build CSV
    const header = ['payoutId,doctorId,doctorName,periodStart,periodEnd,consultationsCount,amountDue,currency,status,providerReference,notes'];
    const rows = payouts.map(p => {
      const docName = p.doctor?.user?.name?.replace(/,/g, ' ') || '';
      return [p.id, p.doctorId, docName, p.periodStart.toISOString(), p.periodEnd.toISOString(), String(p.consultationsCount), String(p.amountDue), p.currency, p.status, p.providerReference || '', (p.notes || '').replace(/\n/g, ' ').replace(/,/g, ' ')].join(',')
    });

    const csv = header.concat(rows).join('\n');

    return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="payouts.csv"' } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
