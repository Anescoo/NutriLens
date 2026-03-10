'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { exportWorkoutPdf, type ExportStyle } from '@/lib/exportPdf';
import type { WorkoutSession, WorkoutPlan, BodyMeasurement } from '@/types';

export function ExportSection() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<ExportStyle | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(style: ExportStyle) {
    setLoading(style);
    setError(null);
    try {
      const [plans, sessions, measurements] = await Promise.all([
        fetch('/api/workout/plans').then((r) => r.json()),
        fetch('/api/workout').then((r) => r.json()),
        fetch('/api/body').then((r) => r.json()),
      ]);

      await exportWorkoutPdf(
        {
          plans: Array.isArray(plans) ? (plans as WorkoutPlan[]) : [],
          sessions: Array.isArray(sessions) ? (sessions as WorkoutSession[]) : [],
          measurements: Array.isArray(measurements) ? (measurements as BodyMeasurement[]) : [],
          userName:
            session?.user?.name ??
            session?.user?.email?.split('@')[0] ??
            'Utilisateur',
        },
        style
      );
    } catch (e) {
      console.error('[export pdf]', e);
      setError('Erreur lors de la génération du PDF. Réessaie.');
    }
    setLoading(null);
  }

  return (
    <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
      <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-1">
        Exporter mes données
      </h2>
      <p className="text-[#6B6B8A] text-xs mb-3">
        Plans, suivi des charges et mesures corporelles au format PDF.
      </p>

      <div className="flex gap-2">
        {/* Table version */}
        <button
          onClick={() => handleExport('table')}
          disabled={loading !== null}
          className="flex-1 py-2.5 rounded-xl bg-[#0F0F1A] border border-[#2d1f5e] text-[#A78BFA] text-xs font-semibold hover:border-[#7C3AED] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
        >
          {loading === 'table' ? (
            <Spinner />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          )}
          Tableau
        </button>

        {/* Styled version */}
        <button
          onClick={() => handleExport('styled')}
          disabled={loading !== null}
          className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
        >
          {loading === 'styled' ? (
            <Spinner />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          )}
          Mise en page
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      <p className="text-[#6B6B8A] text-[10px] mt-2">
        Le fichier PDF se télécharge directement dans le navigateur.
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin shrink-0" />
  );
}
