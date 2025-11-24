import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const id = params.id
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const record = await prisma.healthRecord.findUnique({
      where: { id }
    })

    if (!record || record.userId !== session.user.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Generate a shareable link (in production, use a secure token)
    const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/record/${id}?token=${Buffer.from(`${session.user.id}:${id}`).toString('base64')}`

    return NextResponse.json({ shareUrl })
  } catch (error) {
    console.error('Failed to share health record:', error)
    return NextResponse.json({ error: 'Failed to share health record' }, { status: 500 })
  }
}

