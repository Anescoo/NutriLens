'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface Conversation {
  otherId: string;
  otherName: string | null;
  otherAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isLastMessageMine: boolean;
}

type LeaderboardMetric = 'sessions' | 'volume' | 'streak_nutrition' | 'streak_workout';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  value: number;
  isCurrentUser: boolean;
}

const LEADERBOARD_METRICS: { key: LeaderboardMetric; label: string; unit: string; icon: string }[] = [
  { key: 'sessions',         label: 'Séances',       unit: 'séances', icon: '🏋️' },
  { key: 'volume',           label: 'Volume',         unit: 'kg',      icon: '⚡' },
  { key: 'streak_nutrition', label: 'Streak nutri',   unit: 'jours',   icon: '🔥' },
  { key: 'streak_workout',   label: 'Streak muscu',   unit: 'sem.',    icon: '📅' },
];

function UserCard({
  user,
  onFollowChange,
}: {
  user: UserResult;
  onFollowChange: (id: string, following: boolean) => void;
}) {
  const router = useRouter();
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
      <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
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
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{name}</p>
          {user.bio ? (
            <p className="text-xs text-[#6B6B8A] truncate">{user.bio}</p>
          ) : (
            <p className="text-xs text-[#6B6B8A]">{user.followersCount} abonné{user.followersCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => router.push(`/messages/${user.id}`)}
          className="w-8 h-8 rounded-xl border border-[#2d1f5e] text-[#A78BFA] hover:bg-[#2d1f5e]/40 transition-all flex items-center justify-center"
          title="Envoyer un message"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          onClick={handleFollow}
          disabled={loading}
          className={[
            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
            user.isFollowing
              ? 'border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10'
              : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
          ].join(' ')}
        >
          {loading ? '…' : user.isFollowing ? 'Suivi' : 'Suivre'}
        </button>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function CommunityPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [leaderboardMetric, setLeaderboardMetric] = useState<LeaderboardMetric>('sessions');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

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

  // Load conversations
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/social/conversations')
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session?.user?.id]);

  // Load leaderboard
  useEffect(() => {
    setLeaderboardLoading(true);
    fetch(`/api/social/leaderboard?metric=${leaderboardMetric}`)
      .then((r) => r.json())
      .then((data: LeaderboardEntry[]) => setLeaderboard(Array.isArray(data) ? data : []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false));
  }, [leaderboardMetric]);

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
            <Link href="/profile/connections?type=followers" className="flex-1 text-center pr-4 hover:opacity-80 transition-opacity">
              <p className="text-2xl font-bold text-white">{networkStats.followersCount}</p>
              <p className="text-xs text-[#6B6B8A] mt-0.5">Abonné{networkStats.followersCount !== 1 ? 's' : ''}</p>
            </Link>
            <Link href="/profile/connections?type=following" className="flex-1 text-center pl-4 hover:opacity-80 transition-opacity">
              <p className="text-2xl font-bold text-white">{networkStats.followingCount}</p>
              <p className="text-xs text-[#6B6B8A] mt-0.5">Abonnement{networkStats.followingCount !== 1 ? 's' : ''}</p>
            </Link>
          </div>
        </div>
      )}

      {/* Messages section */}
      {conversations.length > 0 && (
        <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest">Messages</h2>
            {conversations.some((c) => c.unreadCount > 0) && (
              <span className="text-[10px] bg-[#7C3AED] text-white font-bold px-2 py-0.5 rounded-full">
                {conversations.reduce((s, c) => s + c.unreadCount, 0)} non lu{conversations.reduce((s, c) => s + c.unreadCount, 0) > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {conversations.slice(0, 3).map((conv, idx) => {
            const name = conv.otherName ?? 'Utilisateur';
            const initials = name.slice(0, 2).toUpperCase();
            return (
              <button
                key={conv.otherId}
                onClick={() => router.push(`/messages/${conv.otherId}`)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0F0F1A]/60 transition-colors text-left',
                  idx < Math.min(conversations.length, 3) - 1 ? 'border-b border-[#2d1f5e]' : '',
                ].join(' ')}
              >
                <div className="relative shrink-0">
                  {conv.otherAvatar ? (
                    <img src={conv.otherAvatar} alt={name} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-sm font-bold text-white select-none">
                      {initials}
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#7C3AED] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#1A1A2E]">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={['text-sm font-semibold truncate', conv.unreadCount > 0 ? 'text-white' : 'text-[#A78BFA]'].join(' ')}>
                      {name}
                    </p>
                    <span className="text-[10px] text-[#6B6B8A] shrink-0 ml-2">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <p className={['text-xs truncate', conv.unreadCount > 0 ? 'text-white font-medium' : 'text-[#6B6B8A]'].join(' ')}>
                    {conv.isLastMessageMine && <span className="text-[#6B6B8A]">Vous : </span>}
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
          {conversations.length > 3 && (
            <button
              onClick={() => router.push('/messages')}
              className="w-full px-4 py-2.5 text-xs text-[#7C3AED] font-semibold border-t border-[#2d1f5e] hover:bg-[#0F0F1A]/60 transition-colors"
            >
              Voir toutes les conversations ({conversations.length})
            </button>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-widest mb-3">Classement</h2>

        {/* Metric tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 scrollbar-none">
          {LEADERBOARD_METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setLeaderboardMetric(m.key)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                leaderboardMetric === m.key
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#0F0F1A] text-[#6B6B8A] border border-[#2d1f5e] hover:border-[#7C3AED]/50 hover:text-[#A78BFA]',
              ].join(' ')}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Entries */}
        {leaderboardLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin w-5 h-5 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[#6B6B8A] text-sm">Aucune donnée disponible</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {leaderboard.map((entry, idx) => {
              const metricConfig = LEADERBOARD_METRICS.find((m) => m.key === leaderboardMetric)!;
              const isGap = idx > 0 && leaderboard[idx - 1].rank + 1 < entry.rank;
              const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;
              const name = entry.name ?? 'Utilisateur';
              const initials = name.slice(0, 2).toUpperCase();
              return (
                <div key={entry.userId}>
                  {isGap && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 border-t border-dashed border-[#2d1f5e]" />
                      <span className="text-[10px] text-[#6B6B8A]">…</span>
                      <div className="flex-1 border-t border-dashed border-[#2d1f5e]" />
                    </div>
                  )}
                  <Link
                    href={`/profile/${entry.userId}`}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                      entry.isCurrentUser
                        ? 'bg-[#7C3AED]/15 border border-[#7C3AED]/40'
                        : 'bg-[#0F0F1A] border border-transparent hover:border-[#2d1f5e]',
                    ].join(' ')}
                  >
                    {/* Rank */}
                    <div className="w-7 shrink-0 text-center">
                      {medal ? (
                        <span className="text-base leading-none">{medal}</span>
                      ) : (
                        <span className={['text-xs font-bold', entry.isCurrentUser ? 'text-[#A78BFA]' : 'text-[#6B6B8A]'].join(' ')}>
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className={[
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 select-none',
                        entry.isCurrentUser ? 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA]' : 'bg-[#1A1A2E] border border-[#2d1f5e]',
                      ].join(' ')}>
                        {initials}
                      </div>
                    )}

                    {/* Name */}
                    <p className={['flex-1 text-sm font-semibold truncate', entry.isCurrentUser ? 'text-white' : 'text-[#A78BFA]'].join(' ')}>
                      {name}
                      {entry.isCurrentUser && <span className="ml-1.5 text-[10px] font-normal text-[#6B6B8A]">Vous</span>}
                    </p>

                    {/* Value */}
                    <div className="text-right shrink-0">
                      <span className={['text-sm font-bold', entry.rank <= 3 ? 'text-white' : 'text-[#A78BFA]'].join(' ')}>
                        {entry.value.toLocaleString('fr-FR')}
                      </span>
                      <span className="ml-1 text-[10px] text-[#6B6B8A]">{metricConfig.unit}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
