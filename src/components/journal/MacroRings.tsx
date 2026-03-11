'use client';

const R = 26;
const CIRC = 2 * Math.PI * R;

interface RingProps {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
}

function Ring({ label, value, goal, unit, color }: RingProps) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const isOver = goal > 0 && value > goal;
  const fill = isOver ? '#EF4444' : color;
  const dash = pct * CIRC;
  const displayVal = value > 9999 ? `${Math.round(value / 100) / 10}k` : Math.round(value);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="32" cy="32" r={R} fill="none" stroke="#2d1f5e" strokeWidth="5" />
          {/* Progress */}
          <circle
            cx="32" cy="32" r={R}
            fill="none"
            stroke={fill}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold leading-none" style={{ color: isOver ? '#EF4444' : 'white' }}>
            {displayVal}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{label}</p>
        <p className="text-[9px] text-[#6B6B8A]">{goal}{unit}</p>
      </div>
    </div>
  );
}

interface MacroRingsProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goals: { calories: number; protein: number; carbs: number; fat: number };
}

export function MacroRings({ calories, protein, carbs, fat, goals }: MacroRingsProps) {
  return (
    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl px-4 py-4 mb-4">
      <div className="flex items-start justify-around">
        <Ring label="kcal" value={calories}            goal={goals.calories} unit=""  color="#EC4899" />
        <Ring label="prot." value={Math.round(protein)} goal={goals.protein}  unit="g" color="#7C3AED" />
        <Ring label="gluc." value={Math.round(carbs)}   goal={goals.carbs}   unit="g" color="#A78BFA" />
        <Ring label="lip."  value={Math.round(fat)}     goal={goals.fat}     unit="g" color="#06B6D4" />
      </div>
    </div>
  );
}
