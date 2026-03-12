import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type Metric = 'sessions' | 'volume' | 'streak_nutrition' | 'streak_workout';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

interface WorkoutSet { weight?: string | null; reps?: string | null; done?: boolean; }
interface WorkoutExercise { sets?: WorkoutSet[]; }

function computeVolumeKg(exercisesJson: string): number {
  try {
    const exercises: WorkoutExercise[] = JSON.parse(exercisesJson);
    let vol = 0;
    for (const ex of exercises) {
      for (const set of ex.sets ?? []) {
        if (!set.done) continue;
        const weights = (set.weight ?? '').split('-').map(Number).filter((n) => !isNaN(n) && n > 0);
        const reps = (set.reps ?? '').split('-').map(Number).filter((n) => !isNaN(n) && n > 0);
        const len = Math.min(weights.length, reps.length);
        for (let i = 0; i < len; i++) vol += weights[i] * reps[i];
      }
    }
    return vol;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id ?? null;
    const metric = (req.nextUrl.searchParams.get('metric') ?? 'sessions') as Metric;

    // All public users
    const publicUsers = await prisma.user.findMany({
      where: { isPublic: true },
      select: { id: true, name: true, avatarUrl: true },
    });

    // Include current user even if their profile is private
    let users = publicUsers;
    if (currentUserId && !publicUsers.some((u) => u.id === currentUserId)) {
      const me = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, name: true, avatarUrl: true },
      });
      if (me) users = [...publicUsers, me];
    }

    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) return NextResponse.json([]);

    const scores = new Map<string, number>();

    if (metric === 'sessions') {
      const counts = await prisma.workoutSession.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: true,
      });
      for (const c of counts) scores.set(c.userId, c._count);

    } else if (metric === 'volume') {
      const sessions = await prisma.workoutSession.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, exercises: true },
      });
      for (const s of sessions) {
        scores.set(s.userId, (scores.get(s.userId) ?? 0) + computeVolumeKg(s.exercises));
      }
      for (const [k, v] of scores) scores.set(k, Math.round(v));

    } else if (metric === 'streak_nutrition') {
      const allMeals = await prisma.mealEntry.groupBy({
        by: ['userId', 'date'],
        where: { userId: { in: userIds } },
        _sum: { calories: true },
      });
      const allGoals = await prisma.userGoals.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, calories: true },
      });
      const goalMap = new Map(allGoals.map((g) => [g.userId, g.calories ?? 2000]));

      const mealsByUser = new Map<string, Map<string, number>>();
      for (const m of allMeals) {
        if (!mealsByUser.has(m.userId)) mealsByUser.set(m.userId, new Map());
        mealsByUser.get(m.userId)!.set(m.date, m._sum.calories ?? 0);
      }

      for (const uid of userIds) {
        const nutritionByDate = mealsByUser.get(uid) ?? new Map<string, number>();
        const calorieGoal = goalMap.get(uid) ?? 2000;
        let streak = 0;
        const cursor = new Date();
        if ((nutritionByDate.get(toDateStr(cursor)) ?? 0) < calorieGoal * 0.8) {
          cursor.setDate(cursor.getDate() - 1);
        }
        for (let i = 0; i < 366; i++) {
          if ((nutritionByDate.get(toDateStr(cursor)) ?? 0) >= calorieGoal * 0.8) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          } else break;
        }
        scores.set(uid, streak);
      }

    } else if (metric === 'streak_workout') {
      const allSessions = await prisma.workoutSession.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, date: true },
      });
      const allGoals = await prisma.userGoals.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, workoutFrequency: true },
      });
      const freqMap = new Map(allGoals.map((g) => [g.userId, g.workoutFrequency ?? 3]));

      const sessionsByUserWeek = new Map<string, Map<string, number>>();
      for (const s of allSessions) {
        if (!sessionsByUserWeek.has(s.userId)) sessionsByUserWeek.set(s.userId, new Map());
        const monday = getMonday(new Date(s.date + 'T12:00:00'));
        const key = toDateStr(monday);
        const weekMap = sessionsByUserWeek.get(s.userId)!;
        weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
      }

      for (const uid of userIds) {
        const sessionsByWeek = sessionsByUserWeek.get(uid) ?? new Map<string, number>();
        const freq = freqMap.get(uid) ?? 3;
        let streak = 0;
        let weekCursor = getMonday(new Date());
        if ((sessionsByWeek.get(toDateStr(weekCursor)) ?? 0) < freq) {
          weekCursor.setDate(weekCursor.getDate() - 7);
        }
        for (let i = 0; i < 52; i++) {
          const key = toDateStr(weekCursor);
          if ((sessionsByWeek.get(key) ?? 0) >= freq) {
            streak++;
            weekCursor.setDate(weekCursor.getDate() - 7);
          } else break;
        }
        scores.set(uid, streak);
      }
    }

    const ranked = users
      .map((u) => ({ ...u, value: scores.get(u.id) ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        value: u.value,
        isCurrentUser: u.id === currentUserId,
      }));

    const top10 = ranked.slice(0, 10);
    const currentUserEntry = ranked.find((r) => r.isCurrentUser);
    const result = [...top10];
    if (currentUserEntry && currentUserEntry.rank > 10) {
      result.push(currentUserEntry);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/social/leaderboard]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
