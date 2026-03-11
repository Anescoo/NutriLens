import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const DEFAULTS = { calories: 2000, protein: 100, carbs: 250, fat: 65, workoutFrequency: 3 };

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
      calories: body.calories ?? DEFAULTS.calories,
      protein: body.protein ?? DEFAULTS.protein,
      carbs: body.carbs ?? DEFAULTS.carbs,
      fat: body.fat ?? DEFAULTS.fat,
      workoutFrequency: body.workoutFrequency ?? DEFAULTS.workoutFrequency,
    },
    update: {
      ...(body.calories !== undefined && { calories: body.calories }),
      ...(body.protein !== undefined && { protein: body.protein }),
      ...(body.carbs !== undefined && { carbs: body.carbs }),
      ...(body.fat !== undefined && { fat: body.fat }),
      ...(body.workoutFrequency !== undefined && { workoutFrequency: body.workoutFrequency }),
    },
  });

  return NextResponse.json(goals);
}
