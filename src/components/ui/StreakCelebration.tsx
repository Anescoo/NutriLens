'use client';

import { useEffect, useState } from 'react';

const TIERS = [
  { min: 30, color: '#7C3AED', innerColor: '#C4B5FD', glowColor: 'rgba(124,58,237,0.55)', badge: 'Légendaire' },
  { min: 14, color: '#DC2626', innerColor: '#FCA5A5', glowColor: 'rgba(220,38,38,0.50)', badge: 'En feu 🔥' },
  { min: 7,  color: '#EF4444', innerColor: '#FDBA74', glowColor: 'rgba(239,68,68,0.45)', badge: 'Chaud' },
  { min: 3,  color: '#F97316', innerColor: '#FEF08A', glowColor: 'rgba(249,115,22,0.40)', badge: 'Actif' },
  { min: 1,  color: '#F59E0B', innerColor: '#FEF3C7', glowColor: 'rgba(245,158,11,0.35)', badge: 'Début' },
];

const MILESTONES = [1, 3, 7, 14, 30];

function getTier(count: number) {
  return TIERS.find((t) => count >= t.min);
}

interface Props {
  nutritionStreak?: number;
  workoutStreak?: number;
}

export function StreakCelebration({ nutritionStreak, workoutStreak }: Props) {
  const [celebrating, setCelebrating] = useState<{ count: number; label: string } | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const check = (count: number | undefined, key: string, label: string): boolean => {
      if (count === undefined || !MILESTONES.includes(count)) return false;
      const stored = localStorage.getItem(`streak-seen-${key}`);
      if (stored === String(count)) return false;
      localStorage.setItem(`streak-seen-${key}`, String(count));
      setCelebrating({ count, label });
      return true;
    };
    if (!check(nutritionStreak, 'nutrition', 'Nutrition')) {
      check(workoutStreak, 'workout', 'Musculation');
    }
  }, [nutritionStreak, workoutStreak]);

  const dismiss = () => {
    setDismissing(true);
    setTimeout(() => { setCelebrating(null); setDismissing(false); }, 400);
  };

  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(dismiss, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrating]);

  if (!celebrating) return null;

  const tier = getTier(celebrating.count);
  if (!tier) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,15,26,0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        animation: dismissing
          ? 'celebration-out 0.4s ease-in forwards'
          : 'celebration-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Halo */}
      <div
        style={{
          position: 'absolute',
          width: 280, height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${tier.glowColor} 0%, transparent 65%)`,
          animation: 'flame-glow-pulse 2s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Large flame */}
      <div style={{ animation: 'flame-rise 2.8s ease-in-out infinite', marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div style={{
          animation: 'flame-flicker 2.2s ease-in-out infinite',
          transformOrigin: 'bottom center',
          filter: `drop-shadow(0 6px 32px ${tier.glowColor}) drop-shadow(0 0 12px ${tier.glowColor})`,
        }}>
          <svg width="120" height="152" viewBox="0 0 44 56" fill="none">
            <path
              d="M22 2C22 2 6 17 6 30C6 39.9 13.2 48 22 48C30.8 48 38 39.9 38 30C38 20 29 12 27 7C25 12 24 16 24 16C22 10 22 2 22 2Z"
              fill={tier.color}
            />
            <path
              d="M22 14C22 14 13 24 13 32C13 37.5 17 43 22 44C27 43 31 37.5 31 32C31 25 25 19 24.5 17C23.5 19.5 23 22 23 22C21.5 18 22 14 22 14Z"
              fill={tier.innerColor}
              opacity="0.85"
              style={{ animation: 'flame-glow-pulse 1.6s ease-in-out infinite' }}
            />
            <ellipse cx="22" cy="37" rx="4" ry="5" fill="white" opacity="0.4" style={{ animation: 'flame-glow-pulse 1.2s ease-in-out infinite' }} />
            {celebrating.count >= 7 && (
              <>
                <circle cx="12" cy="20" r="2" fill={tier.innerColor} style={{ animation: 'flame-spark 2s ease-in-out infinite 0.3s', opacity: 0 }} />
                <circle cx="32" cy="24" r="1.5" fill={tier.innerColor} style={{ animation: 'flame-spark 2s ease-in-out infinite 0.8s', opacity: 0 }} />
                <circle cx="16" cy="14" r="1.5" fill={tier.innerColor} style={{ animation: 'flame-spark 2.4s ease-in-out infinite 1.1s', opacity: 0 }} />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Text content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          {celebrating.label} · Nouvelle série !
        </p>
        <p style={{ fontSize: 40, fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: 14 }}>
          {celebrating.count} jour{celebrating.count > 1 ? 's' : ''}
        </p>
        <div style={{
          display: 'inline-block',
          fontSize: 20, fontWeight: 800, color: tier.color,
          padding: '8px 28px',
          border: `2px solid ${tier.color}50`,
          borderRadius: 999,
          background: `${tier.color}18`,
          marginBottom: 36,
        }}>
          {tier.badge}
        </div>
        <p style={{ fontSize: 12, color: '#6B6B8A' }}>Appuie pour continuer</p>
      </div>
    </div>
  );
}
