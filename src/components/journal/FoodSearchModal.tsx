'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { SearchResult } from '@/app/api/search/route';
import type { MealType } from '@/types';
import { MEAL_LABELS } from '@/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface FoodSearchModalProps {
  initialMealType: MealType;
  onClose: () => void;
  onAdd: (result: SearchResult, grams: number, mealType: MealType) => void;
}

function ProductImage({ url, name }: { url?: string; name: string }) {
  const [errored, setErrored] = useState(false);
  if (!url || errored) {
    return (
      <div className="w-12 h-12 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d1f5e" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0">
      <Image
        src={url}
        alt={name}
        width={48}
        height={48}
        className="w-full h-full object-contain"
        onError={() => setErrored(true)}
        unoptimized
      />
    </div>
  );
}

export function FoodSearchModal({ initialMealType, onClose, onAdd }: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [grams, setGrams] = useState(100);
  const [servings, setServings] = useState(1);
  const [quantityMode, setQuantityMode] = useState<'grams' | 'servings'>('grams');
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setSelected(result);
    setGrams(result.servingGrams ?? 100);
    setServings(1);
    setQuantityMode('servings');
  };

  const servingSize = selected?.servingGrams ?? 100;
  const effectiveGrams = quantityMode === 'servings'
    ? Math.round(servings * servingSize)
    : grams;

  const macros = selected
    ? {
        calories: Math.round((selected.calories * effectiveGrams) / 100),
        protein: Math.round((selected.protein * effectiveGrams) / 100 * 10) / 10,
        carbs: Math.round((selected.carbs * effectiveGrams) / 100 * 10) / 10,
        fat: Math.round((selected.fat * effectiveGrams) / 100 * 10) / 10,
      }
    : null;

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected, effectiveGrams, mealType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0F0F1A]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 border-b border-[#2d1f5e]">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA] shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Ajouter un aliment</h1>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B8A] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Nutella, yaourt Activia, jambon…"
            className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          {loading ? (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : query ? (
            <button
              onClick={() => { setQuery(''); setResults([]); setSelected(null); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* Meal type pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5">
          {MEAL_ORDER.map((type) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                mealType === type
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#1A1A2E] border border-[#2d1f5e] text-[#6B6B8A]',
              ].join(' ')}
            >
              {MEAL_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Selected product panel */}
        {selected && (
          <div className="px-4 pt-4 pb-3 border-b border-[#2d1f5e] bg-[#1A1A2E]">
            <div className="flex items-start gap-3 mb-4">
              <ProductImage url={selected.imageUrl} name={selected.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{selected.name}</p>
                {selected.brand && <p className="text-xs text-[#A78BFA] mt-0.5">{selected.brand}</p>}
                <p className="text-[10px] text-[#6B6B8A] mt-0.5">{selected.calories} kcal · {selected.protein}g P · {selected.carbs}g G · {selected.fat}g L &nbsp;/100g</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#6B6B8A] hover:text-white shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Quantity mode toggle */}
            <div className="flex bg-[#0F0F1A] rounded-xl p-1 mb-3 w-fit">
              <button
                onClick={() => setQuantityMode('servings')}
                className={['px-3 py-1.5 rounded-lg text-xs font-medium transition-all', quantityMode === 'servings' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A]'].join(' ')}
              >
                {selected.servingSize ? `Portions (${selected.servingSize})` : 'Portions'}
              </button>
              <button
                onClick={() => setQuantityMode('grams')}
                className={['px-3 py-1.5 rounded-lg text-xs font-medium transition-all', quantityMode === 'grams' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A]'].join(' ')}
              >
                Grammes
              </button>
            </div>

            {/* Quantity input */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => quantityMode === 'grams'
                  ? setGrams(Math.max(1, grams - (grams > 50 ? 10 : 1)))
                  : setServings(Math.max(0.5, +(servings - 0.5).toFixed(1)))}
                className="w-10 h-10 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center text-xl leading-none"
              >−</button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  value={quantityMode === 'grams' ? grams : servings}
                  min={quantityMode === 'grams' ? 1 : 0.5}
                  step={quantityMode === 'grams' ? 1 : 0.5}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (quantityMode === 'grams') setGrams(Math.max(1, v));
                    else setServings(Math.max(0.5, v));
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-base text-white text-center focus:outline-none focus:border-[#7C3AED]"
                />
                <p className="text-[10px] text-[#6B6B8A] mt-1">
                  {quantityMode === 'grams' ? 'grammes' : `≈ ${effectiveGrams}g`}
                </p>
              </div>
              <button
                onClick={() => quantityMode === 'grams'
                  ? setGrams(grams + (grams >= 50 ? 10 : 1))
                  : setServings(+(servings + 0.5).toFixed(1))}
                className="w-10 h-10 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center text-xl leading-none"
              >+</button>
            </div>

            {/* Macros preview */}
            {macros && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'kcal', value: macros.calories, color: '#EC4899' },
                  { label: 'prot', value: `${macros.protein}g`, color: '#7C3AED' },
                  { label: 'gluc', value: `${macros.carbs}g`, color: '#A78BFA' },
                  { label: 'lip', value: `${macros.fat}g`, color: '#06B6D4' },
                ].map((m) => (
                  <div key={m.label} className="bg-[#0F0F1A] rounded-xl p-2.5 text-center">
                    <p className="text-white font-bold text-sm">{m.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: m.color }}>{m.label}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleAdd}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl py-3.5 text-sm transition-colors"
            >
              Ajouter au journal — {MEAL_LABELS[mealType]}
            </button>
          </div>
        )}

        {/* Results */}
        {!selected && results.length > 0 && (
          <div className="px-4 pt-3 space-y-2 pb-4">
            <p className="text-[10px] text-[#6B6B8A] mb-2">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full bg-[#1A1A2E] border border-[#2d1f5e] active:border-[#7C3AED]/60 rounded-2xl p-3 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  {r.source === 'raw' ? (
                    <div className="w-12 h-12 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
                        <path d="M12 8v4l3 3"/>
                      </svg>
                    </div>
                  ) : (
                    <ProductImage url={r.imageUrl} name={r.name} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-medium text-white leading-tight line-clamp-2">{r.name}</p>
                      {r.source === 'raw' && (
                        <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#7C3AED]/20 text-[#A78BFA]">Brut</span>
                      )}
                    </div>
                    {r.brand && <p className="text-xs text-[#A78BFA] mt-0 truncate">{r.brand}</p>}
                    {r.servingSize && <p className="text-[10px] text-[#6B6B8A] mt-0.5">Portion : {r.servingSize}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wide mb-0.5">Calories</p>
                    <p className="text-sm font-bold text-white">{r.calories} <span className="text-xs font-normal text-[#EC4899]">kcal</span></p>
                    <p className="text-[9px] text-[#6B6B8A]">pour 100g</p>
                    <div className="flex gap-1.5 mt-1 justify-end">
                      {[
                        { v: r.protein, c: '#7C3AED' },
                        { v: r.carbs, c: '#A78BFA' },
                        { v: r.fat, c: '#06B6D4' },
                      ].map((m, i) => (
                        <span key={i} className="text-[9px] font-semibold" style={{ color: m.c }}>{m.v}g</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty states */}
        {!loading && !selected && query.trim().length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center px-8">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-white font-semibold text-sm">Aucun produit trouvé</p>
            <p className="text-[#6B6B8A] text-xs mt-1">Essayez un autre terme de recherche</p>
          </div>
        )}

        {!loading && !selected && query.trim().length < 2 && (
          <div className="flex flex-col items-center py-20 text-center px-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2d1f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-white font-semibold text-sm">Rechercher un aliment</p>
            <p className="text-[#6B6B8A] text-xs mt-1 leading-relaxed">
              Produits de supermarché (Open Food Facts) et aliments bruts (avocat, poulet, riz…)
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
