import { NextRequest, NextResponse } from 'next/server';
import { searchRawFoods } from '@/lib/rawFoodsDb';

interface OFFProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  image_small_url?: string;
  image_thumb_url?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

export interface SearchResult {
  id: string;
  name: string;
  brand: string;
  servingSize?: string;
  servingGrams?: number;
  imageUrl?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 'off' = Open Food Facts packaged product, 'raw' = local raw food database */
  source?: 'off' | 'raw';
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) return NextResponse.json([]);

  const q = query.trim();

  // Run OFF search and local raw food search in parallel
  const [offResults, rawMatches] = await Promise.all([
    fetchOFF(q),
    Promise.resolve(searchRawFoods(q, 6)),
  ]);

  // Convert raw food matches to SearchResult format
  const rawResults: SearchResult[] = rawMatches.map((r) => ({
    id: `raw-${r.id}`,
    name: r.displayName,
    brand: r.category,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    source: 'raw' as const,
  }));

  // Deduplicate: remove raw results that are already covered by OFF results
  // (simple heuristic: if OFF has ≥3 results, only append raw matches not already present)
  const offNames = new Set(offResults.map((r) => r.name.toLowerCase().split(' ')[0]));
  const filteredRaw = rawResults.filter((r) => {
    const firstWord = r.name.toLowerCase().split(' ')[0];
    return !offNames.has(firstWord);
  });

  // Raw foods always first, then supermarket products
  const combined = [...filteredRaw, ...offResults];

  return NextResponse.json(combined.slice(0, 15));
}

async function fetchOFF(query: string): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=30&fields=product_name,brands,serving_size,serving_quantity,nutriments,image_thumb_url,image_small_url`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NutriLens/1.0 (https://github.com/nutrilens)' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const products: OFFProduct[] = data.products || [];
    const results: SearchResult[] = [];

    for (const p of products) {
      const n = p.nutriments;
      if (!n || !p.product_name) continue;

      const calories = n['energy-kcal_100g'];
      const protein = n['proteins_100g'];
      const carbs = n['carbohydrates_100g'];
      const fat = n['fat_100g'];

      if (calories === undefined || protein === undefined || carbs === undefined || fat === undefined) continue;

      const servingGrams = p.serving_quantity
        ? typeof p.serving_quantity === 'string'
          ? parseFloat(p.serving_quantity) || undefined
          : p.serving_quantity
        : undefined;

      results.push({
        id: crypto.randomUUID(),
        name: p.product_name.trim(),
        brand: p.brands?.split(',')[0]?.trim() || '',
        servingSize: p.serving_size || undefined,
        servingGrams: servingGrams && servingGrams > 0 ? servingGrams : undefined,
        imageUrl: p.image_thumb_url || p.image_small_url || undefined,
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        source: 'off',
      });

      if (results.length >= 12) break;
    }

    return results;
  } catch {
    return [];
  }
}
