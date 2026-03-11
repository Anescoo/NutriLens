'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { useGoalsStore } from '@/store/goalsStore';
import { NotificationSection } from '@/components/profile/NotificationSection';
import { ExportSection } from '@/components/profile/ExportSection';
import { StreakFlame } from '@/components/ui/StreakFlame';
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

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  followersCount: number;
  followingCount: number;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { goals, loadGoals } = useGoalsStore();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [streaks, setStreaks] = useState({ nutritionStreak: 0, workoutStreak: 0 });
  const [workoutFrequency, setWorkoutFrequency] = useState(3);

  // Social profile state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  useEffect(() => {
    Promise.all([
      fetch('/api/body').then((r) => r.json()),
      fetch('/api/meals').then((r) => r.json()),
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/streaks').then((r) => r.ok ? r.json() : { nutritionStreak: 0, workoutStreak: 0 }),
    ]).then(([body, mealData, profile, streakData]) => {
      setMeasurements(Array.isArray(body) ? body : []);
      setMeals(Array.isArray(mealData) ? mealData : []);
      if (profile && !profile.error) {
        setProfileData(profile as ProfileData);
        setBioValue(profile.bio ?? '');
      }
      const sd = streakData as { nutritionStreak: number; workoutStreak: number; workoutFrequency?: number };
      setStreaks({ nutritionStreak: sd.nutritionStreak, workoutStreak: sd.workoutStreak });
      if (sd.workoutFrequency) setWorkoutFrequency(sd.workoutFrequency);
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

  const name = profileData?.name || session?.user?.name || session?.user?.email?.split('@')[0] || 'Utilisateur';
  const email = profileData?.email || session?.user?.email || '';
  const initials = name.slice(0, 2).toUpperCase();

  const macroAvgs = [
    { label: 'Calories', value: avgCalories, goal: goals.calories, unit: 'kcal', color: '#EC4899' },
    { label: 'Protéines', value: avgProtein, goal: goals.protein, unit: 'g', color: '#7C3AED' },
    { label: 'Glucides', value: avgCarbs, goal: goals.carbs, unit: 'g', color: '#A78BFA' },
    { label: 'Lipides', value: avgFat, goal: goals.fat, unit: 'g', color: '#06B6D4' },
  ];

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
      const data = await res.json() as { avatarUrl?: string };
      if (data.avatarUrl) {
        setProfileData((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl! } : prev);
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleBioBlur() {
    setEditingBio(false);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: bioValue }),
    });
    setProfileData((prev) => prev ? { ...prev, bio: bioValue } : prev);
  }

  async function handlePublicToggle(val: boolean) {
    setProfileData((prev) => prev ? { ...prev, isPublic: val } : prev);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: val }),
    });
  }

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Profil" subtitle="Ton espace personnel" />

      {/* Avatar + identity */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-4">
          {/* Avatar with upload button */}
          <div className="relative shrink-0">
            {profileData?.avatarUrl ? (
              <img
                src={profileData.avatarUrl}
                alt={name}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-2xl font-bold text-white select-none">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#7C3AED] flex items-center justify-center shadow-lg border border-[#0F0F1A] transition-opacity hover:opacity-80"
              aria-label="Changer la photo de profil"
            >
              {avatarUploading ? (
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white truncate">{name}</p>
            <p className="text-sm text-[#6B6B8A] truncate">{email}</p>
            <p className="text-[10px] text-[#6B6B8A] mt-1">{uniqueDays} jour{uniqueDays > 1 ? 's' : ''} de suivi · {totalMeals} repas</p>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-3">
          {editingBio ? (
            <textarea
              autoFocus
              value={bioValue}
              onChange={(e) => setBioValue(e.target.value)}
              onBlur={handleBioBlur}
              rows={2}
              className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-[#7C3AED]"
              placeholder="Écris ta bio…"
            />
          ) : (
            <button
              onClick={() => setEditingBio(true)}
              className="w-full text-left text-sm"
            >
              {profileData?.bio ? (
                <span className="text-white">{profileData.bio}</span>
              ) : (
                <span className="text-[#6B6B8A] italic">Ajouter une bio…</span>
              )}
            </button>
          )}
        </div>

        {/* Public profile toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2d1f5e]">
          <span className="text-sm text-[#6B6B8A]">Profil public</span>
          <button
            onClick={() => handlePublicToggle(!(profileData?.isPublic ?? true))}
            className={[
              'relative w-10 h-5 rounded-full transition-colors duration-200',
              (profileData?.isPublic ?? true) ? 'bg-[#7C3AED]' : 'bg-[#2d1f5e]',
            ].join(' ')}
            aria-label="Basculer profil public"
          >
            <span
              className={[
                'absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all duration-200',
                (profileData?.isPublic ?? true) ? 'left-[23px]' : 'left-[3px]',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Followers/following */}
        {profileData && (
          <div className="mt-3 pt-3 border-t border-[#2d1f5e] flex items-center gap-4">
            <Link href="/profile/connections?type=followers" className="text-sm hover:opacity-80 transition-opacity">
              <span className="font-semibold text-white">{profileData.followersCount}</span>
              <span className="text-[#6B6B8A] ml-1">abonné{profileData.followersCount !== 1 ? 's' : ''}</span>
            </Link>
            <span className="text-[#2d1f5e]">·</span>
            <Link href="/profile/connections?type=following" className="text-sm hover:opacity-80 transition-opacity">
              <span className="font-semibold text-white">{profileData.followingCount}</span>
              <span className="text-[#6B6B8A] ml-1">abonnement{profileData.followingCount !== 1 ? 's' : ''}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Streaks */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <SectionTitle>Séries actives</SectionTitle>
          {/* DEV — cycle through streak tiers to preview animations */}
          <button
            onClick={() => {
              const steps = [0, 1, 3, 7, 14, 30];
              const next = (n: number) => steps[(steps.indexOf(steps.find((s) => s >= n) ?? 0) + 1) % steps.length];
              setStreaks((s) => ({ nutritionStreak: next(s.nutritionStreak), workoutStreak: next(s.workoutStreak) }));
            }}
            className="text-[10px] text-[#6B6B8A] border border-[#2d1f5e] rounded-lg px-2 py-1 hover:border-[#7C3AED] hover:text-[#A78BFA] transition-all"
          >
            test 🧪
          </button>
        </div>
        <div className="flex items-center justify-around py-2">
          <StreakFlame count={streaks.nutritionStreak} label="Nutrition" unit="j." />
          <div className="w-px self-stretch bg-[#2d1f5e]" />
          <StreakFlame count={streaks.workoutStreak} label="Musculation" unit="sem." />
        </div>
        {/* Workout frequency selector */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2d1f5e]">
          <p className="text-[11px] text-[#6B6B8A]">Objectif musculation</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={async () => {
                  setWorkoutFrequency(n);
                  await fetch('/api/goals', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workoutFrequency: n }),
                  });
                }}
                className={[
                  'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                  workoutFrequency === n
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-[#0F0F1A] border border-[#2d1f5e] text-[#6B6B8A] hover:border-[#7C3AED]/60 hover:text-[#A78BFA]',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
            <span className="text-[11px] text-[#6B6B8A] ml-1">/ sem.</span>
          </div>
        </div>
        <p className="text-center text-[10px] text-[#6B6B8A] mt-2">
          Nutrition : jours consécutifs · Musculation : semaines consécutives
        </p>
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
          <Link href="/stats" className="text-[10px] text-[#7C3AED] hover:text-[#A78BFA] transition-colors">Voir les stats →</Link>
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
