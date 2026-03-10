'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { useGoalsStore } from '@/store/goalsStore';
import { NotificationSection } from '@/components/profile/NotificationSection';
import { ExportSection } from '@/components/profile/ExportSection';
import type { BodyMeasurement } from '@/types';

function calcBMI(weight: number, height: number) {
  return weight / Math.pow(height / 100, 2);
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Insuffisance pondérale', color: '#60a5fa' };
  if (bmi < 25) return { label: 'Corpulence normale', color: '#10b981' };
  if (bmi < 30) return { label: 'Surpoids', color: '#f59e0b' };
  return { label: 'Obésité', color: '#ef4444' };
}

interface MealRow {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div className="bg-[#0F0F1A] rounded-2xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
      <p className="text-xl font-bold text-white leading-none">{value}</p>
      {unit && <p className="text-[10px] text-[#6B6B8A] mt-0.5">{unit}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">{children}</h2>;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { goals, loadGoals } = useGoalsStore();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  useEffect(() => {
    Promise.all([
      fetch('/api/body').then((r) => r.json()),
      fetch('/api/meals').then((r) => r.json()),
    ]).then(([body, mealData]) => {
      setMeasurements(Array.isArray(body) ? body : []);
      setMeals(Array.isArray(mealData) ? mealData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const latest = measurements[measurements.length - 1];
  const prev = measurements[measurements.length - 2];
  const latestHeight = [...measurements].reverse().find((m) => m.height != null)?.height;
  const bmi = latest && latestHeight ? calcBMI(latest.weight, latestHeight) : null;
  const bmiInfo = bmi ? bmiCategory(bmi) : null;
  const weightDelta = latest && prev ? latest.weight - prev.weight : null;

  // Last 7 days nutrition
  const last7 = getLast7Days();
  const weekMeals = meals.filter((m) => last7.includes(m.date));
  const byDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  for (const m of weekMeals) {
    const cur = byDate.get(m.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    byDate.set(m.date, {
      calories: cur.calories + m.calories,
      protein: cur.protein + m.protein,
      carbs: cur.carbs + m.carbs,
      fat: cur.fat + m.fat,
    });
  }
  const activeDays = byDate.size;
  const dayValues = [...byDate.values()];
  const avgCalories = activeDays > 0 ? Math.round(dayValues.reduce((s, v) => s + v.calories, 0) / activeDays) : 0;
  const avgProtein = activeDays > 0 ? Math.round(dayValues.reduce((s, v) => s + v.protein, 0) / activeDays) : 0;
  const avgCarbs = activeDays > 0 ? Math.round(dayValues.reduce((s, v) => s + v.carbs, 0) / activeDays) : 0;
  const avgFat = activeDays > 0 ? Math.round(dayValues.reduce((s, v) => s + v.fat, 0) / activeDays) : 0;

  // Total meals logged all time
  const totalMeals = meals.length;
  const uniqueDays = new Set(meals.map((m) => m.date)).size;

  const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'Utilisateur';
  const email = session?.user?.email || '';
  const initials = name.slice(0, 2).toUpperCase();

  const macroAvgs = [
    { label: 'Calories', value: avgCalories, goal: goals.calories, unit: 'kcal', color: '#EC4899' },
    { label: 'Protéines', value: avgProtein, goal: goals.protein, unit: 'g', color: '#7C3AED' },
    { label: 'Glucides', value: avgCarbs, goal: goals.carbs, unit: 'g', color: '#A78BFA' },
    { label: 'Lipides', value: avgFat, goal: goals.fat, unit: 'g', color: '#06B6D4' },
  ];

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Profil" subtitle="Ton espace personnel" />

      {/* Avatar + identity */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-2xl font-bold text-white shrink-0 select-none">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-white truncate">{name}</p>
          <p className="text-sm text-[#6B6B8A] truncate">{email}</p>
          <p className="text-[10px] text-[#6B6B8A] mt-1">{uniqueDays} jour{uniqueDays > 1 ? 's' : ''} de suivi · {totalMeals} repas</p>
        </div>
      </div>

      {/* Body composition */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Composition corporelle</SectionTitle>
          <Link href="/body" className="text-[10px] text-[#7C3AED] hover:text-[#A78BFA] transition-colors">Voir tout</Link>
        </div>
        {loading ? (
          <p className="text-[#6B6B8A] text-sm text-center py-4">Chargement…</p>
        ) : latest ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <StatCard label="Poids" value={latest.weight.toFixed(1)} unit="kg" color="#7C3AED" />
              {bmi && bmiInfo && <StatCard label="IMC" value={bmi.toFixed(1)} unit={bmiInfo.label} color={bmiInfo.color} />}
              {latest.bodyFat != null && <StatCard label="Masse grasse" value={`${latest.bodyFat.toFixed(1)}%`} color="#f59e0b" />}
              {latest.muscleMass != null && <StatCard label="Muscle" value={`${latest.muscleMass.toFixed(1)}`} unit="kg" color="#10b981" />}
              {latestHeight && <StatCard label="Taille" value={String(latestHeight)} unit="cm" color="#60a5fa" />}
              {latest.waist != null && <StatCard label="Tour taille" value={`${latest.waist}`} unit="cm" color="#6B6B8A" />}
            </div>
            {weightDelta !== null && (
              <p className="text-[10px] text-center" style={{ color: weightDelta < 0 ? '#10b981' : weightDelta > 0 ? '#f59e0b' : '#6B6B8A' }}>
                {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg depuis la mesure précédente
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-[#6B6B8A] text-sm mb-2">Aucune mesure enregistrée</p>
            <Link href="/body" className="text-xs text-[#7C3AED] hover:text-[#A78BFA]">Ajouter une mesure →</Link>
          </div>
        )}
      </div>

      {/* Weekly nutrition */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Nutrition — 7 derniers jours</SectionTitle>
          <Link href="/journal" className="text-[10px] text-[#7C3AED] hover:text-[#A78BFA] transition-colors">Journal</Link>
        </div>
        {loading ? (
          <p className="text-[#6B6B8A] text-sm text-center py-4">Chargement…</p>
        ) : activeDays === 0 ? (
          <div className="text-center py-4">
            <p className="text-[#6B6B8A] text-sm mb-2">Aucun repas enregistré cette semaine</p>
            <Link href="/journal" className="text-xs text-[#7C3AED] hover:text-[#A78BFA]">Ouvrir le journal →</Link>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-[#6B6B8A] mb-3">{activeDays} jour{activeDays > 1 ? 's' : ''} avec des données · moyennes journalières</p>
            <div className="space-y-2">
              {macroAvgs.map(({ label, value, goal, unit, color }) => {
                const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : null;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#6B6B8A]">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{value} {unit}</span>
                        {pct !== null && (
                          <span className="text-[10px]" style={{ color }}>{pct}%</span>
                        )}
                      </div>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 bg-[#0F0F1A] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Goals summary */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Objectifs</SectionTitle>
          <Link href="/goals" className="text-[10px] text-[#7C3AED] hover:text-[#A78BFA] transition-colors">Modifier</Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Calories', value: goals.calories, unit: 'kcal', color: '#EC4899' },
            { label: 'Protéines', value: goals.protein, unit: 'g', color: '#7C3AED' },
            { label: 'Glucides', value: goals.carbs, unit: 'g', color: '#A78BFA' },
            { label: 'Lipides', value: goals.fat, unit: 'g', color: '#06B6D4' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="bg-[#0F0F1A] rounded-xl px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-[#6B6B8A]">{label}</span>
              <span className="text-sm font-bold" style={{ color }}>{value} <span className="text-[10px] font-normal text-[#6B6B8A]">{unit}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <ExportSection />

      {/* Notifications */}
      <NotificationSection />

      {/* Account */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <SectionTitle>Compte</SectionTitle>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B6B8A]">Adresse email</span>
            <span className="text-sm text-white truncate max-w-[60%] text-right">{email}</span>
          </div>
          <div className="border-t border-[#2d1f5e]" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B6B8A]">Repas enregistrés</span>
            <span className="text-sm text-white">{totalMeals}</span>
          </div>
          <div className="border-t border-[#2d1f5e]" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B6B8A]">Mesures corporelles</span>
            <span className="text-sm text-white">{measurements.length}</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full py-3.5 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold text-sm transition-all"
      >
        Se déconnecter
      </button>
    </main>
  );
}
