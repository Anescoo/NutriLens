'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MealSection } from '@/components/journal/MealSection';
import { FoodSearchModal } from '@/components/journal/FoodSearchModal';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { useNutritionStore, createMealEntry } from '@/store/nutritionStore';
import { useGoalsStore } from '@/store/goalsStore';
import { formatDateDisplay, todayString, goalPercent } from '@/lib/nutritionCalc';
import type { MealType, FoodItem } from '@/types';
import type { SearchResult } from '@/app/api/search/route';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function JournalPage() {
  const { entries, totals, currentDate, loadDay, removeEntry, addEntry, setDate } = useNutritionStore();
  const { goals } = useGoalsStore();
  const [searchMealType, setSearchMealType] = useState<MealType | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddFood = (result: SearchResult, grams: number, mealType: MealType) => {
    const foodItem: FoodItem = {
      id: result.id,
      name: result.brand ? `${result.name} — ${result.brand}` : result.name,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      source: 'off',
    };
    const entry = createMealEntry(foodItem, grams, mealType, currentDate);
    addEntry(entry);
  };

  return (
    <>
      {searchMealType && (
        <FoodSearchModal
          initialMealType={searchMealType}
          onClose={() => setSearchMealType(null)}
          onAdd={handleAddFood}
        />
      )}

      <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
        <PageHeader
          title="Journal"
          action={
            <Link
              href="/scan"
              className="flex items-center gap-1.5 bg-[#1A1A2E] border border-[#2d1f5e] hover:border-[#7C3AED]/60 rounded-xl px-3 py-2 transition-all group"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A78BFA] group-hover:text-[#7C3AED] transition-colors">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
              <span className="text-xs font-semibold text-[#A78BFA] group-hover:text-[#7C3AED] transition-colors">Scanner</span>
            </Link>
          }
        />

        {/* Date navigation — tap center to open date picker */}
        <div className="flex items-center justify-between mb-5 bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-3">
          <button
            onClick={goToPrevDay}
            className="w-9 h-9 rounded-xl hover:bg-[#2d1f5e] transition-colors flex items-center justify-center text-[#A78BFA]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Tap to open history calendar */}
          <button
            onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
            className="relative text-center group px-3 py-1 rounded-xl hover:bg-[#2d1f5e]/50 transition-colors"
          >
            <p className="text-white font-semibold text-sm group-hover:text-[#A78BFA] transition-colors">{formatDateDisplay(currentDate)}</p>
            {isToday
              ? <span className="text-[10px] text-[#7C3AED] font-medium">Aujourd&apos;hui</span>
              : <span className="text-[10px] text-[#6B6B8A]">Appuyer pour changer</span>
            }
            {/* Hidden native date input */}
            <input
              ref={dateInputRef}
              type="date"
              value={currentDate}
              max={todayString()}
              onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              tabIndex={-1}
            />
          </button>

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

        {/* Meal sections — always shown */}
        <div className="space-y-3">
          {MEAL_ORDER.map((mealType) => (
            <MealSection
              key={mealType}
              mealType={mealType}
              entries={grouped[mealType]}
              onDelete={removeEntry}
              onAdd={(type) => setSearchMealType(type)}
            />
          ))}
        </div>
      </main>
    </>
  );
}
