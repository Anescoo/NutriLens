'use client';

import { useState } from 'react';
import { calcMacros } from '@/lib/nutritionCalc';
import type { MealEntry } from '@/types';

interface FoodEntryRowProps {
  entry: MealEntry;
  onDelete: (id: string) => void;
}

export function FoodEntryRow({ entry, onDelete }: FoodEntryRowProps) {
  const [confirming, setConfirming] = useState(false);
  const macros = calcMacros(entry.foodItem, entry.grams);

  const handleDeleteClick = () => {
    if (confirming) {
      onDelete(entry.id);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2d1f5e]/40 last:border-0">
      {/* Food icon */}
      <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate capitalize">{entry.foodItem.name}</p>
        <p className="text-xs text-[#6B6B8A]">
          {entry.grams}g
          <span className="mx-1 text-[#2d1f5e]">·</span>
          <span className="text-[#A78BFA]">{macros.calories} kcal</span>
          <span className="mx-1 text-[#2d1f5e]">·</span>
          P {macros.protein}g · C {macros.carbs}g · F {macros.fat}g
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={handleDeleteClick}
        className={[
          'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
          confirming
            ? 'bg-[#EF4444] text-white scale-110'
            : 'text-[#6B6B8A] hover:text-[#EF4444] hover:bg-[#EF4444]/10',
        ].join(' ')}
        title={confirming ? 'Tap again to confirm' : 'Delete'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  );
}
