import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const requests = await prisma.doctorVerificationRequest.findMany({ where, orderBy: { createdAt: 'desc' }, include: { doctor: { include: { user: true } } } })
    return NextResponse.json({ requests })
  } catch (error) {
    console.error('GET /admin/doctor-verifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
