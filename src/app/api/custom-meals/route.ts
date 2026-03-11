import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface RawMeal {
  id: string;
  userId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
  items: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use raw SQL to include the `items` column (not yet in generated Prisma client)
  const meals = await prisma.$queryRaw<RawMeal[]>`
    SELECT id, userId, name, calories, protein, carbs, fat, grams, items
    FROM CustomMeal
    WHERE userId = ${session.user.id}
    ORDER BY id DESC
  `;

  return NextResponse.json(meals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, calories, protein, carbs, fat, grams, items } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  const itemsJson = Array.isArray(items) ? JSON.stringify(items) : '[]';
  const cal = Number(calories) || 0;
  const prot = Number(protein) || 0;
  const carb = Number(carbs) || 0;
  const f = Number(fat) || 0;
  const g = Number(grams) || 100;
  const trimName = name.trim();
  const userId = session.user.id;

  // Generate a cuid-like id
  const id = `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  await prisma.$executeRaw`
    INSERT INTO CustomMeal (id, userId, name, calories, protein, carbs, fat, grams, items)
    VALUES (${id}, ${userId}, ${trimName}, ${cal}, ${prot}, ${carb}, ${f}, ${g}, ${itemsJson})
  `;

  const meal: RawMeal = { id, userId, name: trimName, calories: cal, protein: prot, carbs: carb, fat: f, grams: g, items: itemsJson };
  return NextResponse.json(meal, { status: 201 });
}
