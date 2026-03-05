'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PortionEditor } from './PortionEditor';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { DetectedFood, MealType } from '@/types';

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

interface FoodResultCardProps {
  food: DetectedFood;
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  onAdd: (grams: number, mealType: MealType) => Promise<void>;
  onRemove: () => void;
}

export function FoodResultCard({
  food,
  mealType,
  onMealTypeChange,
  onAdd,
  onRemove,
}: FoodResultCardProps) {
  const [grams, setGrams] = useState(food.estimatedGrams);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAdd = async () => {
    setAdding(true);
    setAddError('');
    try {
      await onAdd(grams, mealType);
      setAdded(true);
    } catch {
      setAddError('Erreur lors de l\'ajout. Réessaie.');
    } finally {
      setAdding(false);
    }
  };

  if (food.loading) {
    return (
      <Card className="py-6">
        <div className="flex items-center gap-3">
          <LoadingSpinner size={20} />
          <span className="text-sm text-[#6B6B8A]">
            Looking up <span className="text-[#A78BFA]">{food.name}</span>...
          </span>
        </div>
      </Card>
    );
  }

  if (food.error || !food.foodItem) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#EF4444] text-sm">
              {food.error || 'Could not find nutrition data'}
            </span>
          </div>
          <button
            onClick={onRemove}
            className="text-[#6B6B8A] hover:text-[#EF4444] transition-colors"
            aria-label="Remove"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card glow className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-semibold capitalize">{food.foodItem.name}</h3>
          {food.foodItem.source === 'estimate' && (
            <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
              estimated values
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-[#6B6B8A] hover:text-[#EF4444] transition-colors p-1"
          aria-label="Remove food"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Portion editor */}
      <PortionEditor foodItem={food.foodItem} grams={grams} onChange={setGrams} />

      {/* Meal type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {MEAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onMealTypeChange(opt.value)}
            className={[
              'px-3 py-1 rounded-lg text-xs font-medium transition-all',
              mealType === opt.value
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#0F0F1A] text-[#6B6B8A] hover:text-[#A78BFA] border border-[#2d1f5e]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Add button */}
      {addError && (
        <p className="text-xs text-red-400">{addError}</p>
      )}
      {added ? (
        <div className="flex items-center gap-2 text-[#10B981] text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Ajouté au journal !
        </div>
      ) : (
        <Button variant="primary" size="md" fullWidth onClick={handleAdd} disabled={adding}>
          {adding ? 'Ajout…' : 'Ajouter au journal'}
        </Button>
      )}
    </Card>
  );
}
