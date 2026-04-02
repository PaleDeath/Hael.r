/**
 * Text Analysis Service
 *
 * Deterministic journal analysis: phrases, negation, intensity — no network calls.
 */

// ─── Phrase dictionaries (longer phrases listed first for greedy matching) ───

type StressTier = 'high' | 'moderate' | 'low';

const STRESS_PHRASES: { phrase: string; tier: StressTier; baseWeight: number }[] = [
  { phrase: 'falling apart', tier: 'high', baseWeight: 3.2 },
  { phrase: 'out of control', tier: 'high', baseWeight: 3.2 },
  { phrase: "can't cope", tier: 'high', baseWeight: 3.2 },
  { phrase: 'can\'t cope', tier: 'high', baseWeight: 3.2 },
  { phrase: 'bit stressed', tier: 'low', baseWeight: 0.9 },
  { phrase: 'hard time', tier: 'moderate', baseWeight: 2 },
  { phrase: 'slightly anxious', tier: 'low', baseWeight: 1 },
  { phrase: 'getting by', tier: 'low', baseWeight: 0.85 },
  { phrase: 'on edge', tier: 'moderate', baseWeight: 2 },
  { phrase: 'overwhelmed', tier: 'high', baseWeight: 3 },
  { phrase: 'hopeless', tier: 'high', baseWeight: 3 },
  { phrase: 'unbearable', tier: 'high', baseWeight: 3 },
  { phrase: 'burnout', tier: 'high', baseWeight: 3 },
  { phrase: 'breaking', tier: 'high', baseWeight: 2.6 },
  { phrase: 'panic', tier: 'high', baseWeight: 2.8 },
  { phrase: 'disaster', tier: 'high', baseWeight: 2.4 },
  { phrase: 'crisis', tier: 'high', baseWeight: 2.6 },
  { phrase: 'terrible', tier: 'high', baseWeight: 2.2 },
  { phrase: 'awful', tier: 'high', baseWeight: 2.2 },
  { phrase: 'horrible', tier: 'high', baseWeight: 2.2 },
  { phrase: 'miserable', tier: 'high', baseWeight: 2.2 },
  { phrase: 'stressed', tier: 'moderate', baseWeight: 2 },
  { phrase: 'anxious', tier: 'moderate', baseWeight: 2 },
  { phrase: 'worried', tier: 'moderate', baseWeight: 1.8 },
  { phrase: 'tense', tier: 'moderate', baseWeight: 1.8 },
  { phrase: 'nervous', tier: 'moderate', baseWeight: 1.8 },
  { phrase: 'pressure', tier: 'moderate', baseWeight: 1.8 },
  { phrase: 'deadline', tier: 'moderate', baseWeight: 1.5 },
  { phrase: 'overloaded', tier: 'moderate', baseWeight: 2 },
  { phrase: 'difficult', tier: 'moderate', baseWeight: 1.6 },
  { phrase: 'struggle', tier: 'moderate', baseWeight: 1.8 },
  { phrase: 'exhausted', tier: 'moderate', baseWeight: 2 },
  { phrase: 'drained', tier: 'moderate', baseWeight: 2 },
  { phrase: 'frustrated', tier: 'moderate', baseWeight: 1.8 },
  { phrase: 'irritable', tier: 'moderate', baseWeight: 1.8 },
  { phrase: 'busy', tier: 'moderate', baseWeight: 1.2 },
  { phrase: 'tired', tier: 'low', baseWeight: 1 },
  { phrase: 'manageable', tier: 'low', baseWeight: 0.7 },
  { phrase: 'okay', tier: 'low', baseWeight: 0.5 },
  { phrase: 'ok', tier: 'low', baseWeight: 0.5 },
  { phrase: 'fine', tier: 'low', baseWeight: 0.55 },
  { phrase: 'alright', tier: 'low', baseWeight: 0.55 },
];

const POSITIVE_PHRASES: { phrase: string; baseWeight: number }[] = [
  { phrase: 'thankful', baseWeight: 1.2 },
  { phrase: 'grateful', baseWeight: 1.3 },
  { phrase: 'peaceful', baseWeight: 1.2 },
  { phrase: 'productive', baseWeight: 1.1 },
  { phrase: 'accomplished', baseWeight: 1.2 },
  { phrase: 'refreshed', baseWeight: 1.1 },
  { phrase: 'motivated', baseWeight: 1.1 },
  { phrase: 'wonderful', baseWeight: 1.3 },
  { phrase: 'fantastic', baseWeight: 1.3 },
  { phrase: 'excellent', baseWeight: 1.2 },
  { phrase: 'amazing', baseWeight: 1.25 },
  { phrase: 'cheerful', baseWeight: 1.15 },
  { phrase: 'hopeful', baseWeight: 1.15 },
  { phrase: 'energetic', baseWeight: 1.1 },
  { phrase: 'improving', baseWeight: 1.1 },
  { phrase: 'excited', baseWeight: 1.15 },
  { phrase: 'relaxed', baseWeight: 1.1 },
  { phrase: 'content', baseWeight: 1.05 },
  { phrase: 'calm', baseWeight: 1.1 },
  { phrase: 'happy', baseWeight: 1.2 },
  { phrase: 'great', baseWeight: 1 },
  { phrase: 'good', baseWeight: 0.85 },
  { phrase: 'better', baseWeight: 0.95 },
  { phrase: 'joy', baseWeight: 1 },
  { phrase: 'love', baseWeight: 1.05 },
  { phrase: 'proud', baseWeight: 1.1 },
];

const NEGATIVE_PHRASES: { phrase: string; baseWeight: number }[] = [
  { phrase: 'worthless', baseWeight: 1.4 },
  { phrase: 'overwhelmed', baseWeight: 1.2 },
  { phrase: 'miserable', baseWeight: 1.25 },
  { phrase: 'depressed', baseWeight: 1.35 },
  { phrase: 'terrified', baseWeight: 1.25 },
  { phrase: 'isolated', baseWeight: 1.15 },
  { phrase: 'resentful', baseWeight: 1.15 },
  { phrase: 'disappointed', baseWeight: 1.1 },
  { phrase: 'frustrated', baseWeight: 1.1 },
  { phrase: 'exhausted', baseWeight: 1.1 },
  { phrase: 'anxious', baseWeight: 1.15 },
  { phrase: 'stressed', baseWeight: 1.1 },
  { phrase: 'worried', baseWeight: 1.05 },
  { phrase: 'lonely', baseWeight: 1.15 },
  { phrase: 'hopeless', baseWeight: 1.35 },
  { phrase: 'empty', baseWeight: 1.15 },
  { phrase: 'numb', baseWeight: 1.2 },
  { phrase: 'terrible', baseWeight: 1.1 },
  { phrase: 'ashamed', baseWeight: 1.1 },
  { phrase: 'guilty', baseWeight: 1.05 },
  { phrase: 'regret', baseWeight: 1.05 },
  { phrase: 'angry', baseWeight: 1.05 },
  { phrase: 'fearful', baseWeight: 1.1 },
  { phrase: 'scared', baseWeight: 1.1 },
  { phrase: 'sad', baseWeight: 1.05 },
  { phrase: 'unhappy', baseWeight: 1.1 },
  { phrase: 'lost', baseWeight: 1.05 },
  { phrase: 'confused', baseWeight: 0.95 },
  { phrase: 'nervous', baseWeight: 1.05 },
  { phrase: 'awful', baseWeight: 1.05 },
  { phrase: 'drained', baseWeight: 1.05 },
];

// ─── Negation & intensity (word-boundary tokens in normalised text) ──────────

const NEGATION_RE =
  /\b(no|not|never|neither|nor|without|nobody|nothing|nowhere|noone|aint|isnt|arent|wasnt|werent|dont|doesnt|didnt|wont|wouldnt|shouldnt|couldnt|havent|hasnt|hadnt|hardly|barely|scarcely)\b/g;

const INTENSITY_DOWN_RE =
  /\b(a\s+bit|a\s+little|bit|slightly|somewhat|kind\s+of|sort\s+of|mildly|relatively)\b/g;

const INTENSITY_UP_RE =
  /\b(very|extremely|incredibly|intensely|really|so|totally|completely|deeply|severely|quite|pretty|majorly|badly)\b/g;

export type StressLevel = 'low' | 'moderate' | 'high';
export type MoodSentiment = 'positive' | 'neutral' | 'negative';

export interface TextAnalysisResult {
  stressScore: number;
  stressLevel: StressLevel;
  sentiment: MoodSentiment;
  positiveScore: number;
  negativeScore: number;
  detectedKeywords: string[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function negationCountInWindow(normalized: string, matchStart: number, lookback = 56): number {
  const start = Math.max(0, matchStart - lookback);
  const slice = normalized.slice(start, matchStart);
  let count = 0;
  const re = new RegExp(NEGATION_RE.source, 'g');
  while (re.exec(slice) !== null) count++;
  return count;
}

function isNegatedAt(normalized: string, matchStart: number): boolean {
  return negationCountInWindow(normalized, matchStart) % 2 === 1;
}

function intensityMultiplier(normalized: string, matchStart: number): number {
  const start = Math.max(0, matchStart - 40);
  const slice = normalized.slice(start, matchStart);
  let up = 0;
  let down = 0;
  const upRe = new RegExp(INTENSITY_UP_RE.source, 'g');
  const downRe = new RegExp(INTENSITY_DOWN_RE.source, 'g');
  while (upRe.exec(slice) !== null) up++;
  while (downRe.exec(slice) !== null) down++;
  let mult = 1;
  if (up > 0) mult *= 1 + Math.min(up, 2) * 0.18;
  if (down > 0) mult *= Math.max(0.55, 1 - Math.min(down, 2) * 0.2);
  return Math.min(1.55, Math.max(0.5, mult));
}

type Span = { start: number; end: number };

function collectPhraseHits(
  normalized: string,
  phrases: { phrase: string; baseWeight: number }[],
  stressOnly: boolean
): {
  weighted: number;
  labels: string[];
  spans: Span[];
} {
  const sorted = [...phrases].sort((a, b) => b.phrase.length - a.phrase.length);
  const spans: Span[] = [];
  const labels: string[] = [];
  let weighted = 0;

  for (const { phrase, baseWeight } of sorted) {
    let idx = 0;
    while (idx < normalized.length) {
      const found = normalized.indexOf(phrase, idx);
      if (found === -1) break;
      const end = found + phrase.length;
      const overlap = spans.some((s) => found < s.end && end > s.start);
      if (!overlap) {
        const neg = isNegatedAt(normalized, found);
        const intens = intensityMultiplier(normalized, found);
        let contribution = baseWeight * intens;
        if (neg) {
          contribution *= stressOnly ? -0.45 : -0.55;
        }
        weighted += contribution;
        labels.push(phrase);
        spans.push({ start: found, end });
      }
      idx = found + 1;
    }
  }

  return { weighted, labels, spans };
}

function stressFromWeighted(weightedStress: number, wordCount: number): number {
  const density = weightedStress / Math.max(wordCount * 0.35, 1);
  return Math.min(100, Math.max(0, Math.round(density * 22)));
}

/**
 * Analyse a free-text journal note and return a stress/sentiment breakdown.
 */
export function analyzeNotes(text: string): TextAnalysisResult {
  if (!text || text.trim().length === 0) {
    return {
      stressScore: 0,
      stressLevel: 'low',
      sentiment: 'neutral',
      positiveScore: 0,
      negativeScore: 0,
      detectedKeywords: [],
    };
  }

  const normalized = normalizeText(text);
  const wordCount = Math.max(normalized.split(/\s+/).filter(Boolean).length, 1);

  const stressHits = collectPhraseHits(
    normalized,
    STRESS_PHRASES.map((p) => ({ phrase: p.phrase, baseWeight: p.baseWeight })),
    true
  );

  const posHits = collectPhraseHits(
    normalized,
    POSITIVE_PHRASES,
    false
  );
  const negHits = collectPhraseHits(
    normalized,
    NEGATIVE_PHRASES,
    false
  );

  const stressScore = stressFromWeighted(stressHits.weighted, wordCount);

  const posPool = Math.max(1, wordCount * 0.12);
  const negPool = Math.max(1, wordCount * 0.12);
  let positiveScore = Math.min(1, Math.max(0, posHits.weighted / posPool / 4));
  let negativeScore = Math.min(1, Math.max(0, negHits.weighted / negPool / 4));

  if (positiveScore > 0 && negativeScore > 0) {
    const damp = 0.85;
    positiveScore *= damp;
    negativeScore *= damp;
  }

  const stressLevel: StressLevel =
    stressScore >= 60 ? 'high' : stressScore >= 28 ? 'moderate' : 'low';

  const sentiment: MoodSentiment =
    positiveScore > negativeScore + 0.08 ? 'positive' :
    negativeScore > positiveScore + 0.08 ? 'negative' :
    'neutral';

  const detectedKeywords = [...new Set([...stressHits.labels, ...posHits.labels, ...negHits.labels])];

  return {
    stressScore,
    stressLevel,
    sentiment,
    positiveScore,
    negativeScore,
    detectedKeywords,
  };
}

export function detectStressLevel(text: string): StressLevel {
  return analyzeNotes(text).stressLevel;
}

export function detectMood(text: string): MoodSentiment {
  return analyzeNotes(text).sentiment;
}
