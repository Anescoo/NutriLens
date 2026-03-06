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
  onAdd: (mealType: MealType) => void;
}

export function MealSection({ mealType, entries, onDelete, onAdd }: MealSectionProps) {
  const totals = sumEntries(entries);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{MEAL_ICONS[mealType]}</span>
          <h3 className="text-sm font-semibold text-[#A78BFA]">{MEAL_LABELS[mealType]}</h3>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <span className="text-xs text-[#6B6B8A]">{totals.calories} kcal</span>
          )}
          <button
            onClick={() => onAdd(mealType)}
            className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/30 hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/60 text-[#A78BFA] flex items-center justify-center transition-all text-base leading-none"
            title={`Ajouter à ${MEAL_LABELS[mealType]}`}
          >
            +
          </button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div>
          {entries.map((entry) => (
            <FoodEntryRow key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <button
          onClick={() => onAdd(mealType)}
          className="w-full py-3 text-xs text-[#6B6B8A] hover:text-[#A78BFA] transition-colors text-center border border-dashed border-[#2d1f5e] hover:border-[#7C3AED]/40 rounded-xl"
        >
          Rien de logué · Tap pour ajouter
        </button>
      )}
    </Card>
  );
}
