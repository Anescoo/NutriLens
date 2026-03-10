import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      bio: true,
      avatarUrl: true,
      isPublic: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
      ...(session?.user?.id
        ? {
            followers: {
              where: { followerId: session.user.id },
              select: { followerId: true },
            },
          }
        : {}),
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const isFollowing =
    'followers' in user && Array.isArray((user as { followers?: unknown[] }).followers)
      ? ((user as { followers: unknown[] }).followers.length > 0)
      : false;

  return NextResponse.json({
    id: user.id,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isPublic: user.isPublic,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
  });
}
