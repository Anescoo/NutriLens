'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { WorkoutSession } from '@/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function SessionCard({
  session,
  onDelete,
}: {
  session: WorkoutSession;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = session.exercises.reduce(
    (s, e) => s + e.sets.filter((set) => set.done).length,
    0
  );
  const isComplete = !!session.completedAt;

  // Group info
  const groups = new Map<string, string>();
  session.exercises.forEach((e) => {
    if (e.groupId && e.groupType && !groups.has(e.groupId)) {
      groups.set(e.groupId, e.groupType);
    }
  });

  return (
    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[#A78BFA] font-semibold uppercase tracking-wider">
              {formatDate(session.date)}
            </span>
            {isComplete && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                Terminée
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-base truncate">{session.name}</h3>
          <p className="text-[#6B6B8A] text-sm mt-0.5">
            {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''} ·{' '}
            {totalSets} série{totalSets > 1 ? 's' : ''}
            {isComplete ? '' : ` · ${doneSets}/${totalSets} faites`}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {session.exercises.slice(0, 4).map((ex) => (
              <span
                key={ex.id}
                className="text-[11px] bg-[#0F0F1A] text-[#A78BFA] px-2 py-0.5 rounded-full border border-[#2d1f5e]"
              >
                {ex.name}
              </span>
            ))}
            {session.exercises.length > 4 && (
              <span className="text-[11px] text-[#6B6B8A] px-1">
                +{session.exercises.length - 4}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/workout/${session.id}`}
            className="px-3 py-1.5 bg-[#7C3AED]/20 text-[#A78BFA] rounded-xl text-sm font-semibold border border-[#7C3AED]/30 hover:bg-[#7C3AED]/30 transition-colors"
          >
            {isComplete ? 'Voir' : 'Reprendre'}
          </Link>
          {confirming ? (
            <button
              onClick={() => onDelete(session.id)}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold border border-red-500/30"
            >
              Confirmer
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              onBlur={() => setConfirming(false)}
              className="px-3 py-1.5 text-[#6B6B8A] rounded-xl text-sm hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workout')
      .then((r) => r.json())
      .then((s) => { setSessions(s); setLoading(false); });
  }, []);

  async function handleDelete(id: string) {
    await fetch('/api/workout/' + id, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  // Group sessions by month
  const byMonth = sessions.reduce<Record<string, WorkoutSession[]>>((acc, s) => {
    const month = s.date.slice(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month].push(s);
    return acc;
  }, {});

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-[#0F0F1A] pb-32 pt-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Musculation</h1>
            <p className="text-[#6B6B8A] text-sm mt-0.5">
              {sessions.length} séance{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/workout/new"
            className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-900/40 hover:bg-[#6D28D9] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏋️</div>
            <p className="text-white font-semibold text-lg">Aucune séance</p>
            <p className="text-[#6B6B8A] text-sm mt-1 mb-6">
              Crée ta première séance pour commencer le suivi
            </p>
            <Link
              href="/workout/new"
              className="inline-flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold"
            >
              Créer une séance
            </Link>
          </div>
        )}

        {!loading &&
          Object.entries(byMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, monthSessions]) => (
              <div key={month} className="mb-6">
                <h2 className="text-[#6B6B8A] text-xs font-semibold uppercase tracking-wider mb-3">
                  {monthLabel(month)}
                </h2>
                <div className="flex flex-col gap-3">
                  {monthSessions.map((s) => (
                    <SessionCard key={s.id} session={s} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            ))}
      </div>
    </main>
  );
}
