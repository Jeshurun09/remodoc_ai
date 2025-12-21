import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/session';
import { markPayoutAsApproved, triggerPayout } from '@/lib/payouts';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action, ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ ok: false, error: 'No ids provided' }, { status: 400 });

    const results: Record<string, any> = {};
    if (action === 'approve') {
      for (const id of ids) {
        try {
          const updated = await markPayoutAsApproved(id, admin.id);
          results[id] = { ok: true, data: updated };
        } catch (err: any) {
          results[id] = { ok: false, error: err.message };
        }
      }
      return NextResponse.json({ ok: true, data: results });
    }

    if (action === 'trigger') {
      for (const id of ids) {
        try {
          const res = await triggerPayout(id);
          results[id] = { ok: true, data: res };
        } catch (err: any) {
          results[id] = { ok: false, error: err.message };
        }
      }
      return NextResponse.json({ ok: true, data: results });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
