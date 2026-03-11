import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.workoutPlan.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const plan = await prisma.workoutPlan.update({
    where: { id },
    data: {
      name: body.name,
      sessions: JSON.stringify(body.sessions ?? []),
      ...(typeof body.isPublic === 'boolean' ? { isPublic: body.isPublic } : {}),
    },
  });

  return NextResponse.json({
    ...plan,
    sessions: JSON.parse(plan.sessions),
    createdAt: Number(plan.createdAt),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.workoutPlan.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.workoutPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
