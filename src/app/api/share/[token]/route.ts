import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shared = await prisma.sharedPlan.findUnique({
    where: { token },
    include: { plan: true },
  });

  if (!shared) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!shared.plan) return NextResponse.json({ error: 'Plan deleted' }, { status: 410 });

  const plan = shared.plan;
  return NextResponse.json({
    name: plan.name,
    sessions: JSON.parse(plan.sessions),
    createdAt: Number(plan.createdAt),
  });
}
