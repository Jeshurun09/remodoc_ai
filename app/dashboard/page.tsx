import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  // Not authenticated – send to login
  if (!session || !session.user) {
    redirect('/login')
  }

  const role = session.user.role

  if (role === 'PATIENT') {
    redirect('/dashboard/patient')
  }

  if (role === 'DOCTOR') {
    redirect('/dashboard/doctor')
  }

  if (role === 'ADMIN') {
    redirect('/dashboard/admin')
  }

  // Fallback: unknown role, send to login
  redirect('/login')
}

