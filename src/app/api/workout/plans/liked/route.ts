import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  try {
    const likes = await prisma.planLike.findMany({
      where: { userId },
      include: {
        plan: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            likes: { select: { userId: true } },
          },
        },
      },
      orderBy: { savedAt: 'desc' },
    });

    const plans = likes
      .filter((l) => l.plan !== null)
      .map((l) => ({
        id: l.plan.id,
        name: l.plan.name,
        sessions: JSON.parse(l.plan.sessions),
        authorId: l.plan.user.id,
        authorName: l.plan.user.name,
        likesCount: l.plan.likes.length,
        isLiked: true,
        savedAt: l.savedAt.toISOString(),
      }));

    return NextResponse.json(plans);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
