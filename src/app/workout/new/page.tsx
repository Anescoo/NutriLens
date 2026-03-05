'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveWorkoutSession, getAllWorkoutSessions } from '@/lib/db';
import type { WorkoutSession, WorkoutExercise, WorkoutSet, GroupType } from '@/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeSet(isDropSet = false): WorkoutSet {
  return { id: uid(), weight: null, reps: null, isDropSet, done: false };
}

interface BuilderExercise {
  id: string;
  name: string;
  setCount: number;
  dropCount: number;  // drops per set (0 = no drop set)
  groupId?: string;
  groupType?: GroupType;
  initialSets?: WorkoutSet[]; // pre-filled weights from a previous session
}

function makeExercise(): BuilderExercise {
  return { id: uid(), name: '', setCount: 3, dropCount: 0 };
}

// ─── Group badge ─────────────────────────────────────────────────────────────

function GroupBadge({ type }: { type: GroupType }) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
        type === 'biset'
          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
          : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
      }`}
    >
      {type === 'biset' ? 'Bi-set' : 'Superset'}
    </span>
  );
}

// ─── Exercise card ────────────────────────────────────────────────────────────

function ExerciseCard({
  ex,
  index,
  total,
  nextEx,
  onChange,
  onRemove,
  onLink,
  onUnlink,
  onMoveUp,
  onMoveDown,
}: {
  ex: BuilderExercise;
  index: number;
  total: number;
  nextEx?: BuilderExercise;
  onChange: (updated: BuilderExercise) => void;
  onRemove: () => void;
  onLink: (type: GroupType) => void;
  onUnlink: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const isGrouped = !!ex.groupId;
  const isSameGroupAsNext = nextEx && ex.groupId && nextEx.groupId === ex.groupId;

  const borderColor =
    ex.groupType === 'biset'
      ? 'border-violet-500/60'
      : ex.groupType === 'superset'
      ? 'border-orange-500/60'
      : 'border-[#2d1f5e]';

  return (
    <div className="relative">
      {/* Left group indicator */}
      {isGrouped && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
            ex.groupType === 'biset' ? 'bg-violet-500' : 'bg-orange-500'
          }`}
        />
      )}

      <div
        className={`bg-[#1A1A2E] border ${borderColor} rounded-2xl p-4 ${isGrouped ? 'ml-2' : ''}`}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Move handles */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="text-[#6B6B8A] hover:text-[#A78BFA] disabled:opacity-20 text-xs leading-none"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="text-[#6B6B8A] hover:text-[#A78BFA] disabled:opacity-20 text-xs leading-none"
            >
              ▼
            </button>
          </div>

          <input
            value={ex.name}
            onChange={(e) => onChange({ ...ex, name: e.target.value })}
            placeholder="Nom de l'exercice…"
            className="flex-1 bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2 text-white text-sm placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED]"
          />

          {isGrouped && <GroupBadge type={ex.groupType!} />}

          <button
            onClick={onRemove}
            className="text-[#6B6B8A] hover:text-red-400 transition-colors text-lg leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* Sets & drop set */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6B8A] text-sm">Séries :</span>
            <button
              onClick={() => onChange({ ...ex, setCount: Math.max(1, ex.setCount - 1) })}
              className="w-7 h-7 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center font-bold hover:border-[#7C3AED] transition-colors"
            >
              −
            </button>
            <span className="text-white font-bold w-5 text-center">{ex.setCount}</span>
            <button
              onClick={() => onChange({ ...ex, setCount: Math.min(10, ex.setCount + 1) })}
              className="w-7 h-7 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center font-bold hover:border-[#7C3AED] transition-colors"
            >
              +
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                onClick={() => onChange({ ...ex, dropCount: ex.dropCount > 0 ? 0 : 1 })}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  ex.dropCount > 0 ? 'bg-[#7C3AED]' : 'bg-[#2d1f5e]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    ex.dropCount > 0 ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm text-[#6B6B8A]">Dégressif</span>
            </div>
            {ex.dropCount > 0 && (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-xs text-[#6B6B8A]">Descentes par série :</span>
                <button
                  onClick={() => onChange({ ...ex, dropCount: Math.max(1, ex.dropCount - 1) })}
                  className="w-7 h-7 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center font-bold hover:border-[#7C3AED] transition-colors"
                >−</button>
                <span className="text-white font-bold w-5 text-center">{ex.dropCount}</span>
                <button
                  onClick={() => onChange({ ...ex, dropCount: Math.min(5, ex.dropCount + 1) })}
                  className="w-7 h-7 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center font-bold hover:border-[#7C3AED] transition-colors"
                >+</button>
              </div>
            )}
          </div>
        </div>

        {/* Link controls */}
        {index < total - 1 && (
          <div className="mt-3 flex items-center gap-2">
            {isSameGroupAsNext ? (
              <button
                onClick={onUnlink}
                className="text-xs text-[#6B6B8A] hover:text-red-400 transition-colors underline"
              >
                Dissocier
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowLinkMenu((v) => !v)}
                  className="text-xs text-[#A78BFA] hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  <span>⛓</span> Lier avec le suivant
                </button>
                {showLinkMenu && (
                  <div className="absolute left-0 top-6 z-10 bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl shadow-xl overflow-hidden">
                    <button
                      onClick={() => { onLink('biset'); setShowLinkMenu(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-violet-300 hover:bg-violet-500/10 w-full text-left"
                    >
                      <span className="text-base">🔗</span> Bi-set
                    </button>
                    <button
                      onClick={() => { onLink('superset'); setShowLinkMenu(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-orange-300 hover:bg-orange-500/10 w-full text-left"
                    >
                      <span className="text-base">🔗</span> Superset
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Group connector line */}
      {isSameGroupAsNext && (
        <div className="flex items-center ml-4 my-1 gap-2">
          <div
            className={`w-0.5 h-4 ${
              ex.groupType === 'biset' ? 'bg-violet-500' : 'bg-orange-500'
            }`}
          />
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              ex.groupType === 'biset' ? 'text-violet-400' : 'text-orange-400'
            }`}
          >
            {ex.groupType === 'biset' ? 'Bi-set' : 'Superset'}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewWorkoutPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<BuilderExercise[]>([makeExercise()]);
  const [saving, setSaving] = useState(false);
  const [pastSessions, setPastSessions] = useState<WorkoutSession[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [copyWeights, setCopyWeights] = useState(false);

  useEffect(() => {
    getAllWorkoutSessions().then(setPastSessions);
  }, []);

  function updateExercise(index: number, updated: BuilderExercise) {
    setExercises((prev) => prev.map((e, i) => (i === index ? updated : e)));
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function addExercise() {
    setExercises((prev) => [...prev, makeExercise()]);
  }

  function moveExercise(from: number, to: number) {
    setExercises((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function linkExercises(index: number, type: GroupType) {
    const groupId = uid();
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index || i === index + 1 ? { ...e, groupId, groupType: type } : e
      )
    );
  }

  function unlinkExercises(index: number) {
    const groupId = exercises[index].groupId;
    setExercises((prev) =>
      prev.map((e) => (e.groupId === groupId ? { ...e, groupId: undefined, groupType: undefined } : e))
    );
  }

  function importFromSession(session: WorkoutSession, withWeights: boolean) {
    const imported: BuilderExercise[] = session.exercises.map((ex) => {
      // Count main sets
      const setCount = ex.sets.filter((s) => !s.isDropSet).length;
      // Count drops per main set (look at drops right after the first main set)
      let dropCount = 0;
      for (let i = 1; i < ex.sets.length; i++) {
        if (ex.sets[i].isDropSet) dropCount++;
        else break;
      }
      return {
        id: uid(),
        name: ex.name,
        setCount,
        dropCount,
        groupId: ex.groupId,
        groupType: ex.groupType,
        initialSets: withWeights
          ? ex.sets.map((s) => ({ ...s, id: uid(), done: false }))
          : undefined,
      };
    });
    setExercises(imported);
    setShowImport(false);
  }

  async function handleStart() {
    const sessionName = name.trim() || 'Séance sans nom';
    const today = new Date().toISOString().slice(0, 10);

    const workoutExercises: WorkoutExercise[] = exercises
      .filter((e) => e.name.trim())
      .map((e) => {
        const sets: WorkoutSet[] = e.initialSets
          ? e.initialSets.map((s) => ({ ...s, id: uid(), done: false }))
          : (() => {
              const arr: WorkoutSet[] = [];
              for (let s = 0; s < e.setCount; s++) {
                arr.push(makeSet(false));
                for (let d = 0; d < e.dropCount; d++) arr.push(makeSet(true));
              }
              return arr;
            })();
        return {
          id: e.id,
          name: e.name.trim(),
          sets,
          groupId: e.groupId,
          groupType: e.groupType,
        };
      });

    if (workoutExercises.length === 0) return;

    setSaving(true);
    const session: WorkoutSession = {
      id: uid(),
      name: sessionName,
      date: today,
      exercises: workoutExercises,
    };

    await saveWorkoutSession(session);
    router.push(`/workout/${session.id}`);
  }

  const canStart = exercises.some((e) => e.name.trim().length > 0);

  return (
    <main className="min-h-screen bg-[#0F0F1A] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F0F1A]/90 backdrop-blur border-b border-[#2d1f5e] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-[#6B6B8A] hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white flex-1">Nouvelle séance</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Session name */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la séance (ex: Push A, Legs…)"
          className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl px-4 py-3 text-white text-base placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] mb-3"
        />

        {/* Import from past session */}
        {pastSessions.length > 0 && (
          <div className="mb-5">
            <button
              onClick={() => setShowImport((v) => !v)}
              className="flex items-center gap-2 text-sm text-[#A78BFA] hover:text-violet-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Récupérer une séance existante
            </button>

            {showImport && (
              <div className="mt-3 bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl overflow-hidden">
                {/* Copy weights toggle */}
                <div className="px-4 py-3 border-b border-[#2d1f5e] flex items-center gap-3">
                  <div
                    onClick={() => setCopyWeights((v) => !v)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      copyWeights ? 'bg-[#7C3AED]' : 'bg-[#2d1f5e]'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        copyWeights ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                  <span className="text-sm text-[#6B6B8A]">Dupliquer les poids aussi</span>
                </div>

                {/* Session list */}
                <div className="max-h-64 overflow-y-auto">
                  {pastSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => importFromSession(s, copyWeights)}
                      className="w-full px-4 py-3 text-left border-b border-[#2d1f5e]/50 last:border-0 hover:bg-[#2d1f5e]/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white text-sm font-semibold truncate">{s.name}</span>
                        <span className="text-[#6B6B8A] text-xs shrink-0">{formatDate(s.date)}</span>
                      </div>
                      <p className="text-[#6B6B8A] text-xs mt-0.5">
                        {s.exercises.map((e) => e.name).join(' · ')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exercises */}
        <div className="flex flex-col gap-2">
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              index={i}
              total={exercises.length}
              nextEx={exercises[i + 1]}
              onChange={(u) => updateExercise(i, u)}
              onRemove={() => removeExercise(i)}
              onLink={(type) => linkExercises(i, type)}
              onUnlink={() => unlinkExercises(i)}
              onMoveUp={() => moveExercise(i, i - 1)}
              onMoveDown={() => moveExercise(i, i + 1)}
            />
          ))}
        </div>

        {/* Add exercise */}
        <button
          onClick={addExercise}
          className="w-full mt-3 py-3 border border-dashed border-[#2d1f5e] rounded-2xl text-[#A78BFA] hover:border-[#7C3AED] hover:text-violet-300 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter un exercice
        </button>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!canStart || saving}
          className="w-full mt-6 py-4 bg-[#7C3AED] text-white rounded-2xl font-bold text-base shadow-lg shadow-violet-900/40 hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
              </svg>
              Commencer la séance
            </>
          )}
        </button>

        {/* Legend */}
        <div className="mt-6 bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
          <p className="text-[#6B6B8A] text-xs font-semibold uppercase tracking-wider mb-2">Légende</p>
          <div className="flex flex-col gap-1.5 text-xs text-[#6B6B8A]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span>Bi-set — 2 exercices enchaînés sans repos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Superset — 2+ exercices enchaînés sans repos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span>Dégressif — sous-séries avec poids réduit après chaque série principale</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
