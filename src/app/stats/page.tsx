'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useGoalsStore } from '@/store/goalsStore';
import { MACRO_COLORS } from '@/lib/nutritionCalc';

type Period = 7 | 30 | 90;
type ChartMetric = 'calories' | 'protein' | 'carbs' | 'fat';

interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface TopFood {
  name: string;
  count: number;
  avgCalories: number;
}

interface StatsData {
  daily: DailyData[];
  mealBreakdown: Record<string, number>;
  topFoods: TopFood[];
  averages: { calories: number; protein: number; carbs: number; fat: number };
  loggedDays: number;
  totalDays: number;
  currentStreak: number;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collations',
};
const MEAL_COLORS = ['#7C3AED', '#A78BFA', '#06B6D4', '#F59E0B'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const METRIC_CONFIG = {
  calories: { label: 'Kcal',  shortLabel: 'Kcal',   unit: 'kcal', color: MACRO_COLORS.calories },
  protein:  { label: 'Prot.', shortLabel: 'Prot.',   unit: 'g',    color: MACRO_COLORS.protein  },
  carbs:    { label: 'Gluc.', shortLabel: 'Gluc.',   unit: 'g',    color: MACRO_COLORS.carbs    },
  fat:      { label: 'Lip.',  shortLabel: 'Lip.',    unit: 'g',    color: MACRO_COLORS.fat      },
} as const;

export default function StatsPage() {
  const router = useRouter();
  const { goals, loadGoals } = useGoalsStore();
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('calories');

  useEffect(() => { loadGoals(); }, [loadGoals]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/stats/nutrition?days=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  // Goal adherence: count logged days where each macro is within target
  const loggedDays = data?.daily.filter((d) => d.calories > 0) ?? [];
  const adherence = {
    calories: loggedDays.filter((d) => d.calories >= goals.calories * 0.85 && d.calories <= goals.calories * 1.15).length,
    protein:  loggedDays.filter((d) => d.protein  >= goals.protein  * 0.9).length,
    carbs:    loggedDays.filter((d) => d.carbs    >= goals.carbs    * 0.85).length,
    fat:      loggedDays.filter((d) => d.fat      <= goals.fat      * 1.15).length,
  };

  // Chart data: format x-axis labels
  const chartData = data?.daily.map((d) => {
    const date = new Date(d.date + 'T12:00:00');
    return {
      ...d,
      label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    };
  }) ?? [];

  const totalMealCals = data
    ? MEAL_TYPES.reduce((s, t) => s + (data.mealBreakdown[t] ?? 0), 0)
    : 0;

  const tickInterval = period === 7 ? 0 : period === 30 ? 6 : 14;

  // Current metric config + derived values
  const mc = METRIC_CONFIG[chartMetric];
  const goalForMetric = goals[chartMetric];
  const avgForMetric = data?.averages[chartMetric] ?? 0;

  return (
    <main className="px-4 pt-6 pb-28 md:pb-10 md:pt-20 max-w-lg md:max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA] shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight">Statistiques</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-5">
        {([7, 30, 90] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              period === p
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#1A1A2E] border border-[#2d1f5e] text-[#6B6B8A] hover:text-white'
            }`}
          >
            {p}j
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Trend chart ── */}
          <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
            {/* Chart header: title + metric toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider">Tendance</h2>
              <div className="flex gap-1">
                {(Object.keys(METRIC_CONFIG) as ChartMetric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      chartMetric === m
                        ? 'text-white'
                        : 'text-[#6B6B8A] hover:text-white'
                    }`}
                    style={chartMetric === m ? { background: mc.color + '33', color: mc.color } : {}}
                  >
                    {METRIC_CONFIG[m].label}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={mc.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={mc.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6B6B8A', fontSize: 10 }}
                  interval={tickInterval}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1A1A2E', border: '1px solid #2d1f5e', borderRadius: 8, padding: '6px 10px' }}
                  labelStyle={{ color: '#A78BFA', fontSize: 11, marginBottom: 2 }}
                  itemStyle={{ color: '#fff', fontSize: 12 }}
                  formatter={(v: number | undefined) => [
                    `${chartMetric === 'calories' ? Math.round(v ?? 0) : Math.round((v ?? 0) * 10) / 10} ${mc.unit}`,
                    mc.label,
                  ]}
                />
                {goalForMetric > 0 && (
                  <ReferenceLine y={goalForMetric} stroke={mc.color} strokeDasharray="4 4" strokeOpacity={0.45} />
                )}
                <Area
                  key={chartMetric}
                  type="monotone"
                  dataKey={chartMetric}
                  stroke={mc.color}
                  strokeWidth={2}
                  fill="url(#metricGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: mc.color }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Summary stats under chart */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2d1f5e]">
              <div>
                <p className="text-xl font-bold text-white leading-tight">{data.currentStreak}</p>
                <p className="text-[10px] text-[#6B6B8A] mt-0.5">jours consécutifs</p>
              </div>
              <div className="border-l border-[#2d1f5e] pl-4">
                <p className="text-xl font-bold text-white leading-tight">
                  {data.loggedDays}
                  <span className="text-sm text-[#6B6B8A] font-normal">/{data.totalDays}j</span>
                </p>
                <p className="text-[10px] text-[#6B6B8A] mt-0.5">jours enregistrés</p>
              </div>
              <div className="border-l border-[#2d1f5e] pl-4">
                <p className="text-xl font-bold text-white leading-tight">
                  {chartMetric === 'calories' ? Math.round(avgForMetric) : Math.round(avgForMetric * 10) / 10}
                </p>
                <p className="text-[10px] text-[#6B6B8A] mt-0.5">
                  {mc.unit} / jour moy.
                </p>
              </div>
            </div>
          </div>

          {/* ── Goal adherence ── */}
          {data.loggedDays > 0 && (
            <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
              <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Objectifs atteints
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { label: 'Calories', key: 'calories' as const, color: MACRO_COLORS.calories, note: '±15%' },
                    { label: 'Protéines', key: 'protein' as const, color: MACRO_COLORS.protein,  note: '≥90%' },
                    { label: 'Glucides',  key: 'carbs'   as const, color: MACRO_COLORS.carbs,    note: '±15%' },
                    { label: 'Lipides',   key: 'fat'     as const, color: MACRO_COLORS.fat,      note: '≤115%' },
                  ] as const
                ).map(({ label, key, color, note }) => {
                  const count = adherence[key];
                  const pct = data.loggedDays > 0 ? Math.round((count / data.loggedDays) * 100) : 0;
                  return (
                    <div key={key} className="bg-[#0F0F1A] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#6B6B8A]">{label}</span>
                        <span className="text-[10px] text-[#6B6B8A]">{note}</span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-lg font-bold text-white">{count}</span>
                        <span className="text-xs text-[#6B6B8A]">/{data.loggedDays}j</span>
                        <span className="ml-auto text-sm font-bold" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#2d1f5e] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Averages vs goals ── */}
          {data.loggedDays > 0 && (
            <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
              <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Moyennes vs objectifs
              </h2>
              <div className="space-y-4">
                {(
                  [
                    { label: 'Calories',  avg: data.averages.calories, goal: goals.calories, unit: 'kcal', color: MACRO_COLORS.calories },
                    { label: 'Protéines', avg: data.averages.protein,  goal: goals.protein,  unit: 'g',    color: MACRO_COLORS.protein  },
                    { label: 'Glucides',  avg: data.averages.carbs,    goal: goals.carbs,    unit: 'g',    color: MACRO_COLORS.carbs    },
                    { label: 'Lipides',   avg: data.averages.fat,      goal: goals.fat,      unit: 'g',    color: MACRO_COLORS.fat      },
                  ] as const
                ).map(({ label, avg, goal, unit, color }) => {
                  const pct = goal > 0 ? (avg / goal) * 100 : 0;
                  const diff = avg - goal;
                  const isOver  = pct > 110;
                  const isClose = pct >= 90 && pct <= 110;
                  const barColor  = isOver ? '#f59e0b' : isClose ? '#10b981' : color;
                  const diffColor = isOver ? '#f59e0b' : isClose ? '#10b981' : '#ef4444';
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-white">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: diffColor }}>
                            {diff > 0 ? '+' : ''}{unit === 'kcal' ? Math.round(diff) : Math.round(diff * 10) / 10}{unit}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {unit === 'kcal' ? Math.round(avg) : Math.round(avg * 10) / 10}
                            <span className="text-xs text-[#6B6B8A] font-normal">/{goal}{unit}</span>
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#2d1f5e] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Meal type breakdown ── */}
          {totalMealCals > 0 && (
            <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
              <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Répartition par repas
              </h2>
              <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-px">
                {MEAL_TYPES.map((type, i) => {
                  const cals = data.mealBreakdown[type] ?? 0;
                  const pct  = (cals / totalMealCals) * 100;
                  return pct > 0.5 ? (
                    <div key={type} style={{ width: `${pct}%`, background: MEAL_COLORS[i] }} />
                  ) : null;
                })}
              </div>
              <div className="space-y-2.5">
                {MEAL_TYPES.map((type, i) => {
                  const cals = data.mealBreakdown[type] ?? 0;
                  const pct  = totalMealCals > 0 ? Math.round((cals / totalMealCals) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MEAL_COLORS[i] }} />
                      <span className="text-sm text-[#A78BFA] flex-1">{MEAL_LABELS[type]}</span>
                      <span className="text-sm font-semibold text-white">{Math.round(cals)} kcal</span>
                      <span className="text-xs text-[#6B6B8A] w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top 5 aliments ── */}
          {data.topFoods.length > 0 && (
            <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
              <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-3">
                Top aliments
              </h2>
              <div className="space-y-2">
                {data.topFoods.map((food, i) => (
                  <div key={food.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#6B6B8A] w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm text-white flex-1 truncate">{food.name}</span>
                    <span className="text-xs text-[#6B6B8A] shrink-0">
                      ×{food.count}
                    </span>
                    <span className="text-xs font-semibold text-[#A78BFA] shrink-0 w-16 text-right">
                      ~{food.avgCalories} kcal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state if nothing logged */}
          {data.loggedDays === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-white font-semibold">Aucun repas enregistré</p>
              <p className="text-[#6B6B8A] text-sm mt-1">
                Commence à enregistrer tes repas pour voir les statistiques.
              </p>
            </div>
          )}
        </>
      )}

      {!loading && !data && (
        <div className="text-center py-20">
          <p className="text-white font-semibold">Erreur de chargement</p>
          <p className="text-[#6B6B8A] text-sm mt-1">Réessaie plus tard.</p>
        </div>
      )}
    </main>
  );
}
