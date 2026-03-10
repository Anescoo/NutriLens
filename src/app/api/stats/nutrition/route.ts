import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const days = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get('days') ?? '30')));

  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  const startStr = toDateStr(start);
  const todayStr = toDateStr(new Date());

  // Fetch meals in the date range
  const meals = await prisma.mealEntry.findMany({
    where: { userId: session.user.id, date: { gte: startStr } },
    select: { date: true, mealType: true, name: true, calories: true, protein: true, carbs: true, fat: true },
  });

  // Group by date + meal type breakdown + top foods
  const byDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  const mealBreakdown: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  const foodMap = new Map<string, { name: string; count: number; totalCalories: number }>();

  for (const m of meals) {
    const d = byDate.get(m.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    d.calories += m.calories;
    d.protein += m.protein;
    d.carbs += m.carbs;
    d.fat += m.fat;
    byDate.set(m.date, d);
    if (m.mealType in mealBreakdown) mealBreakdown[m.mealType] += m.calories;

    const key = m.name.trim().toLowerCase();
    const food = foodMap.get(key);
    if (food) { food.count++; food.totalCalories += m.calories; }
    else foodMap.set(key, { name: m.name.trim(), count: 1, totalCalories: m.calories });
  }

  const topFoods = [...foodMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ name, count, totalCalories }) => ({ name, count, avgCalories: Math.round(totalCalories / count) }));

  // Build daily array (fill gaps with zeros)
  const daily: Array<{ date: string; calories: number; protein: number; carbs: number; fat: number }> = [];
  const cursor = new Date(start);
  while (toDateStr(cursor) <= todayStr) {
    const ds = toDateStr(cursor);
    const d = byDate.get(ds) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    daily.push({ date: ds, ...d });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Averages over logged days only
  const logged = daily.filter((d) => d.calories > 0);
  function avg(key: 'calories' | 'protein' | 'carbs' | 'fat') {
    return logged.length ? logged.reduce((s, d) => s + d[key], 0) / logged.length : 0;
  }

  // Current streak (needs all-time data)
  const allDates = await prisma.mealEntry.groupBy({
    by: ['date'],
    where: { userId: session.user.id },
  });
  const dateSet = new Set(allDates.map((d) => d.date));

  let currentStreak = 0;
  const streakCursor = new Date();
  // If today not yet logged, start streak check from yesterday
  if (!dateSet.has(toDateStr(streakCursor))) {
    streakCursor.setDate(streakCursor.getDate() - 1);
  }
  for (let i = 0; i < 366; i++) {
    if (dateSet.has(toDateStr(streakCursor))) {
      currentStreak++;
      streakCursor.setDate(streakCursor.getDate() - 1);
    } else {
      break;
    }
  }

  return NextResponse.json({
    daily,
    mealBreakdown,
    topFoods,
    averages: {
      calories: Math.round(avg('calories')),
      protein: Math.round(avg('protein') * 10) / 10,
      carbs: Math.round(avg('carbs') * 10) / 10,
      fat: Math.round(avg('fat') * 10) / 10,
    },
    loggedDays: logged.length,
    totalDays: daily.length,
    currentStreak,
  });
}
