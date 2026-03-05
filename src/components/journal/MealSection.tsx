import { Card } from '@/components/ui/Card';
import { FoodEntryRow } from './FoodEntryRow';
import { sumEntries } from '@/lib/nutritionCalc';
import { MEAL_LABELS } from '@/types';
import type { MealEntry, MealType } from '@/types';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

interface MealSectionProps {
  mealType: MealType;
  entries: MealEntry[];
  onDelete: (id: string) => void;
}

export function MealSection({ mealType, entries, onDelete }: MealSectionProps) {
  if (entries.length === 0) return null;

  const totals = sumEntries(entries);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{MEAL_ICONS[mealType]}</span>
          <h3 className="text-sm font-semibold text-[#A78BFA]">{MEAL_LABELS[mealType]}</h3>
        </div>
        <span className="text-xs text-[#6B6B8A]">
          {totals.calories} kcal
        </span>
      </div>

      <div>
        {entries.map((entry) => (
          <FoodEntryRow key={entry.id} entry={entry} onDelete={onDelete} />
        ))}
      </div>
    </Card>
  );
}
