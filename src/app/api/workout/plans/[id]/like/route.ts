import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST — like/save a plan
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: planId } = await params;

  const plan = await prisma.workoutPlan.findFirst({ where: { id: planId, isPublic: true } });
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.planLike.upsert({
    where: { userId_planId: { userId: session.user.id, planId } },
    create: { userId: session.user.id, planId },
    update: {},
  });

  const likesCount = await prisma.planLike.count({ where: { planId } });
  return NextResponse.json({ liked: true, likesCount });
}

// DELETE — unlike/unsave a plan
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: planId } = await params;

  await prisma.planLike.deleteMany({
    where: { userId: session.user.id, planId },
  });

  const likesCount = await prisma.planLike.count({ where: { planId } });
  return NextResponse.json({ liked: false, likesCount });
}
