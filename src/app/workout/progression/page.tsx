'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WorkoutSession } from '@/types';

// ─── Data helpers ──────────────────────────────────────────────────────────────

function parseWeight(w: string | null): number | null {
  if (!w || w === 'À vide') return null;
  const v = parseFloat(w.split('-')[0]);
  return isNaN(v) ? null : v;
}

function parseReps(r: string | null): number {
  if (!r) return 0;
  const v = parseInt(r.split('-')[0]);
  return isNaN(v) ? 0 : v;
}

interface DataPoint {
  date: string;
  dateLabel: string;
  maxWeight: number;
  totalVolume: number;
  setsCount: number;
}

function getProgressionData(sessions: WorkoutSession[], exerciseName: string): DataPoint[] {
  return sessions
    .filter(
      (s) =>
        s.completedAt &&
        s.exercises.some((e) => e.name.toLowerCase() === exerciseName.toLowerCase())
    )
    .map((s) => {
      const exercise = s.exercises.find(
        (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
      )!;
      // Use all sets regardless of done state — weights entered count for progression
      const sets = exercise.sets;

      let maxWeight = 0;
      let totalVolume = 0;

      for (const set of sets) {
        const w = parseWeight(set.weight);
        const r = parseReps(set.reps);
        if (w !== null) {
          if (w > maxWeight) maxWeight = w;
          totalVolume += w * r;
        }
      }

      const dateLabel = new Date(s.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });

      return { date: s.date, dateLabel, maxWeight, totalVolume: Math.round(totalVolume), setsCount: sets.length };
    })
    // Keep the session as long as there were sets (covers bodyweight "À vide" too)
    .filter((d) => d.setsCount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getAllExercises(sessions: WorkoutSession[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completedAt) continue;
    for (const e of s.exercises) {
      counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  metric: 'weight' | 'volume';
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[#A78BFA] font-semibold text-[11px] mb-0.5">{label}</p>
      <p className="text-white font-bold text-sm">
        {metric === 'weight' ? `${value} kg` : `${value} kg·rép`}
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProgressionPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<'weight' | 'volume'>('weight');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/workout')
      .then((r) => r.json())
      .then((s) => {
        setSessions(s);
        setLoading(false);
      });
  }, []);

  const exercises = useMemo(() => getAllExercises(sessions), [sessions]);

  const filtered = useMemo(
    () =>
      search
        ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
        : exercises,
    [exercises, search]
  );

  const data = useMemo(
    () => (selected ? getProgressionData(sessions, selected) : []),
    [sessions, selected]
  );

  const pr = data.length ? Math.max(...data.map((d) => d.maxWeight)) : 0;
  const progression =
    data.length >= 2
      ? ((data[data.length - 1].maxWeight - data[0].maxWeight) / (data[0].maxWeight || 1)) * 100
      : null;

  const yKey = metric === 'weight' ? 'maxWeight' : 'totalVolume';
  const yUnit = metric === 'weight' ? ' kg' : '';

  return (
    <main className="min-h-screen bg-[#0F0F1A] pb-32 pt-6 px-4">
      <div className="max-w-lg md:max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/workout"
            className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA] shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Progression</h1>
            <p className="text-[#6B6B8A] text-sm">Évolution de la force par exercice</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && exercises.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📈</div>
            <p className="text-white font-semibold text-lg">Pas encore de données</p>
            <p className="text-[#6B6B8A] text-sm mt-1 mb-6">
              Complète des séances pour voir ta progression
            </p>
            <Link
              href="/workout/new"
              className="inline-flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold"
            >
              Créer une séance
            </Link>
          </div>
        )}

        {!loading && exercises.length > 0 && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B8A]"
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher un exercice…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            {/* Exercise pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {filtered.slice(0, 20).map((ex) => (
                <button
                  key={ex.name}
                  onClick={() => setSelected(ex.name === selected ? null : ex.name)}
                  className={[
                    'px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
                    selected === ex.name
                      ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                      : 'bg-[#1A1A2E] border-[#2d1f5e] text-[#A78BFA] hover:border-[#7C3AED]/60',
                  ].join(' ')}
                >
                  {ex.name}
                  <span className="ml-1.5 text-[10px] opacity-60">{ex.count}</span>
                </button>
              ))}
            </div>

            {/* Placeholder when nothing selected */}
            {!selected && (
              <div className="text-center py-10 text-[#6B6B8A] text-sm">
                Sélectionne un exercice pour voir sa progression
              </div>
            )}

            {/* Chart card */}
            {selected && (
              <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white font-bold">{selected}</h2>
                    <p className="text-[#6B6B8A] text-xs mt-0.5">
                      {data.length} séance{data.length > 1 ? 's' : ''} avec données
                    </p>
                  </div>
                  {/* Metric toggle */}
                  <div className="flex bg-[#0F0F1A] rounded-xl p-1 gap-1">
                    {(['weight', 'volume'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMetric(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          metric === m ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A]'
                        }`}
                      >
                        {m === 'weight' ? 'Poids' : 'Volume'}
                      </button>
                    ))}
                  </div>
                </div>

                {data.length < 2 ? (
                  <div className="text-center py-10">
                    <p className="text-[#6B6B8A] text-sm">
                      {data.length === 0
                        ? 'Aucune série complétée pour cet exercice'
                        : 'Complète au moins 2 séances pour voir le graphe'}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d1f5e" vertical={false} />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fill: '#6B6B8A', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#6B6B8A', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        unit={yUnit}
                      />
                      <Tooltip content={<CustomTooltip metric={metric} />} />
                      <Area
                        type="monotone"
                        dataKey={yKey}
                        stroke="#7C3AED"
                        strokeWidth={2.5}
                        fill="url(#progressGrad)"
                        dot={{ fill: '#7C3AED', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#A78BFA', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-[#0F0F1A] rounded-xl p-2.5 text-center">
                    <p className="text-white font-bold text-sm">{pr > 0 ? `${pr} kg` : '—'}</p>
                    <p className="text-[10px] text-[#A78BFA] mt-0.5">Record</p>
                  </div>
                  <div className="bg-[#0F0F1A] rounded-xl p-2.5 text-center">
                    <p className="text-white font-bold text-sm">{data.length}</p>
                    <p className="text-[10px] text-[#A78BFA] mt-0.5">Séances</p>
                  </div>
                  <div className="bg-[#0F0F1A] rounded-xl p-2.5 text-center">
                    {progression !== null ? (
                      <>
                        <p className={`font-bold text-sm ${progression >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {progression >= 0 ? '+' : ''}{progression.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-[#A78BFA] mt-0.5">Progression</p>
                      </>
                    ) : (
                      <>
                        <p className="text-white font-bold text-sm">—</p>
                        <p className="text-[10px] text-[#A78BFA] mt-0.5">Progression</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
