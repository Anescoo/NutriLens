'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts';

interface DayData {
  day: string;
  calories: number;
  isToday: boolean;
}

interface WeeklyChartProps {
  data: DayData[];
  goal: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A2E] border border-[#2d1f5e] rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="text-[#A78BFA] font-medium">{label}</p>
        <p className="text-white font-semibold">{payload[0].value} kcal</p>
      </div>
    );
  }
  return null;
};

export function WeeklyChart({ data, goal }: WeeklyChartProps) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barSize={24} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d1f5e55" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#6B6B8A', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={32}
            tick={{ fill: '#6B6B8A', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#7C3AED11' }} />
          <Bar dataKey="calories" radius={[5, 5, 0, 0]} minPointSize={3}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.isToday
                    ? '#7C3AED'
                    : entry.calories >= goal
                    ? '#10B981'
                    : '#2d1f5e'
                }
                opacity={entry.isToday ? 1 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" />
          <span className="text-[10px] text-[#6B6B8A]">Aujourd'hui</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
          <span className="text-[10px] text-[#6B6B8A]">Objectif atteint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#2d1f5e]" />
          <span className="text-[10px] text-[#6B6B8A]">Sans données</span>
        </div>
      </div>
    </div>
  );
}
