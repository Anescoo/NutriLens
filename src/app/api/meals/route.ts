import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  const where = date
    ? { userId: session.user.id, date }
    : { userId: session.user.id };

  const meals = await prisma.mealEntry.findMany({
    where,
    orderBy: { timestamp: 'asc' },
  });

  // Convert BigInt timestamp to number for JSON serialization
  return NextResponse.json(meals.map((m: { timestamp: bigint } & Record<string, unknown>) => ({ ...m, timestamp: Number(m.timestamp) })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const meal = await prisma.mealEntry.create({
    data: {
      id: body.id,
      userId: session.user.id,
      date: body.date,
      mealType: body.mealType,
      name: body.foodItem?.name ?? body.name,
      calories: body.foodItem?.calories ?? body.calories,
      protein: body.foodItem?.protein ?? body.protein,
      carbs: body.foodItem?.carbs ?? body.carbs,
      fat: body.foodItem?.fat ?? body.fat,
      grams: body.grams,
      timestamp: BigInt(body.timestamp),
    },
  });

  return NextResponse.json({ ...meal, timestamp: Number(meal.timestamp) }, { status: 201 });
}
