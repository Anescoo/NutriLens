'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

import type { WorkoutSession, WorkoutExercise, WorkoutSet } from '@/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Set row ──────────────────────────────────────────────────────────────────

function SetRow({
  set,
  index,
  lastWeight,
  lastReps,
  bodyweight,
  onChange,
}: {
  set: WorkoutSet;
  index: number;
  lastWeight?: string | null;
  lastReps?: string | null;
  bodyweight?: boolean;
  onChange: (updated: WorkoutSet) => void;
}) {
  const hint =
    lastWeight != null && lastReps != null
      ? `${lastWeight}kg × ${lastReps}`
      : lastWeight != null
      ? `${lastWeight}kg`
      : null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
        set.done ? 'bg-emerald-500/10' : 'bg-[#0F0F1A]'
      }`}
    >
      {/* Series number */}
      <span
        className={`text-xs font-bold w-5 text-center shrink-0 ${
          set.isDropSet ? 'text-red-400' : 'text-[#6B6B8A]'
        }`}
      >
        {set.isDropSet ? '↓' : index + 1}
      </span>

      {/* Weight — accepts "80" or "80-60-50" for drop sets */}
      <div className="flex items-center gap-1 flex-1">
        {bodyweight ? (
          <div className="w-full border border-[#2d1f5e] rounded-lg px-2 py-1.5 text-[#A78BFA] text-sm text-center bg-transparent select-none">
            À vide
          </div>
        ) : (
          <input
            type="text"
            inputMode="text"
            value={set.weight != null ? String(set.weight) : ''}
            onChange={(e) => onChange({ ...set, weight: e.target.value || null })}
            placeholder={hint ? (lastWeight ?? '') : ''}
            className="w-full bg-transparent border border-[#2d1f5e] rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-[#7C3AED] placeholder-[#3a3a5c]"
          />
        )}
        <span className="text-[#6B6B8A] text-xs shrink-0">kg</span>
      </div>

      <span className="text-[#6B6B8A] text-xs shrink-0">×</span>

      {/* Reps */}
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={set.reps != null ? String(set.reps) : ''}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); onChange({ ...set, reps: v || null }); }}
          placeholder={hint ? (lastReps ?? '') : ''}
          className="w-full bg-transparent border border-[#2d1f5e] rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-[#7C3AED] placeholder-[#3a3a5c] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-[#6B6B8A] text-xs shrink-0">rép</span>
      </div>

      {/* Done checkbox */}
      <button
        onClick={() => onChange({ ...set, done: !set.done })}
        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
          set.done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-[#2d1f5e] text-transparent hover:border-[#7C3AED]'
        }`}
      >
        ✓
      </button>
    </div>
  );
}

// ─── Exercise block ───────────────────────────────────────────────────────────

function ExerciseBlock({
  exercise,
  prevSession,
  onChange,
}: {
  exercise: WorkoutExercise;
  prevSession?: WorkoutSession;
  // Receives a transform so the page can merge against the *latest* prev state
  onChange: (updater: (ex: WorkoutExercise) => WorkoutExercise) => void;
}) {
  const [bodyweight, setBodyweight] = useState(() =>
    exercise.sets.some((s) => s.weight === 'À vide')
  );

  const prevExercise = prevSession?.exercises.find(
    (e) => e.name.toLowerCase() === exercise.name.toLowerCase()
  );

  const doneSets = exercise.sets.filter((s) => s.done).length;
  const totalSets = exercise.sets.length;

  const groupColor =
    exercise.groupType === 'biset'
      ? 'border-violet-500/60'
      : exercise.groupType === 'superset'
      ? 'border-orange-500/60'
      : 'border-[#2d1f5e]';

  const groupBarColor =
    exercise.groupType === 'biset'
      ? 'bg-violet-500'
      : exercise.groupType === 'superset'
      ? 'bg-orange-500'
      : '';

  function updateSet(setIndex: number, updated: WorkoutSet) {
    // Pass a transform — the merge happens inside setSession(prev => …)
    // so it always reads the latest sets, never a stale prop snapshot
    onChange((ex) => {
      const sets = ex.sets.map((s, i) => (i === setIndex ? updated : s));
      return { ...ex, sets };
    });
  }

  return (
    <div className="relative">
      {exercise.groupId && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${groupBarColor}`} />
      )}
      <div className={`bg-[#1A1A2E] border ${groupColor} rounded-2xl overflow-hidden ${exercise.groupId ? 'ml-2' : ''}`}>
        {/* Exercise header */}
        <div className="px-4 py-3 border-b border-[#2d1f5e]/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {exercise.groupType && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                    exercise.groupType === 'biset'
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-orange-500/20 text-orange-300'
                  }`}
                >
                  {exercise.groupType === 'biset' ? 'Bi-set' : 'Superset'}
                </span>
              )}
              <h3 className="text-white font-bold truncate">{exercise.name}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const next = !bodyweight;
                  setBodyweight(next);
                  onChange((ex) => ({
                    ...ex,
                    sets: ex.sets.map((s) => ({
                      ...s,
                      weight: next ? 'À vide' : (s.weight === 'À vide' ? null : s.weight),
                    })),
                  }));
                }}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  bodyweight
                    ? 'bg-[#A78BFA]/20 border-[#A78BFA]/50 text-[#A78BFA]'
                    : 'border-[#2d1f5e] text-[#6B6B8A] hover:border-[#A78BFA]/40 hover:text-[#A78BFA]'
                }`}
              >
                À vide
              </button>
              <span className="text-xs text-[#6B6B8A]">
                {doneSets}/{totalSets} séries
              </span>
            </div>
          </div>
          {prevExercise && (
            <p className="text-[11px] text-[#6B6B8A] mt-1">
              Dernière séance :{' '}
              {prevExercise.sets
                .filter((s) => s.weight != null)
                .slice(0, 3)
                .map((s) => `${s.weight}kg×${s.reps}`)
                .join(' / ')}
            </p>
          )}
        </div>

        {/* Sets */}
        <div className="p-3 flex flex-col gap-1.5">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 mb-1">
            <span className="w-5" />
            <span className="flex-1 text-[10px] text-[#6B6B8A] text-center uppercase tracking-wider">
              Poids
            </span>
            <span className="w-3" />
            <span className="flex-1 text-[10px] text-[#6B6B8A] text-center uppercase tracking-wider">
              Rép.
            </span>
            <span className="w-7" />
          </div>

          {(() => {
            // Group sets: each main set followed by its drop sets
            const groups: Array<{ mainIdx: number; dropIdxs: number[] }> = [];
            let i = 0;
            while (i < exercise.sets.length) {
              if (!exercise.sets[i].isDropSet) {
                const group = { mainIdx: i, dropIdxs: [] as number[] };
                let j = i + 1;
                while (j < exercise.sets.length && exercise.sets[j].isDropSet) {
                  group.dropIdxs.push(j);
                  j++;
                }
                groups.push(group);
                i = j;
              } else {
                i++;
              }
            }

            return groups.map((group, gi) => (
              <div key={exercise.sets[group.mainIdx].id} className="flex flex-col gap-1">
                <SetRow
                  set={exercise.sets[group.mainIdx]}
                  index={gi}
                  lastWeight={prevExercise?.sets[group.mainIdx]?.weight}
                  lastReps={prevExercise?.sets[group.mainIdx]?.reps}
                  bodyweight={bodyweight}
                  onChange={(updated) => updateSet(group.mainIdx, updated)}
                />
                {group.dropIdxs.length > 0 && (
                  <div className="ml-4 flex flex-col gap-1 border-l-2 border-red-500/40 pl-2">
                    {group.dropIdxs.map((dropIdx, di) => (
                      <SetRow
                        key={exercise.sets[dropIdx].id}
                        set={exercise.sets[dropIdx]}
                        index={di}
                        lastWeight={prevExercise?.sets[dropIdx]?.weight}
                        lastReps={prevExercise?.sets[dropIdx]?.reps}
                        bodyweight={bodyweight}
                        onChange={(updated) => updateSet(dropIdx, updated)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkoutSessionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [prevSessions, setPrevSessions] = useState<Map<string, WorkoutSession>>(new Map());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Holds the latest saved snapshot so completeSession never reads stale state
  const latestRef = useRef<WorkoutSession | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/workout/' + id);
      if (!res.ok) { router.replace('/workout'); return; }
      const s: WorkoutSession = await res.json();
      if (!s) { router.replace('/workout'); return; }
      setSession(s);
      latestRef.current = s;

      const allRes = await fetch('/api/workout');
      const allSessions: WorkoutSession[] = allRes.ok ? await allRes.json() : [];
      const map = new Map<string, WorkoutSession>();
      for (const ex of s.exercises) {
        if (!map.has(ex.name)) {
          const prev = allSessions.find(
            (ws) => ws.id !== id && ws.exercises.some((e) => e.name.toLowerCase() === ex.name.toLowerCase())
          );
          if (prev) map.set(ex.name, prev);
        }
      }
      setPrevSessions(map);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function updateExercise(
    index: number,
    updater: (ex: WorkoutExercise) => WorkoutExercise
  ) {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((e, i) => (i === index ? updater(e) : e));
      const next = { ...prev, exercises };
      latestRef.current = next;
      fetch('/api/workout/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      return next;
    });
  }

  async function completeSession() {
    const current = latestRef.current;
    if (!current) return;
    setCompleting(true);
    const completed = { ...current, completedAt: Date.now() };
    await fetch('/api/workout/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completed),
    });
    router.push('/workout');
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!session) return null;

  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = session.exercises.reduce(
    (s, e) => s + e.sets.filter((set) => set.done).length,
    0
  );
  const progress = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;
  const isComplete = !!session.completedAt;

  // Group exercises by groupId for display ordering
  const exerciseGroups: WorkoutExercise[][] = [];
  const seen = new Set<string>();
  for (const ex of session.exercises) {
    if (ex.groupId && !seen.has(ex.groupId)) {
      seen.add(ex.groupId);
      exerciseGroups.push(session.exercises.filter((e) => e.groupId === ex.groupId));
    } else if (!ex.groupId) {
      exerciseGroups.push([ex]);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F0F1A] pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#0F0F1A]/90 backdrop-blur border-b border-[#2d1f5e]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/workout')}
              className="text-[#6B6B8A] hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold truncate">{session.name}</h1>
              <p className="text-[#6B6B8A] text-xs">{formatDate(session.date)}</p>
            </div>
            {isComplete && (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-semibold shrink-0">
                Terminée ✓
              </span>
            )}
          </div>

          {/* Progress bar */}
          {!isComplete && (
            <div className="mt-2.5">
              <div className="flex justify-between text-xs text-[#6B6B8A] mb-1">
                <span>{doneSets} / {totalSets} séries</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-[#2d1f5e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4">
        {exerciseGroups.map((group) => (
          <div key={group[0].id} className="flex flex-col gap-2">
            {group.map((ex) => {
              const exIndex = session.exercises.findIndex((e) => e.id === ex.id);
              return (
                <ExerciseBlock
                  key={ex.id}
                  exercise={ex}
                  prevSession={prevSessions.get(ex.name)}
                  onChange={(updater) => updateExercise(exIndex, updater)}
                />
              );
            })}
          </div>
        ))}

        {/* Complete button */}
        {!isComplete && (
          <button
            onClick={completeSession}
            disabled={completing}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {completing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Terminer la séance
              </>
            )}
          </button>
        )}

        {/* Summary when complete */}
        {isComplete && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <p className="text-emerald-400 font-bold text-lg">Séance terminée ! 🎉</p>
            <p className="text-[#6B6B8A] text-sm mt-1">
              {doneSets} séries · {session.exercises.length} exercices
            </p>
            <p className="text-[10px] text-[#6B6B8A] mt-1">
              Terminée le{' '}
              {new Date(session.completedAt!).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
