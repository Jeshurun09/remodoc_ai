import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chat/messages?chatId=... - Get messages for a chat
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    // Verify user is participant in chat
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatId,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const skip = (page - 1) * limit;

    const messages = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
        replies: {
          select: {
            id: true,
            content: true,
            sentAt: true,
            sender: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    // Mark messages as read by this user
    await prisma.chatMessage.updateMany({
      where: {
        chatId,
        readBy: {
          doesNotContain: session.user.id,
        },
      },
      data: {
        readBy: {
          push: session.user.id,
        },
      },
    });

    return NextResponse.json(messages);

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, content, type, replyToId, fileUrl, fileName, fileSize } = await request.json();

    if (!chatId || !content) {
      return NextResponse.json({ error: 'Chat ID and content required' }, { status: 400 });
    }

    // Verify user is participant in chat
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatId,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify replyTo exists if provided
    if (replyToId) {
      const replyMessage = await prisma.chatMessage.findFirst({
        where: {
          id: replyToId,
          chatId,
        },
      });
      if (!replyMessage) {
        return NextResponse.json({ error: 'Reply message not found' }, { status: 400 });
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        chatId,
        senderId: session.user.id,
        content,
        type: type || 'TEXT',
        replyToId,
        fileUrl,
        fileName,
        fileSize,
        readBy: [session.user.id], // Sender has read their own message
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Update chat's updatedAt
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Log message sent
    await prisma.securityAuditLog.create({
      data: {
        userId: session.user.id,
        action: 'MESSAGE_SENT',
        resource: 'CHAT_MESSAGE',
        resourceId: message.id,
        details: { chatId, type: message.type },
      },
    });

    return NextResponse.json(message);

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}