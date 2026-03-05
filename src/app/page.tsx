'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalorieRing } from '@/components/dashboard/CalorieRing';
import { MacroBar } from '@/components/dashboard/MacroBar';
import { WeeklyChart } from '@/components/dashboard/WeeklyChart';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { useNutritionStore } from '@/store/nutritionStore';
import { useGoalsStore } from '@/store/goalsStore';
import { todayString, lastNDays, formatDateDisplay, MACRO_COLORS } from '@/lib/nutritionCalc';
import type { BodyMeasurement } from '@/types';

interface WeekDay {
  day: string;
  calories: number;
  isToday: boolean;
}

export default function DashboardPage() {
  const { entries, totals, loadDay } = useNutritionStore();
  const { goals, loadGoals } = useGoalsStore();
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [latestMeasurement, setLatestMeasurement] = useState<BodyMeasurement | null>(null);
  const today = todayString();

  useEffect(() => {
    loadDay(today);
    loadGoals();
  }, [today, loadDay, loadGoals]);

  // Load latest body measurement
  useEffect(() => {
    fetch('/api/body')
      .then((r) => (r.ok ? r.json() : []))
      .then((all: BodyMeasurement[]) => {
        setLatestMeasurement(all.length > 0 ? all[all.length - 1] : null);
      });
  }, []);

  // Load weekly data
  useEffect(() => {
    const loadWeek = async () => {
      const days = lastNDays(7);
      const results = await Promise.all(
        days.map(async (date) => {
          const r = await fetch('/api/meals?date=' + date);
          const raw: Array<{ calories: number }> = r.ok ? await r.json() : [];
          const dayCalories = raw.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
          const d = new Date(date + 'T12:00:00');
          return {
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            calories: dayCalories,
            isToday: date === today,
          };
        })
      );
      setWeekData(results);
    };
    loadWeek();
  }, [today, entries]);

  const macroGoals = [
    { label: 'Protein', consumed: totals.protein, goal: goals.protein, color: MACRO_COLORS.protein },
    { label: 'Carbs', consumed: totals.carbs, goal: goals.carbs, color: MACRO_COLORS.carbs },
    { label: 'Fat', consumed: totals.fat, goal: goals.fat, color: MACRO_COLORS.fat },
  ];

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={formatDateDisplay(today)}
      />

      {/* Calorie ring */}
      <Card glow className="flex flex-col items-center py-6 mb-4">
        <CalorieRing consumed={totals.calories} goal={goals.calories} />
      </Card>

      {/* Macros */}
      <Card className="mb-4 space-y-4">
        <h2 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider">Macros</h2>
        {macroGoals.map((m) => (
          <MacroBar
            key={m.label}
            label={m.label}
            consumed={m.consumed}
            goal={m.goal}
            color={m.color}
          />
        ))}
      </Card>

      {/* Weekly chart */}
      <Card className="mb-4">
        <h2 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider mb-4">
          7-Day History
        </h2>
        <WeeklyChart data={weekData} goal={goals.calories} />
      </Card>

      {/* Body snapshot */}
      <Link href="/body" className="block mb-4">
        <Card className="hover:border-[#7C3AED]/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#A78BFA] uppercase tracking-wider">Corps</h2>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          {latestMeasurement ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white leading-none">{latestMeasurement.weight.toFixed(1)}</span>
                <span className="text-xs text-[#6B6B8A] mt-0.5">kg</span>
              </div>
              {latestMeasurement.bodyFat != null && (
                <div className="flex flex-col border-l border-[#2d1f5e] pl-4">
                  <span className="text-2xl font-bold text-[#f59e0b] leading-none">{latestMeasurement.bodyFat.toFixed(1)}</span>
                  <span className="text-xs text-[#6B6B8A] mt-0.5">% MG</span>
                </div>
              )}
              {latestMeasurement.muscleMass != null && (
                <div className="flex flex-col border-l border-[#2d1f5e] pl-4">
                  <span className="text-2xl font-bold text-[#10b981] leading-none">{latestMeasurement.muscleMass.toFixed(1)}</span>
                  <span className="text-xs text-[#6B6B8A] mt-0.5">kg muscle</span>
                </div>
              )}
              <div className="ml-auto text-right">
                <span className="text-xs text-[#6B6B8A]">
                  {new Date(latestMeasurement.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6B6B8A]">Aucune mesure enregistrée — appuie pour commencer</p>
          )}
        </Card>
      </Link>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/scan"
          className="bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-2xl p-4 flex flex-col gap-2 shadow-lg shadow-violet-900/30 hover:from-[#6D28D9] hover:to-[#5B21B6] transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          <span className="text-white font-semibold text-sm">Scan Food</span>
          <span className="text-white/60 text-xs">AI detection</span>
        </Link>

        <Link
          href="/journal"
          className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 flex flex-col gap-2 hover:border-[#7C3AED]/50 transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="12" y2="16" />
          </svg>
          <span className="text-white font-semibold text-sm">Journal</span>
          <span className="text-[#6B6B8A] text-xs">{entries.length} entries today</span>
        </Link>
      </div>
    </main>
  );
}
