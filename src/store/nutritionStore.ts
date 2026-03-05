import { create } from 'zustand';
import type { MealEntry, MealType, NutritionTotals } from '@/types';
import { sumEntries, todayString } from '@/lib/nutritionCalc';

// ─── API helpers ─────────────────────────────────────────────────────────────

export function toMealEntry(raw: Record<string, unknown>): MealEntry {
  return {
    id: raw.id as string,
    date: raw.date as string,
    mealType: raw.mealType as MealType,
    timestamp: Number(raw.timestamp),
    grams: raw.grams as number,
    foodItem: {
      id: raw.id as string,
      name: raw.name as string,
      calories: raw.calories as number,
      protein: raw.protein as number,
      carbs: raw.carbs as number,
      fat: raw.fat as number,
    },
  };
}

async function apiFetchMeals(date: string): Promise<MealEntry[]> {
  const res = await fetch(`/api/meals?date=${date}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data as Record<string, unknown>[]).map(toMealEntry);
}

async function apiSaveMeal(entry: MealEntry): Promise<void> {
  await fetch('/api/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

async function apiDeleteMeal(id: string): Promise<void> {
  await fetch(`/api/meals/${id}`, { method: 'DELETE' });
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface NutritionState {
  currentDate: string;
  entries: MealEntry[];
  totals: NutritionTotals;
  isLoading: boolean;

  loadDay: (date: string) => Promise<void>;
  addEntry: (entry: MealEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  setDate: (date: string) => void;
}

export const useNutritionStore = create<NutritionState>()((set, get) => ({
  currentDate: todayString(),
  entries: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  isLoading: false,

  loadDay: async (date: string) => {
    set({ isLoading: true, currentDate: date });
    try {
      const entries = await apiFetchMeals(date);
      const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
      set({ entries: sorted, totals: sumEntries(sorted), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry: MealEntry) => {
    await apiSaveMeal(entry);
    const { currentDate } = get();
    if (entry.date === currentDate) {
      const entries = [...get().entries, entry];
      set({ entries, totals: sumEntries(entries) });
    }
  },

  removeEntry: async (id: string) => {
    await apiDeleteMeal(id);
    const entries = get().entries.filter((e) => e.id !== id);
    set({ entries, totals: sumEntries(entries) });
  },

  setDate: (date: string) => {
    get().loadDay(date);
  },
}));

export function createMealEntry(
  foodItem: import('@/types').FoodItem,
  grams: number,
  mealType: MealType,
  date?: string
): MealEntry {
  return {
    id: crypto.randomUUID(),
    foodItem,
    grams,
    mealType,
    timestamp: Date.now(),
    date: date || todayString(),
  };
}
