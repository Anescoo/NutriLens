import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(
    sessions.map((s: { exercises: string; completedAt: bigint | null } & Record<string, unknown>) => ({
      ...s,
      exercises: JSON.parse(s.exercises),
      completedAt: s.completedAt ? Number(s.completedAt) : undefined,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const ws = await prisma.workoutSession.create({
    data: {
      id: body.id,
      userId: session.user.id,
      name: body.name,
      date: body.date,
      exercises: JSON.stringify(body.exercises ?? []),
      completedAt: body.completedAt ? BigInt(body.completedAt) : null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({
    ...ws,
    exercises: JSON.parse(ws.exercises),
    completedAt: ws.completedAt ? Number(ws.completedAt) : undefined,
  }, { status: 201 });
}
