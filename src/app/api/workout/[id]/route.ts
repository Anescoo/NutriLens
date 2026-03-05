import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ws = await prisma.workoutSession.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...ws,
    exercises: JSON.parse(ws.exercises),
    completedAt: ws.completedAt ? Number(ws.completedAt) : undefined,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const ws = await prisma.workoutSession.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: body.name,
      date: body.date,
      exercises: JSON.stringify(body.exercises ?? []),
      completedAt: body.completedAt ? BigInt(body.completedAt) : null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(ws);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.workoutSession.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
