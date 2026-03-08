'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import type { WorkoutSession, WorkoutExercise, WorkoutSet, GroupType } from '@/types';
import { EXERCISES, MUSCLE_GROUPS, type MuscleGroup, type ExerciseType } from '@/lib/exercises';

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

// ─── Custom exercises (localStorage) ─────────────────────────────────────────

const CUSTOM_EXERCISES_KEY = 'nutrilens_custom_exercises';

function loadCustomExercises(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveCustomExercises(names: string[]) {
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(names));
}

// ─── Exercise picker ─────────────────────────────────────────────────────────

function ExercisePicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (name: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [typeFilter, setTypeFilter] = useState<ExerciseType | null>(null);
  const [customExercises, setCustomExercises] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomExercises(loadCustomExercises());
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const filteredPredefined = EXERCISES.filter((e) => {
    if (muscleFilter && e.muscle !== muscleFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredCustom = customExercises.filter(
    (name) => !search || name.toLowerCase().includes(search.toLowerCase())
  );

  const searchTrimmed = search.trim();
  const canAdd =
    searchTrimmed.length > 0 &&
    !EXERCISES.some((e) => e.name.toLowerCase() === searchTrimmed.toLowerCase()) &&
    !customExercises.some((n) => n.toLowerCase() === searchTrimmed.toLowerCase());

  function select(name: string) {
    onChange(name);
    onClose();
  }

  function addCustom() {
    if (!searchTrimmed) return;
    const updated = [...customExercises, searchTrimmed];
    setCustomExercises(updated);
    saveCustomExercises(updated);
    select(searchTrimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex flex-col justify-end"
      onClick={onClose}
    >
      <div
        className="bg-[#0F0F1A] rounded-t-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-[#2d1f5e] rounded-full mx-auto mt-3 mb-4 shrink-0" />

        {/* Search */}
        <div className="px-4 mb-3 shrink-0">
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher ou créer un exercice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        {/* Type filter */}
        <div className="px-4 mb-2 flex gap-2 shrink-0">
          {(['Polyarticulaire', 'Isolation'] as ExerciseType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                typeFilter === t
                  ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                  : 'bg-[#1A1A2E] border-[#2d1f5e] text-[#A78BFA]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Muscle group filter */}
        <div className="px-4 mb-3 flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border whitespace-nowrap transition-all ${
                muscleFilter === m
                  ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                  : 'bg-[#1A1A2E] border-[#2d1f5e] text-[#6B6B8A]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">

          {/* ── Add new custom exercise ── */}
          {canAdd && (
            <button
              onClick={addCustom}
              className="w-full text-left px-3 py-2.5 rounded-xl mb-2 flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={3} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span className="text-sm text-emerald-400 font-medium">
                Ajouter <span className="text-white font-semibold">"{searchTrimmed}"</span> à mes exercices
              </span>
            </button>
          )}

          {/* ── Custom (saved) exercises ── */}
          {filteredCustom.map((name) => (
            <button
              key={`custom-${name}`}
              onClick={() => select(name)}
              className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 flex items-center justify-between transition-colors ${
                value === name
                  ? 'bg-[#7C3AED]/20 border border-[#7C3AED]/40'
                  : 'hover:bg-[#1A1A2E]'
              }`}
            >
              <span className="text-white text-sm font-medium">{name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-300 shrink-0 ml-2">
                Perso
              </span>
            </button>
          ))}

          {/* ── Predefined exercises ── */}
          {filteredPredefined.length === 0 && filteredCustom.length === 0 && !canAdd && (
            <p className="text-[#6B6B8A] text-sm text-center py-4">Aucun résultat</p>
          )}
          {filteredPredefined.map((e) => (
            <button
              key={e.name}
              onClick={() => select(e.name)}
              className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 flex items-center justify-between transition-colors ${
                value === e.name
                  ? 'bg-[#7C3AED]/20 border border-[#7C3AED]/40'
                  : 'hover:bg-[#1A1A2E]'
              }`}
            >
              <span className="text-white text-sm font-medium">{e.name}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    e.type === 'Polyarticulaire'
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {e.type === 'Polyarticulaire' ? 'Poly' : 'Iso'}
                </span>
                <span className="text-[10px] text-[#6B6B8A]">{e.muscle}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
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
  const [showPicker, setShowPicker] = useState(false);
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

          <button
            onClick={() => setShowPicker(true)}
            className={`flex-1 bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2 text-sm text-left hover:border-[#7C3AED]/60 transition-colors focus:outline-none ${
              ex.name ? 'text-white' : 'text-[#6B6B8A]'
            }`}
          >
            {ex.name || "Nom de l'exercice…"}
          </button>
          {showPicker && (
            <ExercisePicker
              value={ex.name}
              onChange={(name) => onChange({ ...ex, name })}
              onClose={() => setShowPicker(false)}
            />
          )}

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
    fetch('/api/workout').then((r) => r.json()).then(setPastSessions);
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

    await fetch('/api/workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
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
