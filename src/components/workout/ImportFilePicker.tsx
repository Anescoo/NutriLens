'use client';

import { useState, useRef } from 'react';
import { importPlanFromFile, type ParsedPlan } from '@/lib/importPlanPdf';
import type { WorkoutPlan } from '@/types';

interface Props {
  onSave: (data: Omit<WorkoutPlan, 'id' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export function ImportFilePicker({ onSave, onClose }: Props) {
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedPlan | null>(null);
  const [planName, setPlanName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    setParsed(null);
    try {
      const result = await importPlanFromFile(file);
      if (result.sessions.length === 0) {
        setError('Aucun exercice détecté. Vérifie le format du fichier.');
        setParsing(false);
        return;
      }
      setParsed(result);
      setPlanName(result.name);
    } catch (e) {
      console.error('[import plan]', e);
      setError('Erreur lors de la lecture du fichier.');
    }
    setParsing(false);
  }

  async function handleConfirm() {
    if (!parsed) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: planName.trim() || parsed.name,
        sessions: parsed.sessions.map((s) => ({
          id: uid(),
          name: s.name,
          exercises: s.exercises.map((e) => ({ id: uid(), name: e.name, sets: e.sets, ...(e.reps !== undefined && { reps: e.reps }), ...(e.time !== undefined && { time: e.time }) })),
        })),
        isPublic: false,
      });
      onClose();
    } catch {
      setError('Erreur lors de la sauvegarde. Réessaie.');
      setSaving(false);
    }
  }

  const totalExercises = parsed?.sessions.reduce((s, sess) => s + sess.exercises.length, 0) ?? 0;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex flex-col justify-end"
      onClick={onClose}
    >
      <div
        className="bg-[#0F0F1A] rounded-t-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div className="shrink-0 pt-3 pb-4 px-4 border-b border-[#2d1f5e]">
          <div className="w-10 h-1 bg-[#2d1f5e] rounded-full mx-auto mb-4" />
          <h2 className="text-base font-bold text-white">Importer un plan</h2>
          <p className="text-[#6B6B8A] text-xs mt-0.5">Fichier PDF, TXT ou CSV</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {!parsed ? (
            <>
              {/* Drop zone */}
              <button
                onClick={() => inputRef.current?.click()}
                disabled={parsing}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-[#2d1f5e] hover:border-[#7C3AED]/60 transition-colors flex flex-col items-center gap-3 disabled:opacity-60"
              >
                {parsing ? (
                  <>
                    <div className="w-7 h-7 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#6B6B8A] text-sm">Analyse en cours…</p>
                  </>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="12" x2="12" y2="18"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <div className="text-center">
                      <p className="text-[#A78BFA] text-sm font-semibold">Choisir un fichier</p>
                      <p className="text-[#6B6B8A] text-xs mt-0.5">.pdf · .txt · .csv</p>
                    </div>
                  </>
                )}
              </button>

              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {error && (
                <p className="text-red-400 text-xs mt-3 text-center">{error}</p>
              )}

              {/* Format hint */}
              <div className="mt-4 bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl p-3">
                <p className="text-[10px] text-[#6B6B8A] font-semibold uppercase tracking-wider mb-2">
                  Format CSV attendu
                </p>
                <div className="bg-[#0F0F1A] rounded-lg p-2.5 font-mono text-[10px] text-[#A78BFA] leading-relaxed">
                  Séance,Exercice,Séries<br />
                  Push,Développé couché,4<br />
                  Push,Développé incliné,3<br />
                  Pull,Tractions,4<br />
                  Pull,Rowing barre,4
                </div>
                <p className="text-[10px] text-[#6B6B8A] mt-2">
                  Pour PDF/TXT : le parseur détecte automatiquement les séances (titres courts, majuscules, ou finissant par &quot;:&quot;) et les exercices (lignes avec séries, ou précédées d&apos;un tiret).
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Plan name input */}
              <div className="mb-4">
                <label className="text-[10px] text-[#6B6B8A] font-semibold uppercase tracking-wider block mb-1.5">
                  Nom du plan
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Preview */}
              <p className="text-[10px] text-[#6B6B8A] font-semibold uppercase tracking-wider mb-2">
                Aperçu — {parsed.sessions.length} séance{parsed.sessions.length > 1 ? 's' : ''} · {totalExercises} exercice{totalExercises > 1 ? 's' : ''}
              </p>

              <div className="space-y-2.5">
                {parsed.sessions.map((session, si) => {
                  const hasReps = session.exercises.some((e) => e.reps !== undefined);
                  const hasTime = session.exercises.some((e) => e.time !== undefined);
                  return (
                    <div key={si} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-[#2d1f5e]/40 border-b border-[#2d1f5e] flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{session.name}</span>
                        <span className="text-[10px] text-[#6B6B8A]">
                          {session.exercises.length} ex.
                        </span>
                      </div>
                      <div className="px-3 py-2 space-y-1.5">
                        {session.exercises.map((ex, ei) => (
                          <div key={ei} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-white flex-1 min-w-0 truncate">{ex.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-[#A78BFA]">
                                {ex.sets} série{ex.sets > 1 ? 's' : ''}
                              </span>
                              {hasReps && (
                                <span className="text-xs text-emerald-400">
                                  {ex.reps !== undefined ? `× ${ex.reps} rép.` : ''}
                                </span>
                              )}
                              {hasTime && (
                                <span className="text-xs text-sky-400">
                                  {ex.time ?? ''}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="text-red-400 text-xs mt-3 text-center">{error}</p>
              )}

              <button
                onClick={() => { setParsed(null); setPlanName(''); setError(null); }}
                className="w-full mt-3 py-2 text-[#6B6B8A] text-xs hover:text-[#A78BFA] transition-colors"
              >
                Choisir un autre fichier
              </button>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div
          className="shrink-0 px-4 py-3 border-t border-[#2d1f5e] flex gap-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] text-[#6B6B8A] text-sm font-semibold hover:border-[#7C3AED]/40 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>
          {parsed && (
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {saving ? 'Sauvegarde…' : 'Importer le plan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
