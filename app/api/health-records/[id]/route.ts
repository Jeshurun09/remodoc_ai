import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const record = await prisma.healthRecord.findUnique({
      where: { id: params.id }
    })

    if (!record || record.userId !== session.user.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    await prisma.healthRecord.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete health record:', error)
    return NextResponse.json({ error: 'Failed to delete health record' }, { status: 500 })
  }
}

