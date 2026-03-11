import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // ── Nutrition streak ──────────────────────────────────────────────────────
  // Consecutive days where the user logged ≥ 80% of their calorie goal

  const userGoals = await prisma.userGoals.findUnique({ where: { userId } });
  const calorieGoal = userGoals?.calories ?? 2000;
  const workoutFrequency = userGoals?.workoutFrequency ?? 3;

  const allMeals = await prisma.mealEntry.groupBy({
    by: ['date'],
    where: { userId },
    _sum: { calories: true },
  });

  const nutritionByDate = new Map<string, number>();
  for (const m of allMeals) {
    nutritionByDate.set(m.date, m._sum.calories ?? 0);
  }

  let nutritionStreak = 0;
  const nutCursor = new Date();
  // If today hasn't hit goal yet, start counting from yesterday
  if ((nutritionByDate.get(toDateStr(nutCursor)) ?? 0) < calorieGoal * 0.8) {
    nutCursor.setDate(nutCursor.getDate() - 1);
  }
  for (let i = 0; i < 366; i++) {
    const ds = toDateStr(nutCursor);
    if ((nutritionByDate.get(ds) ?? 0) >= calorieGoal * 0.8) {
      nutritionStreak++;
      nutCursor.setDate(nutCursor.getDate() - 1);
    } else {
      break;
    }
  }

  // ── Workout streak (weekly) ───────────────────────────────────────────────
  // Consecutive weeks where the user logged ≥ workoutFrequency sessions

  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    select: { date: true },
  });

  // Group sessions by ISO week (keyed by Monday's date string)
  const sessionsByWeek = new Map<string, number>();
  for (const s of sessions) {
    const monday = getMonday(new Date(s.date + 'T12:00:00'));
    const key = toDateStr(monday);
    sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + 1);
  }

  let workoutStreak = 0;
  let weekCursor = getMonday(new Date());

  // If current week hasn't met the goal yet, start from last week
  if ((sessionsByWeek.get(toDateStr(weekCursor)) ?? 0) < workoutFrequency) {
    weekCursor.setDate(weekCursor.getDate() - 7);
  }

  for (let i = 0; i < 52; i++) {
    const key = toDateStr(weekCursor);
    if ((sessionsByWeek.get(key) ?? 0) >= workoutFrequency) {
      workoutStreak++;
      weekCursor.setDate(weekCursor.getDate() - 7);
    } else {
      break;
    }
  }

  return NextResponse.json({ nutritionStreak, workoutStreak, workoutFrequency });
}
