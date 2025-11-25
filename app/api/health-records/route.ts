import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const records = await prisma.healthRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Failed to fetch health records:', error)
    return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const title = (formData.get('title') as string) || 'Health Record'
      const recordType = (formData.get('recordType') as string) || 'report'

      const record = await prisma.healthRecord.create({
        data: {
          userId: session.user.id,
          title,
          description: 'Secure upload',
          recordType,
          fileUrl: '/uploads/mock-file'
        }
      })

      return NextResponse.json(record, { status: 201 })
    }

    const body = await req.json()
    const { title, description, recordType, fileUrl } = body

    if (!title || !recordType) {
      return NextResponse.json(
        { error: 'Title and recordType are required' },
        { status: 400 }
      )
    }

    const record = await prisma.healthRecord.create({
      data: {
        userId: session.user.id,
        title,
        description,
        recordType,
        fileUrl
      }
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Failed to create health record:', error)
    return NextResponse.json({ error: 'Failed to create health record' }, { status: 500 })
  }
}
