'use client';

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface CalorieRingProps {
  consumed: number;
  goal: number;
}

export function CalorieRing({ consumed, goal }: CalorieRingProps) {
  const percent = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const remaining = Math.max(0, goal - consumed);
  const isOver = consumed > goal;

  const data = [{ value: percent, fill: isOver ? '#EF4444' : '#7C3AED' }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: '#1A1A2E' }}
              dataKey="value"
              cornerRadius={8}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color: isOver ? '#EF4444' : 'white' }}
          >
            {consumed.toLocaleString()}
          </span>
          <span className="text-xs text-[#6B6B8A] mt-0.5">kcal</span>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs" style={{ color: isOver ? '#EF4444' : '#10B981' }}>
              {isOver
                ? `+${(consumed - goal).toLocaleString()} over`
                : `${remaining.toLocaleString()} left`}
            </span>
          </div>
        </div>
      </div>

      {/* Goal label */}
      <p className="text-xs text-[#6B6B8A] mt-1">
        Goal: <span className="text-[#A78BFA]">{goal.toLocaleString()} kcal</span>
      </p>
    </div>
  );
}
