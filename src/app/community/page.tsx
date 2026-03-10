'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/layout/PageHeader';

interface UserResult {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followersCount: number;
  isFollowing: boolean;
}

interface NetworkStats {
  followersCount: number;
  followingCount: number;
}

function UserCard({
  user,
  onFollowChange,
}: {
  user: UserResult;
  onFollowChange: (id: string, following: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const name = user.name ?? 'Utilisateur';
  const initials = name.slice(0, 2).toUpperCase();

  async function handleFollow() {
    setLoading(true);
    try {
      if (user.isFollowing) {
        await fetch(`/api/social/follow?targetUserId=${user.id}`, { method: 'DELETE' });
        onFollowChange(user.id, false);
      } else {
        await fetch('/api/social/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: user.id }),
        });
        onFollowChange(user.id, true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-3">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={name}
          className="w-11 h-11 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-base font-bold text-white shrink-0 select-none">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{name}</p>
        {user.bio ? (
          <p className="text-xs text-[#6B6B8A] truncate">{user.bio}</p>
        ) : (
          <p className="text-xs text-[#6B6B8A]">{user.followersCount} abonné{user.followersCount !== 1 ? 's' : ''}</p>
        )}
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        className={[
          'shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
          user.isFollowing
            ? 'border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10'
            : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
        ].join(' ')}
      >
        {loading ? '…' : user.isFollowing ? 'Suivi' : 'Suivre'}
      </button>
    </div>
  );
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load network stats
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: { followersCount?: number; followingCount?: number }) => {
        if (data && typeof data.followersCount === 'number') {
          setNetworkStats({
            followersCount: data.followersCount,
            followingCount: data.followingCount ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [session?.user?.id]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/social/users?q=${encodeURIComponent(q)}`);
      const data = await res.json() as UserResult[];
      setResults(Array.isArray(data) ? data : []);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  function handleFollowChange(id: string, following: boolean) {
    setResults((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, isFollowing: following, followersCount: u.followersCount + (following ? 1 : -1) }
          : u
      )
    );
    // Update network stats following count
    if (networkStats) {
      setNetworkStats((prev) =>
        prev
          ? { ...prev, followingCount: prev.followingCount + (following ? 1 : -1) }
          : prev
      );
    }
  }

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Communauté" subtitle="Découvrez et suivez des membres" />

      {/* My network card */}
      {networkStats && (
        <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
          <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Mon réseau</h2>
          <div className="flex items-center divide-x divide-[#2d1f5e]">
            <div className="flex-1 text-center pr-4">
              <p className="text-2xl font-bold text-white">{networkStats.followersCount}</p>
              <p className="text-xs text-[#6B6B8A] mt-0.5">Abonné{networkStats.followersCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 text-center pl-4">
              <p className="text-2xl font-bold text-white">{networkStats.followingCount}</p>
              <p className="text-xs text-[#6B6B8A] mt-0.5">Abonnement{networkStats.followingCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search section */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Rechercher</h2>

        <div className="relative mb-2">
          <svg
            width="16" height="16"
            viewBox="0 0 24 24"
            fill="none" stroke="#6B6B8A"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un membre…"
            className="w-full bg-[#0F0F1A] border border-[#2d1f5e] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#6B6B8A] focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          {searching && (
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 text-[#7C3AED]"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          )}
        </div>

        {/* Results */}
        {query.length >= 2 ? (
          results.length > 0 ? (
            <div className="divide-y divide-[#2d1f5e]">
              {results.map((user) => (
                <UserCard key={user.id} user={user} onFollowChange={handleFollowChange} />
              ))}
            </div>
          ) : !searching ? (
            <div className="text-center py-6">
              <p className="text-[#6B6B8A] text-sm">Aucun membre trouvé pour &ldquo;{query}&rdquo;</p>
            </div>
          ) : null
        ) : (
          <div className="text-center py-8">
            <svg
              width="40" height="40"
              viewBox="0 0 24 24" fill="none" stroke="#2d1f5e"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <circle cx="8" cy="12" r="3" />
              <circle cx="16" cy="8" r="3" />
              <circle cx="16" cy="16" r="3" />
              <line x1="11" y1="12" x2="13" y2="9" />
              <line x1="11" y1="12" x2="13" y2="15" />
            </svg>
            <p className="text-white text-sm font-semibold mb-1">Recherchez des membres par nom</p>
            <p className="text-[#6B6B8A] text-xs">Découvrez et suivez d&apos;autres membres</p>
          </div>
        )}
      </div>
    </main>
  );
}
