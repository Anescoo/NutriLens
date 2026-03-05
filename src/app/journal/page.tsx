'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MealSection } from '@/components/journal/MealSection';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { useNutritionStore } from '@/store/nutritionStore';
import { useGoalsStore } from '@/store/goalsStore';
import { formatDateDisplay, todayString, goalPercent } from '@/lib/nutritionCalc';
import type { MealType } from '@/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function JournalPage() {
  const { entries, totals, currentDate, loadDay, removeEntry, setDate } = useNutritionStore();
  const { goals } = useGoalsStore();

  // Run on every mount (navigation remounts this component)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDay(currentDate || todayString()); }, []);
  // Also re-run when user changes the date
  useEffect(() => { loadDay(currentDate); }, [currentDate, loadDay]);

  const grouped = MEAL_ORDER.reduce<Record<MealType, typeof entries>>(
    (acc, type) => {
      acc[type] = entries.filter((e) => e.mealType === type);
      return acc;
    },
    { breakfast: [], lunch: [], dinner: [], snack: [] }
  );

  const goToPrevDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().split('T')[0];
    if (next <= todayString()) setDate(next);
  };

  const isToday = currentDate === todayString();

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Journal" />

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-5 bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-3">
        <button
          onClick={goToPrevDay}
          className="w-9 h-9 rounded-xl hover:bg-[#2d1f5e] transition-colors flex items-center justify-center text-[#A78BFA]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-white font-semibold text-sm">{formatDateDisplay(currentDate)}</p>
          {isToday && (
            <span className="text-[10px] text-[#7C3AED] font-medium">Today</span>
          )}
        </div>

        <button
          onClick={goToNextDay}
          disabled={isToday}
          className="w-9 h-9 rounded-xl hover:bg-[#2d1f5e] transition-colors flex items-center justify-center text-[#A78BFA] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Daily summary */}
      {entries.length > 0 && (
        <Card className="mb-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'kcal', value: totals.calories, goal: goals.calories, color: '#EC4899' },
              { label: 'protein', value: `${totals.protein}g`, goal: goals.protein, color: '#7C3AED' },
              { label: 'carbs', value: `${totals.carbs}g`, goal: goals.carbs, color: '#A78BFA' },
              { label: 'fat', value: `${totals.fat}g`, goal: goals.fat, color: '#06B6D4' },
            ].map((item) => {
              const numVal = typeof item.value === 'number' ? item.value : parseFloat(item.value);
              const pct = goalPercent(numVal, item.goal);
              return (
                <div key={item.label} className="bg-[#0F0F1A] rounded-xl p-2.5">
                  <p className="text-white font-bold text-sm">{item.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: item.color }}>{item.label}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-[#2d1f5e] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: pct > 100 ? '#EF4444' : item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Meal sections */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1A1A2E] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          </div>
          <p className="text-[#6B6B8A] text-sm">No meals logged for this day</p>
          {isToday && (
            <Link
              href="/scan"
              className="mt-4 text-sm text-[#7C3AED] hover:text-[#A78BFA] transition-colors font-medium"
            >
              Scan food to get started →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {MEAL_ORDER.map((mealType) => (
            <MealSection
              key={mealType}
              mealType={mealType}
              entries={grouped[mealType]}
              onDelete={removeEntry}
            />
          ))}
        </div>
      )}
    </main>
  );
}
