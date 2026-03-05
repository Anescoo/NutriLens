'use client';

import { useState, useCallback, useEffect } from 'react';
import { CameraCapture } from '@/components/scan/CameraCapture';
import { FoodResultCard } from '@/components/scan/FoodResultCard';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { compressImage } from '@/lib/imageCompression';
import { useNutritionStore, createMealEntry } from '@/store/nutritionStore';
import type { DetectedFood, MealType } from '@/types';

type ScanState = 'idle' | 'analyzing' | 'results' | 'error';

// ─── Scan history (localStorage) ─────────────────────────────────────────────

const HISTORY_KEY = 'nutrilens-scan-history';
const MAX_HISTORY = 15;

interface ScanHistoryItem {
  id: string;
  timestamp: number;
  foods: Array<{ name: string; estimatedGrams: number }>;
  strategy: string;
}

function loadHistory(): ScanHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveToHistory(foods: Array<{ name: string; estimatedGrams: number }>, strategy: string) {
  const history = loadHistory();
  const entry: ScanHistoryItem = {
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
    foods,
    strategy,
  };
  const updated = [entry, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function deleteFromHistory(id: string) {
  const history = loadHistory().filter((h) => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Aujourd'hui à ${time}`;
  if (isYesterday) return `Hier à ${time}`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ` à ${time}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [detectedFoods, setDetectedFoods] = useState<DetectedFood[]>([]);
  const [mealTypes, setMealTypes] = useState<Record<string, MealType>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const addEntry = useNutritionStore((s) => s.addEntry);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleImageSelected = useCallback(async (file: File) => {
    setScanState('analyzing');
    setDetectedFoods([]);
    setErrorMsg('');

    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressed, 'photo.jpg');

      const analysisRes = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!analysisRes.ok) {
        const err = await analysisRes.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const { foods, strategy } = await analysisRes.json();

      // Save scan to history
      const updated = saveToHistory(foods, strategy);
      setHistory(updated);

      const initial: DetectedFood[] = foods.map(
        (f: { name: string; estimatedGrams: number }) => ({
          name: f.name,
          estimatedGrams: f.estimatedGrams,
          loading: true,
        })
      );
      setDetectedFoods(initial);
      setScanState('results');

      const types: Record<string, MealType> = {};
      const hour = new Date().getHours();
      const defaultMeal: MealType =
        hour < 10 ? 'breakfast' : hour < 14 ? 'lunch' : hour < 19 ? 'dinner' : 'snack';
      foods.forEach((_: unknown, i: number) => { types[i] = defaultMeal; });
      setMealTypes(types);

      await Promise.all(
        foods.map(async (food: { name: string; estimatedGrams: number }, index: number) => {
          try {
            const res = await fetch(`/api/nutrition?query=${encodeURIComponent(food.name)}`);
            if (!res.ok) throw new Error('Nutrition lookup failed');
            const foodItem = await res.json();
            setDetectedFoods((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], foodItem, loading: false };
              return next;
            });
          } catch {
            setDetectedFoods((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], loading: false, error: 'Données nutritionnelles indisponibles' };
              return next;
            });
          }
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      setScanState('error');
    }
  }, []);

  const handleAdd = useCallback(
    async (index: number, grams: number, mealType: MealType): Promise<void> => {
      const food = detectedFoods[index];
      if (!food?.foodItem) throw new Error('Données nutritionnelles manquantes');
      const entry = createMealEntry(food.foodItem, grams, mealType);
      await addEntry(entry);
    },
    [detectedFoods, addEntry]
  );

  const handleRemove = useCallback((index: number) => {
    setDetectedFoods((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReset = () => {
    setScanState('idle');
    setDetectedFoods([]);
    setErrorMsg('');
  };

  // Re-scan from history item: populate results from a past scan
  const handleRescanFromHistory = useCallback(
    async (item: ScanHistoryItem) => {
      setScanState('analyzing');
      setDetectedFoods([]);
      setErrorMsg('');
      setExpandedHistoryId(null);

      const initial: DetectedFood[] = item.foods.map((f) => ({
        name: f.name,
        estimatedGrams: f.estimatedGrams,
        loading: true,
      }));
      setDetectedFoods(initial);
      setScanState('results');

      const hour = new Date().getHours();
      const defaultMeal: MealType =
        hour < 10 ? 'breakfast' : hour < 14 ? 'lunch' : hour < 19 ? 'dinner' : 'snack';
      const types: Record<string, MealType> = {};
      item.foods.forEach((_, i) => { types[i] = defaultMeal; });
      setMealTypes(types);

      await Promise.all(
        item.foods.map(async (food, index) => {
          try {
            const res = await fetch(`/api/nutrition?query=${encodeURIComponent(food.name)}`);
            if (!res.ok) throw new Error();
            const foodItem = await res.json();
            setDetectedFoods((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], foodItem, loading: false };
              return next;
            });
          } catch {
            setDetectedFoods((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], loading: false, error: 'Données nutritionnelles indisponibles' };
              return next;
            });
          }
        })
      );
    },
    []
  );

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader
        title="Scanner"
        subtitle="Détection IA des aliments"
        action={
          scanState !== 'idle' ? (
            <button
              onClick={handleReset}
              className="text-sm text-[#A78BFA] hover:text-white transition-colors"
            >
              Nouveau scan
            </button>
          ) : undefined
        }
      />

      {/* Camera capture */}
      {(scanState === 'idle' || scanState === 'error') && (
        <div className="space-y-4">
          <CameraCapture onImageSelected={handleImageSelected} disabled={false} />

          {scanState === 'error' && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-[#EF4444]">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Scan history */}
          {history.length > 0 && (
            <div className="mt-2">
              <h2 className="text-sm font-semibold text-[#A78BFA] mb-3">Historique des scans</h2>
              <div className="space-y-2">
                {history.map((item) => {
                  const isExpanded = expandedHistoryId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl overflow-hidden"
                    >
                      {/* Header row */}
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer"
                        onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#6B6B8A]">{fmtTime(item.timestamp)}</p>
                          <p className="text-sm text-white font-medium truncate mt-0.5">
                            {item.foods.map((f) => f.name).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = deleteFromHistory(item.id);
                              setHistory(updated);
                            }}
                            className="p-1.5 text-[#6B6B8A] hover:text-red-400 transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3,6 5,6 21,6" /><path d="M19,6l-1,14H6L5,6" />
                            </svg>
                          </button>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round"
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded: food chips + re-scan button */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-[#2d1f5e] pt-3">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {item.foods.map((f, i) => (
                              <span
                                key={i}
                                className="text-xs bg-[#7C3AED]/20 text-[#A78BFA] px-2.5 py-1 rounded-full"
                              >
                                {f.name}
                                <span className="text-[#6B6B8A] ml-1">~{f.estimatedGrams}g</span>
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleRescanFromHistory(item)}
                            className="w-full bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 text-[#A78BFA] text-sm font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <polyline points="1 4 1 10 7 10" />
                              <path d="M3.51 15a9 9 0 1 0 .49-3.36" />
                            </svg>
                            Réutiliser ce scan
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analyzing */}
      {scanState === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-[#7C3AED]/20 flex items-center justify-center">
              <LoadingSpinner size={40} />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-[#7C3AED] animate-ping opacity-20" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Analyse en cours…</p>
            <p className="text-[#6B6B8A] text-sm mt-1">L'IA identifie vos aliments</p>
          </div>
        </div>
      )}

      {/* Results */}
      {scanState === 'results' && (
        <div className="space-y-4">
          {detectedFoods.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6B6B8A]">Aucun aliment détecté. Essaie avec une autre photo.</p>
              <Button variant="secondary" size="md" className="mt-4" onClick={handleReset}>
                Réessayer
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-[#6B6B8A]">
                  {detectedFoods.length} aliment{detectedFoods.length > 1 ? 's' : ''} détecté{detectedFoods.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                  Estimations approximatives
                </span>
              </div>

              {detectedFoods.map((food, index) => (
                <FoodResultCard
                  key={index}
                  food={food}
                  mealType={mealTypes[index] || 'lunch'}
                  onMealTypeChange={(type) =>
                    setMealTypes((prev) => ({ ...prev, [index]: type }))
                  }
                  onAdd={(grams, mealType) => handleAdd(index, grams, mealType)}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </main>
  );
}
