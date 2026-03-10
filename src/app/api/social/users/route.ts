import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      isPublic: true,
      id: { not: session.user.id },
      name: { contains: q },
    },
    select: {
      id: true,
      name: true,
      bio: true,
      avatarUrl: true,
      _count: {
        select: { followers: true },
      },
      followers: {
        where: { followerId: session.user.id },
        select: { followerId: true },
      },
    },
    take: 20,
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      followersCount: u._count.followers,
      isFollowing: u.followers.length > 0,
    }))
  );
}
