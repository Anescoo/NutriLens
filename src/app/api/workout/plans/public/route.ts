import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const authorId = searchParams.get('authorId') ?? null;

  const plans = await prisma.workoutPlan.findMany({
    where: {
      isPublic: true,
      ...(authorId ? { userId: authorId } : currentUserId ? { userId: { not: currentUserId } } : {}),
      ...(q.length >= 2 ? { name: { contains: q } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      likes: { select: { userId: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return NextResponse.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      sessions: JSON.parse(p.sessions),
      createdAt: Number(p.createdAt),
      isPublic: p.isPublic,
      authorId: p.user.id,
      authorName: p.user.name,
      authorAvatarUrl: p.user.avatarUrl,
      likesCount: p.likes.length,
      isLiked: currentUserId ? p.likes.some((l) => l.userId === currentUserId) : false,
      isSaved: currentUserId ? p.likes.some((l) => l.userId === currentUserId) : false,
    }))
  );
  } catch (err) {
    console.error('[/api/workout/plans/public]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
