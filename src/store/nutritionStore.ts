import { create } from 'zustand';
import type { MealEntry, MealType, NutritionTotals } from '@/types';
import { sumEntries, todayString } from '@/lib/nutritionCalc';
import { saveMealEntry, getMealsByDate, deleteMealEntry } from '@/lib/db';

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
      const entries = await getMealsByDate(date);
      const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
      set({ entries: sorted, totals: sumEntries(sorted), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry: MealEntry) => {
    await saveMealEntry(entry);
    const { currentDate } = get();
    if (entry.date === currentDate) {
      const entries = [...get().entries, entry];
      set({ entries, totals: sumEntries(entries) });
    }
  },

  removeEntry: async (id: string) => {
    await deleteMealEntry(id);
    const entries = get().entries.filter((e) => e.id !== id);
    set({ entries, totals: sumEntries(entries) });
  },

  setDate: (date: string) => {
    get().loadDay(date);
  },
}));

/**
 * Create a new MealEntry from a food item with grams
 */
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
