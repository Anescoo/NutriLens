import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const plan = await prisma.workoutPlan.findFirst({
    where: { id, userId: session.user.id },
    include: { sharedLinks: true },
  });
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Reuse existing share link if present
  if (plan.sharedLinks.length > 0) {
    return NextResponse.json({ token: plan.sharedLinks[0].token });
  }

  const token = generateToken();
  await prisma.sharedPlan.create({ data: { token, planId: id } });

  return NextResponse.json({ token });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const plan = await prisma.workoutPlan.findFirst({ where: { id, userId: session.user.id } });
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.sharedPlan.deleteMany({ where: { planId: id } });

  return NextResponse.json({ ok: true });
}
