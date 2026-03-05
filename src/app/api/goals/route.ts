import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const DEFAULTS = { calories: 2000, protein: 100, carbs: 250, fat: 65 };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goals = await prisma.userGoals.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(goals ?? DEFAULTS);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const goals = await prisma.userGoals.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
    },
    update: {
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
    },
  });

  return NextResponse.json(goals);
}
