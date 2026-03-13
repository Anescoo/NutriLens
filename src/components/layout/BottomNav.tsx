'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

const tabs = [
  {
    href: '/journal',
    label: 'Journal',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="12" y2="16" />
      </svg>
    ),
  },
  {
    href: '/workout',
    label: 'Muscu',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16" />
        <path d="M18 4v16" />
        <path d="M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3" />
        <path d="M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3" />
        <line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    ),
  },
  {
    href: '/community',
    label: 'Communauté',
    badge: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="12" r="3" />
        <circle cx="16" cy="8" r="3" />
        <circle cx="16" cy="16" r="3" />
        <line x1="11" y1="12" x2="13" y2="9" />
        <line x1="11" y1="12" x2="13" y2="15" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    function fetchUnread() {
      fetch('/api/social/messages/unread')
        .then((r) => r.json())
        .then((data: { count?: number }) => {
          if (typeof data.count === 'number') setUnreadCount(data.count);
        })
        .catch(() => {});
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  if (status === 'loading') return null;

  const isPublicProfilePage = /^\/profile\/[^/]+/.test(pathname);
  const isChatPage = /^\/messages\/.+/.test(pathname);
  if (
    !session ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/share/') ||
    isPublicProfilePage ||
    isChatPage
  ) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] md:bottom-auto md:top-0 md:pb-0">
      {/* Separator — top of nav on mobile (bottom bar), bottom of nav on desktop (top bar) */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent md:hidden" />

      <div
        className="px-2 md:px-6"
        style={{
          background: 'rgba(5, 5, 12, 0.93)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto md:max-w-none md:max-w-7xl md:mx-auto md:justify-start md:gap-1">
          {/* Brand — desktop only */}
          <span className="hidden md:flex items-center gap-2 pr-6 mr-2 border-r border-[#1A1A32] text-[#9D80FF] font-bold text-base tracking-tight shrink-0">
            NutriLens
          </span>

          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const showBadge = tab.badge && unreadCount > 0 && !isActive;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  'relative flex flex-col items-center gap-1 py-3 px-2 min-w-[52px]',
                  'md:flex-row md:gap-2 md:py-4 md:px-3 md:min-w-0',
                  'transition-all duration-200',
                  isActive ? 'text-[#9D80FF]' : 'text-[#2E2C4A] hover:text-[#52507A]',
                ].join(' ')}
              >
                {/* Active background pill */}
                {isActive && (
                  <span
                    className="absolute inset-x-1 top-2 bottom-2 rounded-xl animate-scale-in md:rounded-lg"
                    style={{ background: 'rgba(124, 58, 237, 0.12)' }}
                  />
                )}

                {/* Icon wrapper */}
                <span
                  className={[
                    'relative z-10 transition-transform duration-200',
                    isActive ? 'scale-110 md:scale-100' : 'scale-100',
                  ].join(' ')}
                >
                  {tab.icon(isActive)}

                  {/* Unread badge */}
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#7C3AED] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#08080F] animate-scale-in-bounce">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={[
                    'relative z-10 text-[10px] font-semibold transition-all duration-200',
                    'md:text-sm',
                    isActive ? 'tracking-wide' : 'tracking-normal',
                  ].join(' ')}
                >
                  {tab.label}
                </span>

                {/* Active indicator dot — mobile only */}
                {isActive && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full tab-indicator md:hidden"
                    style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }}
                  />
                )}

                {/* Active indicator line — desktop only */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full hidden md:block"
                    style={{ background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom separator — desktop only */}
      <div className="hidden md:block h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />
    </nav>
  );
}
