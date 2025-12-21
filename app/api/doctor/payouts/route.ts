import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getCurrentUserServer } from '@/lib/session'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserServer()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find doctor profile
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId: user.id } })
    if (!doctor) {
      return NextResponse.json({ error: 'Not a doctor' }, { status: 403 })
    }

    // Get query parameters
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const skip = parseInt(url.searchParams.get('skip') || '0')

    // Build filter
    const filter: any = { doctorId: doctor.id }
    if (status) filter.status = status

    // Get payouts
    const payouts = await prisma.doctorPayout.findMany({
      where: filter,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    })

    const total = await prisma.doctorPayout.count({ where: filter })

    return NextResponse.json({
      payouts,
      total,
      limit,
      skip,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
