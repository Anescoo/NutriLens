import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/social/connections?type=followers|following&userId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = req.nextUrl.searchParams.get('userId') ?? session.user.id;
  const type = req.nextUrl.searchParams.get('type'); // 'followers' | 'following'

  if (type === 'followers') {
    const rows = await prisma.userFollow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, name: true, bio: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const currentUserId = session.user.id;
    const followingIds = new Set(
      (await prisma.userFollow.findMany({ where: { followerId: currentUserId }, select: { followingId: true } }))
        .map((r) => r.followingId)
    );

    return NextResponse.json(
      rows.map((r) => ({
        id: r.follower.id,
        name: r.follower.name,
        bio: r.follower.bio,
        avatarUrl: r.follower.avatarUrl,
        isFollowing: followingIds.has(r.follower.id),
      }))
    );
  }

  if (type === 'following') {
    const rows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, name: true, bio: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const currentUserId = session.user.id;
    const followingIds = new Set(
      (await prisma.userFollow.findMany({ where: { followerId: currentUserId }, select: { followingId: true } }))
        .map((r) => r.followingId)
    );

    return NextResponse.json(
      rows.map((r) => ({
        id: r.following.id,
        name: r.following.name,
        bio: r.following.bio,
        avatarUrl: r.following.avatarUrl,
        isFollowing: followingIds.has(r.following.id),
      }))
    );
  }

  return NextResponse.json({ error: 'type must be followers or following' }, { status: 400 });
}
