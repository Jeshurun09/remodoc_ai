import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chat - Get user's chats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
            isActive: true,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1, // Get latest message
          select: {
            id: true,
            content: true,
            sentAt: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                readBy: {
                  doesNotContain: session.user.id,
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(chats);

  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat - Create new chat
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, participantIds, name, initialMessage } = await request.json();

    if (!participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json({ error: 'Participant IDs required' }, { status: 400 });
    }

    // Add current user to participants
    const allParticipantIds = [...new Set([session.user.id, ...participantIds])];

    // Validate participants exist
    const participants = await prisma.user.findMany({
      where: {
        id: { in: allParticipantIds },
      },
      select: { id: true, name: true, role: true },
    });

    if (participants.length !== allParticipantIds.length) {
      return NextResponse.json({ error: 'Some participants not found' }, { status: 400 });
    }

    // Create chat
    const chat = await prisma.chat.create({
      data: {
        type: type || 'DIRECT',
        name: name || null,
        createdBy: session.user.id,
        participants: {
          create: allParticipantIds.map(userId => ({
            userId,
            role: userId === session.user.id ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Send initial message if provided
    if (initialMessage) {
      await prisma.chatMessage.create({
        data: {
          chatId: chat.id,
          senderId: session.user.id,
          content: initialMessage,
          type: 'TEXT',
        },
      });
    }

    // Log chat creation
    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'CHAT_CREATED',
        resource: 'CHAT',
        resourceId: chat.id,
        details: { participantCount: allParticipantIds.length, type },
      },
    });

    return NextResponse.json(chat);

  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}