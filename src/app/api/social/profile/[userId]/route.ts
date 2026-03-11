import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

interface WorkoutSet {
  weight?: string | null;
  reps?: string | null;
  done?: boolean;
}
interface WorkoutExercise {
  sets?: WorkoutSet[];
}

function computeVolumeKg(exercisesJson: string): number {
  try {
    const exercises: WorkoutExercise[] = JSON.parse(exercisesJson);
    let vol = 0;
    for (const ex of exercises) {
      for (const set of ex.sets ?? []) {
        if (!set.done) continue;
        const weights = (set.weight ?? '').split('-').map(Number).filter(n => !isNaN(n) && n > 0);
        const reps = (set.reps ?? '').split('-').map(Number).filter(n => !isNaN(n) && n > 0);
        const len = Math.min(weights.length, reps.length);
        for (let i = 0; i < len; i++) vol += weights[i] * reps[i];
      }
    }
    return vol;
  } catch {
    return 0;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      bio: true,
      avatarUrl: true,
      isPublic: true,
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
      ...(session?.user?.id
        ? {
            followers: {
              where: { followerId: session.user.id },
              select: { followerId: true },
            },
          }
        : {}),
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const isFollowing =
    'followers' in user && Array.isArray((user as { followers?: unknown[] }).followers)
      ? ((user as { followers: unknown[] }).followers.length > 0)
      : false;

  const isOwnProfile = session?.user?.id === userId;
  const canViewContent = user.isPublic || isFollowing || isOwnProfile;

  // Compute stats only for viewable profiles
  let stats: {
    nutritionStreak: number;
    workoutStreak: number;
    totalSessions: number;
    totalVolumeKg: number;
  } | null = null;

  if (canViewContent) {
    // Streaks
    const userGoals = await prisma.userGoals.findUnique({ where: { userId } });
    const calorieGoal = userGoals?.calories ?? 2000;
    const workoutFrequency = userGoals?.workoutFrequency ?? 3;

    const allMeals = await prisma.mealEntry.groupBy({
      by: ['date'],
      where: { userId },
      _sum: { calories: true },
    });
    const nutritionByDate = new Map<string, number>();
    for (const m of allMeals) nutritionByDate.set(m.date, m._sum.calories ?? 0);

    let nutritionStreak = 0;
    const nutCursor = new Date();
    if ((nutritionByDate.get(toDateStr(nutCursor)) ?? 0) < calorieGoal * 0.8) {
      nutCursor.setDate(nutCursor.getDate() - 1);
    }
    for (let i = 0; i < 366; i++) {
      if ((nutritionByDate.get(toDateStr(nutCursor)) ?? 0) >= calorieGoal * 0.8) {
        nutritionStreak++;
        nutCursor.setDate(nutCursor.getDate() - 1);
      } else break;
    }

    const workoutSessionDates = await prisma.workoutSession.findMany({
      where: { userId },
      select: { date: true, exercises: true },
    });

    const sessionsByWeek = new Map<string, number>();
    let totalVolumeKg = 0;
    for (const s of workoutSessionDates) {
      const monday = getMonday(new Date(s.date + 'T12:00:00'));
      const key = toDateStr(monday);
      sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + 1);
      totalVolumeKg += computeVolumeKg(s.exercises);
    }

    let workoutStreak = 0;
    let weekCursor = getMonday(new Date());
    if ((sessionsByWeek.get(toDateStr(weekCursor)) ?? 0) < workoutFrequency) {
      weekCursor.setDate(weekCursor.getDate() - 7);
    }
    for (let i = 0; i < 52; i++) {
      const key = toDateStr(weekCursor);
      if ((sessionsByWeek.get(key) ?? 0) >= workoutFrequency) {
        workoutStreak++;
        weekCursor.setDate(weekCursor.getDate() - 7);
      } else break;
    }

    stats = {
      nutritionStreak,
      workoutStreak,
      totalSessions: workoutSessionDates.length,
      totalVolumeKg: Math.round(totalVolumeKg),
    };
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isPublic: user.isPublic,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
    stats,
  });
}
