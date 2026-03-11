import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plans = await prisma.workoutPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    plans.map((p: { sessions: string; createdAt: bigint } & Record<string, unknown>) => ({
      ...p,
      sessions: JSON.parse(p.sessions),
      createdAt: Number(p.createdAt),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const plan = await prisma.workoutPlan.create({
    data: {
      userId: session.user.id,
      name: body.name,
      sessions: JSON.stringify(body.sessions ?? []),
      createdAt: BigInt(Date.now()),
      isPublic: body.isPublic ?? false,
    },
  });

  return NextResponse.json({
    ...plan,
    sessions: JSON.parse(plan.sessions),
    createdAt: Number(plan.createdAt),
  }, { status: 201 });
}
