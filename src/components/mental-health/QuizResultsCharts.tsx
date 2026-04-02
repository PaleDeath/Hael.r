import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AnalysisResult, MentalHealthCategory } from './types';

const CATEGORY_ORDER: MentalHealthCategory[] = [
  'anxiety',
  'depression',
  'stress',
  'sleep',
  'social',
];

const COLORS: Record<MentalHealthCategory, string> = {
  anxiety: '#8884d8',
  depression: '#82ca9d',
  stress: '#ffc658',
  sleep: '#8dd1e1',
  social: '#a4de6c',
};

interface Props {
  result: AnalysisResult;
}

const QuizResultsCharts: React.FC<Props> = ({ result }) => {
  const barData = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      score: Math.round(result.categories[cat]?.score ?? 0),
      key: cat,
    }));
  }, [result]);

  return (
    <div className="rounded-xl bg-white/90 shadow-md p-4 md:p-6 border border-gray-100">
      <h3 className="text-lg font-medium text-gray-900 mb-1">Category snapshot</h3>
      <p className="text-sm text-gray-500 mb-4">
        Scores are 0–100% relative to your answers (not a clinical score).
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Score']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {barData.map((row) => (
                <Cell key={row.key} fill={COLORS[row.key as MentalHealthCategory]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default QuizResultsCharts;
