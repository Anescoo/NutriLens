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

const LEADERBOARD_METRICS: { key: LeaderboardMetric; label: string; unit: string }[] = [
  { key: 'sessions',         label: 'Séances',     unit: 'séances' },
  { key: 'volume',           label: 'Volume',       unit: 'kg'      },
  { key: 'streak_nutrition', label: 'Streak nutri', unit: 'jours'   },
  { key: 'streak_workout',   label: 'Streak muscu', unit: 'sem.'    },
];

/* SVG icons for leaderboard metrics */
const MetricIcon = ({ metric, size = 13 }: { metric: LeaderboardMetric; size?: number }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (metric === 'sessions') return (
    <svg {...props}>
      <path d="M6 4v16M18 4v16M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3M6 12h12" />
    </svg>
  );
  if (metric === 'volume') return (
    <svg {...props}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
  if (metric === 'streak_nutrition') return (
    <svg {...props}>
      <path d="M12 2c0 6.5-5 9-5 14a5 5 0 0 0 10 0c0-5-5-7.5-5-14z" />
      <path d="M12 14c-.5.8-.8 1.8-.8 2.5a.8.8 0 0 0 1.6 0c0-.7-.3-1.7-.8-2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
  /* streak_workout */
  return (
    <svg {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
};

/* Rank badge — replaces medal emoji */
function RankBadge({ rank, isCurrentUser }: { rank: number; isCurrentUser: boolean }) {
  if (rank === 1) return (
    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black"
      style={{ background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.32)', color: '#FBbf24' }}>
      1
    </div>
  );
  if (rank === 2) return (
    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black"
      style={{ background: 'rgba(209,213,219,0.10)', border: '1px solid rgba(209,213,219,0.28)', color: '#C8CDD5' }}>
      2
    </div>
  );
  if (rank === 3) return (
    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black"
      style={{ background: 'rgba(205,124,47,0.14)', border: '1px solid rgba(205,124,47,0.32)', color: '#CD7C2F' }}>
      3
    </div>
  );
  return (
    <span className={['text-xs font-bold tabular-nums', isCurrentUser ? 'text-[#9D80FF]' : 'text-[#2A2848]'].join(' ')}>
      #{rank}
    </span>
  );
}

/* ── Shared section header ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold text-[#7C3AED] uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
      <span className="w-1 h-3.5 rounded-full bg-[#7C3AED] inline-block shrink-0" />
      {children}
    </h2>
  );
}

/* ── Card shell ── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl mb-4 overflow-hidden ${className}`}
      style={{
        background: '#101020',
        border: '1px solid #1A1A32',
        boxShadow: 'inset 0 1px 0 rgba(157,128,255,0.05), 0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </div>
  );
}

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
    <div className="flex items-center gap-3 py-3 animate-fade-in">
      <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={name}
            className="w-11 h-11 rounded-xl object-cover shrink-0 transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#9D80FF] flex items-center justify-center text-base font-bold text-white shrink-0 select-none transition-transform duration-200 group-hover:scale-105">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate group-hover:text-[#9D80FF] transition-colors duration-150">{name}</p>
          {user.bio ? (
            <p className="text-xs text-[#52507A] truncate">{user.bio}</p>
          ) : (
            <p className="text-xs text-[#52507A]">{user.followersCount} abonné{user.followersCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => router.push(`/messages/${user.id}`)}
          className="w-8 h-8 rounded-xl border border-[#1A1A32] text-[#52507A] hover:text-[#9D80FF] hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/10 transition-all duration-150 flex items-center justify-center press"
          title="Envoyer un message"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          onClick={handleFollow}
          disabled={loading}
          className={[
            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 press',
            user.isFollowing
              ? 'border border-[#7C3AED]/60 text-[#9D80FF] hover:bg-[#7C3AED]/10'
              : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
            loading ? 'opacity-50' : '',
          ].join(' ')}
          style={!user.isFollowing ? { boxShadow: '0 0 12px rgba(124,58,237,0.3)' } : {}}
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

/* Skeleton row for leaderboard loading state */
function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ animationDelay: `${delay}ms`, background: '#080810' }}
    >
      <div className="w-7 h-4 rounded skeleton" />
      <div className="w-8 h-8 rounded-lg skeleton" />
      <div className="flex-1 h-4 rounded-lg skeleton" />
      <div className="w-14 h-4 rounded skeleton" />
    </div>
  );
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
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: { followersCount?: number; followingCount?: number }) => {
        if (data && typeof data.followersCount === 'number') {
          setNetworkStats({ followersCount: data.followersCount, followingCount: data.followingCount ?? 0 });
        }
      })
      .catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/social/conversations')
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    setLeaderboardLoading(true);
    fetch(`/api/social/leaderboard?metric=${leaderboardMetric}`)
      .then((r) => r.json())
      .then((data: LeaderboardEntry[]) => {
        setLeaderboard(Array.isArray(data) ? data : []);
        setLeaderboardKey((k) => k + 1);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false));
  }, [leaderboardMetric]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
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
    debounceRef.current = setTimeout(() => { void doSearch(query); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  function handleFollowChange(id: string, following: boolean) {
    setResults((prev) =>
      prev.map((u) => u.id === id ? { ...u, isFollowing: following, followersCount: u.followersCount + (following ? 1 : -1) } : u)
    );
    if (networkStats) {
      setNetworkStats((prev) => prev ? { ...prev, followingCount: prev.followingCount + (following ? 1 : -1) } : prev);
    }
  }

  return (
    <main className="px-4 pt-6 pb-28 md:pb-10 md:pt-20 max-w-lg md:max-w-3xl mx-auto">
      <PageHeader title="Communauté" subtitle="Découvrez et suivez des membres" />

      {/* ── Mon réseau ── */}
      {networkStats && (
        <Card className="animate-slide-in-up stagger-0">
          <div className="p-4">
            <SectionLabel>Mon réseau</SectionLabel>
            <div className="flex items-center divide-x divide-[#1A1A32]">
              <Link href="/profile/connections?type=followers" className="flex-1 text-center pr-4 group">
                <p className="text-2xl font-bold text-white group-hover:text-[#9D80FF] transition-colors duration-150 animate-number-pop stagger-1">
                  {networkStats.followersCount}
                </p>
                <p className="text-xs text-[#52507A] mt-0.5">Abonné{networkStats.followersCount !== 1 ? 's' : ''}</p>
              </Link>
              <Link href="/profile/connections?type=following" className="flex-1 text-center pl-4 group">
                <p className="text-2xl font-bold text-white group-hover:text-[#9D80FF] transition-colors duration-150 animate-number-pop stagger-2">
                  {networkStats.followingCount}
                </p>
                <p className="text-xs text-[#52507A] mt-0.5">Abonnement{networkStats.followingCount !== 1 ? 's' : ''}</p>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ── Messages ── */}
      {conversations.length > 0 && (
        <Card className="animate-slide-in-up stagger-1">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <SectionLabel>Messages</SectionLabel>
            {conversations.some((c) => c.unreadCount > 0) && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-scale-in-bounce"
                style={{ background: '#7C3AED', color: '#fff', boxShadow: '0 0 10px rgba(124,58,237,0.5)' }}
              >
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
                  'w-full flex items-center gap-3 px-4 py-3 text-left press transition-colors duration-150',
                  conv.unreadCount > 0 ? 'hover:bg-[#7C3AED]/10' : 'hover:bg-[#080810]/70',
                  idx < Math.min(conversations.length, 3) - 1 ? 'border-b border-[#1A1A32]' : '',
                ].join(' ')}
              >
                <div className="relative shrink-0">
                  {conv.otherAvatar ? (
                    <img src={conv.otherAvatar} alt={name} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#9D80FF] flex items-center justify-center text-sm font-bold text-white select-none">
                      {initials}
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#101020] animate-scale-in-bounce"
                      style={{ background: '#7C3AED', boxShadow: '0 0 8px rgba(124,58,237,0.6)' }}
                    >
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={['text-sm font-semibold truncate', conv.unreadCount > 0 ? 'text-white' : 'text-[#9D80FF]'].join(' ')}>
                      {name}
                    </p>
                    <span className="text-[10px] text-[#52507A] shrink-0 ml-2">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <p className={['text-xs truncate', conv.unreadCount > 0 ? 'text-white font-medium' : 'text-[#52507A]'].join(' ')}>
                    {conv.isLastMessageMine && <span className="text-[#2A2848]">Vous : </span>}
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            );
          })}
          {conversations.length > 3 && (
            <button
              onClick={() => router.push('/messages')}
              className="w-full px-4 py-2.5 text-xs font-semibold border-t border-[#1A1A32] transition-colors duration-150 hover:bg-[#080810]/60 press"
              style={{ color: '#7C3AED' }}
            >
              Voir toutes les conversations ({conversations.length})
            </button>
          )}
        </Card>
      )}

      {/* ── Classement ── */}
      <Card className="animate-slide-in-up stagger-2">
        <div className="p-4">
          <SectionLabel>Classement</SectionLabel>

          {/* Metric tabs */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 scrollbar-none">
            {LEADERBOARD_METRICS.map((m) => {
              const isActive = leaderboardMetric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setLeaderboardMetric(m.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 press"
                  style={
                    isActive
                      ? { background: '#7C3AED', color: '#fff', boxShadow: '0 0 14px rgba(124,58,237,0.45)' }
                      : { background: '#080810', color: '#52507A', border: '1px solid #1A1A32' }
                  }
                >
                  <span style={{ color: isActive ? 'rgba(255,255,255,0.75)' : '#3A3860' }}>
                    <MetricIcon metric={m.key} size={12} />
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Entries */}
          {leaderboardLoading ? (
            <div className="flex flex-col gap-1.5">
              {[0, 60, 120, 180, 240].map((d) => <SkeletonRow key={d} delay={d} />)}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-6 animate-fade-in">
              <p className="text-[#52507A] text-sm">Aucune donnée disponible</p>
            </div>
          ) : (
            <div key={leaderboardKey} className="flex flex-col gap-1.5">
              {leaderboard.map((entry, idx) => {
                const metricConfig = LEADERBOARD_METRICS.find((m) => m.key === leaderboardMetric)!;
                const isGap = idx > 0 && leaderboard[idx - 1].rank + 1 < entry.rank;
                const name = entry.name ?? 'Utilisateur';
                const initials = name.slice(0, 2).toUpperCase();
                const delay = Math.min(idx, 9) * 45;

                return (
                  <div key={entry.userId} className="animate-slide-in-up" style={{ animationDelay: `${delay}ms` }}>
                    {isGap && (
                      <div className="flex items-center gap-2 py-1.5 my-0.5">
                        <div className="flex-1 border-t border-dashed border-[#1A1A32]" />
                        <span className="text-[10px] text-[#2A2848] font-mono">•••</span>
                        <div className="flex-1 border-t border-dashed border-[#1A1A32]" />
                      </div>
                    )}
                    <Link
                      href={`/profile/${entry.userId}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 press"
                      style={
                        entry.isCurrentUser
                          ? { background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.30)', boxShadow: 'inset 0 0 0 1px rgba(157,128,255,0.06)' }
                          : { background: '#080810', border: '1px solid transparent' }
                      }
                    >
                      {/* Rank */}
                      <div className="w-7 shrink-0 flex items-center justify-center">
                        <RankBadge rank={entry.rank} isCurrentUser={entry.isCurrentUser} />
                      </div>

                      {/* Avatar */}
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt={name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 select-none"
                          style={
                            entry.isCurrentUser
                              ? { background: 'linear-gradient(135deg, #7C3AED, #9D80FF)' }
                              : { background: '#0E0E20', border: '1px solid #1A1A32' }
                          }
                        >
                          {initials}
                        </div>
                      )}

                      {/* Name */}
                      <p className={['flex-1 text-sm font-semibold truncate', entry.isCurrentUser ? 'text-white' : 'text-[#c4b5fd]'].join(' ')}>
                        {name}
                        {entry.isCurrentUser && (
                          <span className="ml-1.5 text-[10px] font-normal text-[#52507A]">Vous</span>
                        )}
                      </p>

                      {/* Value */}
                      <div className="text-right shrink-0">
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{
                            color: entry.rank === 1 ? '#FBbf24'
                              : entry.rank === 2 ? '#C8CDD5'
                              : entry.rank === 3 ? '#CD7C2F'
                              : '#9D80FF',
                          }}
                        >
                          {entry.value.toLocaleString('fr-FR')}
                        </span>
                        <span className="ml-1 text-[10px] text-[#2A2848]">{metricConfig.unit}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ── Rechercher ── */}
      <Card className="animate-slide-in-up stagger-3">
        <div className="p-4">
          <SectionLabel>Rechercher</SectionLabel>

          <div className="relative mb-2">
            <svg
              width="15" height="15"
              viewBox="0 0 24 24"
              fill="none" stroke="#2A2848"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un membre…"
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#2A2848] outline-none transition-all duration-200"
              style={{
                background: '#080810',
                border: query ? '1px solid rgba(124,58,237,0.6)' : '1px solid #1A1A32',
                boxShadow: query ? '0 0 0 3px rgba(124,58,237,0.08)' : 'none',
              }}
            />
            {searching && (
              <svg
                className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin w-4 h-4"
                style={{ color: '#7C3AED' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            )}
          </div>

          {query.length >= 2 ? (
            results.length > 0 ? (
              <div className="divide-y divide-[#1A1A32]">
                {results.map((user) => (
                  <UserCard key={user.id} user={user} onFollowChange={handleFollowChange} />
                ))}
              </div>
            ) : !searching ? (
              <div className="text-center py-6 animate-fade-in">
                <p className="text-[#2A2848] text-sm">Aucun membre trouvé pour &ldquo;{query}&rdquo;</p>
              </div>
            ) : null
          ) : (
            <div className="text-center py-8 animate-fade-in">
              <svg
                width="38" height="38"
                viewBox="0 0 24 24" fill="none" stroke="#1A1A32"
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
              <p className="text-[#2A2848] text-xs">Découvrez et suivez d&apos;autres membres</p>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
