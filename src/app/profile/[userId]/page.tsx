'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface PublicProfile {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleFollow() {
    if (!session) return;
    if (!profile) return;
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

  const isOwnProfile = session?.user?.id === userId;
  const name = profile?.name ?? 'Utilisateur';
  const initials = name.slice(0, 2).toUpperCase();
  const canViewContent = profile?.isPublic || profile?.isFollowing || isOwnProfile;

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
                  <img
                    src={profile.avatarUrl}
                    alt={name}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />
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

                {/* Followers / following */}
                <p className="text-sm text-[#6B6B8A] mt-2">
                  <span className="font-semibold text-white">{profile.followersCount}</span> abonné{profile.followersCount !== 1 ? 's' : ''}&nbsp;·&nbsp;
                  <span className="font-semibold text-white">{profile.followingCount}</span> abonnement{profile.followingCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Follow button — only show if logged in and not own profile */}
            {session && !isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={[
                  'mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                  profile.isFollowing
                    ? 'border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10'
                    : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
                ].join(' ')}
              >
                {followLoading ? 'Chargement…' : profile.isFollowing ? 'Ne plus suivre' : 'Suivre'}
              </button>
            )}
          </div>

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
    </main>
  );
}
