import type { FoodItem } from '@/types';

const OFF_BASE = 'https://world.openfoodfacts.org';

interface OFFProduct {
  product_name?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

interface OFFSearchResponse {
  products: OFFProduct[];
  count: number;
}

/**
 * Search Open Food Facts for a food item and return nutrition per 100g
 */
export async function searchFood(query: string): Promise<FoodItem | null> {
  const encoded = encodeURIComponent(query);
  const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'NutriLens/1.0 (github.com/nutrilens)' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const data: OFFSearchResponse = await res.json();
  const products = data.products || [];

  // Find first product with complete nutrition data
  for (const product of products) {
    const n = product.nutriments;
    if (!n) continue;

    const calories = n['energy-kcal_100g'];
    const protein = n['proteins_100g'];
    const carbs = n['carbohydrates_100g'];
    const fat = n['fat_100g'];

    if (
      calories !== undefined &&
      protein !== undefined &&
      carbs !== undefined &&
      fat !== undefined
    ) {
      return {
        id: crypto.randomUUID(),
        name: product.product_name || query,
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        source: 'off',
      };
    }
  }

  return null;
}

/**
 * Fallback estimated nutrition values for common foods
 * Used when Open Food Facts returns no results
 */
export function estimateNutrition(foodName: string): FoodItem {
  const name = foodName.toLowerCase();

  // Common food estimates per 100g
  const estimates: Array<{ keywords: string[]; data: Omit<FoodItem, 'id' | 'name' | 'source'> }> = [
    { keywords: ['chicken', 'poulet'], data: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
    { keywords: ['beef', 'boeuf', 'steak'], data: { calories: 250, protein: 26, carbs: 0, fat: 17 } },
    { keywords: ['salmon', 'saumon'], data: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
    { keywords: ['rice', 'riz'], data: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
    { keywords: ['pasta', 'pâtes', 'noodle'], data: { calories: 131, protein: 5, carbs: 25, fat: 1.1 } },
    { keywords: ['bread', 'pain'], data: { calories: 265, protein: 9, carbs: 49, fat: 3.2 } },
    { keywords: ['egg', 'oeuf'], data: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
    { keywords: ['apple', 'pomme'], data: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
    { keywords: ['banana', 'banane'], data: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
    { keywords: ['salad', 'salade', 'lettuce'], data: { calories: 15, protein: 1.4, carbs: 2.2, fat: 0.2 } },
    { keywords: ['cheese', 'fromage'], data: { calories: 402, protein: 25, carbs: 1.3, fat: 33 } },
    { keywords: ['milk', 'lait'], data: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
    { keywords: ['potato', 'pomme de terre', 'frite'], data: { calories: 77, protein: 2, carbs: 17, fat: 0.1 } },
    { keywords: ['tomato', 'tomate'], data: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
    { keywords: ['avocado', 'avocat'], data: { calories: 160, protein: 2, carbs: 9, fat: 15 } },
    { keywords: ['pizza'], data: { calories: 266, protein: 11, carbs: 33, fat: 10 } },
    { keywords: ['burger', 'hamburger'], data: { calories: 295, protein: 17, carbs: 24, fat: 14 } },
    { keywords: ['yogurt', 'yaourt', 'yoghurt'], data: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 } },
    { keywords: ['oat', 'avoine', 'porridge'], data: { calories: 389, protein: 17, carbs: 66, fat: 7 } },
  ];

  for (const estimate of estimates) {
    if (estimate.keywords.some((kw) => name.includes(kw))) {
      return {
        id: crypto.randomUUID(),
        name: foodName,
        ...estimate.data,
        source: 'estimate',
      };
    }
  }

  // Generic fallback
  return {
    id: crypto.randomUUID(),
    name: foodName,
    calories: 150,
    protein: 8,
    carbs: 20,
    fat: 5,
    source: 'estimate',
  };
}
