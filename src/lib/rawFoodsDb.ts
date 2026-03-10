/**
 * Local database of common raw / whole foods with nutrition per 100g.
 * Used as a fallback / complement when Open Food Facts returns no results.
 * Values are average reference values (ANSES / USDA sources).
 */

export interface RawFoodEntry {
  id: string;
  /** All searchable names (French + English), lowercase */
  names: string[];
  /** Display name shown in results */
  displayName: string;
  calories: number; // kcal/100g
  protein: number;  // g/100g
  carbs: number;    // g/100g
  fat: number;      // g/100g
  category: string;
}

export const RAW_FOODS: RawFoodEntry[] = [
  // ── Fruits ────────────────────────────────────────────────────────────────
  { id: 'avocat',     names: ['avocat', 'avocado'],                      displayName: 'Avocat',            calories: 160, protein: 2.0, carbs: 8.5,  fat: 14.7, category: 'Fruit' },
  { id: 'pomme',      names: ['pomme', 'apple'],                         displayName: 'Pomme',             calories: 52,  protein: 0.3, carbs: 13.8, fat: 0.2,  category: 'Fruit' },
  { id: 'banane',     names: ['banane', 'banana'],                       displayName: 'Banane',            calories: 89,  protein: 1.1, carbs: 22.8, fat: 0.3,  category: 'Fruit' },
  { id: 'orange',     names: ['orange'],                                  displayName: 'Orange',            calories: 47,  protein: 0.9, carbs: 11.8, fat: 0.1,  category: 'Fruit' },
  { id: 'citron',     names: ['citron', 'lemon'],                        displayName: 'Citron',            calories: 29,  protein: 1.1, carbs: 9.3,  fat: 0.3,  category: 'Fruit' },
  { id: 'poire',      names: ['poire', 'pear'],                          displayName: 'Poire',             calories: 57,  protein: 0.4, carbs: 15.2, fat: 0.1,  category: 'Fruit' },
  { id: 'fraise',     names: ['fraise', 'strawberry'],                   displayName: 'Fraise',            calories: 32,  protein: 0.7, carbs: 7.7,  fat: 0.3,  category: 'Fruit' },
  { id: 'raisin',     names: ['raisin', 'grape'],                        displayName: 'Raisin',            calories: 69,  protein: 0.6, carbs: 18.1, fat: 0.2,  category: 'Fruit' },
  { id: 'cerise',     names: ['cerise', 'cherry'],                       displayName: 'Cerise',            calories: 63,  protein: 1.1, carbs: 16.0, fat: 0.2,  category: 'Fruit' },
  { id: 'ananas',     names: ['ananas', 'pineapple'],                    displayName: 'Ananas',            calories: 50,  protein: 0.5, carbs: 13.1, fat: 0.1,  category: 'Fruit' },
  { id: 'mangue',     names: ['mangue', 'mango'],                        displayName: 'Mangue',            calories: 60,  protein: 0.8, carbs: 14.8, fat: 0.4,  category: 'Fruit' },
  { id: 'kiwi',       names: ['kiwi'],                                   displayName: 'Kiwi',              calories: 61,  protein: 1.1, carbs: 14.7, fat: 0.5,  category: 'Fruit' },
  { id: 'peche',      names: ['pêche', 'peche', 'peach'],                displayName: 'Pêche',             calories: 39,  protein: 0.9, carbs: 9.5,  fat: 0.3,  category: 'Fruit' },
  { id: 'abricot',    names: ['abricot', 'apricot'],                     displayName: 'Abricot',           calories: 48,  protein: 1.4, carbs: 11.1, fat: 0.4,  category: 'Fruit' },
  { id: 'pasteque',   names: ['pastèque', 'pasteque', 'watermelon'],     displayName: 'Pastèque',          calories: 30,  protein: 0.6, carbs: 7.6,  fat: 0.2,  category: 'Fruit' },
  { id: 'melon',      names: ['melon', 'cantaloupe'],                    displayName: 'Melon',             calories: 34,  protein: 0.8, carbs: 8.2,  fat: 0.2,  category: 'Fruit' },
  { id: 'myrtille',   names: ['myrtille', 'blueberry'],                  displayName: 'Myrtille',          calories: 57,  protein: 0.7, carbs: 14.5, fat: 0.3,  category: 'Fruit' },
  { id: 'framboise',  names: ['framboise', 'raspberry'],                 displayName: 'Framboise',         calories: 52,  protein: 1.2, carbs: 11.9, fat: 0.7,  category: 'Fruit' },
  { id: 'prune',      names: ['prune', 'plum'],                          displayName: 'Prune',             calories: 46,  protein: 0.7, carbs: 11.4, fat: 0.3,  category: 'Fruit' },
  { id: 'grenade',    names: ['grenade', 'pomegranate'],                 displayName: 'Grenade',           calories: 83,  protein: 1.7, carbs: 18.7, fat: 1.2,  category: 'Fruit' },
  { id: 'figue',      names: ['figue', 'fig'],                           displayName: 'Figue',             calories: 74,  protein: 0.8, carbs: 19.2, fat: 0.3,  category: 'Fruit' },
  { id: 'papaye',     names: ['papaye', 'papaya'],                       displayName: 'Papaye',            calories: 43,  protein: 0.5, carbs: 10.8, fat: 0.3,  category: 'Fruit' },

  // ── Légumes ───────────────────────────────────────────────────────────────
  { id: 'tomate',     names: ['tomate', 'tomato'],                       displayName: 'Tomate',            calories: 18,  protein: 0.9, carbs: 3.9,  fat: 0.2,  category: 'Légume' },
  { id: 'concombre',  names: ['concombre', 'cucumber'],                  displayName: 'Concombre',         calories: 15,  protein: 0.7, carbs: 3.6,  fat: 0.1,  category: 'Légume' },
  { id: 'courgette',  names: ['courgette', 'zucchini'],                  displayName: 'Courgette',         calories: 17,  protein: 1.2, carbs: 3.1,  fat: 0.3,  category: 'Légume' },
  { id: 'aubergine',  names: ['aubergine', 'eggplant'],                  displayName: 'Aubergine',         calories: 25,  protein: 1.0, carbs: 5.9,  fat: 0.2,  category: 'Légume' },
  { id: 'carotte',    names: ['carotte', 'carrot'],                      displayName: 'Carotte',           calories: 41,  protein: 0.9, carbs: 9.6,  fat: 0.2,  category: 'Légume' },
  { id: 'brocoli',    names: ['brocoli', 'broccoli'],                    displayName: 'Brocoli',           calories: 34,  protein: 2.8, carbs: 6.6,  fat: 0.4,  category: 'Légume' },
  { id: 'chou-fleur', names: ['chou-fleur', 'choufleur', 'cauliflower'], displayName: 'Chou-fleur',        calories: 25,  protein: 1.9, carbs: 5.0,  fat: 0.3,  category: 'Légume' },
  { id: 'epinards',   names: ['épinards', 'epinards', 'spinach'],        displayName: 'Épinards',          calories: 23,  protein: 2.9, carbs: 3.6,  fat: 0.4,  category: 'Légume' },
  { id: 'salade',     names: ['salade', 'laitue', 'lettuce'],            displayName: 'Salade (laitue)',   calories: 15,  protein: 1.4, carbs: 2.2,  fat: 0.2,  category: 'Légume' },
  { id: 'poivron',    names: ['poivron', 'bell pepper', 'pepper'],       displayName: 'Poivron',           calories: 31,  protein: 1.0, carbs: 7.3,  fat: 0.3,  category: 'Légume' },
  { id: 'champignon', names: ['champignon', 'mushroom'],                 displayName: 'Champignon',        calories: 22,  protein: 3.1, carbs: 3.3,  fat: 0.3,  category: 'Légume' },
  { id: 'haricot-v',  names: ['haricot vert', 'haricots verts', 'green bean'], displayName: 'Haricots verts', calories: 31,  protein: 1.8, carbs: 7.1,  fat: 0.1,  category: 'Légume' },
  { id: 'petits-pois',names: ['petits pois', 'peas', 'pois'],           displayName: 'Petits pois',       calories: 81,  protein: 5.4, carbs: 14.5, fat: 0.4,  category: 'Légume' },
  { id: 'asperge',    names: ['asperge', 'asparagus'],                   displayName: 'Asperge',           calories: 20,  protein: 2.2, carbs: 3.9,  fat: 0.1,  category: 'Légume' },
  { id: 'celeri',     names: ['céleri', 'celeri', 'celery'],             displayName: 'Céleri',            calories: 16,  protein: 0.7, carbs: 3.0,  fat: 0.2,  category: 'Légume' },
  { id: 'poireau',    names: ['poireau', 'leek'],                        displayName: 'Poireau',           calories: 61,  protein: 1.5, carbs: 14.2, fat: 0.3,  category: 'Légume' },
  { id: 'oignon',     names: ['oignon', 'onion'],                        displayName: 'Oignon',            calories: 40,  protein: 1.1, carbs: 9.3,  fat: 0.1,  category: 'Légume' },
  { id: 'ail',        names: ['ail', 'garlic'],                          displayName: 'Ail',               calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5,  category: 'Légume' },
  { id: 'betterave',  names: ['betterave', 'beet', 'beetroot'],         displayName: 'Betterave',         calories: 43,  protein: 1.6, carbs: 9.6,  fat: 0.2,  category: 'Légume' },
  { id: 'chou',       names: ['chou', 'cabbage'],                        displayName: 'Chou',              calories: 25,  protein: 1.3, carbs: 5.8,  fat: 0.1,  category: 'Légume' },
  { id: 'mais',       names: ['maïs', 'mais', 'corn'],                   displayName: 'Maïs',              calories: 86,  protein: 3.2, carbs: 18.7, fat: 1.2,  category: 'Légume' },

  // ── Féculents ─────────────────────────────────────────────────────────────
  { id: 'pdt',        names: ['pomme de terre', 'patate', 'potato'],     displayName: 'Pomme de terre',    calories: 77,  protein: 2.0, carbs: 17.5, fat: 0.1,  category: 'Féculent' },
  { id: 'patate-douce',names: ['patate douce', 'sweet potato'],          displayName: 'Patate douce',      calories: 86,  protein: 1.6, carbs: 20.1, fat: 0.1,  category: 'Féculent' },
  { id: 'riz',        names: ['riz', 'rice'],                            displayName: 'Riz cuit',          calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3,  category: 'Féculent' },
  { id: 'riz-cru',    names: ['riz cru', 'raw rice'],                    displayName: 'Riz (cru)',         calories: 360, protein: 6.7, carbs: 79.3, fat: 0.7,  category: 'Féculent' },
  { id: 'pates',      names: ['pâtes', 'pates', 'pasta', 'spaghetti', 'tagliatelle', 'penne', 'fusilli'], displayName: 'Pâtes cuites', calories: 131, protein: 5.0, carbs: 25.0, fat: 1.1, category: 'Féculent' },
  { id: 'pain',       names: ['pain', 'bread'],                          displayName: 'Pain (baguette)',   calories: 265, protein: 9.0, carbs: 49.0, fat: 3.2,  category: 'Féculent' },
  { id: 'quinoa',     names: ['quinoa'],                                  displayName: 'Quinoa cuit',       calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9,  category: 'Féculent' },
  { id: 'avoine',     names: ['avoine', 'flocons davoine', 'oat', 'porridge', 'muesli'], displayName: 'Flocons d\'avoine', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, category: 'Féculent' },
  { id: 'lentilles',  names: ['lentille', 'lentilles', 'lentil'],        displayName: 'Lentilles cuites',  calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4,  category: 'Légumineuse' },
  { id: 'pois-chiches',names: ['pois chiche', 'pois chiches', 'chickpea'], displayName: 'Pois chiches cuits', calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, category: 'Légumineuse' },
  { id: 'haricots',   names: ['haricot rouge', 'haricots rouges', 'kidney bean'], displayName: 'Haricots rouges cuits', calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, category: 'Légumineuse' },
  { id: 'farine',     names: ['farine', 'flour'],                        displayName: 'Farine de blé',     calories: 364, protein: 10.3, carbs: 76.3, fat: 1.0, category: 'Féculent' },

  // ── Protéines animales ────────────────────────────────────────────────────
  { id: 'poulet',     names: ['poulet', 'chicken', 'blanc de poulet', 'escalope'],    displayName: 'Poulet (blanc)',    calories: 165, protein: 31.0, carbs: 0.0,  fat: 3.6,  category: 'Viande' },
  { id: 'boeuf',      names: ['boeuf', 'beef', 'steak', 'viande hachée', 'hachée', 'bavette', 'entrecote', 'entrecôte'], displayName: 'Boeuf (steack)', calories: 250, protein: 26.0, carbs: 0.0, fat: 17.0, category: 'Viande' },
  { id: 'porc',       names: ['porc', 'pork', 'filet de porc', 'côte de porc'],      displayName: 'Porc (filet)',      calories: 143, protein: 21.0, carbs: 0.0,  fat: 6.8,  category: 'Viande' },
  { id: 'dinde',      names: ['dinde', 'turkey'],                        displayName: 'Dinde',             calories: 135, protein: 29.9, carbs: 0.0,  fat: 1.0,  category: 'Viande' },
  { id: 'saumon',     names: ['saumon', 'salmon'],                       displayName: 'Saumon',            calories: 208, protein: 20.0, carbs: 0.0,  fat: 13.4, category: 'Poisson' },
  { id: 'thon',       names: ['thon', 'tuna'],                           displayName: 'Thon (frais)',      calories: 144, protein: 23.3, carbs: 0.0,  fat: 4.9,  category: 'Poisson' },
  { id: 'cabillaud',  names: ['cabillaud', 'cod', 'colin'],              displayName: 'Cabillaud',         calories: 82,  protein: 17.8, carbs: 0.0,  fat: 0.7,  category: 'Poisson' },
  { id: 'crevettes',  names: ['crevette', 'crevettes', 'shrimp', 'prawn'], displayName: 'Crevettes',     calories: 99,  protein: 18.0, carbs: 1.8,  fat: 1.5,  category: 'Poisson' },
  { id: 'oeuf',       names: ['oeuf', 'oeufs', 'egg', 'eggs'],          displayName: 'Oeuf entier',       calories: 155, protein: 12.6, carbs: 1.1,  fat: 10.6, category: 'Oeuf' },
  { id: 'jambon',     names: ['jambon', 'ham'],                          displayName: 'Jambon blanc',      calories: 107, protein: 17.0, carbs: 2.0,  fat: 3.5,  category: 'Charcuterie' },
  { id: 'lardons',    names: ['lardons', 'bacon'],                       displayName: 'Lardons',           calories: 320, protein: 16.0, carbs: 0.0,  fat: 29.0, category: 'Charcuterie' },
  { id: 'sardine',    names: ['sardine'],                                 displayName: 'Sardine (fraîche)', calories: 208, protein: 24.6, carbs: 0.0,  fat: 11.5, category: 'Poisson' },

  // ── Produits laitiers ─────────────────────────────────────────────────────
  { id: 'lait',       names: ['lait', 'milk'],                           displayName: 'Lait demi-écrémé', calories: 46,  protein: 3.2, carbs: 4.7,  fat: 1.5,  category: 'Laitier' },
  { id: 'lait-entier',names: ['lait entier', 'whole milk'],              displayName: 'Lait entier',       calories: 61,  protein: 3.2, carbs: 4.8,  fat: 3.3,  category: 'Laitier' },
  { id: 'yaourt',     names: ['yaourt', 'yogurt', 'yoghurt'],            displayName: 'Yaourt nature',     calories: 59,  protein: 3.8, carbs: 4.9,  fat: 1.5,  category: 'Laitier' },
  { id: 'fromage-blanc', names: ['fromage blanc', 'cottage cheese'],     displayName: 'Fromage blanc 0%',  calories: 46,  protein: 7.9, carbs: 4.0,  fat: 0.2,  category: 'Laitier' },
  { id: 'fromage',    names: ['fromage', 'cheese', 'emmental', 'gruyère', 'gruyere', 'comté', 'comte'], displayName: 'Fromage (emmental)', calories: 382, protein: 28.0, carbs: 1.0, fat: 29.0, category: 'Laitier' },
  { id: 'beurre',     names: ['beurre', 'butter'],                       displayName: 'Beurre',            calories: 717, protein: 0.9, carbs: 0.1,  fat: 81.1, category: 'Corps gras' },
  { id: 'creme',      names: ['crème fraîche', 'creme fraiche', 'cream'], displayName: 'Crème fraîche',   calories: 292, protein: 2.0, carbs: 2.7,  fat: 30.0, category: 'Laitier' },

  // ── Noix & Graines ────────────────────────────────────────────────────────
  { id: 'amande',     names: ['amande', 'almond'],                       displayName: 'Amande',            calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, category: 'Oléagineux' },
  { id: 'noix',       names: ['noix', 'walnut'],                         displayName: 'Noix',              calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, category: 'Oléagineux' },
  { id: 'noisette',   names: ['noisette', 'hazelnut'],                   displayName: 'Noisette',          calories: 628, protein: 15.0, carbs: 16.7, fat: 60.8, category: 'Oléagineux' },
  { id: 'cajou',      names: ['noix de cajou', 'cajou', 'cashew'],       displayName: 'Noix de cajou',     calories: 553, protein: 18.2, carbs: 30.2, fat: 43.8, category: 'Oléagineux' },
  { id: 'arachide',   names: ['cacahuète', 'cacahuetes', 'arachide', 'peanut'], displayName: 'Cacahuète', calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, category: 'Oléagineux' },
  { id: 'tournesol',  names: ['graines de tournesol', 'sunflower seed'], displayName: 'Graines de tournesol', calories: 584, protein: 20.8, carbs: 20.0, fat: 51.5, category: 'Graine' },
  { id: 'chia',       names: ['graines de chia', 'chia'],                displayName: 'Graines de chia',   calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, category: 'Graine' },
  { id: 'lin',        names: ['graines de lin', 'lin', 'flaxseed'],      displayName: 'Graines de lin',    calories: 534, protein: 18.3, carbs: 28.9, fat: 42.2, category: 'Graine' },

  // ── Corps gras ────────────────────────────────────────────────────────────
  { id: 'huile-olive',names: ['huile d\'olive', 'olive oil'],            displayName: 'Huile d\'olive',    calories: 884, protein: 0.0, carbs: 0.0,  fat: 100.0, category: 'Corps gras' },
  { id: 'huile',      names: ['huile', 'oil'],                           displayName: 'Huile (tournesol)', calories: 884, protein: 0.0, carbs: 0.0,  fat: 100.0, category: 'Corps gras' },

  // ── Divers ────────────────────────────────────────────────────────────────
  { id: 'sucre',      names: ['sucre', 'sugar'],                         displayName: 'Sucre',             calories: 400, protein: 0.0, carbs: 99.8, fat: 0.0,  category: 'Divers' },
  { id: 'miel',       names: ['miel', 'honey'],                          displayName: 'Miel',              calories: 304, protein: 0.3, carbs: 82.4, fat: 0.0,  category: 'Divers' },
  { id: 'chocolat-n', names: ['chocolat noir', 'dark chocolate'],        displayName: 'Chocolat noir',     calories: 546, protein: 4.9, carbs: 59.4, fat: 31.3, category: 'Divers' },
  { id: 'tofu',       names: ['tofu'],                                   displayName: 'Tofu',              calories: 76,  protein: 8.1, carbs: 1.9,  fat: 4.8,  category: 'Végétal' },
  { id: 'edamame',    names: ['edamame', 'soja', 'soy'],                 displayName: 'Edamame',           calories: 121, protein: 11.9, carbs: 8.9, fat: 5.2,  category: 'Végétal' },
];

/**
 * Score how well a raw food entry matches a query.
 * Higher = better match.
 */
function scoreMatch(entry: RawFoodEntry, q: string): number {
  const qNorm = q.toLowerCase().trim();
  for (const name of entry.names) {
    if (name === qNorm) return 3;          // exact match
    if (name.startsWith(qNorm)) return 2;  // prefix match
    if (name.includes(qNorm) || qNorm.includes(name)) return 1; // partial match
  }
  // Also try display name
  const dn = entry.displayName.toLowerCase();
  if (dn.includes(qNorm) || qNorm.includes(dn.split(' ')[0])) return 1;
  return 0;
}

/**
 * Search the local raw foods database.
 * Returns up to `limit` matching entries sorted by match quality.
 */
export function searchRawFoods(query: string, limit = 6): RawFoodEntry[] {
  if (query.trim().length < 2) return [];

  return RAW_FOODS
    .map((entry) => ({ entry, score: scoreMatch(entry, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
