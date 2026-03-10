import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { targetUserId } = body as { targetUserId: string };

  if (!targetUserId) return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
  if (targetUserId === session.user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  await prisma.userFollow.upsert({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetUserId,
      },
    },
    create: {
      followerId: session.user.id,
      followingId: targetUserId,
    },
    update: {},
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targetUserId = req.nextUrl.searchParams.get('targetUserId');
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });

  await prisma.userFollow.deleteMany({
    where: {
      followerId: session.user.id,
      followingId: targetUserId,
    },
  });

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const [isFollowing, followersCount, followingCount] = await Promise.all([
    prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: userId,
        },
      },
    }),
    prisma.userFollow.count({ where: { followingId: userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
  ]);

  return NextResponse.json({
    isFollowing: !!isFollowing,
    followersCount,
    followingCount,
  });
}
