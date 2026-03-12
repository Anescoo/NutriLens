import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Mark all messages from a given sender to me as read
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const myId = session.user.id;
  const body = await req.json() as { senderId?: string };
  const { senderId } = body;

  if (!senderId) return NextResponse.json({ error: 'senderId required' }, { status: 400 });

  await prisma.message.updateMany({
    where: {
      senderId,
      recipientId: myId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return new NextResponse(null, { status: 204 });
}
