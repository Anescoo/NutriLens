'use client';

import { calcMacros } from '@/lib/nutritionCalc';
import type { FoodItem } from '@/types';

interface PortionEditorProps {
  foodItem: FoodItem;
  grams: number;
  onChange: (grams: number) => void;
}

export function PortionEditor({ foodItem, grams, onChange }: PortionEditorProps) {
  const macros = calcMacros(foodItem, grams);

  return (
    <div className="space-y-3">
      {/* Gram slider */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={grams}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <div className="flex items-center gap-1 min-w-[80px]">
          <input
            type="number"
            min={1}
            max={2000}
            value={grams}
            onChange={(e) => {
              const v = Math.min(2000, Math.max(1, Number(e.target.value) || 1));
              onChange(v);
            }}
            className="w-16 bg-[#0F0F1A] border border-[#2d1f5e] rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-[#7C3AED]"
          />
          <span className="text-xs text-[#6B6B8A]">g</span>
        </div>
      </div>

      {/* Macro preview */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'kcal', value: macros.calories, color: '#EC4899' },
          { label: 'protein', value: `${macros.protein}g`, color: '#7C3AED' },
          { label: 'carbs', value: `${macros.carbs}g`, color: '#A78BFA' },
          { label: 'fat', value: `${macros.fat}g`, color: '#06B6D4' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[#0F0F1A] rounded-xl p-2 text-center border border-[#2d1f5e]/50"
          >
            <p className="text-white font-semibold text-sm">{item.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: item.color }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
