import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> } // FIX: Change to use Promise type
) {
  // FIX: Await the params object
  const params = await props.params;

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use the resolved params.id
    const record = await prisma.healthRecord.findUnique({
      where: { id: params.id }
    })

    if (!record || record.userId !== session.user.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // In a real implementation, fetch from cloud storage and decrypt
    // For now, return a mock response
    return NextResponse.json({ fileUrl: record.fileUrl })
  } catch (error) {
    console.error('Failed to download health record:', error)
    return NextResponse.json({ error: 'Failed to download health record' }, { status: 500 })
  }
}