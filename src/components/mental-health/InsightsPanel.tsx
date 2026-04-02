import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { InsightReport } from '../../services/insights.service';

interface Props {
  report: InsightReport;
  className?: string;
}

const levelStyles: Record<string, string> = {
  good: 'border-l-emerald-500 bg-emerald-50/80',
  moderate: 'border-l-amber-500 bg-amber-50/80',
  attention: 'border-l-rose-500 bg-rose-50/80',
};

const InsightsPanel: React.FC<Props> = ({ report, className = '' }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('[data-insight-card]');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 28, filter: 'blur(6px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.55,
        stagger: 0.11,
        ease: 'power3.out',
        clearProps: 'filter',
      }
    );
  }, [report]);

  return (
    <div ref={rootRef} className={`space-y-4 ${className}`}>
      <div
        data-insight-card
        className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-5 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Summary</p>
        <h3 className="text-xl font-semibold text-gray-900 leading-snug">{report.headline}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{report.primaryInsight.message}</p>
        {report.primaryInsight.suggestions.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
            {report.primaryInsight.suggestions.slice(0, 2).map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-indigo-500 shrink-0">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {report.insights
        .filter((i) => i.category !== 'overall')
        .map((insight) => (
          <div
            key={insight.category}
            data-insight-card
            className={`rounded-xl border border-gray-100 border-l-4 p-4 shadow-sm ${levelStyles[insight.level]}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-medium capitalize text-gray-900">{String(insight.category).replace(/_/g, ' ')}</span>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-600">{insight.level}</span>
            </div>
            <p className="text-sm text-gray-800 mb-2">{insight.message}</p>
            {insight.suggestions.length > 0 && (
              <ul className="text-sm text-gray-700 space-y-1 list-disc pl-4">
                {insight.suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
};

export default InsightsPanel;
