'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { WorkoutPlanSession, WorkoutPlanExercise } from '@/types';

interface SharedPlanData {
  name: string;
  sessions: WorkoutPlanSession[];
  createdAt: number;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<SharedPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        if (r.status === 410) { setDeleted(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setPlan(data); setLoading(false); }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  // SSE: watch for real-time plan deletion while the page is open
  useEffect(() => {
    if (!plan) return;
    const es = new EventSource(`/api/share/${token}/stream`);
    es.onmessage = (e) => {
      if (e.data === 'deleted') {
        setPlan(null);
        setDeleted(true);
        es.close();
      }
    };
    return () => es.close();
  }, [plan, token]);

  async function handleImport() {
    if (!plan) return;
    setImporting(true);
    setImportError('');
    try {
      const res = await fetch('/api/workout/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plan.name, sessions: plan.sessions }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=/share/${token}`);
        return;
      }
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setImported(true);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F0F1A] flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-10 pb-28">
        <div className="w-full max-w-lg mx-auto">

          {/* Logo / brand */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base">NutriLens</span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Not found */}
          {notFound && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔗</div>
              <p className="text-white font-semibold text-lg">Lien invalide</p>
              <p className="text-[#6B6B8A] text-sm mt-1">Ce lien de partage n&apos;existe pas ou a expiré.</p>
            </div>
          )}

          {/* Plan deleted */}
          {deleted && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🗑️</div>
              <p className="text-white font-semibold text-lg">Plan supprimé</p>
              <p className="text-[#6B6B8A] text-sm mt-2">
                L&apos;auteur a supprimé ce plan d&apos;entraînement.<br />
                Il n&apos;est plus disponible à l&apos;import.
              </p>
            </div>
          )}

          {/* Plan content */}
          {plan && (() => {
            const totalExercises = plan.sessions.reduce((s, sess) => s + sess.exercises.length, 0);
            return (
              <>
                <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
                  <p className="text-xs text-[#A78BFA] font-semibold uppercase tracking-wider mb-1">Plan partagé</p>
                  <h1 className="text-white font-bold text-xl mb-1 break-words">{plan.name}</h1>
                  <p className="text-[#6B6B8A] text-sm">
                    {plan.sessions.length} séance{plan.sessions.length > 1 ? 's' : ''} · {totalExercises} exercice{totalExercises > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-3">
                  {plan.sessions.map((session: WorkoutPlanSession) => (
                    <div key={session.id} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-[#2d1f5e]/40 border-b border-[#2d1f5e] flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{session.name}</span>
                        <span className="text-[10px] text-[#6B6B8A]">{session.exercises.length} ex.</span>
                      </div>
                      <div className="px-3 py-2 space-y-1.5">
                        {session.exercises.map((ex: WorkoutPlanExercise) => (
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
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

        </div>
      </div>

      {/* Sticky import button — only when plan is loaded */}
      {plan && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#0F0F1A]/90 backdrop-blur-md border-t border-[#2d1f5e]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <div className="max-w-lg mx-auto">
            {imported ? (
              <div className="flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-emerald-400 font-semibold text-sm">Plan importé !</p>
                  <p className="text-[#6B6B8A] text-xs mt-0.5">Retrouve-le dans l&apos;onglet Plans.</p>
                </div>
                <button
                  onClick={() => router.push('/workout')}
                  className="px-4 py-2 bg-[#7C3AED] text-white rounded-xl text-sm font-semibold shrink-0"
                >
                  Voir mes plans
                </button>
              </div>
            ) : (
              <>
                {importError && (
                  <p className="text-red-400 text-xs text-center mb-2">{importError}</p>
                )}
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full py-3.5 bg-[#7C3AED] disabled:opacity-50 text-white rounded-2xl font-bold text-base transition-colors hover:bg-[#6D28D9]"
                >
                  {importing ? 'Importation…' : 'Importer ce plan dans mon compte'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
