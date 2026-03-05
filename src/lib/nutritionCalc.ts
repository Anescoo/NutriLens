import type { FoodItem, MealEntry, NutritionTotals } from '@/types';

/**
 * Calculate macros for a given food at specified grams
 * Formula: macros_total = sum(macros_per100g * grams / 100)
 */
export function calcMacros(food: FoodItem, grams: number): NutritionTotals {
  const factor = grams / 100;
  return {
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    fat: Math.round(food.fat * factor * 10) / 10,
  };
}

/**
 * Sum totals across all meal entries
 */
export function sumEntries(entries: MealEntry[]): NutritionTotals {
  return entries.reduce(
    (acc, entry) => {
      const macros = calcMacros(entry.foodItem, entry.grams);
      return {
        calories: acc.calories + macros.calories,
        protein: Math.round((acc.protein + macros.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + macros.carbs) * 10) / 10,
        fat: Math.round((acc.fat + macros.fat) * 10) / 10,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Get percentage of goal achieved (capped at 100 for display)
 */
export function goalPercent(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get date string for N days ago
 */
export function daysAgoString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Get last N date strings including today, most recent last
 */
export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgoString(n - 1 - i));
}

/**
 * Format date for display (e.g. "Mon, Mar 4")
 */
export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Macro color mapping
 */
export const MACRO_COLORS = {
  protein: '#7C3AED',
  carbs: '#A78BFA',
  fat: '#06B6D4',
  calories: '#EC4899',
} as const;
