import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const id = params.id
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { read } = await req.json()

  try {
    const insight = await prisma.healthInsight.update({
      where: { id },
      data: { read }
    })

    return NextResponse.json(insight)
  } catch (error) {
    console.error('Failed to update insight:', error)
    return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 })
  }
}

