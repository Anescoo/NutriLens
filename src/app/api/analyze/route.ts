import { NextRequest, NextResponse } from 'next/server';
import { InferenceClient } from '@huggingface/inference';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png':  [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'image/gif':  [[0x47, 0x49, 0x46, 0x38]],
};

function checkMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
  const magic = MAGIC_BYTES[mimeType];
  if (!magic) return false;
  return magic.some((bytes) => bytes.every((b, i) => buffer[i] === b));
}

type DetectedFood = { name: string; estimatedGrams: number };

// ─── Comprehensive food label list for zero-shot CLIP classification ───────────
const FOOD_LABELS = [
  // Proteins
  'chicken breast', 'grilled chicken', 'fried chicken', 'salmon', 'tuna', 'steak',
  'beef', 'pork', 'bacon', 'eggs', 'omelette', 'scrambled eggs', 'shrimp', 'tofu',
  // Grains / carbs
  'rice', 'white rice', 'brown rice', 'pasta', 'spaghetti', 'noodles', 'bread',
  'toast', 'baguette', 'sandwich', 'burger', 'pizza', 'quinoa', 'couscous',
  'oatmeal', 'granola', 'pancakes', 'waffles', 'french fries', 'potatoes',
  // Vegetables
  'salad', 'caesar salad', 'green salad', 'broccoli', 'carrots', 'tomato',
  'cucumber', 'lettuce', 'spinach', 'avocado', 'asparagus', 'zucchini',
  'eggplant', 'peppers', 'corn', 'mushrooms', 'onions', 'peas',
  // Fruits
  'apple', 'banana', 'orange', 'strawberries', 'blueberries', 'grapes',
  'watermelon', 'mango', 'pineapple', 'peach', 'kiwi', 'lemon',
  // Dairy / fats
  'cheese', 'yogurt', 'milk', 'butter', 'cream', 'ice cream',
  // Dishes
  'soup', 'stew', 'curry', 'tacos', 'burrito', 'sushi', 'ramen', 'stir fry',
  'fried rice', 'risotto', 'lasagna', 'casserole', 'smoothie bowl',
  // Snacks / sweets
  'chocolate', 'cake', 'cookies', 'muffin', 'donut', 'croissant', 'nuts',
  'chips', 'popcorn', 'protein bar',
];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'on', 'in', 'is', 'are',
  'plate', 'bowl', 'dish', 'cup', 'table', 'white', 'black', 'red',
  'green', 'brown', 'top', 'side', 'image', 'photo', 'picture', 'some',
  'several', 'close', 'up', 'view', 'food', 'full', 'filled',
]);

function textToFoods(text: string): DetectedFood[] {
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed[0]?.name) return parsed;
    } catch {}
  }

  const foods: DetectedFood[] = [];
  for (const line of text.split('\n')) {
    const match = line.match(/([A-Za-z][A-Za-z\s]{1,40}?)(?:\s*[:–-]\s*|\s*\()(\d+)\s*g/i);
    if (match) {
      const name = match[1].trim();
      const grams = parseInt(match[2], 10);
      if (name && grams > 0 && grams < 2000) foods.push({ name, estimatedGrams: grams });
    }
  }
  if (foods.length > 0) return foods;

  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const unique = [...new Set(words)].slice(0, 4);
  return unique.map((name) => ({ name, estimatedGrams: 150 }));
}

// ─── Strategy implementations using the official SDK ──────────────────────────

async function strategyCaption(hf: InferenceClient, model: string, blob: Blob): Promise<DetectedFood[]> {
  const result = await hf.imageToText({ model, data: blob });
  const caption = result.generated_text ?? '';
  console.log(`[caption:${model.split('/')[1]}]`, caption);
  if (!caption.trim()) throw new Error('Empty caption');
  return textToFoods(caption);
}

async function strategyZeroShot(hf: InferenceClient, blob: Blob): Promise<DetectedFood[]> {
  const results = await hf.zeroShotImageClassification({
    model: 'openai/clip-vit-base-patch32',
    inputs: { image: blob },
    parameters: { candidate_labels: FOOD_LABELS },
  });
  const foods = results
    .filter((r) => r.score > 0.05)
    .slice(0, 6)
    .map((r) => ({
      name: r.label.replace(/\b\w/g, (c) => c.toUpperCase()),
      estimatedGrams: 150,
    }));
  console.log('[zero-shot:clip]', foods.map((f) => f.name).join(', '));
  if (foods.length === 0) throw new Error('No foods above score threshold');
  return foods;
}

async function strategyClassification(hf: InferenceClient, model: string, blob: Blob): Promise<DetectedFood[]> {
  const data = await hf.imageClassification({ model, data: blob });
  const foods = data
    .slice(0, 5)
    .filter((d) => d.score > 0.04)
    .map((d) => ({
      name: d.label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      estimatedGrams: 150,
    }));
  console.log(`[classify:${model.split('/')[1]}]`, foods.map((f) => f.name).join(', '));
  if (foods.length === 0) throw new Error('No foods above score threshold');
  return foods;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI non configurée. Ajoutez HF_API_KEY dans .env.local' },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Aucune image fournie' }, { status: 400 });
  }

  const mimeType = file.type;
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: 'Type de fichier invalide (JPEG, PNG, WebP, GIF)' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!checkMagicBytes(buffer, mimeType)) {
    return NextResponse.json({ error: 'Fichier image invalide' }, { status: 400 });
  }

  const hf = new InferenceClient(apiKey);
  const blob = new Blob([buffer], { type: mimeType });

  // Strategy chain — SDK handles routing automatically via router.huggingface.co
  const strategies: Array<{ name: string; fn: () => Promise<DetectedFood[]> }> = [
    { name: 'blip-base',      fn: () => strategyCaption(hf, 'Salesforce/blip-image-captioning-base', blob) },
    { name: 'clip-zero-shot', fn: () => strategyZeroShot(hf, blob) },
    { name: 'blip-large',     fn: () => strategyCaption(hf, 'Salesforce/blip-image-captioning-large', blob) },
    { name: 'vit-gpt2',       fn: () => strategyCaption(hf, 'nlpconnect/vit-gpt2-image-captioning', blob) },
    { name: 'food-classifier', fn: () => strategyClassification(hf, 'nateraw/food', blob) },
  ];

  let foods: DetectedFood[] = [];
  let strategy = '';

  for (const s of strategies) {
    try {
      console.log(`[/api/analyze] Trying ${s.name}…`);
      const result = await s.fn();
      if (result.length > 0) {
        foods = result;
        strategy = s.name;
        break;
      }
    } catch (err) {
      console.warn(`[/api/analyze] ${s.name} failed:`, (err as Error).message.slice(0, 200));
    }
  }

  if (!strategy) {
    return NextResponse.json(
      { error: 'Tous les modèles IA sont indisponibles. Vérifiez votre clé HF_API_KEY ou réessayez dans 30 secondes.' },
      { status: 503 }
    );
  }

  const sanitized = foods
    .slice(0, 10)
    .map((f) => ({
      name: String(f.name).substring(0, 100).trim(),
      estimatedGrams: Math.min(2000, Math.max(1, Math.round(Number(f.estimatedGrams) || 100))),
    }))
    .filter((f) => f.name.length > 0);

  return NextResponse.json({ foods: sanitized, strategy });
}
