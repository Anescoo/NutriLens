interface ProgressBarProps {
  value: number;    // 0-100
  color?: string;
  height?: number;
  label?: string;
  sublabel?: string;
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  color = '#7C3AED',
  height = 8,
  label,
  sublabel,
  showPercent = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const isOver = value > 100;

  return (
    <div className="w-full">
      {(label || sublabel || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          <div>
            {label && <span className="text-sm font-medium text-white/90">{label}</span>}
            {sublabel && <span className="text-xs text-[#6B6B8A] ml-2">{sublabel}</span>}
          </div>
          {showPercent && (
            <span
              className="text-xs font-semibold"
              style={{ color: isOver ? '#EF4444' : color }}
            >
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden bg-[#0F0F1A]"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clamped}%`,
            background: isOver
              ? '#EF4444'
              : `linear-gradient(90deg, ${color}99, ${color})`,
          }}
        />
      </div>
    </div>
  );
}
