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

interface CustomMealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
  items: string; // JSON
}

interface IngredientItem {
  key: string;
  name: string;
  grams: number;
  calories: number; // absolute for this gram amount
  protein: number;
  carbs: number;
  fat: number;
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
      <Image src={url} alt={name} width={48} height={48} className="w-full h-full object-contain" onError={() => setErrored(true)} unoptimized />
    </div>
  );
}

function customMealToSearchResult(m: CustomMealItem): SearchResult {
  const g = m.grams || 100;
  return {
    id: `custom-${m.id}`,
    name: m.name,
    brand: '',
    calories: Math.round((m.calories / g) * 100 * 10) / 10,
    protein: Math.round((m.protein / g) * 100 * 10) / 10,
    carbs: Math.round((m.carbs / g) * 100 * 10) / 10,
    fat: Math.round((m.fat / g) * 100 * 10) / 10,
    servingGrams: g,
    servingSize: `${g}g`,
    source: 'off' as const,
  };
}

export function FoodSearchModal({ initialMealType, onClose, onAdd }: FoodSearchModalProps) {
  // ── Main mode ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'search' | 'custom'>('search');
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  // ── Journal search ───────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [grams, setGrams] = useState(100);
  const [servings, setServings] = useState(1);
  const [quantityMode, setQuantityMode] = useState<'grams' | 'servings'>('grams');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Custom meals list ────────────────────────────────────────────────────
  const [customMeals, setCustomMeals] = useState<CustomMealItem[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // ── Create form ──────────────────────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newItems, setNewItems] = useState<IngredientItem[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Ingredient sub-search ────────────────────────────────────────────────
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [ingQuery, setIngQuery] = useState('');
  const [ingResults, setIngResults] = useState<SearchResult[]>([]);
  const [ingLoading, setIngLoading] = useState(false);
  const [ingSelected, setIngSelected] = useState<SearchResult | null>(null);
  const [ingGrams, setIngGrams] = useState(100);
  const [ingServings, setIngServings] = useState(1);
  const [ingQuantityMode, setIngQuantityMode] = useState<'grams' | 'servings'>('grams');
  const ingInputRef = useRef<HTMLInputElement>(null);
  const ingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Focus effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'search' && !selected) setTimeout(() => inputRef.current?.focus(), 100);
  }, [tab, selected]);

  useEffect(() => {
    if (addingIngredient && !ingSelected) setTimeout(() => ingInputRef.current?.focus(), 100);
  }, [addingIngredient, ingSelected]);

  // ── Load custom meals ─────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'custom' && customMeals.length === 0) {
      setLoadingCustom(true);
      fetch('/api/custom-meals')
        .then((r) => r.ok ? r.json() : [])
        .then((data: CustomMealItem[]) => setCustomMeals(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingCustom(false));
    }
  }, [tab, customMeals.length]);

  // ── Journal search ────────────────────────────────────────────────────────
  const search = useCallback(async (q: string, setter: typeof setResults, loadSetter: typeof setLoading) => {
    if (q.trim().length < 2) { setter([]); return; }
    loadSetter(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      setter(await res.json());
    } catch { setter([]); }
    finally { loadSetter(false); }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value, setResults, setLoading), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setSelected(result);
    setGrams(result.servingGrams ?? 100);
    setServings(1);
    setQuantityMode('servings');
  };

  // ── Ingredient search ─────────────────────────────────────────────────────
  const handleIngQueryChange = (value: string) => {
    setIngQuery(value);
    setIngSelected(null);
    if (ingDebounceRef.current) clearTimeout(ingDebounceRef.current);
    ingDebounceRef.current = setTimeout(() => search(value, setIngResults, setIngLoading), 300);
  };

  const handleIngSelect = (result: SearchResult) => {
    setIngSelected(result);
    setIngGrams(result.servingGrams ?? 100);
    setIngServings(1);
    setIngQuantityMode('servings');
  };

  const ingServingSize = ingSelected?.servingGrams ?? 100;
  const ingEffectiveGrams = ingQuantityMode === 'servings'
    ? Math.round(ingServings * ingServingSize)
    : ingGrams;

  const ingMacros = ingSelected ? {
    calories: Math.round((ingSelected.calories * ingEffectiveGrams) / 100),
    protein: Math.round((ingSelected.protein * ingEffectiveGrams) / 100 * 10) / 10,
    carbs: Math.round((ingSelected.carbs * ingEffectiveGrams) / 100 * 10) / 10,
    fat: Math.round((ingSelected.fat * ingEffectiveGrams) / 100 * 10) / 10,
  } : null;

  function handleAddIngredient() {
    if (!ingSelected || !ingMacros) return;
    setNewItems((prev) => [...prev, {
      key: Date.now().toString(),
      name: ingSelected.name,
      grams: ingEffectiveGrams,
      calories: ingMacros.calories,
      protein: ingMacros.protein,
      carbs: ingMacros.carbs,
      fat: ingMacros.fat,
    }]);
    // Reset ingredient search
    setIngSelected(null);
    setIngQuery('');
    setIngResults([]);
    setAddingIngredient(false);
  }

  function cancelIngredientSearch() {
    setAddingIngredient(false);
    setIngSelected(null);
    setIngQuery('');
    setIngResults([]);
  }

  // ── Totals computed from items ────────────────────────────────────────────
  const totals = newItems.reduce(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      protein: +(acc.protein + it.protein).toFixed(1),
      carbs: +(acc.carbs + it.carbs).toFixed(1),
      fat: +(acc.fat + it.fat).toFixed(1),
      grams: acc.grams + it.grams,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }
  );

  // ── Save custom meal ──────────────────────────────────────────────────────
  async function handleSaveCustom() {
    if (!newName.trim() || newItems.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/custom-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          grams: totals.grams || 100,
          items: newItems.map(({ key: _k, ...rest }) => rest),
        }),
      });
      if (res.ok) {
        const meal: CustomMealItem = await res.json();
        setCustomMeals((prev) => [meal, ...prev]);
        setCreating(false);
        setNewName('');
        setNewItems([]);
      }
    } finally {
      setSaving(false);
    }
  }

  function resetCreate() {
    setCreating(false);
    setNewName('');
    setNewItems([]);
    setAddingIngredient(false);
    setIngSelected(null);
    setIngQuery('');
    setIngResults([]);
  }

  // ── Delete custom meal ────────────────────────────────────────────────────
  async function handleDeleteCustom(id: string) {
    const realId = id.replace('custom-', '');
    await fetch(`/api/custom-meals/${realId}`, { method: 'DELETE' });
    setCustomMeals((prev) => prev.filter((m) => `custom-${m.id}` !== id));
    if (selected?.id === id) setSelected(null);
  }

  // ── Journal add ───────────────────────────────────────────────────────────
  const servingSize = selected?.servingGrams ?? 100;
  const effectiveGrams = quantityMode === 'servings' ? Math.round(servings * servingSize) : grams;
  const macros = selected ? {
    calories: Math.round((selected.calories * effectiveGrams) / 100),
    protein: Math.round((selected.protein * effectiveGrams) / 100 * 10) / 10,
    carbs: Math.round((selected.carbs * effectiveGrams) / 100 * 10) / 10,
    fat: Math.round((selected.fat * effectiveGrams) / 100 * 10) / 10,
  } : null;

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected, effectiveGrams, mealType);
    onClose();
  };

  // ── Header back-button logic ──────────────────────────────────────────────
  const handleBack = () => {
    if (tab === 'custom') {
      if (addingIngredient) { cancelIngredientSearch(); return; }
      if (creating) { resetCreate(); return; }
      if (selected) { setSelected(null); return; }
    }
    if (tab === 'search' && selected) { setSelected(null); return; }
    onClose();
  };

  // ── Header title ──────────────────────────────────────────────────────────
  const headerTitle = (() => {
    if (tab === 'custom') {
      if (addingIngredient) return 'Ajouter un ingrédient';
      if (creating) return 'Nouveau repas';
    }
    return 'Ajouter un aliment';
  })();

  const showTabToggle = !creating && !addingIngredient && !selected;
  const showMealPills = !addingIngredient;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0F0F1A]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-12 pb-4 border-b border-[#2d1f5e]">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA] shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">{headerTitle}</h1>
          </div>

          {/* Tab toggle */}
          {showTabToggle && (
            <div className="flex bg-[#1A1A2E] rounded-2xl p-1 mb-3 border border-[#2d1f5e]">
              <button
                onClick={() => { setTab('search'); setSelected(null); }}
                className={['flex-1 py-2 rounded-xl text-xs font-semibold transition-all', tab === 'search' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A]'].join(' ')}
              >
                Rechercher
              </button>
              <button
                onClick={() => { setTab('custom'); setSelected(null); }}
                className={['flex-1 py-2 rounded-xl text-xs font-semibold transition-all', tab === 'custom' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A]'].join(' ')}
              >
                Mes repas
              </button>
            </div>
          )}

          {/* Search input — journal search */}
          {tab === 'search' && !selected && (
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B8A] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Nutella, yaourt, poulet…"
                className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
              {loading ? (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : query ? (
                <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B8A]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : null}
            </div>
          )}

          {/* Search input — ingredient sub-search */}
          {tab === 'custom' && addingIngredient && !ingSelected && (
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B8A] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={ingInputRef}
                type="text"
                value={ingQuery}
                onChange={(e) => handleIngQueryChange(e.target.value)}
                placeholder="Riz, œufs, poulet…"
                className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
              {ingLoading ? (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : ingQuery ? (
                <button onClick={() => { setIngQuery(''); setIngResults([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B8A]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : null}
            </div>
          )}

          {/* Meal type pills */}
          {showMealPills && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {MEAL_ORDER.map((type) => (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={[
                    'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                    mealType === type ? 'bg-[#7C3AED] text-white' : 'bg-[#1A1A2E] border border-[#2d1f5e] text-[#6B6B8A]',
                  ].join(' ')}
                >
                  {MEAL_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Selected food panel (journal add — shared) */}
          {selected && (
            <SelectedPanel
              selected={selected}
              grams={grams} setGrams={setGrams}
              servings={servings} setServings={setServings}
              quantityMode={quantityMode} setQuantityMode={setQuantityMode}
              effectiveGrams={effectiveGrams}
              macros={macros}
              mealType={mealType}
              onAdd={handleAdd}
              onDeleteCustom={selected.id.startsWith('custom-') ? () => handleDeleteCustom(selected.id) : undefined}
            />
          )}

          {/* ── SEARCH tab content ──────────────────────────────────────── */}
          {tab === 'search' && !selected && (
            <SearchResults
              query={query} results={results} loading={loading}
              onSelect={handleSelect}
            />
          )}

          {/* ── CUSTOM tab content ──────────────────────────────────────── */}
          {tab === 'custom' && !selected && (
            <>
              {/* Ingredient sub-search */}
              {addingIngredient && (
                <>
                  {ingSelected ? (
                    <IngredientPanel
                      selected={ingSelected}
                      grams={ingGrams} setGrams={setIngGrams}
                      servings={ingServings} setServings={setIngServings}
                      quantityMode={ingQuantityMode} setQuantityMode={setIngQuantityMode}
                      effectiveGrams={ingEffectiveGrams}
                      macros={ingMacros}
                      onConfirm={handleAddIngredient}
                      onCancel={() => setIngSelected(null)}
                    />
                  ) : (
                    <SearchResults
                      query={ingQuery} results={ingResults} loading={ingLoading}
                      onSelect={handleIngSelect}
                    />
                  )}
                </>
              )}

              {/* Create form */}
              {creating && !addingIngredient && (
                <div className="px-4 pt-4 pb-6">
                  {/* Name */}
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom du repas (ex: Mon bowl muesli)"
                    className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3 py-3 text-sm text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] mb-4"
                    autoFocus
                  />

                  {/* Ingredients list */}
                  {newItems.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {newItems.map((item) => (
                        <div key={item.key} className="flex items-center gap-3 bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{item.name}</p>
                            <p className="text-[10px] text-[#6B6B8A]">{item.grams}g · {Math.round(item.calories)} kcal</p>
                          </div>
                          <div className="flex gap-2 text-[9px] font-semibold shrink-0">
                            <span className="text-[#7C3AED]">{item.protein}g P</span>
                            <span className="text-[#A78BFA]">{item.carbs}g G</span>
                            <span className="text-[#06B6D4]">{item.fat}g L</span>
                          </div>
                          <button
                            onClick={() => setNewItems((prev) => prev.filter((i) => i.key !== item.key))}
                            className="text-red-400/60 hover:text-red-400 shrink-0 ml-1"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add ingredient button */}
                  <button
                    onClick={() => setAddingIngredient(true)}
                    className="w-full flex items-center gap-2 justify-center border border-dashed border-[#7C3AED]/50 rounded-xl py-3 text-sm font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors mb-4"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Ajouter un ingrédient
                  </button>

                  {/* Totals */}
                  {newItems.length > 0 && (
                    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl p-3 mb-4">
                      <p className="text-[10px] text-[#6B6B8A] mb-2 uppercase tracking-wider">Total du repas</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'kcal', value: Math.round(totals.calories), color: '#EC4899' },
                          { label: 'prot', value: `${totals.protein}g`, color: '#7C3AED' },
                          { label: 'gluc', value: `${totals.carbs}g`, color: '#A78BFA' },
                          { label: 'lip',  value: `${totals.fat}g`,  color: '#06B6D4' },
                        ].map((m) => (
                          <div key={m.label} className="bg-[#0F0F1A] rounded-xl p-2 text-center">
                            <p className="text-white font-bold text-sm">{m.value}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: m.color }}>{m.label}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#6B6B8A] text-center mt-2">{Math.round(totals.grams)}g au total</p>
                    </div>
                  )}

                  {/* Save */}
                  <button
                    onClick={handleSaveCustom}
                    disabled={saving || !newName.trim() || newItems.length === 0}
                    className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white font-semibold rounded-xl py-3.5 text-sm transition-colors"
                  >
                    {saving ? 'Sauvegarde…' : 'Sauvegarder le repas'}
                  </button>
                </div>
              )}

              {/* Custom meals list */}
              {!creating && !addingIngredient && (
                <div className="px-4 pt-4 pb-6">
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full flex items-center gap-2 justify-center border border-dashed border-[#7C3AED]/50 rounded-2xl py-3.5 text-sm font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors mb-4"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Créer un repas personnalisé
                  </button>

                  {loadingCustom ? (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : customMeals.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2d1f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                        <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
                      </svg>
                      <p className="text-white font-semibold text-sm">Aucun repas sauvegardé</p>
                      <p className="text-[#6B6B8A] text-xs mt-1">Créez vos repas habituels pour les ajouter rapidement</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customMeals.map((meal) => {
                        const sr = customMealToSearchResult(meal);
                        let ingredients: IngredientItem[] = [];
                        try { ingredients = JSON.parse(meal.items ?? '[]'); } catch { /* noop */ }
                        return (
                          <div key={meal.id} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] flex items-center justify-center shrink-0">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                                  <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{meal.name}</p>
                                <p className="text-[10px] text-[#6B6B8A] mt-0.5">
                                  {Math.round(meal.grams)}g · {Math.round(meal.calories)} kcal
                                  {ingredients.length > 0 && ` · ${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''}`}
                                </p>
                                <div className="flex gap-2 mt-0.5">
                                  <span className="text-[9px] font-semibold text-[#7C3AED]">{meal.protein}g P</span>
                                  <span className="text-[9px] font-semibold text-[#A78BFA]">{meal.carbs}g G</span>
                                  <span className="text-[9px] font-semibold text-[#06B6D4]">{meal.fat}g L</span>
                                </div>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleDeleteCustom(sr.id)}
                                  className="w-8 h-8 rounded-lg bg-[#0F0F1A] flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleSelect(sr)}
                                  className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] hover:bg-[#7C3AED]/40 transition-colors"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SearchResults({
  query, results, loading, onSelect,
}: {
  query: string;
  results: SearchResult[];
  loading: boolean;
  onSelect: (r: SearchResult) => void;
}) {
  return (
    <>
      {!loading && results.length > 0 && (
        <div className="px-4 pt-3 space-y-2 pb-4">
          <p className="text-[10px] text-[#6B6B8A] mb-2">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
          {results.map((r) => (
            <button key={r.id} onClick={() => onSelect(r)} className="w-full bg-[#1A1A2E] border border-[#2d1f5e] active:border-[#7C3AED]/60 rounded-2xl p-3 text-left transition-all">
              <div className="flex items-center gap-3">
                {r.source === 'raw' ? (
                  <div className="w-12 h-12 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/>
                    </svg>
                  </div>
                ) : (
                  <ProductImage url={r.imageUrl} name={r.name} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-medium text-white leading-tight line-clamp-2">{r.name}</p>
                    {r.source === 'raw' && <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#7C3AED]/20 text-[#A78BFA]">Brut</span>}
                  </div>
                  {r.brand && <p className="text-xs text-[#A78BFA] truncate">{r.brand}</p>}
                  {r.servingSize && <p className="text-[10px] text-[#6B6B8A] mt-0.5">Portion : {r.servingSize}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wide mb-0.5">Calories</p>
                  <p className="text-sm font-bold text-white">{r.calories} <span className="text-xs font-normal text-[#EC4899]">kcal</span></p>
                  <p className="text-[9px] text-[#6B6B8A]">pour 100g</p>
                  <div className="flex gap-1.5 mt-1 justify-end">
                    {[{ v: r.protein, c: '#7C3AED' }, { v: r.carbs, c: '#A78BFA' }, { v: r.fat, c: '#06B6D4' }].map((m, i) => (
                      <span key={i} className="text-[9px] font-semibold" style={{ color: m.c }}>{m.v}g</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center px-8">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-white font-semibold text-sm">Aucun produit trouvé</p>
          <p className="text-[#6B6B8A] text-xs mt-1">Essayez un autre terme de recherche</p>
        </div>
      )}
      {!loading && query.trim().length < 2 && (
        <div className="flex flex-col items-center py-20 text-center px-8">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2d1f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-white font-semibold text-sm">Rechercher un aliment</p>
          <p className="text-[#6B6B8A] text-xs mt-1 leading-relaxed">Produits supermarché (Open Food Facts) et aliments bruts</p>
        </div>
      )}
    </>
  );
}

function QuantityEditor({
  selected, grams, setGrams, servings, setServings,
  quantityMode, setQuantityMode, effectiveGrams,
}: {
  selected: SearchResult;
  grams: number; setGrams: (v: number) => void;
  servings: number; setServings: (v: number) => void;
  quantityMode: 'grams' | 'servings'; setQuantityMode: (v: 'grams' | 'servings') => void;
  effectiveGrams: number;
}) {
  return (
    <>
      <div className="flex bg-[#0F0F1A] rounded-xl p-1 mb-3 w-fit">
        <button onClick={() => setQuantityMode('servings')} className={['px-3 py-1.5 rounded-lg text-xs font-medium transition-all', quantityMode === 'servings' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A]'].join(' ')}>
          {selected.servingSize ? `Portions (${selected.servingSize})` : 'Portions'}
        </button>
        <button onClick={() => setQuantityMode('grams')} className={['px-3 py-1.5 rounded-lg text-xs font-medium transition-all', quantityMode === 'grams' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A]'].join(' ')}>
          Grammes
        </button>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => quantityMode === 'grams' ? setGrams(Math.max(1, grams - (grams > 50 ? 10 : 1))) : setServings(Math.max(0.5, +(servings - 0.5).toFixed(1)))}
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
          <p className="text-[10px] text-[#6B6B8A] mt-1">{quantityMode === 'grams' ? 'grammes' : `≈ ${effectiveGrams}g`}</p>
        </div>
        <button
          onClick={() => quantityMode === 'grams' ? setGrams(grams + (grams >= 50 ? 10 : 1)) : setServings(+(servings + 0.5).toFixed(1))}
          className="w-10 h-10 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center text-xl leading-none"
        >+</button>
      </div>
    </>
  );
}

function MacrosPreview({ macros }: { macros: { calories: number; protein: number; carbs: number; fat: number } }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {[
        { label: 'kcal', value: macros.calories, color: '#EC4899' },
        { label: 'prot', value: `${macros.protein}g`, color: '#7C3AED' },
        { label: 'gluc', value: `${macros.carbs}g`, color: '#A78BFA' },
        { label: 'lip',  value: `${macros.fat}g`,  color: '#06B6D4' },
      ].map((m) => (
        <div key={m.label} className="bg-[#0F0F1A] rounded-xl p-2.5 text-center">
          <p className="text-white font-bold text-sm">{m.value}</p>
          <p className="text-[10px] mt-0.5" style={{ color: m.color }}>{m.label}</p>
        </div>
      ))}
    </div>
  );
}

function SelectedPanel({
  selected, grams, setGrams, servings, setServings,
  quantityMode, setQuantityMode, effectiveGrams, macros, mealType, onAdd, onDeleteCustom,
}: {
  selected: SearchResult;
  grams: number; setGrams: (v: number) => void;
  servings: number; setServings: (v: number) => void;
  quantityMode: 'grams' | 'servings'; setQuantityMode: (v: 'grams' | 'servings') => void;
  effectiveGrams: number;
  macros: { calories: number; protein: number; carbs: number; fat: number } | null;
  mealType: MealType;
  onAdd: () => void;
  onDeleteCustom?: () => void;
}) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[#2d1f5e] bg-[#1A1A2E]">
      <div className="flex items-start gap-3 mb-4">
        <ProductImage url={selected.imageUrl} name={selected.name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{selected.name}</p>
          {selected.brand && <p className="text-xs text-[#A78BFA] mt-0.5">{selected.brand}</p>}
          <p className="text-[10px] text-[#6B6B8A] mt-0.5">{selected.calories} kcal · {selected.protein}g P · {selected.carbs}g G · {selected.fat}g L /100g</p>
        </div>
      </div>
      <QuantityEditor
        selected={selected} grams={grams} setGrams={setGrams}
        servings={servings} setServings={setServings}
        quantityMode={quantityMode} setQuantityMode={setQuantityMode}
        effectiveGrams={effectiveGrams}
      />
      {macros && <MacrosPreview macros={macros} />}
      <button onClick={onAdd} className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl py-3.5 text-sm transition-colors">
        Ajouter au journal — {MEAL_LABELS[mealType]}
      </button>
      {onDeleteCustom && (
        <button onClick={onDeleteCustom} className="w-full mt-2 py-2 text-xs text-red-400 hover:text-red-300 transition-colors">
          Supprimer ce repas
        </button>
      )}
    </div>
  );
}

function IngredientPanel({
  selected, grams, setGrams, servings, setServings,
  quantityMode, setQuantityMode, effectiveGrams, macros, onConfirm, onCancel,
}: {
  selected: SearchResult;
  grams: number; setGrams: (v: number) => void;
  servings: number; setServings: (v: number) => void;
  quantityMode: 'grams' | 'servings'; setQuantityMode: (v: 'grams' | 'servings') => void;
  effectiveGrams: number;
  macros: { calories: number; protein: number; carbs: number; fat: number } | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-start gap-3 mb-4">
        <ProductImage url={selected.imageUrl} name={selected.name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{selected.name}</p>
          {selected.brand && <p className="text-xs text-[#A78BFA] mt-0.5">{selected.brand}</p>}
          <p className="text-[10px] text-[#6B6B8A] mt-0.5">{selected.calories} kcal · {selected.protein}g P · {selected.carbs}g G · {selected.fat}g L /100g</p>
        </div>
        <button onClick={onCancel} className="text-[#6B6B8A] hover:text-white shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <QuantityEditor
        selected={selected} grams={grams} setGrams={setGrams}
        servings={servings} setServings={setServings}
        quantityMode={quantityMode} setQuantityMode={setQuantityMode}
        effectiveGrams={effectiveGrams}
      />
      {macros && <MacrosPreview macros={macros} />}
      <button onClick={onConfirm} className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl py-3.5 text-sm transition-colors">
        Ajouter à la recette
      </button>
    </div>
  );
}
