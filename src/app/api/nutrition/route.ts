import { NextRequest, NextResponse } from 'next/server';
import { searchFood, estimateNutrition } from '@/lib/openFoodFacts';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  // Sanitize query
  const sanitized = query.trim().substring(0, 200).replace(/[<>'"]/g, '');

  try {
    // Try Open Food Facts first
    const result = await searchFood(sanitized);
    if (result) {
      return NextResponse.json(result);
    }

    // Fallback to estimates
    const estimate = estimateNutrition(sanitized);
    return NextResponse.json(estimate);
  } catch (err) {
    console.error('[/api/nutrition]', err);
    // Always return something usable
    const estimate = estimateNutrition(sanitized);
    return NextResponse.json(estimate);
  }
}
