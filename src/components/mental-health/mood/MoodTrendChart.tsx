import React from 'react';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';

export interface MoodTrendDatum {
  label: string;
  mood: number;
  energy: number;
}

interface MoodTrendChartProps {
  data: MoodTrendDatum[];
}

const MoodTrendChart: React.FC<MoodTrendChartProps> = ({ data }) => {
  return (
    <div className="h-64 w-full min-w-0" aria-label="Mood and energy trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="moodFillHael" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D4A3E" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2D4A3E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontFamily: 'Inter, sans-serif', fill: '#8A8474', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontFamily: 'Inter, sans-serif', fill: '#8A8474', fontSize: 10 }}
            width={28}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#FFFDF7',
              border: '1px solid #E8E2D6',
              borderRadius: 0,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              color: '#1A1A1A',
            }}
          />
          <Area
            type="monotone"
            dataKey="mood"
            name="Mood"
            stroke="none"
            fill="url(#moodFillHael)"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="mood"
            name="Mood"
            stroke="#2D4A3E"
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="energy"
            name="Energy"
            stroke="#C4654A"
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MoodTrendChart;
