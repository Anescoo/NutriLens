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
  if (bmi < 25) return { label: 'Corpulence normale', color: '#0ED4A0' };
  if (bmi < 30) return { label: 'Surpoids', color: '#F5A520' };
  return { label: 'Obésité', color: '#F04E6E' };
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
    <div className="bg-[#080810] rounded-2xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
      <p className="text-xl font-bold text-white leading-none">{value}</p>
      {unit && <p className="text-[10px] text-[#52507A] mt-0.5">{unit}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-[#9D80FF] uppercase tracking-widest mb-3">{children}</h2>;
}

function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (next.length < 6) { setError('Minimum 6 caractères.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return; }
      setSuccess(true);
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(() => { setSuccess(false); setOpen(false); }, 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => { setOpen((v) => !v); setError(''); setSuccess(false); }}
        className="flex items-center justify-between w-full"
      >
        <span className="text-xs text-[#52507A]">Mot de passe</span>
        <span className="text-xs text-[#7C3AED] hover:text-[#9D80FF] transition-colors">
          {open ? 'Annuler' : 'Modifier'}
        </span>
      </button>

      {open && (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 space-y-2">
          {(['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmer'] as const).map((label, i) => {
            const val = i === 0 ? current : i === 1 ? next : confirm;
            const set = i === 0 ? setCurrent : i === 1 ? setNext : setConfirm;
            return (
              <input
                key={label}
                type="password"
                placeholder={label}
                value={val}
                onChange={(e) => set(e.target.value)}
                required
                className="w-full bg-[#080810] border border-[#1A1A32] focus:border-[#7C3AED] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#52507A] outline-none transition-colors"
              />
            );
          })}
          {error && <p className="text-xs text-[#F04E6E]">{error}</p>}
          {success && <p className="text-xs text-[#0ED4A0]">Mot de passe mis à jour ✓</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Mise à jour…' : 'Confirmer'}
          </button>
        </form>
      )}
    </div>
  );
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

  // Liked plans
  interface LikedPlan {
    id: string;
    name: string;
    sessions: { id: string; name: string; exercises: unknown[] }[];
    authorId: string;
    authorName: string | null;
    likesCount: number;
  }
  const [likedPlans, setLikedPlans] = useState<LikedPlan[]>([]);
  const [addingPlanId, setAddingPlanId] = useState<string | null>(null);
  const [addedPlanIds, setAddedPlanIds] = useState<Set<string>>(new Set());

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
      fetch('/api/workout/plans/liked').then((r) => r.ok ? r.json() : []),
    ]).then(([body, mealData, profile, streakData, liked]) => {
      setMeasurements(Array.isArray(body) ? body : []);
      setMeals(Array.isArray(mealData) ? mealData : []);
      if (profile && !profile.error) {
        setProfileData(profile as ProfileData);
        setBioValue(profile.bio ?? '');
      }
      const sd = streakData as { nutritionStreak: number; workoutStreak: number; workoutFrequency?: number };
      setStreaks({ nutritionStreak: sd.nutritionStreak, workoutStreak: sd.workoutStreak });
      if (sd.workoutFrequency) setWorkoutFrequency(sd.workoutFrequency);
      if (Array.isArray(liked)) setLikedPlans(liked as LikedPlan[]);
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
    { label: 'Glucides', value: avgCarbs, goal: goals.carbs, unit: 'g', color: '#9D80FF' },
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

  async function handleAddLikedPlan(plan: LikedPlan) {
    if (addingPlanId || addedPlanIds.has(plan.id)) return;
    setAddingPlanId(plan.id);
    try {
      const res = await fetch('/api/workout/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${plan.name} (Copie)`, sessions: plan.sessions, isPublic: false }),
      });
      if (res.ok) setAddedPlanIds((prev) => new Set(prev).add(plan.id));
    } finally {
      setAddingPlanId(null);
    }
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
    <main className="px-4 pt-6 pb-28 md:pb-10 md:pt-20 max-w-lg md:max-w-3xl mx-auto">
      <PageHeader title="Profil" subtitle="Ton espace personnel" />

      {/* Avatar + identity */}
      <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#9D80FF] flex items-center justify-center text-2xl font-bold text-white select-none">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#7C3AED] flex items-center justify-center shadow-lg border border-[#08080F] transition-opacity hover:opacity-80"
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
            <p className="text-sm text-[#52507A] truncate">{email}</p>
            <p className="text-[10px] text-[#52507A] mt-1">{uniqueDays} jour{uniqueDays > 1 ? 's' : ''} de suivi · {totalMeals} repas</p>
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
              className="w-full bg-[#080810] border border-[#1A1A32] rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-[#7C3AED]"
              placeholder="Écris ta bio…"
            />
          ) : (
            <button onClick={() => setEditingBio(true)} className="w-full text-left text-sm">
              {profileData?.bio ? (
                <span className="text-white">{profileData.bio}</span>
              ) : (
                <span className="text-[#52507A] italic">Ajouter une bio…</span>
              )}
            </button>
          )}
        </div>

        {/* Public profile toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1A1A32]">
          <span className="text-sm text-[#52507A]">Profil public</span>
          <button
            onClick={() => handlePublicToggle(!(profileData?.isPublic ?? true))}
            className={[
              'relative w-10 h-5 rounded-full transition-colors duration-200',
              (profileData?.isPublic ?? true) ? 'bg-[#7C3AED]' : 'bg-[#1A1A32]',
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
          <div className="mt-3 pt-3 border-t border-[#1A1A32] flex items-center gap-4">
            <Link href="/profile/connections?type=followers" className="text-sm hover:opacity-80 transition-opacity">
              <span className="font-semibold text-white">{profileData.followersCount}</span>
              <span className="text-[#52507A] ml-1">abonné{profileData.followersCount !== 1 ? 's' : ''}</span>
            </Link>
            <span className="text-[#1A1A32]">·</span>
            <Link href="/profile/connections?type=following" className="text-sm hover:opacity-80 transition-opacity">
              <span className="font-semibold text-white">{profileData.followingCount}</span>
              <span className="text-[#52507A] ml-1">abonnement{profileData.followingCount !== 1 ? 's' : ''}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Streaks */}
      <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <SectionTitle>Séries actives</SectionTitle>
          {/* <button
            onClick={() => {
              const steps = [0, 1, 3, 7, 14, 30];
              const next = (n: number) => steps[(steps.indexOf(steps.find((s) => s >= n) ?? 0) + 1) % steps.length];
              setStreaks((s) => ({ nutritionStreak: next(s.nutritionStreak), workoutStreak: next(s.workoutStreak) }));
            }}
            className="text-[10px] text-[#52507A] border border-[#1A1A32] rounded-lg px-2 py-1 hover:border-[#7C3AED] hover:text-[#9D80FF] transition-all"
          >
            test
          </button> */}
        </div>
        <div className="flex items-center justify-around py-2">
          <StreakFlame count={streaks.nutritionStreak} label="Nutrition" unit="j." />
          <div className="w-px self-stretch bg-[#1A1A32]" />
          <StreakFlame count={streaks.workoutStreak} label="Musculation" unit="sem." />
        </div>
        {/* Workout frequency selector */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1A1A32]">
          <p className="text-[11px] text-[#52507A]">Objectif musculation</p>
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
                    : 'bg-[#080810] border border-[#1A1A32] text-[#52507A] hover:border-[#7C3AED]/60 hover:text-[#9D80FF]',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
            <span className="text-[11px] text-[#52507A] ml-1">/ sem.</span>
          </div>
        </div>
        <p className="text-center text-[10px] text-[#52507A] mt-2">
          Nutrition : jours consécutifs · Musculation : semaines consécutives
        </p>
      </div>

      {/* Body composition */}
      <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Composition corporelle</SectionTitle>
          <Link href="/body" className="text-[10px] text-[#7C3AED] hover:text-[#9D80FF] transition-colors">Voir tout</Link>
        </div>
        {loading ? (
          <p className="text-[#52507A] text-sm text-center py-4">Chargement…</p>
        ) : latest ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <StatCard label="Poids" value={latest.weight.toFixed(1)} unit="kg" color="#7C3AED" />
              {bmi && bmiInfo && <StatCard label="IMC" value={bmi.toFixed(1)} unit={bmiInfo.label} color={bmiInfo.color} />}
              {latest.bodyFat != null && <StatCard label="Masse grasse" value={`${latest.bodyFat.toFixed(1)}%`} color="#F5A520" />}
              {latest.muscleMass != null && <StatCard label="Muscle" value={`${latest.muscleMass.toFixed(1)}`} unit="kg" color="#0ED4A0" />}
              {latestHeight && <StatCard label="Taille" value={String(latestHeight)} unit="cm" color="#60a5fa" />}
              {latest.waist != null && <StatCard label="Tour taille" value={`${latest.waist}`} unit="cm" color="#52507A" />}
            </div>
            {weightDelta !== null && (
              <p className="text-[10px] text-center" style={{ color: weightDelta < 0 ? '#0ED4A0' : weightDelta > 0 ? '#F5A520' : '#52507A' }}>
                {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg depuis la mesure précédente
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-[#52507A] text-sm mb-2">Aucune mesure enregistrée</p>
            <Link href="/body" className="text-xs text-[#7C3AED] hover:text-[#9D80FF]">Ajouter une mesure →</Link>
          </div>
        )}
      </div>

      {/* Weekly nutrition */}
      <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Nutrition — 7 derniers jours</SectionTitle>
          <Link href="/stats" className="text-[10px] text-[#7C3AED] hover:text-[#9D80FF] transition-colors">Voir les stats →</Link>
        </div>
        {loading ? (
          <p className="text-[#52507A] text-sm text-center py-4">Chargement…</p>
        ) : activeDays === 0 ? (
          <div className="text-center py-4">
            <p className="text-[#52507A] text-sm mb-2">Aucun repas enregistré cette semaine</p>
            <Link href="/journal" className="text-xs text-[#7C3AED] hover:text-[#9D80FF]">Ouvrir le journal →</Link>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-[#52507A] mb-3">{activeDays} jour{activeDays > 1 ? 's' : ''} avec des données · moyennes journalières</p>
            <div className="space-y-2">
              {macroAvgs.map(({ label, value, goal, unit, color }) => {
                const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : null;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#52507A]">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{value} {unit}</span>
                        {pct !== null && (
                          <span className="text-[10px]" style={{ color }}>{pct}%</span>
                        )}
                      </div>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 bg-[#080810] rounded-full overflow-hidden">
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
      <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Objectifs</SectionTitle>
          <Link href="/goals" className="text-[10px] text-[#7C3AED] hover:text-[#9D80FF] transition-colors">Modifier</Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Calories', value: goals.calories, unit: 'kcal', color: '#EC4899' },
            { label: 'Protéines', value: goals.protein, unit: 'g', color: '#7C3AED' },
            { label: 'Glucides', value: goals.carbs, unit: 'g', color: '#9D80FF' },
            { label: 'Lipides', value: goals.fat, unit: 'g', color: '#06B6D4' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="bg-[#080810] rounded-xl px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-[#52507A]">{label}</span>
              <span className="text-sm font-bold" style={{ color }}>{value} <span className="text-[10px] font-normal text-[#52507A]">{unit}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Liked plans */}
      {likedPlans.length > 0 && (
        <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
          <SectionTitle>Programmes likés</SectionTitle>
          <div className="flex flex-col gap-3">
            {likedPlans.map((plan) => {
              const totalExercises = plan.sessions.reduce((s, sess) => s + sess.exercises.length, 0);
              const isAdded = addedPlanIds.has(plan.id);
              const isAdding = addingPlanId === plan.id;
              return (
                <div key={plan.id} className="bg-[#080810] rounded-2xl p-3 border border-[#1A1A32]">
                  <p className="text-white font-semibold text-sm truncate mb-0.5">{plan.name}</p>
                  <p className="text-[#52507A] text-xs mb-2">
                    par {plan.authorName ?? 'Inconnu'} · {plan.sessions.length} séance{plan.sessions.length > 1 ? 's' : ''} · {totalExercises} exercice{totalExercises > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {plan.sessions.map((s) => (
                      <span key={s.id} className="text-[10px] bg-[#101020] text-[#9D80FF] px-2 py-0.5 rounded-full border border-[#1A1A32]">
                        {s.name}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAddLikedPlan(plan)}
                    disabled={isAdding || isAdded}
                    className={[
                      'w-full py-2 rounded-xl text-xs font-semibold transition-all',
                      isAdded
                        ? 'bg-[#0ED4A0]/15 text-[#0ED4A0] border border-[#0ED4A0]/25'
                        : 'bg-[#7C3AED]/15 text-[#9D80FF] border border-[#7C3AED]/35 hover:bg-[#7C3AED]/25',
                    ].join(' ')}
                  >
                    {isAdding ? 'Ajout…' : isAdded ? '✓ Ajouté à mes programmes' : '+ Ajouter à mes programmes'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export */}
      <ExportSection />

      {/* Notifications */}
      <NotificationSection />

      {/* Account */}
      <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
        <SectionTitle>Compte</SectionTitle>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#52507A]">Adresse email</span>
            <span className="text-sm text-white truncate max-w-[60%] text-right">{email}</span>
          </div>
          <div className="border-t border-[#1A1A32]" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#52507A]">Repas enregistrés</span>
            <span className="text-sm text-white">{totalMeals}</span>
          </div>
          <div className="border-t border-[#1A1A32]" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#52507A]">Mesures corporelles</span>
            <span className="text-sm text-white">{measurements.length}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-[#101020] border border-[#1A1A32] rounded-2xl p-4 mb-4">
        <ChangePasswordForm />
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full py-3.5 rounded-2xl border border-[#F04E6E]/25 text-[#F04E6E] hover:bg-[#F04E6E]/08 font-semibold text-sm transition-all"
      >
        Se déconnecter
      </button>
    </main>
  );
}
