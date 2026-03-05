import { ProgressBar } from '@/components/ui/ProgressBar';
import { goalPercent } from '@/lib/nutritionCalc';

interface MacroBarProps {
  label: string;
  consumed: number;
  goal: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, consumed, goal, unit = 'g', color }: MacroBarProps) {
  const percent = goalPercent(consumed, goal);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white/90">{label}</span>
        <span className="text-[#6B6B8A]">
          <span className="text-white font-semibold">{consumed}</span>
          <span className="text-[#6B6B8A]">/{goal}{unit}</span>
        </span>
      </div>
      <ProgressBar value={percent} color={color} height={8} showPercent />
    </div>
  );
}
