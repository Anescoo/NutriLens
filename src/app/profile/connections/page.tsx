'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserRow {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
}

function UserItem({ user, onFollowChange }: { user: UserRow; onFollowChange: (id: string, following: boolean) => void }) {
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
    <div className="flex items-center gap-3 py-3 border-b border-[#2d1f5e] last:border-0">
      <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
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
            <p className="text-xs text-[#6B6B8A]">Voir le profil</p>
          )}
        </div>
      </Link>
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

function ConnectionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type') ?? 'followers';
  const userId = searchParams.get('userId') ?? undefined;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/social/connections?type=${type}${userId ? `&userId=${userId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as UserRow[];
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [type, userId]);

  useEffect(() => { void load(); }, [load]);

  function handleFollowChange(id: string, following: boolean) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isFollowing: following } : u));
  }

  const title = type === 'followers' ? 'Abonnés' : 'Abonnements';

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-[#1A1A2E] border border-[#2d1f5e] flex items-center justify-center text-[#A78BFA] shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-xs text-[#6B6B8A] mt-0.5">{users.length} membre{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white font-semibold mb-1">Aucun membre ici</p>
          <p className="text-[#6B6B8A] text-sm">
            {type === 'followers' ? 'Personne ne vous suit encore.' : 'Vous ne suivez personne encore.'}
          </p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl px-4">
          {users.map((u) => (
            <UserItem key={u.id} user={u} onFollowChange={handleFollowChange} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConnectionsContent />
    </Suspense>
  );
}
