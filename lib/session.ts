import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getCurrentUserServer(req?: Request) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (session && session.user && session.user.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } })
      return user
    }
  } catch (err) {
    // ignore
  }

  // fallback to header (for scripts or manual requests)
  if (req) {
    try {
      const uid = req.headers.get('x-user-id')
      if (uid) {
        const u = await prisma.user.findUnique({ where: { id: uid } })
        return u
      }
    } catch (err) {
      // ignore
    }
  }

  return null
}

export async function requireAdmin(req?: Request) {
  const user = await getCurrentUserServer(req)
  if (!user || user.role !== 'ADMIN') return null
  return user
}
