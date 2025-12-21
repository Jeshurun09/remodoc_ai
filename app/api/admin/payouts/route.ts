import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getCurrentUserServer, requireAdmin } from '@/lib/session'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // Get query parameters for filtering
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const doctor = url.searchParams.get('doctor')
    const provider = url.searchParams.get('provider')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const skip = parseInt(url.searchParams.get('skip') || '0')

    // Build filter
    const filter: any = {}
    if (status) filter.status = status
    if (doctor) filter.doctorId = doctor
    if (provider) filter.provider = provider
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.gte = new Date(startDate)
      if (endDate) filter.createdAt.lte = new Date(endDate)
    }

    const payouts = await prisma.doctorPayout.findMany({
      where: filter,
      include: { doctor: { include: { user: true } }, items: true },
      orderBy: { periodStart: 'desc' },
      take: limit,
      skip,
    })

    const total = await prisma.doctorPayout.count({ where: filter })

    return NextResponse.json({
      ok: true,
      data: payouts,
      total,
      limit,
      skip,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    // Create a manual payout record (admin use)
    const { doctorId, periodStart, periodEnd, amountDue, currency, notes } = body
    const payout = await prisma.doctorPayout.create({
      data: {
        doctorId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        consultationsCount: 0,
        interactionsCount: 0,
        amountDue: amountDue || 0,
        currency: currency || 'KES',
        notes: notes || 'Manual payout created by admin',
        status: 'READY' as any,
      },
    })
    return NextResponse.json({ ok: true, data: payout })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
