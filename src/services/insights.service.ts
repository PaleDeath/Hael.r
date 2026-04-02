/**
 * Insights Service
 *
 * Generates structured, actionable insights from assessment results and
 * mood history. Fully deterministic — no external API calls.
 */

import { AnalysisResult, MentalHealthCategory } from '../components/mental-health/types';
import { MoodStats } from './firebase.mood.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsightLevel = 'good' | 'moderate' | 'attention';

export interface Insight {
  category: MentalHealthCategory | 'overall' | 'mood';
  level: InsightLevel;
  message: string;
  suggestions: string[];
}

export interface InsightReport {
  insights: Insight[];
  /** Highest-priority insight to surface first in the UI */
  primaryInsight: Insight;
  /** Short (1-sentence) headline suitable for a card header */
  headline: string;
}

// ─── Suggestion bank ─────────────────────────────────────────────────────────

const SUGGESTIONS: Record<MentalHealthCategory, Record<InsightLevel, string[]>> = {
  anxiety: {
    good: [
      'Keep practising your current relaxation routines.',
      'Continue to monitor how your anxiety responds to stressors.',
    ],
    moderate: [
      'Try 5 minutes of deep breathing when you notice tension rising.',
      'Limit caffeine, especially in the afternoon.',
      'Break large tasks into smaller, timed steps to reduce overwhelm.',
    ],
    attention: [
      'Consider speaking with a mental health professional about your anxiety.',
      'Progressive muscle relaxation (PMR) exercises can provide quick relief.',
      'Identify and gradually face anxiety triggers rather than avoiding them.',
      'Reduce screen time in the hour before bed to lower baseline arousal.',
    ],
  },
  depression: {
    good: [
      'Maintaining positive momentum is important — notice what is working.',
      'Stay connected with people who energise you.',
    ],
    moderate: [
      'Schedule at least one enjoyable activity each day, however small.',
      'Aim for a consistent sleep and wake time.',
      'A short walk outdoors can meaningfully lift mood.',
    ],
    attention: [
      'Reach out to a trusted person or mental health professional today.',
      'Behavioural activation — doing activities even when unmotivated — is evidence-based.',
      'Keep a brief gratitude log to gently shift attention to positive moments.',
      'Avoid isolating; maintaining social contact is protective.',
    ],
  },
  stress: {
    good: [
      'Your stress levels look well-managed — keep protecting your recovery time.',
      'Reflect on which coping strategies have been most effective for you.',
    ],
    moderate: [
      'Identify your top two stressors this week and write one action for each.',
      'Guard one block of time daily with no obligations.',
      'Physical movement — even a 10-minute walk — reduces cortisol quickly.',
    ],
    attention: [
      'High chronic stress can affect physical health; prioritise rest now.',
      'Talk through your workload with someone who can help redistribute tasks.',
      'Consider a digital detox — even a few hours offline reduces cognitive load.',
      'Mindfulness-based stress reduction (MBSR) techniques have strong evidence.',
    ],
  },
  sleep: {
    good: [
      'Good sleep is foundational — maintain your consistent sleep schedule.',
      'Notice any activities that reliably improve your sleep quality.',
    ],
    moderate: [
      'Keep your bedroom cool and dark; avoid screens 30 minutes before bed.',
      'Avoid alcohol close to bedtime — it fragments sleep architecture.',
      'A brief wind-down routine (e.g., reading, light stretching) signals the body to sleep.',
    ],
    attention: [
      'Persistent sleep difficulties can worsen all mental health categories — address this first.',
      'Cognitive Behavioural Therapy for Insomnia (CBT-I) is the gold-standard treatment.',
      'Avoid naps longer than 20 minutes if you struggle to fall asleep at night.',
      'Consult a doctor if sleep problems have lasted more than a month.',
    ],
  },
  social: {
    good: [
      'Your social wellbeing looks healthy — investing in relationships pays dividends.',
      'Being a reliable presence for others also strengthens your own resilience.',
    ],
    moderate: [
      'Reach out to one friend or family member this week, even briefly.',
      'Join a group centred on a hobby — shared interests lower the barrier to connection.',
      'Volunteer work is one of the fastest ways to build a sense of belonging.',
    ],
    attention: [
      'Social isolation is a risk factor for depression — small steps matter.',
      'Consider whether shyness or anxiety is limiting connection, and address that directly.',
      'Online communities can be a bridge, but aim for in-person contact where possible.',
      'A therapist can help develop social confidence in a safe environment.',
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function severityToLevel(severity: 'low' | 'moderate' | 'high'): InsightLevel {
  if (severity === 'high')     return 'attention';
  if (severity === 'moderate') return 'moderate';
  return 'good';
}

const MESSAGE_TEMPLATES: Record<
  MentalHealthCategory,
  Record<InsightLevel, string[]>
> = {
  anxiety: {
    good: [
      '{label}: looking steady at {pct}% — a solid baseline.',
      '{label} is sitting at {pct}%, which sits in a comfortable range.',
      'At {pct}%, your {labelLower} signals look manageable right now.',
    ],
    moderate: [
      '{label} is mid-range ({pct}%) — a few focused habits can sharpen this.',
      '{pct}% on {labelLower} suggests some wobble; small daily resets help.',
      'Your {labelLower} score ({pct}%) has headroom; see the tips below.',
    ],
    attention: [
      '{label} reads high ({pct}%). Worth prioritising support and grounding skills.',
      'At {pct}%, {labelLower} is signalling strongly — treat it as a focus area.',
      '{label} at {pct}%: consider leaning on both self-care and professional guidance.',
    ],
  },
  depression: {
    good: [
      '{label} trend is encouraging at {pct}%.',
      '{pct}% — {labelLower} responses look relatively protected.',
      'Your {labelLower} picture ({pct}%) appears stable this pass.',
    ],
    moderate: [
      '{label} is elevated ({pct}%). Gentle structure and connection matter.',
      '{pct}% flags mid-level {labelLower} strain — incremental wins count.',
      '{labelLower} at {pct}%: small routines and sunlight often help.',
    ],
    attention: [
      '{label} needs care now ({pct}%). Reach out sooner rather than later.',
      '{pct}% suggests {labelLower} deserves focused attention this week.',
      'Strong {labelLower} signal ({pct}%) — professional support is a strength move.',
    ],
  },
  stress: {
    good: [
      '{label} load looks workable at {pct}%.',
      '{pct}% — stress seems within a recoverable band.',
      'Stress sits at {pct}%; your system has breathing room.',
    ],
    moderate: [
      '{label} is stacking ({pct}%). Trim one obligation at a time.',
      '{pct}% stress — protect a daily pocket of real downtime.',
      'Mid-band stress ({pct}%): boundaries and movement shift the needle.',
    ],
    attention: [
      '{label} is heavy ({pct}%). Recovery blocks are non-optional.',
      '{pct}% — reduce load where you can; this pace is costly.',
      'High stress ({pct}%): say no once this week on purpose.',
    ],
  },
  sleep: {
    good: [
      '{label} looks sorted at {pct}%.',
      '{pct}% — sleep seems to be doing its job.',
      'At {pct}%, rest patterns look generally supportive.',
    ],
    moderate: [
      '{label} wobbles at {pct}%. Wind-down wins nights.',
      '{pct}% sleep score — tighten light and timing a touch.',
      'Sleep at {pct}%: consistency beats perfection.',
    ],
    attention: [
      '{label} is rough ({pct}%). Fix nights first; everything else gets easier.',
      '{pct}% flags sleep debt — treat it as week-one priority.',
      'Poor sleep ({pct}%): CBT-I style ways are worth exploring.',
    ],
  },
  social: {
    good: [
      '{label} looks healthy at {pct}%.',
      '{pct}% — connection seems reasonably fuelled.',
      'Social side at {pct}%: ties look in decent shape.',
    ],
    moderate: [
      '{label} could use a lift ({pct}%). One intentional reach-out helps.',
      '{pct}% — add a low-pressure social touchpoint this week.',
      'Social score {pct}%: small gatherings beat big leaps.',
    ],
    attention: [
      '{label} is strained ({pct}%). Isolation creeps — push back gently.',
      '{pct}% — lean on trusted people even briefly.',
      'At {pct}%, social life needs deliberate care — start tiny.',
    ],
  },
};

function fillTemplate(tpl: string, label: string, pct: number): string {
  return tpl
    .replace(/\{label\}/g, label)
    .replace(/\{labelLower\}/g, label.toLowerCase())
    .replace(/\{pct\}/g, String(pct));
}

function buildMessage(
  category: MentalHealthCategory,
  level: InsightLevel,
  score: number,
  variationSeed: string
): string {
  const pct = Math.round(score);
  const labels: Record<MentalHealthCategory, string> = {
    anxiety: 'Anxiety',
    depression: 'Depression',
    stress: 'Stress',
    sleep: 'Sleep quality',
    social: 'Social wellbeing',
  };
  const label = labels[category];
  const variants = MESSAGE_TEMPLATES[category][level];
  const idx = stableHash(`${variationSeed}|${category}|${level}`) % variants.length;
  return fillTemplate(variants[idx], label, pct);
}

function pickSuggestions(
  category: MentalHealthCategory,
  level: InsightLevel,
  variationSeed: string,
  count = 3
): string[] {
  const pool = [...SUGGESTIONS[category][level]];
  const seed = stableHash(`${variationSeed}|${category}|${level}|suggestions`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (seed + i * 31) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function pickHeadline(overallLevel: InsightLevel, variationSeed: string): string {
  const map: Record<InsightLevel, string[]> = {
    good: [
      'Overall, things look like they are tracking in a good direction.',
      'Big picture: your last run-through looks mostly solid.',
      'High-level view — you are in a generally healthy band.',
    ],
    moderate: [
      'A few spots deserve gentle tuning — nothing has to be perfect.',
      'There are some mid-level signals worth a closer look this week.',
      'Mixed picture: a little attention in the right places goes far.',
    ],
    attention: [
      'One or more areas are asking for priority care right now.',
      'Worth treating the strongest signals seriously — support helps.',
      'This check-in flagged something important; slow down and plan next steps.',
    ],
  };
  const opts = map[overallLevel];
  const idx = stableHash(`${variationSeed}|headline`) % opts.length;
  return opts[idx];
}

function buildMoodInsight(stats: MoodStats, variationSeed: string): Insight {
  const avg = stats.averageMood;
  const level: InsightLevel =
    avg >= 7 ? 'good' :
    avg >= 4 ? 'moderate' :
    'attention';

  const goodPool = [
    'Continue your current mood-positive habits.',
    'Consider sharing what is working with others.',
    'Replicate the days that already feel lighter.',
  ];
  const modPool = [
    'Log your mood daily to spot patterns.',
    'Identify activities that reliably lift your mood.',
    'Ensure you are getting enough sleep and movement.',
    'Name one micro-win before bed — it compounds.',
  ];
  const attPool = [
    'Talk to someone you trust about how you are feeling.',
    'Track your mood daily to share with a professional.',
    'Small positive actions — sunshine, movement, connection — add up.',
    'If today was heavy, tomorrow only needs one kind step.',
  ];
  const pool = level === 'good' ? goodPool : level === 'moderate' ? modPool : attPool;
  const seed = stableHash(`${variationSeed}|mood|${level}`);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i * 17) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const messageVariants = [
    `Your average mood is ${avg.toFixed(1)}/10 across ${stats.totalEntries} check-ins.`,
    `Across ${stats.totalEntries} entries, mood averages ${avg.toFixed(1)}/10.`,
    `Mood log: ${stats.totalEntries} days averaged to ${avg.toFixed(1)}/10.`,
  ];
  const msgIdx = seed % messageVariants.length;

  return {
    category: 'mood',
    level,
    message: messageVariants[msgIdx],
    suggestions: shuffled.slice(0, 3),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface GenerateInsightsOptions {
  /** e.g. calendar day `YYYY-MM-DD` — rotates phrasing and suggestion order deterministically */
  variationKey?: string;
}

/**
 * Generate a full insight report from assessment results and optional mood stats.
 *
 * @param analysis  - The AnalysisResult returned by analyzeResponses()
 * @param moodStats - Optional MoodStats from FirebaseMoodService.getMoodStats()
 */
export function generateInsights(
  analysis: AnalysisResult,
  moodStats?: MoodStats,
  options?: GenerateInsightsOptions
): InsightReport {
  const variationSeed =
    options?.variationKey ??
    new Date().toISOString().slice(0, 10);

  const insights: Insight[] = [];

  // One insight per assessment category
  const categories: MentalHealthCategory[] = ['anxiety', 'depression', 'stress', 'sleep', 'social'];
  for (const cat of categories) {
    const catData = analysis.categories[cat];
    if (!catData) continue;
    const level = severityToLevel(catData.severity);
    insights.push({
      category: cat,
      level,
      message: buildMessage(cat, level, catData.score, variationSeed),
      suggestions: pickSuggestions(cat, level, variationSeed),
    });
  }

  // Add mood insight if stats are available and have data
  if (moodStats && moodStats.totalEntries > 0) {
    insights.push(buildMoodInsight(moodStats, variationSeed));
  }

  // Overall insight — summarise worst area
  const worstInsight = insights
    .filter(i => i.category !== 'mood' && i.category !== 'overall')
    .sort((a, b) => {
      const rank: Record<InsightLevel, number> = { attention: 2, moderate: 1, good: 0 };
      return rank[b.level] - rank[a.level];
    })[0];

  const overallLevel: InsightLevel = worstInsight?.level ?? 'good';
  const overall: Insight = {
    category: 'overall',
    level: overallLevel,
    message: analysis.overallAnalysis,
    suggestions: analysis.recommendations.slice(0, 3),
  };
  insights.unshift(overall);

  // Primary insight: worst non-overall, or overall if all good
  const primaryInsight = worstInsight ?? overall;

  return {
    insights,
    primaryInsight,
    headline: pickHeadline(overallLevel, variationSeed),
  };
}

/**
 * Convenience wrapper — returns only the top-level Insight for a single category.
 */
export function getCategoryInsight(
  category: MentalHealthCategory,
  score: number,
  severity: 'low' | 'moderate' | 'high',
  variationKey?: string
): Insight {
  const level = severityToLevel(severity);
  const seed = variationKey ?? new Date().toISOString().slice(0, 10);
  return {
    category,
    level,
    message: buildMessage(category, level, score, seed),
    suggestions: pickSuggestions(category, level, seed),
  };
}
