import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, context: any) {
  // Resolve params whether it's a Promise or a direct object
  const params = await Promise.resolve(context.params)

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { read } = await req.json()

  try {
    // 2. Use the resolved params.id
    const insight = await prisma.healthInsight.update({
      where: { id: params.id },
      data: { read }
    })

    return NextResponse.json(insight)
  } catch (error) {
    console.error('Failed to update insight:', error)
    return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 })
  }
}