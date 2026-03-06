'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { useGoalsStore } from '@/store/goalsStore';
import { type Goals, type GoalPreset } from '@/types';

// ─── Mifflin-St Jeor ─────────────────────────────────────────────────────────

const ACTIVITY_LEVELS = [
  { label: 'Sédentaire', description: '0h / semaine', multiplier: 1.2 },
  { label: 'Légèrement actif', description: '1–3h / semaine', multiplier: 1.375 },
  { label: 'Modérément actif', description: '3–5h / semaine', multiplier: 1.55 },
  { label: 'Très actif', description: '5–7h / semaine', multiplier: 1.725 },
  { label: 'Extrêmement actif', description: '7h+ / semaine', multiplier: 1.9 },
];

function calcMifflin(
  sex: 'male' | 'female',
  age: number,
  weightKg: number,
  heightCm: number,
  activityMultiplier: number
): { bmr: number; tdee: number } {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = Math.round(sex === 'male' ? base + 5 : base - 161);
  const tdee = Math.round(bmr * activityMultiplier);
  return { bmr, tdee };
}

function tdeeToGoals(tdee: number, weightKg: number, mode: GoalPreset, intensityPct = 12.5): Goals {
  const calories =
    mode === 'weightLoss' ? Math.round(tdee * (1 - intensityPct / 100)) :
    mode === 'muscleGain' ? Math.round(tdee * (1 + intensityPct / 100)) :
    tdee;
  const protein = Math.round(
    weightKg * (mode === 'muscleGain' ? 2.3 : mode === 'weightLoss' ? 2.2 : 2.0)
  );
  const fat = Math.round((calories * 0.28) / 9);
  const carbCal = calories - protein * 4 - fat * 9;
  const carbs = Math.round(Math.max(0, carbCal) / 4);
  return { calories, protein, carbs, fat };
}

interface TdeeContext { tdee: number; weight: number }

const INTENSITY_LEVELS = [
  { label: 'Léger', pct: 10, description: '±10%' },
  { label: 'Modéré', pct: 12.5, description: '±12.5%' },
  { label: 'Intense', pct: 15, description: '±15%' },
];

interface IntensityState { preset: 'weightLoss' | 'muscleGain'; pct: number }

const LS_KEY = 'mifflin_last';
interface MifflinSaved { sex: 'male' | 'female'; age: string; weight: string; height: string; activityIdx: number }

function loadSaved(): Partial<MifflinSaved> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function MifflinCalculator({
  onApply,
  onCalculated,
}: {
  onApply: (goals: Goals) => void;
  onCalculated: (ctx: TdeeContext) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [ageStr, setAgeStr] = useState('25');
  const [weightStr, setWeightStr] = useState('75');
  const [heightStr, setHeightStr] = useState('175');
  const [activityIdx, setActivityIdx] = useState(1);
  const [source, setSource] = useState<'body' | 'saved' | null>(null);

  // Load from localStorage + latest body measurement on open
  useEffect(() => {
    if (!open) return;
    const saved = loadSaved();
    // Apply saved values first
    if (saved.sex) setSex(saved.sex);
    if (saved.age) setAgeStr(saved.age);
    if (saved.activityIdx !== undefined) setActivityIdx(saved.activityIdx);

    // Fetch latest body measurement for weight + height
    fetch('/api/body').then((r) => r.json()).then((measurements: Array<{ weight: number; height?: number }>) => {
      if (!Array.isArray(measurements) || measurements.length === 0) {
        // No body data — fall back to saved weight/height
        if (saved.weight) setWeightStr(saved.weight);
        if (saved.height) setHeightStr(saved.height);
        return;
      }
      const latest = measurements[measurements.length - 1];
      const latestHeight = [...measurements].reverse().find((m) => m.height != null)?.height;
      setWeightStr(String(latest.weight));
      if (latestHeight) setHeightStr(String(latestHeight));
      setSource('body');
    }).catch(() => {
      if (saved.weight) setWeightStr(saved.weight);
      if (saved.height) setHeightStr(saved.height);
    });
  }, [open]);
  const [result, setResult] = useState<{ bmr: number; tdee: number } | null>(null);
  const [error, setError] = useState('');

  const calculate = () => {
    const age = parseFloat(ageStr);
    const weight = parseFloat(weightStr);
    const height = parseFloat(heightStr);
    if (isNaN(age) || age < 10 || age > 120) { setError('Âge invalide (10–120)'); return; }
    if (isNaN(weight) || weight < 20 || weight > 300) { setError('Poids invalide (20–300 kg)'); return; }
    if (isNaN(height) || height < 100 || height > 250) { setError('Taille invalide (100–250 cm)'); return; }
    setError('');
    // Save to localStorage for next session
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ sex, age: ageStr, weight: weightStr, height: heightStr, activityIdx }));
    } catch { /* ignore */ }
    const r = calcMifflin(sex, age, weight, height, ACTIVITY_LEVELS[activityIdx].multiplier);
    setResult(r);
    onCalculated({ tdee: r.tdee, weight });
  };

  const apply = () => {
    if (!result) return;
    onApply(tdeeToGoals(result.tdee, parseFloat(weightStr), 'maintenance'));
    setOpen(false);
    setResult(null);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-[#1A1A2E] border border-[#2d1f5e] hover:border-[#7C3AED]/60 rounded-2xl px-4 py-3.5 transition-all group"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🧮</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white group-hover:text-[#A78BFA] transition-colors">
              Calculer ma maintenance
            </p>
            <p className="text-xs text-[#6B6B8A] mt-0.5">Formule Mifflin-St Jeor</p>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && source === 'body' && (
        <p className="mt-2 text-[10px] text-[#7C3AED] text-center">
          Poids et taille pré-remplis depuis ta dernière mesure corporelle
        </p>
      )}

      {open && (
        <div className="mt-2 bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 space-y-4">
          {/* Sex */}
          <div>
            <p className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-2">Sexe</p>
            <div className="flex gap-2">
              {(['male', 'female'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={[
                    'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                    sex === s
                      ? 'bg-[#7C3AED] text-white'
                      : 'bg-[#0F0F1A] border border-[#2d1f5e] text-[#6B6B8A] hover:border-[#7C3AED]/60',
                  ].join(' ')}
                >
                  {s === 'male' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
          </div>

          {/* Age / Weight / Height — free text inputs */}
          {[
            { label: 'Âge', unit: 'ans', value: ageStr, set: setAgeStr, placeholder: '25' },
            { label: 'Poids', unit: 'kg', value: weightStr, set: setWeightStr, placeholder: '75' },
            { label: 'Taille', unit: 'cm', value: heightStr, set: setHeightStr, placeholder: '175' },
          ].map(({ label, unit, value, set, placeholder }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-2">{label}</p>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => { set(e.target.value); setResult(null); setError(''); }}
                  placeholder={placeholder}
                  className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#7C3AED] transition-colors pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#6B6B8A] pointer-events-none">
                  {unit}
                </span>
              </div>
            </div>
          ))}

          {/* Activity level */}
          <div>
            <p className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-2">Activité physique</p>
            <div className="space-y-1.5">
              {ACTIVITY_LEVELS.map((level, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActivityIdx(idx); setResult(null); }}
                  className={[
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all',
                    activityIdx === idx
                      ? 'bg-[#7C3AED]/20 border border-[#7C3AED]/50'
                      : 'bg-[#0F0F1A] border border-[#2d1f5e] hover:border-[#7C3AED]/30',
                  ].join(' ')}
                >
                  <div>
                    <p className={`text-xs font-semibold ${activityIdx === idx ? 'text-[#A78BFA]' : 'text-white'}`}>
                      {level.label}
                    </p>
                    <p className="text-[10px] text-[#6B6B8A] mt-0.5">{level.description}</p>
                  </div>
                  {activityIdx === idx && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={calculate}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            Calculer
          </button>

          {result && (
            <div className="bg-[#0F0F1A] rounded-xl p-4 text-center border border-[#7C3AED]/30">
              <p className="text-xs text-[#6B6B8A] mb-1">Métabolisme de base (BMR)</p>
              <p className="text-lg font-bold text-white">{result.bmr} <span className="text-sm font-normal text-[#6B6B8A]">kcal</span></p>
              <div className="my-3 border-t border-[#2d1f5e]" />
              <p className="text-xs text-[#6B6B8A] mb-1">Dépense totale — maintenance (TDEE)</p>
              <p className="text-2xl font-bold text-[#A78BFA]">{result.tdee} <span className="text-sm font-normal text-[#6B6B8A]">kcal / jour</span></p>
              <p className="text-[10px] text-[#6B6B8A] mt-2">
                Les presets s&apos;ajustent automatiquement à cette valeur
              </p>
              <button
                onClick={apply}
                className="mt-3 w-full bg-[#1A1A2E] border border-[#7C3AED]/50 hover:bg-[#7C3AED]/20 text-[#A78BFA] font-semibold rounded-xl py-2.5 text-sm transition-all"
              >
                Appliquer maintenance
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESET_META: Record<GoalPreset, { label: string; description: string; icon: string }> = {
  weightLoss: { label: 'Sèche', description: 'Déficit calorique', icon: '📉' },
  maintenance: { label: 'Maintenance', description: 'Macros équilibrées', icon: '⚖️' },
  muscleGain: { label: 'Prise de masse', description: 'Surplus calorique', icon: '💪' },
};

const FALLBACK_PRESETS: Record<GoalPreset, Goals> = {
  weightLoss: { calories: 1600, protein: 130, carbs: 150, fat: 55 },
  maintenance: { calories: 2000, protein: 100, carbs: 250, fat: 65 },
  muscleGain: { calories: 2500, protein: 180, carbs: 300, fat: 70 },
};

// ─── GoalInput ────────────────────────────────────────────────────────────────

function GoalInput({
  label, value, unit, color, onChange, step = 5,
}: {
  label: string; value: number; unit: string; color: string; onChange: (v: number) => void; step?: number;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => { setRaw(String(value)); }, [value]);

  const commit = (str: string) => {
    const n = parseFloat(str);
    if (!isNaN(n) && n >= 0) onChange(Math.round(n));
    else setRaw(String(value));
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#2d1f5e]/40 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs" style={{ color }}>{unit}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { const v = Math.max(0, value - step); onChange(v); setRaw(String(v)); }}
          className="w-8 h-8 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] hover:border-[#7C3AED] flex items-center justify-center transition-colors text-lg leading-none"
        >−</button>
        <input
          type="number"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }}
          className="w-20 bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-[#7C3AED] transition-colors"
        />
        <button
          onClick={() => { const v = value + step; onChange(v); setRaw(String(v)); }}
          className="w-8 h-8 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] hover:border-[#7C3AED] flex items-center justify-center transition-colors text-lg leading-none"
        >+</button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { goals, setGoals, loadGoals } = useGoalsStore();
  const [localGoals, setLocalGoals] = useState<Goals>({ ...goals });
  const [saved, setSaved] = useState(false);
  const [tdeeCtx, setTdeeCtx] = useState<TdeeContext | null>(null);
  const [intensityState, setIntensityState] = useState<IntensityState | null>(null);

  useEffect(() => { loadGoals(); }, [loadGoals]);
  useEffect(() => { setLocalGoals({ ...goals }); }, [goals]);

  const applyPreset = (preset: GoalPreset) => {
    if ((preset === 'weightLoss' || preset === 'muscleGain') && tdeeCtx) {
      setIntensityState({ preset, pct: 12.5 });
      return;
    }
    const g = tdeeCtx
      ? tdeeToGoals(tdeeCtx.tdee, tdeeCtx.weight, preset)
      : FALLBACK_PRESETS[preset];
    setLocalGoals(g);
    setSaved(false);
  };

  const confirmIntensity = () => {
    if (!intensityState || !tdeeCtx) return;
    setLocalGoals(tdeeToGoals(tdeeCtx.tdee, tdeeCtx.weight, intensityState.preset, intensityState.pct));
    setSaved(false);
    setIntensityState(null);
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

  const goalInputs: Array<{ key: keyof Goals; label: string; unit: string; color: string; step: number }> = [
    { key: 'calories', label: 'Calories', unit: 'kcal / jour', color: '#EC4899', step: 50 },
    { key: 'protein', label: 'Protéines', unit: 'grammes / jour', color: '#7C3AED', step: 5 },
    { key: 'carbs', label: 'Glucides', unit: 'grammes / jour', color: '#A78BFA', step: 5 },
    { key: 'fat', label: 'Lipides', unit: 'grammes / jour', color: '#06B6D4', step: 5 },
  ];

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Objectifs" subtitle="Définis tes cibles nutritionnelles" />

      <MifflinCalculator
        onApply={(g) => { setLocalGoals(g); setSaved(false); }}
        onCalculated={(ctx) => setTdeeCtx(ctx)}
      />

      {/* Presets */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider">Presets</h2>
          {tdeeCtx && (
            <span className="text-[10px] text-[#7C3AED] font-medium">Basé sur {tdeeCtx.tdee} kcal</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(PRESET_META) as [GoalPreset, typeof PRESET_META[GoalPreset]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={[
                'border rounded-2xl p-3 text-left transition-all group',
                intensityState?.preset === key
                  ? 'bg-[#7C3AED]/20 border-[#7C3AED]/60'
                  : 'bg-[#1A1A2E] border-[#2d1f5e] hover:border-[#7C3AED]/60 hover:bg-[#2d1f5e]/30',
              ].join(' ')}
            >
              <span className="text-xl block mb-1.5">{meta.icon}</span>
              <p className="text-xs font-semibold text-white group-hover:text-[#A78BFA] transition-colors">{meta.label}</p>
              <p className="text-[10px] text-[#6B6B8A] mt-0.5 leading-tight">{meta.description}</p>
            </button>
          ))}
        </div>

        {/* Intensity selector — shown when weightLoss or muscleGain is selected with TDEE */}
        {intensityState && tdeeCtx && (
          <div className="mt-3 bg-[#1A1A2E] border border-[#7C3AED]/30 rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-3">
              {intensityState.preset === 'weightLoss' ? 'Intensité du déficit' : 'Intensité du surplus'}
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {INTENSITY_LEVELS.map((lvl) => {
                const kcal = intensityState.preset === 'weightLoss'
                  ? Math.round(tdeeCtx.tdee * (1 - lvl.pct / 100))
                  : Math.round(tdeeCtx.tdee * (1 + lvl.pct / 100));
                const delta = intensityState.preset === 'weightLoss'
                  ? -Math.round(tdeeCtx.tdee * lvl.pct / 100)
                  : +Math.round(tdeeCtx.tdee * lvl.pct / 100);
                return (
                  <button
                    key={lvl.pct}
                    onClick={() => setIntensityState((s) => s ? { ...s, pct: lvl.pct } : s)}
                    className={[
                      'rounded-xl py-2.5 px-1 text-center transition-all border',
                      intensityState.pct === lvl.pct
                        ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                        : 'bg-[#0F0F1A] border-[#2d1f5e] text-[#6B6B8A] hover:border-[#7C3AED]/50',
                    ].join(' ')}
                  >
                    <p className="text-xs font-semibold">{lvl.label}</p>
                    <p className="text-[10px] mt-0.5">{lvl.description}</p>
                    <p className={`text-[10px] font-bold mt-1 ${intensityState.pct === lvl.pct ? 'text-white/80' : 'text-[#A78BFA]'}`}>
                      {delta > 0 ? '+' : ''}{delta} kcal
                    </p>
                    <p className={`text-[10px] ${intensityState.pct === lvl.pct ? 'text-white/60' : 'text-[#6B6B8A]'}`}>
                      = {kcal} kcal/j
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIntensityState(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#0F0F1A] border border-[#2d1f5e] text-[#6B6B8A] hover:border-[#7C3AED]/40 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={confirmIntensity}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual inputs */}
      <Card className="mb-5">
        <h2 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-1">Cibles personnalisées</h2>
        {goalInputs.map((input) => (
          <GoalInput
            key={input.key}
            label={input.label}
            value={localGoals[input.key]}
            unit={input.unit}
            color={input.color}
            step={input.step}
            onChange={(v) => updateGoal(input.key, v)}
          />
        ))}
      </Card>

      {/* Macro split */}
      <Card className="mb-5">
        <h2 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-3">Répartition des macros</h2>
        {(() => {
          const proteinCal = localGoals.protein * 4;
          const carbsCal = localGoals.carbs * 4;
          const fatCal = localGoals.fat * 9;
          const total = proteinCal + carbsCal + fatCal;
          const macros = [
            { label: 'Prot', cal: proteinCal, color: '#7C3AED' },
            { label: 'Gluc', cal: carbsCal, color: '#A78BFA' },
            { label: 'Lip', cal: fatCal, color: '#06B6D4' },
          ];
          return (
            <div className="space-y-2">
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                {macros.map((m) => (
                  <div
                    key={m.label}
                    className="h-full transition-all duration-300"
                    style={{ width: `${total > 0 ? (m.cal / total) * 100 : 33}%`, background: m.color }}
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

      <Button variant="primary" size="lg" fullWidth onClick={handleSave} disabled={saved}>
        {saved ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Objectifs sauvegardés !
          </>
        ) : (
          'Sauvegarder les objectifs'
        )}
      </Button>

      <p className="text-center text-xs text-[#6B6B8A] mt-3">Synchronisé avec votre compte</p>
    </main>
  );
}
