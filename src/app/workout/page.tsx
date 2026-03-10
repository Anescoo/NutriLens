'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

import type { WorkoutSession, WorkoutPlan, WorkoutPlanSession, GroupType } from '@/types';
import { EXERCISES } from '@/lib/exercises';
import { ImportFilePicker } from '@/components/workout/ImportFilePicker';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

const CUSTOM_EXERCISES_KEY = 'nutrilens_custom_exercises';
function loadCustomExercises(): string[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY) ?? '[]'); } catch { return []; }
}

// ─── Session card (onglet Séances) ────────────────────────────────────────────

function SessionCard({ session, onDelete }: { session: WorkoutSession; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = session.exercises.reduce((s, e) => s + e.sets.filter((set) => set.done).length, 0);
  const isComplete = !!session.completedAt;

  return (
    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[#A78BFA] font-semibold uppercase tracking-wider">{formatDate(session.date)}</span>
            {isComplete && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Terminée</span>
            )}
          </div>
          <h3 className="text-white font-bold text-base truncate">{session.name}</h3>
          <p className="text-[#6B6B8A] text-sm mt-0.5">
            {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''} · {totalSets} série{totalSets > 1 ? 's' : ''}
            {!isComplete && ` · ${doneSets}/${totalSets} faites`}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {session.exercises.slice(0, 4).map((ex) => (
              <span key={ex.id} className="text-[11px] bg-[#0F0F1A] text-[#A78BFA] px-2 py-0.5 rounded-full border border-[#2d1f5e]">{ex.name}</span>
            ))}
            {session.exercises.length > 4 && <span className="text-[11px] text-[#6B6B8A] px-1">+{session.exercises.length - 4}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isComplete ? (
            <>
              <Link href={`/workout/${session.id}`} className="w-8 h-8 bg-[#1A1A2E] border border-[#2d1f5e] hover:border-[#7C3AED]/60 text-[#A78BFA] rounded-xl flex items-center justify-center transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </Link>
              <Link href={`/workout/${session.id}?edit=true`} className="w-8 h-8 bg-[#7C3AED]/20 border border-[#7C3AED]/30 hover:bg-[#7C3AED]/30 text-[#A78BFA] rounded-xl flex items-center justify-center transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </Link>
            </>
          ) : (
            <Link href={`/workout/${session.id}`} className="px-3 py-1.5 bg-[#7C3AED]/20 text-[#A78BFA] rounded-xl text-sm font-semibold border border-[#7C3AED]/30 hover:bg-[#7C3AED]/30 transition-colors">
              Reprendre
            </Link>
          )}
          {confirming ? (
            <button onClick={() => onDelete(session.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold border border-red-500/30">
              Confirmer
            </button>
          ) : (
            <button onClick={() => setConfirming(true)} onBlur={() => setConfirming(false)} className="px-3 py-1.5 text-[#6B6B8A] rounded-xl text-sm hover:text-red-400 transition-colors">✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plan exercise picker (mini) ──────────────────────────────────────────────

function ExercisePickerMini({
  value,
  onChange,
  onClose,
  usedNames = [],
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  usedNames?: string[];
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const allExercises = [...EXERCISES.map((e) => e.name), ...loadCustomExercises()];
  const filtered = allExercises.filter((n) => {
    if (usedNames.includes(n)) return false;
    return query.trim().length === 0 || n.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-end bg-black/60" onClick={onClose}>
      <div className="bg-[#1A1A2E] border-t border-[#2d1f5e] rounded-t-3xl w-full max-h-[75vh] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 pt-3 pb-3 border-b border-[#2d1f5e] shrink-0">
          <div className="w-8 h-1 bg-[#2d1f5e] rounded-full mx-auto mb-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un exercice…"
            className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {filtered.map((name) => (
            <button
              key={name}
              onClick={() => { onChange(name); onClose(); }}
              className={['w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors mb-1', value === name ? 'bg-[#7C3AED]/20 text-[#A78BFA]' : 'text-white hover:bg-[#0F0F1A]'].join(' ')}
            >
              {name}
            </button>
          ))}
          {query.trim().length > 1 && !allExercises.includes(query.trim()) && !usedNames.includes(query.trim()) && (
            <button
              onClick={() => { onChange(query.trim()); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-[#7C3AED] hover:bg-[#0F0F1A] mb-1"
            >
              + Ajouter &quot;{query.trim()}&quot;
            </button>
          )}
          {filtered.length === 0 && query.trim().length <= 1 && (
            <p className="text-[#6B6B8A] text-sm text-center py-6">Tous les exercices sont déjà ajoutés</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plan editor ──────────────────────────────────────────────────────────────

interface PlanEditorProps {
  initial: WorkoutPlan | null;
  existingPlans: WorkoutPlan[];
  onSave: (plan: Omit<WorkoutPlan, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

function PlanEditor({ initial, existingPlans, onSave, onCancel }: PlanEditorProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sessions, setSessions] = useState<WorkoutPlanSession[]>(
    initial?.sessions ?? [{ id: uid(), name: 'Séance A', exercises: [] }]
  );
  const [pickerInfo, setPickerInfo] = useState<{ sessionIdx: number; exIdx: number } | null>(null);
  const [linkMenuInfo, setLinkMenuInfo] = useState<{ si: number; ei: number } | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  function addSession() {
    setSessions((prev) => [...prev, { id: uid(), name: `Séance ${String.fromCharCode(65 + prev.length)}`, exercises: [] }]);
  }
  function removeSession(idx: number) {
    setSessions((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateSessionName(idx: number, val: string) {
    setSessions((prev) => prev.map((s, i) => i === idx ? { ...s, name: val } : s));
  }
  function addExercise(sessionIdx: number) {
    setSessions((prev) => prev.map((s, i) => i === sessionIdx
      ? { ...s, exercises: [...s.exercises, { id: uid(), name: '', sets: 3 }] }
      : s));
  }
  function removeExercise(sessionIdx: number, exIdx: number) {
    setSessions((prev) => prev.map((s, i) => i === sessionIdx
      ? { ...s, exercises: s.exercises.filter((_, ei) => ei !== exIdx) }
      : s));
  }
  function updateExerciseName(sessionIdx: number, exIdx: number, val: string) {
    setSessions((prev) => prev.map((s, i) => i === sessionIdx
      ? { ...s, exercises: s.exercises.map((e, ei) => ei === exIdx ? { ...e, name: val } : e) }
      : s));
  }
  function updateExerciseSets(sessionIdx: number, exIdx: number, delta: number) {
    setSessions((prev) => prev.map((s, i) => i === sessionIdx
      ? { ...s, exercises: s.exercises.map((e, ei) => ei === exIdx ? { ...e, sets: Math.max(1, e.sets + delta) } : e) }
      : s));
  }
  function linkExercises(sessionIdx: number, exIdx: number, type: GroupType) {
    const groupId = uid();
    setSessions((prev) => prev.map((s, i) => i !== sessionIdx ? s : {
      ...s,
      exercises: s.exercises.map((e, ei) =>
        ei === exIdx || ei === exIdx + 1 ? { ...e, groupId, groupType: type } : e
      ),
    }));
    setLinkMenuInfo(null);
  }
  function unlinkExercises(sessionIdx: number, exIdx: number) {
    const groupId = sessions[sessionIdx].exercises[exIdx].groupId;
    setSessions((prev) => prev.map((s, i) => i !== sessionIdx ? s : {
      ...s,
      exercises: s.exercises.map((e) =>
        e.groupId === groupId ? { ...e, groupId: undefined, groupType: undefined } : e
      ),
    }));
  }

  const canSave = name.trim().length > 0 && sessions.length > 0 && sessions.every((s) => s.name.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[150] bg-[#0F0F1A] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 border-b border-[#2d1f5e] flex items-center gap-3 shrink-0">
        <button onClick={onCancel} className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-white flex-1">{initial?.id ? 'Modifier le plan' : initial ? 'Dupliquer le plan' : 'Nouveau plan'}</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 max-w-lg w-full mx-auto">
        {/* Plan name */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du plan (ex: PPL, Full Body…)"
          className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl px-4 py-3 text-base text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] mb-3"
        />

        {/* Import from existing plan (only when creating) */}
        {!initial?.id && existingPlans.length > 0 && (
          <div className="mb-5">
            <button
              onClick={() => setShowPlanPicker((v) => !v)}
              className="flex items-center gap-2 text-sm text-[#A78BFA] hover:text-violet-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Partir d&apos;un plan existant
            </button>

            {showPlanPicker && (
              <div className="mt-3 bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl overflow-hidden">
                <p className="px-4 py-2.5 text-[10px] text-[#6B6B8A] uppercase tracking-wider font-semibold border-b border-[#2d1f5e]">Choisir un plan à copier</p>
                {existingPlans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSessions(p.sessions.map((s) => ({ ...s, id: uid(), exercises: s.exercises.map((e) => ({ ...e, id: uid() })) })));
                      if (!name.trim()) setName(`Copie de ${p.name}`);
                      setShowPlanPicker(false);
                    }}
                    className="w-full px-4 py-3 text-left border-b border-[#2d1f5e]/50 last:border-0 hover:bg-[#2d1f5e]/30 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white text-sm font-semibold">{p.name}</p>
                      <p className="text-[#6B6B8A] text-xs mt-0.5">{p.sessions.map((s) => s.name).join(' · ')}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sessions */}
        <div className="space-y-4">
          {sessions.map((session, si) => (
            <div key={session.id} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl overflow-hidden">
              {/* Session header */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#2d1f5e]">
                <input
                  type="text"
                  value={session.name}
                  onChange={(e) => updateSessionName(si, e.target.value)}
                  placeholder="Nom de la séance"
                  className="flex-1 bg-transparent text-white font-semibold text-sm placeholder-[#6B6B8A] focus:outline-none"
                />
                <button onClick={() => removeSession(si)} className="text-[#6B6B8A] hover:text-red-400 transition-colors ml-1 p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Exercises */}
              <div className="px-4 py-3 space-y-1">
                {session.exercises.map((ex, ei) => {
                  const isGrouped = !!ex.groupId;
                  const nextEx = session.exercises[ei + 1];
                  const isSameGroupAsNext = nextEx && ex.groupId && nextEx.groupId === ex.groupId;
                  const borderLeft = ex.groupType === 'biset' ? 'border-l-2 border-violet-500 pl-3 ml-2' : ex.groupType === 'superset' ? 'border-l-2 border-orange-500 pl-3 ml-2' : '';
                  const usedInSession = session.exercises.filter((_, i) => i !== ei).map((e) => e.name).filter(Boolean);

                  return (
                    <div key={ex.id} className="relative">
                      {/* Group badge at top of group */}
                      {isGrouped && (ei === 0 || session.exercises[ei - 1].groupId !== ex.groupId) && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={['text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', ex.groupType === 'biset' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'].join(' ')}>
                            {ex.groupType === 'biset' ? 'Bi-set' : 'Superset'}
                          </span>
                        </div>
                      )}

                      <div className={['flex items-center gap-2 py-1', borderLeft].join(' ')}>
                        {/* Exercise name button */}
                        <button
                          onClick={() => setPickerInfo({ sessionIdx: si, exIdx: ei })}
                          className="flex-1 text-left bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-sm transition-colors min-w-0"
                        >
                          <span className={ex.name ? 'text-white truncate block' : 'text-[#6B6B8A]'}>{ex.name || 'Choisir…'}</span>
                        </button>
                        {/* Sets stepper */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => updateExerciseSets(si, ei, -1)} className="w-7 h-7 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center leading-none">−</button>
                          <span className="text-white text-sm font-bold w-5 text-center">{ex.sets}</span>
                          <button onClick={() => updateExerciseSets(si, ei, 1)} className="w-7 h-7 rounded-lg bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] flex items-center justify-center leading-none">+</button>
                          <span className="text-[10px] text-[#6B6B8A] ml-0.5">×</span>
                        </div>
                        {/* Delete */}
                        <button onClick={() => removeExercise(si, ei)} className="text-[#6B6B8A] hover:text-red-400 transition-colors shrink-0 p-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>

                      {/* Link / unlink controls (between this and next) */}
                      {ei < session.exercises.length - 1 && (
                        <div className="flex items-center ml-2 my-1">
                          {isSameGroupAsNext ? (
                            <>
                              <div className={['w-0.5 h-3 mr-2', ex.groupType === 'biset' ? 'bg-violet-500' : 'bg-orange-500'].join(' ')} />
                              <button
                                onClick={() => unlinkExercises(si, ei)}
                                className="text-[10px] text-[#6B6B8A] hover:text-red-400 transition-colors underline"
                              >
                                Dissocier
                              </button>
                            </>
                          ) : !isGrouped && !session.exercises[ei + 1]?.groupId && (
                            <div className="relative">
                              <button
                                onClick={() => setLinkMenuInfo(linkMenuInfo?.si === si && linkMenuInfo?.ei === ei ? null : { si, ei })}
                                className="text-[10px] text-[#A78BFA] hover:text-violet-300 transition-colors flex items-center gap-1"
                              >
                                <span>⛓</span> Lier avec le suivant
                              </button>
                              {linkMenuInfo?.si === si && linkMenuInfo?.ei === ei && (
                                <div className="absolute left-0 top-5 z-10 bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl shadow-xl overflow-hidden">
                                  <button
                                    onClick={() => linkExercises(si, ei, 'biset')}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-violet-300 hover:bg-violet-500/10 w-full text-left whitespace-nowrap"
                                  >
                                    🔗 Bi-set
                                  </button>
                                  <button
                                    onClick={() => linkExercises(si, ei, 'superset')}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-orange-300 hover:bg-orange-500/10 w-full text-left whitespace-nowrap"
                                  >
                                    🔗 Superset
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hidden picker trigger — captures usedInSession */}
                      {pickerInfo?.sessionIdx === si && pickerInfo?.exIdx === ei && (
                        <ExercisePickerMini
                          value={ex.name}
                          onChange={(v) => updateExerciseName(si, ei, v)}
                          onClose={() => setPickerInfo(null)}
                          usedNames={usedInSession}
                        />
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => addExercise(si)}
                  className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-[#2d1f5e] text-[#6B6B8A] text-xs hover:border-[#7C3AED]/50 hover:text-[#A78BFA] transition-colors"
                >
                  + Exercice
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSession}
          className="w-full mt-4 py-3 rounded-2xl border border-dashed border-[#2d1f5e] text-[#6B6B8A] text-sm hover:border-[#7C3AED]/50 hover:text-[#A78BFA] transition-colors"
        >
          + Ajouter une séance
        </button>
      </div>

      {/* Sticky save button */}
      <div className="px-4 py-3 border-t border-[#2d1f5e] shrink-0 max-w-lg w-full mx-auto">
        <button
          onClick={() => canSave && onSave({ name: name.trim(), sessions })}
          disabled={!canSave}
          className="w-full py-3.5 bg-[#7C3AED] disabled:opacity-40 text-white rounded-2xl font-bold text-base transition-colors hover:bg-[#6D28D9]"
        >
          Enregistrer le plan
        </button>
      </div>
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanViewModal({ plan, onClose }: { plan: WorkoutPlan; onClose: () => void }) {
  const totalExercises = plan.sessions.reduce((s, sess) => s + sess.exercises.length, 0);
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex flex-col justify-end" onClick={onClose}>
      <div className="bg-[#0F0F1A] rounded-t-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 pt-3 pb-4 px-4 border-b border-[#2d1f5e]">
          <div className="w-10 h-1 bg-[#2d1f5e] rounded-full mx-auto mb-4" />
          <h2 className="text-base font-bold text-white">{plan.name}</h2>
          <p className="text-[#6B6B8A] text-xs mt-0.5">
            {plan.sessions.length} séance{plan.sessions.length > 1 ? 's' : ''} · {totalExercises} exercice{totalExercises > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 space-y-2.5">
          {plan.sessions.map((session) => (
            <div key={session.id} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-[#2d1f5e]/40 border-b border-[#2d1f5e] flex items-center justify-between">
                <span className="text-sm font-bold text-white">{session.name}</span>
                <span className="text-[10px] text-[#6B6B8A]">{session.exercises.length} ex.</span>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {session.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white flex-1 min-w-0 truncate">{ex.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[#A78BFA]">{ex.sets} série{ex.sets > 1 ? 's' : ''}</span>
                      {ex.reps !== undefined && (
                        <span className="text-xs text-emerald-400">× {ex.reps} rép.</span>
                      )}
                      {ex.time && (
                        <span className="text-xs text-sky-400">{ex.time}</span>
                      )}
                    </div>
                  </div>
                ))}
                {session.exercises.length === 0 && (
                  <p className="text-[#6B6B8A] text-xs py-1">Aucun exercice</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 px-4 py-3 border-t border-[#2d1f5e]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] text-[#6B6B8A] text-sm font-semibold hover:border-[#7C3AED]/40 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete, onCopied }: { plan: WorkoutPlan; onEdit: () => void; onDelete: () => void; onCopied: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const totalExercises = plan.sessions.reduce((s, sess) => s + sess.exercises.length, 0);

  async function handleShare() {
    setSharing(true);
    try {
      const res = await fetch(`/api/workout/plans/${plan.id}/share`, { method: 'POST' });
      const { token } = await res.json();
      const url = `${window.location.origin}/share/${token}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard not available — prompt user manually
        window.prompt('Copier ce lien :', url);
      }
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base truncate">{plan.name}</h3>
            <p className="text-[#6B6B8A] text-sm mt-0.5">
              {plan.sessions.length} séance{plan.sessions.length > 1 ? 's' : ''} · {totalExercises} exercice{totalExercises > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {plan.sessions.map((s) => (
                <span key={s.id} className="text-[11px] bg-[#0F0F1A] text-[#A78BFA] px-2 py-0.5 rounded-full border border-[#2d1f5e]">{s.name}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setViewing(true)}
              className="w-8 h-8 bg-[#1A1A2E] border border-[#2d1f5e] hover:border-[#7C3AED]/60 text-[#A78BFA] rounded-xl flex items-center justify-center transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              title={copied ? 'Lien copié !' : 'Partager'}
              className={['w-8 h-8 border rounded-xl flex items-center justify-center transition-colors', copied ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-[#1A1A2E] border-[#2d1f5e] hover:border-[#7C3AED]/60 text-[#A78BFA]'].join(' ')}
            >
              {copied
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              }
            </button>
            <button
              onClick={onEdit}
              className="w-8 h-8 bg-[#7C3AED]/20 border border-[#7C3AED]/30 hover:bg-[#7C3AED]/30 text-[#A78BFA] rounded-xl flex items-center justify-center transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            {confirming ? (
              <button onClick={onDelete} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold border border-red-500/30">Confirmer</button>
            ) : (
              <button onClick={() => setConfirming(true)} onBlur={() => setConfirming(false)} className="px-3 py-1.5 text-[#6B6B8A] rounded-xl text-sm hover:text-red-400 transition-colors">✕</button>
            )}
          </div>
        </div>
      </div>
      {viewing && <PlanViewModal plan={plan} onClose={() => setViewing(false)} />}
    </>
  );
}

type Tab = 'sessions' | 'plans';

// ─── Copy toast ──────────────────────────────────────────────────────────────

function CopyToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={[
        'fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1A1A2E] border border-emerald-500/40 shadow-xl transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
      ].join(' ')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
      <span className="text-sm text-white font-medium">Lien copié dans le presse-papier</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [copyToast, setCopyToast] = useState(false);

  function showCopyToast() {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2500);
  }

  // Sessions state
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Plans state
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null | 'new'>(null);
  const [showImportFile, setShowImportFile] = useState(false);

  useEffect(() => {
    fetch('/api/workout').then((r) => r.json()).then((s) => { setSessions(s); setSessionsLoading(false); });
    fetch('/api/workout/plans').then((r) => r.json()).then((p) => { setPlans(p); setPlansLoading(false); });
  }, []);

  async function handleDeleteSession(id: string) {
    await fetch('/api/workout/' + id, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSavePlan(data: Omit<WorkoutPlan, 'id' | 'createdAt'>) {
    if (editingPlan === 'new') {
      const res = await fetch('/api/workout/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const created = await res.json();
      setPlans((prev) => [created, ...prev]);
    } else if (editingPlan) {
      const res = await fetch(`/api/workout/plans/${editingPlan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const updated = await res.json();
      setPlans((prev) => prev.map((p) => p.id === editingPlan.id ? updated : p));
    }
    setEditingPlan(null);
  }

  async function handleImportPlan(data: Omit<WorkoutPlan, 'id' | 'createdAt'>) {
    const res = await fetch('/api/workout/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const created = await res.json();
    setPlans((prev) => [created, ...prev]);
  }

  async function handleDeletePlan(id: string) {
    await fetch(`/api/workout/plans/${id}`, { method: 'DELETE' });
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  // Group sessions by month
  const byMonth = sessions.reduce<Record<string, WorkoutSession[]>>((acc, s) => {
    const month = s.date.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(s);
    return acc;
  }, {});

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <>
      <CopyToast visible={copyToast} />

      {/* Plan editor overlay */}
      {editingPlan !== null && (
        <PlanEditor
          initial={editingPlan === 'new' ? null : editingPlan}
          existingPlans={plans}
          onSave={handleSavePlan}
          onCancel={() => setEditingPlan(null)}
        />
      )}

      {/* Import from file modal */}
      {showImportFile && (
        <ImportFilePicker
          onSave={handleImportPlan}
          onClose={() => setShowImportFile(false)}
        />
      )}

      <main className="min-h-screen bg-[#0F0F1A] pb-32 pt-6 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white">Musculation</h1>
              <p className="text-[#6B6B8A] text-sm mt-0.5">
                {tab === 'sessions'
                  ? `${sessions.length} séance${sessions.length !== 1 ? 's' : ''}`
                  : `${plans.length} plan${plans.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Stats — icon only */}
              <Link
                href="/workout/progression"
                title="Progression"
                className="w-9 h-9 bg-[#1A1A2E] border border-[#2d1f5e] hover:border-[#7C3AED]/60 text-[#A78BFA] rounded-xl flex items-center justify-center transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </Link>

              {tab === 'sessions' ? (
                <Link
                  href="/workout/new"
                  className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-900/40 hover:bg-[#6D28D9] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nouvelle
                </Link>
              ) : (
                <>
                  {/* Import — icon only */}
                  <button
                    onClick={() => setShowImportFile(true)}
                    title="Importer depuis un fichier"
                    className="w-9 h-9 bg-[#1A1A2E] border border-[#2d1f5e] hover:border-[#7C3AED]/60 text-[#A78BFA] rounded-xl flex items-center justify-center transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingPlan('new')}
                    className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-900/40 hover:bg-[#6D28D9] transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nouveau
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-1 mb-5">
            <button
              onClick={() => setTab('sessions')}
              className={['flex-1 py-2 rounded-xl text-sm font-semibold transition-all', tab === 'sessions' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A] hover:text-white'].join(' ')}
            >
              Séances
            </button>
            <button
              onClick={() => setTab('plans')}
              className={['flex-1 py-2 rounded-xl text-sm font-semibold transition-all', tab === 'plans' ? 'bg-[#7C3AED] text-white' : 'text-[#6B6B8A] hover:text-white'].join(' ')}
            >
              Plans
            </button>
          </div>

          {/* ── Séances tab ── */}
          {tab === 'sessions' && (
            <>
              {sessionsLoading && (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🏋️</div>
                  <p className="text-white font-semibold text-lg">Aucune séance</p>
                  <p className="text-[#6B6B8A] text-sm mt-1 mb-6">Crée ta première séance pour commencer le suivi</p>
                  <Link href="/workout/new" className="inline-flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold">
                    Créer une séance
                  </Link>
                </div>
              )}
              {!sessionsLoading &&
                Object.entries(byMonth)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, monthSessions]) => (
                    <div key={month} className="mb-6">
                      <h2 className="text-[#6B6B8A] text-xs font-semibold uppercase tracking-wider mb-3">{monthLabel(month)}</h2>
                      <div className="flex flex-col gap-3">
                        {monthSessions.map((s) => <SessionCard key={s.id} session={s} onDelete={handleDeleteSession} />)}
                      </div>
                    </div>
                  ))}
            </>
          )}

          {/* ── Plans tab ── */}
          {tab === 'plans' && (
            <>
              {plansLoading && (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!plansLoading && plans.length === 0 && (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-white font-semibold text-lg">Aucun plan</p>
                  <p className="text-[#6B6B8A] text-sm mt-1 mb-6">
                    Crée un plan pour pré-configurer tes séances<br />et saisir tes charges plus vite
                  </p>
                  <button
                    onClick={() => setEditingPlan('new')}
                    className="inline-flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold"
                  >
                    Créer un plan
                  </button>
                </div>
              )}
              {!plansLoading && plans.length > 0 && (
                <div className="flex flex-col gap-3">
                  {plans.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      onEdit={() => setEditingPlan(p)}
                      onDelete={() => handleDeletePlan(p.id)}
                      onCopied={showCopyToast}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
