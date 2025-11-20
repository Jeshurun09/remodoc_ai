import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
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

  const formData = await req.formData()
  const file = formData.get('file') as File
  const title = formData.get('title') as string
  const recordType = formData.get('recordType') as string

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  try {
    // In a real implementation, upload to cloud storage (S3, etc.) and encrypt
    // For now, we'll just store metadata
    const record = await prisma.healthRecord.create({
      data: {
        userId: session.user.id,
        title: title || file.name,
        recordType: recordType || 'report',
        fileUrl: `/uploads/${file.name}`, // Mock URL
        encrypted: true
      }
    })

    return NextResponse.json({ ...record, fileUrl: record.fileUrl })
  } catch (error) {
    console.error('Failed to create health record:', error)
    return NextResponse.json({ error: 'Failed to create health record' }, { status: 500 })
  }
}

