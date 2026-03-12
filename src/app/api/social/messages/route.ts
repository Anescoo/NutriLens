import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const myId = session.user.id;
  const otherUserId = req.nextUrl.searchParams.get('userId');
  if (!otherUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: myId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      content: true,
      type: true,
      metadata: true,
      isRead: true,
      createdAt: true,
    },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const myId = session.user.id;
  const body = await req.json() as {
    recipientId?: string;
    content?: string;
    type?: string;
    metadata?: Record<string, unknown>;
  };
  const { recipientId, content = '', type = 'text', metadata = {} } = body;

  if (!recipientId || typeof recipientId !== 'string') {
    return NextResponse.json({ error: 'recipientId required' }, { status: 400 });
  }
  if (type === 'text' && (!content || content.trim().length === 0)) {
    return NextResponse.json({ error: 'content required' }, { status: 400 });
  }
  if (recipientId === myId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      senderId: myId,
      recipientId,
      content: content.trim(),
      type,
      metadata: JSON.stringify(metadata),
    },
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      content: true,
      type: true,
      metadata: true,
      isRead: true,
      createdAt: true,
    },
  });

  return NextResponse.json(message, { status: 201 });
}
