import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// --- Interface for Route Context (Crucial Fix for the original error) ---
interface RouteContext {
  params: {
    id: string; // The dynamic segment [id] will be available here
  };
}
// ------------------------------------------------------------------------

/**
 * GET handler: Fetch a single health record by ID.
 * @param req The NextRequest object.
 * @param context The context containing the route parameters.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params // Get the ID from the URL parameters

  try {
    const record = await prisma.healthRecord.findUnique({
      where: {
        id: id, // Use the ID from the URL
        userId: session.user.id // Ensure the record belongs to the user
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json(record)
  } catch (error) {
    console.error(`Failed to fetch health record ${id}:`, error)
    return NextResponse.json({ error: 'Failed to fetch health record' }, { status: 500 })
  }
}

/**
 * DELETE handler: Delete a single health record by ID.
 * This was the function causing the original TypeScript error.
 * @param req The NextRequest object.
 * @param context The context containing the route parameters.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params // Get the ID from the URL parameters

  try {
    // 1. Check if the record exists and belongs to the user before deleting
    const record = await prisma.healthRecord.findUnique({
      where: {
        id: id,
        userId: session.user.id // Security check: Only delete your own records
      }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 })
    }
    
    // 2. Perform the deletion
    await prisma.healthRecord.delete({
      where: { id: id },
    })

    // 3. (Real-world step) Implement logic to delete the actual file from cloud storage here!

    return NextResponse.json({ success: true, message: `Record ${id} deleted` })
  } catch (error) {
    console.error(`Failed to delete health record ${id}:`, error)
    return NextResponse.json({ error: 'Failed to delete health record' }, { status: 500 })
  }
}
