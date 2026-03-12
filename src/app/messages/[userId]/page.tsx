'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { WorkoutPlan, WorkoutPlanSession, WorkoutPlanExercise, WorkoutSession, WorkoutExercise, WorkoutSet } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: string;
  metadata: string;
  isRead: boolean;
  createdAt: string;
}

interface OtherUser { id: string; name: string | null; avatarUrl: string | null }

interface ImageMeta { imageUrl: string }
interface PlanMeta {
  planId: string; planName: string; sessionsCount: number; exercisesCount: number;
  sessions?: WorkoutPlanSession[];
}
interface SessionMeta {
  sessionId: string; sessionName: string; sessionDate: string;
  exercisesCount: number; totalVolumeKg: number; topExercises: string[];
  exercises?: WorkoutExercise[];
}

// Compose queue item
interface PendingItem {
  id: string;
  type: 'image' | 'plan' | 'session';
  label: string;
  previewUrl?: string;   // blob URL for image preview
  file?: File;           // image to upload on send
  planData?: WorkoutPlan;
  sessionData?: WorkoutSession;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function shouldShowTime(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  return new Date(messages[index].createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000;
}

function computeVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((total, ex) =>
    total + ex.sets.reduce((s, set: WorkoutSet) => {
      if (!set.done || !set.weight || !set.reps) return s;
      const weights = set.weight.split('-').map(Number);
      const reps = set.reps.split('-').map(Number);
      return s + weights.reduce((v, w, i) => v + w * (reps[i] ?? reps[0]), 0);
    }, 0), 0);
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMeta(metadata: string): any {
  try { return JSON.parse(metadata); } catch { return {}; }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ urls, index, onClose, onNav }: { urls: string[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
  const url = urls[index];
  const hasPrev = index > 0;
  const hasNext = index < urls.length - 1;

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && hasPrev) onNav(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onNav(index + 1);
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasPrev, hasNext, onNav, onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={onClose}>
      {/* Close */}
      <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white z-10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}

      {/* Image */}
      <img src={url} alt="Photo" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />

      {/* Next */}
      {hasNext && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* Counter */}
      {urls.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{index + 1} / {urls.length}</p>
      )}
    </div>
  );
}

// ─── Plan detail ──────────────────────────────────────────────────────────────

function PlanDetail({ meta, onClose }: { meta: PlanMeta; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    if (!meta.sessions || adding || added) return;
    setAdding(true);
    try {
      const res = await fetch('/api/workout/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${meta.planName} (Copie)`, sessions: meta.sessions, isPublic: false }),
      });
      if (res.ok) setAdded(true);
    } finally { setAdding(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1A1A2E] border-t border-[#2d1f5e] rounded-t-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#2d1f5e] shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#A78BFA] mb-0.5">Programme</p>
            <p className="text-white font-bold text-base leading-tight">{meta.planName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#0F0F1A] flex items-center justify-center text-[#6B6B8A]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {meta.sessions ? meta.sessions.map((sess: WorkoutPlanSession) => (
            <div key={sess.id} className="bg-[#0F0F1A] rounded-2xl p-3">
              <p className="text-white font-semibold text-sm mb-2">{sess.name}</p>
              <div className="space-y-1">
                {sess.exercises.map((ex: WorkoutPlanExercise) => (
                  <div key={ex.id} className="flex items-center justify-between">
                    <p className="text-[#A78BFA] text-xs">{ex.name}</p>
                    <p className="text-[#6B6B8A] text-xs shrink-0 ml-2">{ex.sets}×{ex.reps ?? (ex.time ?? '?')}</p>
                  </div>
                ))}
              </div>
            </div>
          )) : <p className="text-[#6B6B8A] text-sm text-center py-6">Détail non disponible</p>}
        </div>
        {meta.sessions && (
          <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-[#2d1f5e] shrink-0">
            <button
              onClick={() => void handleAdd()}
              disabled={adding || added}
              className={['w-full py-3 rounded-2xl text-sm font-bold transition-all', added ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-60'].join(' ')}
            >
              {adding ? 'Ajout en cours…' : added ? 'Ajouté à mes programmes ✓' : 'Ajouter à mes programmes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session detail ───────────────────────────────────────────────────────────

function SessionDetail({ meta, onClose }: { meta: SessionMeta; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1A1A2E] border-t border-[#2d1f5e] rounded-t-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#2d1f5e] shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#A78BFA] mb-0.5">Séance</p>
            <p className="text-white font-bold text-base leading-tight">{meta.sessionName}</p>
            <p className="text-xs text-[#6B6B8A] mt-0.5">
              {new Date(meta.sessionDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {meta.totalVolumeKg > 0 && ` · ${formatVolume(meta.totalVolumeKg)}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#0F0F1A] flex items-center justify-center text-[#6B6B8A]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {meta.exercises ? meta.exercises.map((ex: WorkoutExercise) => {
            const doneSets = ex.sets.filter((s) => s.done);
            return (
              <div key={ex.id} className="bg-[#0F0F1A] rounded-2xl p-3">
                <p className="text-white font-semibold text-sm mb-2">{ex.name}</p>
                {doneSets.length > 0 ? (
                  <div className="space-y-1">
                    {doneSets.map((set, i) => (
                      <div key={set.id} className="flex items-center gap-2">
                        <span className="text-[#6B6B8A] text-xs w-5">{i + 1}.</span>
                        <span className="text-[#A78BFA] text-xs">{set.weight ? `${set.weight} kg` : '—'}</span>
                        <span className="text-[#6B6B8A] text-xs">×</span>
                        <span className="text-white text-xs">{set.reps ?? '—'} rép.</span>
                        {set.isDropSet && <span className="text-[10px] text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded-full">Drop</span>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[#6B6B8A] text-xs">Aucune série complétée</p>}
              </div>
            );
          }) : <p className="text-[#6B6B8A] text-sm text-center py-6">Détail non disponible</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, isMe, imageIndex, onImageClick, onPlanClick, onSessionClick,
}: {
  msg: Message; isMe: boolean;
  imageIndex?: number;
  onImageClick: (index: number) => void;
  onPlanClick: (meta: PlanMeta) => void;
  onSessionClick: (meta: SessionMeta) => void;
}) {
  const meta = parseMeta(msg.metadata);
  const base = isMe ? 'bg-[#7C3AED] text-white rounded-br-sm' : 'bg-[#1A1A2E] text-white border border-[#2d1f5e] rounded-bl-sm';

  if (msg.type === 'image') {
    const { imageUrl } = meta as ImageMeta;
    return (
      <div className={['rounded-2xl overflow-hidden max-w-[78%] cursor-pointer', isMe ? 'rounded-br-sm' : 'rounded-bl-sm'].join(' ')} onClick={() => onImageClick(imageIndex ?? 0)}>
        <img src={imageUrl} alt="Photo" className="block max-w-full max-h-64 object-cover" />
      </div>
    );
  }

  if (msg.type === 'plan') {
    const planMeta = meta as PlanMeta;
    return (
      <div className={['max-w-[78%] rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity', isMe ? 'rounded-br-sm' : 'rounded-bl-sm'].join(' ')} onClick={() => onPlanClick(planMeta)}>
        <div className={['px-3.5 pt-3 pb-3', base].join(' ')}>
          <div className="flex items-center gap-2 mb-2">
            <div className={['w-7 h-7 rounded-lg flex items-center justify-center shrink-0', isMe ? 'bg-white/20' : 'bg-[#7C3AED]/20'].join(' ')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isMe ? 'white' : '#A78BFA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4v16" /><path d="M18 4v16" />
                <path d="M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3" />
                <path d="M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3" />
                <line x1="6" y1="12" x2="18" y2="12" />
              </svg>
            </div>
            <p className={['text-[10px] font-bold uppercase tracking-widest', isMe ? 'text-white/70' : 'text-[#A78BFA]'].join(' ')}>Programme</p>
          </div>
          <p className="text-sm font-bold leading-tight">{planMeta.planName}</p>
          <p className={['text-xs mt-1', isMe ? 'text-white/70' : 'text-[#6B6B8A]'].join(' ')}>{planMeta.sessionsCount} séance{planMeta.sessionsCount !== 1 ? 's' : ''} · {planMeta.exercisesCount} exercice{planMeta.exercisesCount !== 1 ? 's' : ''}</p>
          <p className={['text-[10px] mt-2 font-semibold', isMe ? 'text-white/50' : 'text-[#7C3AED]'].join(' ')}>Appuyer pour voir le détail →</p>
        </div>
      </div>
    );
  }

  if (msg.type === 'session') {
    const sessMeta = meta as SessionMeta;
    return (
      <div className={['max-w-[78%] rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity', isMe ? 'rounded-br-sm' : 'rounded-bl-sm'].join(' ')} onClick={() => onSessionClick(sessMeta)}>
        <div className={['px-3.5 pt-3 pb-3', base].join(' ')}>
          <div className="flex items-center gap-2 mb-2">
            <div className={['w-7 h-7 rounded-lg flex items-center justify-center shrink-0', isMe ? 'bg-white/20' : 'bg-[#7C3AED]/20'].join(' ')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isMe ? 'white' : '#A78BFA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" />
              </svg>
            </div>
            <p className={['text-[10px] font-bold uppercase tracking-widest', isMe ? 'text-white/70' : 'text-[#A78BFA]'].join(' ')}>Séance</p>
          </div>
          <p className="text-sm font-bold leading-tight">{sessMeta.sessionName}</p>
          <p className={['text-xs mt-1', isMe ? 'text-white/70' : 'text-[#6B6B8A]'].join(' ')}>
            {new Date(sessMeta.sessionDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            {sessMeta.totalVolumeKg > 0 && ` · ${formatVolume(sessMeta.totalVolumeKg)}`}
          </p>
          {sessMeta.topExercises?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {sessMeta.topExercises.slice(0, 3).map((ex: string) => (
                <span key={ex} className={['text-[10px] px-2 py-0.5 rounded-full', isMe ? 'bg-white/15' : 'bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA]'].join(' ')}>{ex}</span>
              ))}
              {sessMeta.exercisesCount > 3 && (
                <span className={['text-[10px] px-2 py-0.5 rounded-full', isMe ? 'bg-white/15' : 'bg-[#0F0F1A] border border-[#2d1f5e] text-[#6B6B8A]'].join(' ')}>+{sessMeta.exercisesCount - 3}</span>
              )}
            </div>
          )}
          <p className={['text-[10px] mt-2 font-semibold', isMe ? 'text-white/50' : 'text-[#7C3AED]'].join(' ')}>Appuyer pour voir le détail →</p>
        </div>
      </div>
    );
  }

  return (
    <div className={['max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed', base].join(' ')}>{msg.content}</div>
  );
}

// ─── Plan picker (multi-select) ───────────────────────────────────────────────

function PlanPicker({ onConfirm, onClose }: { onConfirm: (plans: WorkoutPlan[]) => void; onClose: () => void }) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/workout/plans')
      .then((r) => r.json())
      .then((data: WorkoutPlan[]) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1A1A2E] border-t border-[#2d1f5e] rounded-t-3xl max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#2d1f5e] shrink-0">
          <p className="text-white font-bold text-sm">Programmes</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#0F0F1A] flex items-center justify-center text-[#6B6B8A]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" /></div>
          ) : plans.length === 0 ? (
            <p className="text-[#6B6B8A] text-sm text-center py-10">Aucun programme créé</p>
          ) : plans.map((plan) => {
            const sessions = plan.sessions as WorkoutPlanSession[];
            const totalEx = sessions.reduce((s, sess) => s + sess.exercises.length, 0);
            const isSelected = selected.has(plan.id);
            return (
              <button key={plan.id} onClick={() => toggle(plan.id)} className={['w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#2d1f5e] last:border-0 transition-colors text-left', isSelected ? 'bg-[#7C3AED]/10' : 'hover:bg-[#0F0F1A]/60'].join(' ')}>
                <div className={['w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all', isSelected ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[#2d1f5e]'].join(' ')}>
                  {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v16" /><path d="M18 4v16" />
                    <path d="M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3" />
                    <path d="M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{plan.name}</p>
                  <p className="text-[#6B6B8A] text-xs">{sessions.length} séance{sessions.length !== 1 ? 's' : ''} · {totalEx} exercice{totalEx !== 1 ? 's' : ''}</p>
                </div>
              </button>
            );
          })}
        </div>
        {selected.size > 0 && (
          <div className="px-4 py-3 border-t border-[#2d1f5e] shrink-0">
            <button
              onClick={() => { onConfirm(plans.filter((p) => selected.has(p.id))); onClose(); }}
              className="w-full py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-2xl hover:bg-[#6D28D9] transition-colors"
            >
              Ajouter {selected.size} programme{selected.size > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session picker (multi-select) ───────────────────────────────────────────

function SessionPicker({ onConfirm, onClose }: { onConfirm: (sessions: WorkoutSession[]) => void; onClose: () => void }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/workout')
      .then((r) => r.json())
      .then((data: WorkoutSession[]) => {
        setSessions(Array.isArray(data) ? data.filter((s) => s.completedAt).slice(0, 15) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1A1A2E] border-t border-[#2d1f5e] rounded-t-3xl max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#2d1f5e] shrink-0">
          <p className="text-white font-bold text-sm">Séances</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#0F0F1A] flex items-center justify-center text-[#6B6B8A]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <p className="text-[#6B6B8A] text-sm text-center py-10">Aucune séance complétée</p>
          ) : sessions.map((sess) => {
            const vol = computeVolume(sess.exercises as WorkoutExercise[]);
            const isSelected = selected.has(sess.id);
            return (
              <button key={sess.id} onClick={() => toggle(sess.id)} className={['w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#2d1f5e] last:border-0 transition-colors text-left', isSelected ? 'bg-[#7C3AED]/10' : 'hover:bg-[#0F0F1A]/60'].join(' ')}>
                <div className={['w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all', isSelected ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[#2d1f5e]'].join(' ')}>
                  {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{sess.name}</p>
                  <p className="text-[#6B6B8A] text-xs">
                    {new Date(sess.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {vol > 0 && ` · ${formatVolume(vol)}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {selected.size > 0 && (
          <div className="px-4 py-3 border-t border-[#2d1f5e] shrink-0">
            <button
              onClick={() => { onConfirm(sessions.filter((s) => selected.has(s.id))); onClose(); }}
              className="w-full py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-2xl hover:bg-[#6D28D9] transition-colors"
            >
              Ajouter {selected.size} séance{selected.size > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanMeta | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionMeta | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Camera: capture="environment", no multiple
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Gallery: no capture, supports multiple
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/social/profile/${userId}`)
      .then((r) => r.json())
      .then((data: OtherUser & { error?: string }) => {
        if (!data.error) setOtherUser({ id: data.id, name: data.name, avatarUrl: data.avatarUrl });
      })
      .catch(() => {});
  }, [userId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/social/messages?userId=${userId}`);
    if (!res.ok) return;
    const data = await res.json() as Message[];
    if (Array.isArray(data)) setMessages(data);
  }, [userId]);

  useEffect(() => {
    loadMessages()
      .then(() => {
        setLoading(false);
        return fetch('/api/social/messages/read', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: userId }),
        });
      })
      .catch(() => { setLoading(false); });
  }, [userId, loadMessages]);

  useEffect(() => {
    pollingRef.current = setInterval(() => { void loadMessages(); }, 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadMessages]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ─── Pending queue helpers ────────────────────────────────────────────────

  function addImageFiles(files: FileList | File[]) {
    const newItems: PendingItem[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'image',
        label: file.name,
        previewUrl: URL.createObjectURL(file),
        file,
      }));
    setPending((prev) => [...prev, ...newItems]);
  }

  function addPlans(plans: WorkoutPlan[]) {
    const newItems: PendingItem[] = plans.map((plan) => ({
      id: `plan-${plan.id}`,
      type: 'plan',
      label: plan.name,
      planData: plan,
    }));
    setPending((prev) => [...prev, ...newItems]);
  }

  function addSessions(sessions: WorkoutSession[]) {
    const newItems: PendingItem[] = sessions.map((sess) => ({
      id: `sess-${sess.id}`,
      type: 'session',
      label: sess.name,
      sessionData: sess,
    }));
    setPending((prev) => [...prev, ...newItems]);
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  // ─── Send ────────────────────────────────────────────────────────────────

  async function sendMessage(payload: { content: string; type?: string; metadata?: Record<string, unknown> }) {
    const res = await fetch('/api/social/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: userId, ...payload }),
    });
    if (res.ok) {
      const msg = await res.json() as Message;
      setMessages((prev) => [...prev, msg]);
    }
  }

  async function handleSend() {
    if (sending) return;
    const hasText = input.trim().length > 0;
    const hasPending = pending.length > 0;
    if (!hasText && !hasPending) return;

    setSending(true);
    try {
      // Send each pending attachment first
      for (const item of pending) {
        if (item.type === 'image' && item.file) {
          const form = new FormData();
          form.append('file', item.file);
          const uploadRes = await fetch('/api/social/messages/upload', { method: 'POST', body: form });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json() as { url: string };
            await sendMessage({ content: '', type: 'image', metadata: { imageUrl: url } });
          }
        } else if (item.type === 'plan' && item.planData) {
          const sessions = item.planData.sessions as WorkoutPlanSession[];
          const totalEx = sessions.reduce((s, sess) => s + sess.exercises.length, 0);
          await sendMessage({
            content: '', type: 'plan',
            metadata: { planId: item.planData.id, planName: item.planData.name, sessionsCount: sessions.length, exercisesCount: totalEx, sessions },
          });
        } else if (item.type === 'session' && item.sessionData) {
          const exercises = item.sessionData.exercises as WorkoutExercise[];
          const vol = computeVolume(exercises);
          const topEx = exercises.slice(0, 5).map((e) => e.name);
          await sendMessage({
            content: '', type: 'session',
            metadata: { sessionId: item.sessionData.id, sessionName: item.sessionData.name, sessionDate: item.sessionData.date, exercisesCount: exercises.length, totalVolumeKg: vol, topExercises: topEx, exercises },
          });
        }
        // Revoke preview URL
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      // Send text message
      if (hasText) {
        await sendMessage({ content: input.trim() });
      }
      setInput('');
      setPending([]);
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }

  const canSend = (input.trim().length > 0 || pending.length > 0) && !sending;
  const name = otherUser?.name ?? 'Utilisateur';
  const initials = name.slice(0, 2).toUpperCase();
  const imageUrls = messages.filter(m => m.type === 'image').map(m => (parseMeta(m.metadata) as ImageMeta).imageUrl);

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto bg-[#0F0F1A]">
      {/* Camera input: capture forces camera, no multiple */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { if (e.target.files) addImageFiles(e.target.files); e.target.value = ''; }}
      />
      {/* Gallery input: no capture, allows multiple */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) addImageFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1A1A2E] border-b border-[#2d1f5e] shrink-0">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA] shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/profile/${userId}`)}>
          {otherUser?.avatarUrl ? (
            <img src={otherUser.avatarUrl} alt={name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-sm font-bold text-white select-none shrink-0">{initials}</div>
          )}
          <p className="text-white font-semibold text-sm truncate">{name}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" onClick={() => setShowAttachMenu(false)}>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-2xl font-bold text-white mb-4 select-none">{initials}</div>
            <p className="text-white font-semibold mb-1">{name}</p>
            <p className="text-[#6B6B8A] text-sm">Démarrez la conversation !</p>
          </div>
        ) : (() => {
          let imgCounter = -1;
          return messages.map((msg, idx) => {
            const isMe = msg.senderId === myId;
            if (msg.type === 'image') imgCounter++;
            const imgIdx = msg.type === 'image' ? imgCounter : undefined;
            return (
              <div key={msg.id}>
                {shouldShowTime(messages, idx) && (
                  <p className="text-center text-[10px] text-[#6B6B8A] my-3">{formatTime(msg.createdAt)}</p>
                )}
                <div className={['flex', isMe ? 'justify-end' : 'justify-start'].join(' ')}>
                  <MessageBubble msg={msg} isMe={isMe} imageIndex={imgIdx} onImageClick={setLightboxIndex} onPlanClick={setSelectedPlan} onSessionClick={setSelectedSession} />
                </div>
              </div>
            );
          });
        })()}
        <div ref={bottomRef} />
      </div>

      {/* Attach menu */}
      {showAttachMenu && (
        <div className="px-4 pb-2 shrink-0">
          <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-1 flex gap-1">
            <button onClick={() => { setShowAttachMenu(false); cameraInputRef.current?.click(); }} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-[#0F0F1A] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <span className="text-[11px] text-[#A78BFA] font-semibold">Caméra</span>
            </button>
            <button onClick={() => { setShowAttachMenu(false); galleryInputRef.current?.click(); }} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-[#0F0F1A] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <span className="text-[11px] text-[#A78BFA] font-semibold">Pellicule</span>
            </button>
            <button onClick={() => { setShowAttachMenu(false); setShowPlanPicker(true); }} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-[#0F0F1A] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4v16" /><path d="M18 4v16" />
                  <path d="M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3" />
                  <path d="M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </div>
              <span className="text-[11px] text-[#A78BFA] font-semibold">Programme</span>
            </button>
            <button onClick={() => { setShowAttachMenu(false); setShowSessionPicker(true); }} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-[#0F0F1A] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" />
                </svg>
              </div>
              <span className="text-[11px] text-[#A78BFA] font-semibold">Séance</span>
            </button>
          </div>
        </div>
      )}

      {/* Pending attachments preview */}
      {pending.length > 0 && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pending.map((item) => (
              <div key={item.id} className="relative shrink-0">
                {item.type === 'image' && item.previewUrl ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#2d1f5e]">
                    <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-10 flex items-center gap-2 bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {item.type === 'plan' ? (
                        <><path d="M6 4v16" /><path d="M18 4v16" /><path d="M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3" /><path d="M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3" /><line x1="6" y1="12" x2="18" y2="12" /></>
                      ) : (
                        <><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" /></>
                      )}
                    </svg>
                    <span className="text-[11px] text-white font-medium max-w-[80px] truncate">{item.label}</span>
                  </div>
                )}
                <button
                  onClick={() => removePending(item.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#2d1f5e] border border-[#0F0F1A] rounded-full flex items-center justify-center text-white"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 bg-[#1A1A2E] border-t border-[#2d1f5e] shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowAttachMenu((v) => !v)}
            className={['w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-all', showAttachMenu ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'border-[#2d1f5e] text-[#A78BFA] hover:bg-[#2d1f5e]/40'].join(' ')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={pending.length > 0 ? 'Ajouter un message (optionnel)…' : 'Votre message…'}
            className="flex-1 bg-[#0F0F1A] border border-[#2d1f5e] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="w-10 h-10 rounded-2xl bg-[#7C3AED] flex items-center justify-center text-white shrink-0 disabled:opacity-40 hover:bg-[#6D28D9] transition-colors"
          >
            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Pickers */}
      {showPlanPicker && <PlanPicker onConfirm={addPlans} onClose={() => setShowPlanPicker(false)} />}
      {showSessionPicker && <SessionPicker onConfirm={addSessions} onClose={() => setShowSessionPicker(false)} />}

      {/* View modals */}
      {lightboxIndex !== null && <Lightbox urls={imageUrls} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNav={setLightboxIndex} />}
      {selectedPlan && <PlanDetail meta={selectedPlan} onClose={() => setSelectedPlan(null)} />}
      {selectedSession && <SessionDetail meta={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
}
