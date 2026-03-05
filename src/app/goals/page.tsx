'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { useGoalsStore } from '@/store/goalsStore';
import { GOAL_PRESETS, type Goals, type GoalPreset } from '@/types';

const PRESET_META: Record<GoalPreset, { label: string; description: string; icon: string }> = {
  weightLoss: {
    label: 'Weight Loss',
    description: 'Caloric deficit, high protein',
    icon: '📉',
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Balanced macros, stable weight',
    icon: '⚖️',
  },
  muscleGain: {
    label: 'Muscle Gain',
    description: 'Caloric surplus, very high protein',
    icon: '💪',
  },
};

interface GoalInputProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

function GoalInput({ label, value, unit, color, onChange, min = 0, max = 5000 }: GoalInputProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#2d1f5e]/40 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs" style={{ color }}>{unit}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - (unit === 'kcal' ? 50 : 5)))}
          className="w-8 h-8 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] hover:border-[#7C3AED] flex items-center justify-center transition-colors text-lg leading-none"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = Math.min(max, Math.max(min, Number(e.target.value) || min));
            onChange(v);
          }}
          className="w-20 bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-[#7C3AED] transition-colors"
        />
        <button
          onClick={() => onChange(Math.min(max, value + (unit === 'kcal' ? 50 : 5)))}
          className="w-8 h-8 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] hover:border-[#7C3AED] flex items-center justify-center transition-colors text-lg leading-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const { goals, setGoals } = useGoalsStore();
  const [localGoals, setLocalGoals] = useState<Goals>({ ...goals });
  const [saved, setSaved] = useState(false);

  const applyPreset = (preset: GoalPreset) => {
    setLocalGoals(GOAL_PRESETS[preset]);
    setSaved(false);
  };

  const handleSave = () => {
    setGoals(localGoals);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateGoal = (key: keyof Goals, value: number) => {
    setLocalGoals((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const goalInputs: Array<{
    key: keyof Goals;
    label: string;
    unit: string;
    color: string;
    max: number;
  }> = [
    { key: 'calories', label: 'Calories', unit: 'kcal', color: '#EC4899', max: 5000 },
    { key: 'protein', label: 'Protein', unit: 'grams per day', color: '#7C3AED', max: 400 },
    { key: 'carbs', label: 'Carbohydrates', unit: 'grams per day', color: '#A78BFA', max: 600 },
    { key: 'fat', label: 'Fat', unit: 'grams per day', color: '#06B6D4', max: 300 },
  ];

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader
        title="Goals"
        subtitle="Set your daily nutrition targets"
      />

      {/* Presets */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-3">
          Quick Presets
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(PRESET_META) as [GoalPreset, typeof PRESET_META[GoalPreset]][]).map(
            ([key, meta]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="bg-[#1A1A2E] border border-[#2d1f5e] hover:border-[#7C3AED]/60 rounded-2xl p-3 text-left transition-all hover:bg-[#2d1f5e]/30 group"
              >
                <span className="text-xl block mb-1.5">{meta.icon}</span>
                <p className="text-xs font-semibold text-white group-hover:text-[#A78BFA] transition-colors">
                  {meta.label}
                </p>
                <p className="text-[10px] text-[#6B6B8A] mt-0.5 leading-tight">
                  {meta.description}
                </p>
              </button>
            )
          )}
        </div>
      </div>

      {/* Manual inputs */}
      <Card className="mb-5">
        <h2 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-1">
          Custom Targets
        </h2>
        {goalInputs.map((input) => (
          <GoalInput
            key={input.key}
            label={input.label}
            value={localGoals[input.key]}
            unit={input.unit}
            color={input.color}
            max={input.max}
            onChange={(v) => updateGoal(input.key, v)}
          />
        ))}
      </Card>

      {/* Macro ratio preview */}
      <Card className="mb-5">
        <h2 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-3">
          Macro Split
        </h2>
        {(() => {
          const proteinCal = localGoals.protein * 4;
          const carbsCal = localGoals.carbs * 4;
          const fatCal = localGoals.fat * 9;
          const total = proteinCal + carbsCal + fatCal;
          const macros = [
            { label: 'P', cal: proteinCal, color: '#7C3AED' },
            { label: 'C', cal: carbsCal, color: '#A78BFA' },
            { label: 'F', cal: fatCal, color: '#06B6D4' },
          ];
          return (
            <div className="space-y-2">
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                {macros.map((m) => (
                  <div
                    key={m.label}
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${total > 0 ? (m.cal / total) * 100 : 33}%`,
                      background: m.color,
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                {macros.map((m) => (
                  <div key={m.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                    <span className="text-xs text-[#6B6B8A]">
                      {m.label} {total > 0 ? Math.round((m.cal / total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Save button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleSave}
        disabled={saved}
      >
        {saved ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Goals Saved!
          </>
        ) : (
          'Save Goals'
        )}
      </Button>

      <p className="text-center text-xs text-[#6B6B8A] mt-3">
        Goals are stored locally on your device
      </p>
    </main>
  );
}
