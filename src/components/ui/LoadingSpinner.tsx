interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

export function LoadingSpinner({
  size = 32,
  color = '#7C3AED',
  label,
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={`${color}33`}
          strokeWidth="3"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <p className="text-sm text-[#6B6B8A]">{label}</p>}
    </div>
  );
}
