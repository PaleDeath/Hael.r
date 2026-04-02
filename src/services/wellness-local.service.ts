/**
 * Local wellness progress + streaks (localStorage).
 * Complements Firebase when the user is offline or anonymous.
 */

const STORAGE_KEY = 'haelr_wellness_progress';

export interface WellnessProgress {
  /** Consecutive calendar days (local) with at least one completed assessment */
  assessmentStreak: number;
  /** ISO date (YYYY-MM-DD) of last assessment day counted toward streak */
  lastAssessmentDay: string | null;
  /** Running count of saved/completed assessments this device has seen */
  totalAssessments: number;
}

function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  const ms = parseYmd(b).getTime() - parseYmd(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function loadWellnessProgress(): WellnessProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        assessmentStreak: 0,
        lastAssessmentDay: null,
        totalAssessments: 0,
      };
    }
    const p = JSON.parse(raw) as Partial<WellnessProgress>;
    return {
      assessmentStreak: typeof p.assessmentStreak === 'number' ? p.assessmentStreak : 0,
      lastAssessmentDay: p.lastAssessmentDay ?? null,
      totalAssessments: typeof p.totalAssessments === 'number' ? p.totalAssessments : 0,
    };
  } catch {
    return {
      assessmentStreak: 0,
      lastAssessmentDay: null,
      totalAssessments: 0,
    };
  }
}

function saveWellnessProgress(p: WellnessProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/**
 * Call when a mental health assessment is completed (before or after cloud save).
 */
export function recordAssessmentDay(): WellnessProgress {
  const prev = loadWellnessProgress();
  const today = todayLocalYmd();
  const last = prev.lastAssessmentDay;

  let streak = prev.assessmentStreak;
  if (!last) {
    streak = 1;
  } else if (last === today) {
    // Same day: keep streak, still bump totals below
    streak = Math.max(1, streak);
  } else {
    const gap = daysBetween(last, today);
    if (gap === 1) streak = prev.assessmentStreak + 1;
    else if (gap > 1) streak = 1;
  }

  const next: WellnessProgress = {
    assessmentStreak: streak,
    lastAssessmentDay: today,
    totalAssessments: prev.totalAssessments + 1,
  };
  saveWellnessProgress(next);
  return next;
}
