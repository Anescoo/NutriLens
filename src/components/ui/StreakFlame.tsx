'use client';

interface Props {
  count: number;
  label: string;
  unit?: string; // e.g. 'j.' or 'sem.'
}

type Tier = {
  min: number;
  color: string;
  innerColor: string;
  glowColor: string;
  badge: string;
};

const TIERS: Tier[] = [
  { min: 30, color: '#7C3AED', innerColor: '#C4B5FD', glowColor: 'rgba(124,58,237,0.55)', badge: 'Légendaire' },
  { min: 14, color: '#DC2626', innerColor: '#FCA5A5', glowColor: 'rgba(220,38,38,0.50)', badge: 'En feu 🔥' },
  { min: 7,  color: '#EF4444', innerColor: '#FDBA74', glowColor: 'rgba(239,68,68,0.45)', badge: 'Chaud' },
  { min: 3,  color: '#F97316', innerColor: '#FEF08A', glowColor: 'rgba(249,115,22,0.40)', badge: 'Actif' },
  { min: 1,  color: '#F59E0B', innerColor: '#FEF3C7', glowColor: 'rgba(245,158,11,0.35)', badge: 'Début' },
  { min: 0,  color: '#3B3B5C', innerColor: '#4B4B70', glowColor: 'transparent',           badge: 'Inactif' },
];

function getTier(count: number): Tier {
  return TIERS.find((t) => count >= t.min) ?? TIERS[TIERS.length - 1];
}

export function StreakFlame({ count, label, unit }: Props) {
  const tier = getTier(count);
  const isActive = count > 0;

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ animation: 'streak-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      {/* Flame container */}
      <div
        className="relative flex items-center justify-center"
        style={{
          animation: isActive ? 'flame-rise 2.8s ease-in-out infinite' : 'none',
        }}
      >
        {/* Halo glow */}
        {isActive && (
          <div
            className="absolute rounded-full"
            style={{
              width: 56,
              height: 56,
              background: `radial-gradient(circle, ${tier.glowColor} 0%, transparent 70%)`,
              animation: 'flame-glow-pulse 2s ease-in-out infinite',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

        {/* SVG Flame */}
        <div
          style={{
            animation: isActive ? 'flame-flicker 2.2s ease-in-out infinite' : 'none',
            transformOrigin: 'bottom center',
            filter: isActive
              ? `drop-shadow(0 2px 10px ${tier.glowColor}) drop-shadow(0 0 4px ${tier.glowColor})`
              : 'none',
          }}
        >
          <svg width="44" height="56" viewBox="0 0 44 56" fill="none">
            {/* Outer flame body */}
            <path
              d="M22 2C22 2 6 17 6 30C6 39.9 13.2 48 22 48C30.8 48 38 39.9 38 30C38 20 29 12 27 7C25 12 24 16 24 16C22 10 22 2 22 2Z"
              fill={tier.color}
            />
            {/* Mid flame */}
            <path
              d="M22 14C22 14 13 24 13 32C13 37.5 17 43 22 44C27 43 31 37.5 31 32C31 25 25 19 24.5 17C23.5 19.5 23 22 23 22C21.5 18 22 14 22 14Z"
              fill={tier.innerColor}
              style={{
                animation: isActive ? 'flame-glow-pulse 1.6s ease-in-out infinite' : 'none',
                opacity: 0.85,
              }}
            />
            {/* Core glow */}
            {isActive && (
              <ellipse
                cx="22"
                cy="37"
                rx="4"
                ry="5"
                fill="white"
                opacity="0.35"
                style={{ animation: 'flame-glow-pulse 1.2s ease-in-out infinite' }}
              />
            )}
            {/* Sparks for high streaks */}
            {count >= 7 && (
              <>
                <circle
                  cx="12"
                  cy="20"
                  r="1.5"
                  fill={tier.innerColor}
                  style={{ animation: 'flame-spark 2s ease-in-out infinite 0.3s', opacity: 0 }}
                />
                <circle
                  cx="32"
                  cy="24"
                  r="1"
                  fill={tier.innerColor}
                  style={{ animation: 'flame-spark 2s ease-in-out infinite 0.8s', opacity: 0 }}
                />
                <circle
                  cx="16"
                  cy="14"
                  r="1"
                  fill={tier.innerColor}
                  style={{ animation: 'flame-spark 2.4s ease-in-out infinite 1.1s', opacity: 0 }}
                />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Count + badge */}
      <div className="text-center">
        <p
          className="text-3xl font-black leading-none"
          style={{ color: isActive ? tier.color : '#3B3B5C' }}
        >
          {count}
          {unit && (
            <span className="text-sm font-semibold ml-0.5 opacity-70">{unit}</span>
          )}
        </p>
        <p
          className="text-[10px] font-bold mt-0.5 tracking-wide uppercase"
          style={{ color: isActive ? tier.color : '#4B4B70' }}
        >
          {tier.badge}
        </p>
        <p className="text-[10px] text-[#6B6B8A] mt-0.5">{label}</p>
      </div>
    </div>
  );
}
