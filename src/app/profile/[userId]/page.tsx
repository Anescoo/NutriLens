'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { WorkoutPlanSession } from '@/types';

interface UserPlan {
  id: string;
  name: string;
  sessions: WorkoutPlanSession[];
  likesCount: number;
  isLiked: boolean;
}

interface ProfileStats {
  nutritionStreak: number;
  workoutStreak: number;
  totalSessions: number;
  totalVolumeKg: number;
}

interface PublicProfile {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  stats: ProfileStats | null;
}

const FLAME_TIERS = [
  { min: 30, color: '#FF0000', shadow: '#ff000066', label: '🔥' },
  { min: 14, color: '#FF4500', shadow: '#ff450066', label: '🔥' },
  { min: 7,  color: '#FF6B00', shadow: '#ff6b0066', label: '🔥' },
  { min: 3,  color: '#FF9500', shadow: '#ff950066', label: '🔥' },
  { min: 1,  color: '#FFB800', shadow: '#ffb80066', label: '🔥' },
];

function flameColor(count: number) {
  for (const tier of FLAME_TIERS) {
    if (count >= tier.min) return tier;
  }
  return null;
}

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M kg`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${kg} kg`;
}

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<UserPlan[]>([]);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/social/profile/${userId}`)
      .then((r) => r.json())
      .then((data: PublicProfile & { error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProfile(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger ce profil');
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    const canView = profile.isPublic || profile.isFollowing || session?.user?.id === userId;
    if (!canView) return;
    fetch(`/api/workout/plans/public?authorId=${userId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: UserPlan[]) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [profile, userId, session?.user?.id]);

  async function handleFollow() {
    if (!session || !profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await fetch(`/api/social/follow?targetUserId=${profile.id}`, { method: 'DELETE' });
        setProfile((p) => p ? { ...p, isFollowing: false, followersCount: p.followersCount - 1 } : p);
      } else {
        await fetch('/api/social/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: profile.id }),
        });
        setProfile((p) => p ? { ...p, isFollowing: true, followersCount: p.followersCount + 1 } : p);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleLike(plan: UserPlan) {
    if (!session || likingId) return;
    setLikingId(plan.id);
    try {
      const method = plan.isLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/workout/plans/${plan.id}/like`, { method });
      if (res.ok) {
        const data = await res.json() as { likesCount: number; liked: boolean };
        setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, likesCount: data.likesCount, isLiked: data.liked } : p));
        if (!plan.isLiked) {
          const authorName = profile?.name ?? 'cet utilisateur';
          setToast(`Programme de ${authorName} liké !`);
          setTimeout(() => setToast(null), 3000);
        }
      }
    } finally {
      setLikingId(null);
    }
  }

  const isOwnProfile = session?.user?.id === userId;
  const name = profile?.name ?? 'Utilisateur';
  const initials = name.slice(0, 2).toUpperCase();
  const canViewContent = profile?.isPublic || profile?.isFollowing || isOwnProfile;
  const stats = profile?.stats ?? null;

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA] hover:text-white transition-colors"
          aria-label="Retour"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Profil</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        </div>
      ) : error ? (
        <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-6 text-center">
          <p className="text-[#6B6B8A]">{error}</p>
        </div>
      ) : profile ? (
        <>
          {/* Profile card */}
          <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={name} className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-3xl font-bold text-white select-none">
                    {initials}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-white truncate">{name}</p>
                {profile.bio && (
                  <p className="text-sm text-[#6B6B8A] mt-1 line-clamp-2">{profile.bio}</p>
                )}
                <p className="text-sm text-[#6B6B8A] mt-2">
                  <span className="font-semibold text-white">{profile.followersCount}</span> abonné{profile.followersCount !== 1 ? 's' : ''}&nbsp;·&nbsp;
                  <span className="font-semibold text-white">{profile.followingCount}</span> abonnement{profile.followingCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Follow + Message buttons */}
            {session && !isOwnProfile && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    profile.isFollowing
                      ? 'border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10'
                      : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
                  ].join(' ')}
                >
                  {followLoading ? 'Chargement…' : profile.isFollowing ? 'Ne plus suivre' : 'Suivre'}
                </button>
                <button
                  onClick={() => router.push(`/messages/${profile.id}`)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#2d1f5e] text-[#A78BFA] hover:bg-[#2d1f5e]/40 transition-all flex items-center gap-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Message
                </button>
              </div>
            )}
          </div>

          {/* Stats section — only for viewable profiles */}
          {canViewContent && stats && (
            <>
              {/* Streaks */}
              {(stats.nutritionStreak > 0 || stats.workoutStreak > 0) && (
                <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
                  <p className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Flammes</p>
                  <div className="flex gap-3">
                    {/* Nutrition streak */}
                    {stats.nutritionStreak > 0 && (() => {
                      const tier = flameColor(stats.nutritionStreak);
                      return (
                        <div className="flex-1 bg-[#0F0F1A] rounded-2xl p-3 text-center">
                          <div className="text-2xl mb-1" style={{ filter: tier ? `drop-shadow(0 0 6px ${tier.shadow})` : undefined }}>🔥</div>
                          <p className="text-xl font-black text-white leading-none" style={{ color: tier?.color ?? '#FFB800' }}>
                            {stats.nutritionStreak}
                            <span className="text-xs font-semibold ml-0.5 opacity-70 text-white">j.</span>
                          </p>
                          <p className="text-[10px] text-[#6B6B8A] mt-0.5">Nutrition</p>
                        </div>
                      );
                    })()}

                    {/* Workout streak */}
                    {stats.workoutStreak > 0 && (() => {
                      const tier = flameColor(stats.workoutStreak);
                      return (
                        <div className="flex-1 bg-[#0F0F1A] rounded-2xl p-3 text-center">
                          <div className="text-2xl mb-1" style={{ filter: tier ? `drop-shadow(0 0 6px ${tier.shadow})` : undefined }}>🔥</div>
                          <p className="text-xl font-black leading-none" style={{ color: tier?.color ?? '#FFB800' }}>
                            {stats.workoutStreak}
                            <span className="text-xs font-semibold ml-0.5 opacity-70 text-white">sem.</span>
                          </p>
                          <p className="text-[10px] text-[#6B6B8A] mt-0.5">Musculation</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Workout numbers */}
              {(stats.totalSessions > 0 || stats.totalVolumeKg > 0) && (
                <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
                  <p className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Stats musculation</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0F0F1A] rounded-2xl p-3 text-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5">
                        <path d="M8 6v6m8-6v6M3 12h2m14 0h2M5 6H3m18 0h-2M5 18H3m18 0h-2"/>
                        <rect x="5" y="9" width="14" height="6" rx="1"/>
                      </svg>
                      <p className="text-2xl font-black text-white leading-none">{stats.totalSessions}</p>
                      <p className="text-[10px] text-[#6B6B8A] mt-0.5">séances</p>
                    </div>
                    <div className="bg-[#0F0F1A] rounded-2xl p-3 text-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5">
                        <path d="M6 4v6a6 6 0 0 0 12 0V4"/>
                        <line x1="4" y1="20" x2="20" y2="20"/>
                      </svg>
                      <p className="text-2xl font-black text-white leading-none">{formatVolume(stats.totalVolumeKg)}</p>
                      <p className="text-[10px] text-[#6B6B8A] mt-0.5">volume total</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Public plans */}
          {canViewContent && plans.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">
                Programmes publics
              </h2>
              <div className="flex flex-col gap-3">
                {plans.map((plan) => {
                  const totalExercises = plan.sessions.reduce((s, sess) => s + sess.exercises.length, 0);
                  const isAnimating = likingId === plan.id;
                  return (
                    <div key={plan.id} className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
                      <p className="text-white font-bold text-base truncate mb-0.5">{plan.name}</p>
                      <p className="text-[#6B6B8A] text-sm mb-2">
                        {plan.sessions.length} séance{plan.sessions.length > 1 ? 's' : ''} · {totalExercises} exercice{totalExercises > 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {plan.sessions.map((s) => (
                          <span key={s.id} className="text-[11px] bg-[#0F0F1A] text-[#A78BFA] px-2 py-0.5 rounded-full border border-[#2d1f5e]">
                            {s.name}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleLike(plan)}
                        disabled={!session || isOwnProfile || !!likingId}
                        className="flex items-center gap-1.5 text-xs text-[#6B6B8A] hover:text-[#A78BFA] transition-colors disabled:cursor-default group"
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 24 24"
                          fill={plan.isLiked ? '#A78BFA' : 'none'}
                          stroke={plan.isLiked ? '#A78BFA' : 'currentColor'}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={[
                            'transition-transform duration-150',
                            isAnimating ? 'scale-150' : 'scale-100',
                            !isOwnProfile && session ? 'group-hover:scale-125' : '',
                          ].join(' ')}
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span className={plan.isLiked ? 'text-[#A78BFA]' : ''}>{plan.likesCount} j&apos;aime</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Private profile message */}
          {!canViewContent && (
            <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-6 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-white font-semibold mb-1">Ce profil est privé</p>
              <p className="text-[#6B6B8A] text-sm">Suivez cet utilisateur pour voir son contenu</p>
            </div>
          )}
        </>
      ) : null}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A2E] border border-[#7C3AED]/60 text-white text-sm font-medium px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 animate-fade-in-up">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#A78BFA" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {toast}
        </div>
      )}
    </main>
  );
}
