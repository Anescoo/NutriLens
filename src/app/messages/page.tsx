'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';

interface Conversation {
  otherId: string;
  otherName: string | null;
  otherAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isLastMessageMine: boolean;
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

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/social/conversations')
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Messages" subtitle="Vos conversations privées" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl p-8 text-center">
          <svg
            width="48" height="48" viewBox="0 0 24 24"
            fill="none" stroke="#2d1f5e" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="mx-auto mb-4"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-white font-semibold mb-1">Aucun message</p>
          <p className="text-[#6B6B8A] text-sm mb-4">
            Démarrez une conversation depuis un profil ou la communauté
          </p>
          <button
            onClick={() => router.push('/community')}
            className="px-4 py-2 bg-[#7C3AED] text-white text-sm font-semibold rounded-xl hover:bg-[#6D28D9] transition-colors"
          >
            Trouver des membres
          </button>
        </div>
      ) : (
        <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-2xl overflow-hidden">
          {conversations.map((conv, idx) => {
            const name = conv.otherName ?? 'Utilisateur';
            const initials = name.slice(0, 2).toUpperCase();
            return (
              <Link
                key={conv.otherId}
                href={`/messages/${conv.otherId}`}
                className={[
                  'flex items-center gap-3 px-4 py-3.5 hover:bg-[#0F0F1A]/60 transition-colors',
                  idx < conversations.length - 1 ? 'border-b border-[#2d1f5e]' : '',
                ].join(' ')}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {conv.otherAvatar ? (
                    <img
                      src={conv.otherAvatar}
                      alt={name}
                      className="w-12 h-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-base font-bold text-white select-none">
                      {initials}
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#7C3AED] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#1A1A2E]">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={['text-sm font-semibold truncate', conv.unreadCount > 0 ? 'text-white' : 'text-[#A78BFA]'].join(' ')}>
                      {name}
                    </p>
                    <span className="text-[10px] text-[#6B6B8A] shrink-0 ml-2">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className={['text-xs truncate', conv.unreadCount > 0 ? 'text-white font-medium' : 'text-[#6B6B8A]'].join(' ')}>
                    {conv.isLastMessageMine && <span className="text-[#6B6B8A]">Vous : </span>}
                    {conv.lastMessage}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
