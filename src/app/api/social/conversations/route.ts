import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const myId = session.user.id;

  // Fetch all messages involving current user
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: myId }, { recipientId: myId }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      recipient: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Group by the other user (build conversation map)
  const convMap = new Map<
    string,
    {
      otherId: string;
      otherName: string | null;
      otherAvatar: string | null;
      lastMessage: string;
      lastMessageAt: Date;
      unreadCount: number;
      isLastMessageMine: boolean;
    }
  >();

  for (const msg of messages) {
    const isFromMe = msg.senderId === myId;
    const other = isFromMe ? msg.recipient : msg.sender;

    if (!convMap.has(other.id)) {
      convMap.set(other.id, {
        otherId: other.id,
        otherName: other.name,
        otherAvatar: other.avatarUrl,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        unreadCount: !isFromMe && !msg.isRead ? 1 : 0,
        isLastMessageMine: isFromMe,
      });
    } else {
      const conv = convMap.get(other.id)!;
      // Messages are sorted desc, so if already set, this is older — only count unread
      if (!isFromMe && !msg.isRead) {
        conv.unreadCount += 1;
      }
    }
  }

  const conversations = Array.from(convMap.values()).sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  );

  return NextResponse.json(conversations);
}
