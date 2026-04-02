/**
 * Brain training — localStorage mirror, guest sessions, and offline / failed-save queue.
 */

import type { GameSession, UserProgress } from './brain-training.service';

export const BRAIN_LS_SESSIONS = 'brainTrainingSessions';
export const BRAIN_LS_PROGRESS = 'brainTrainingProgress';
export const BRAIN_LS_PENDING_SYNC = 'brainTrainingPendingSync';

export interface BrainGameResultPayload {
  gameType: string;
  score: number;
  level: number;
  accuracy: number;
  reactionTime?: number;
  duration: number;
  details?: Record<string, unknown>;
}

export function readLocalBrainSessions(): GameSession[] {
  try {
    const raw = localStorage.getItem(BRAIN_LS_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GameSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalBrainSessions(sessions: GameSession[]): void {
  const limited = sessions.slice(-100);
  localStorage.setItem(BRAIN_LS_SESSIONS, JSON.stringify(limited));
  updateLocalProgressSummary(limited);
}

export function appendLocalBrainSession(session: GameSession): void {
  const all = readLocalBrainSessions();
  all.push(session);
  writeLocalBrainSessions(all);
}

function calculateLocalStreak(sessions: GameSession[]): number {
  if (sessions.length === 0) return 0;
  const sorted = [...sessions].sort((a, b) => {
    const bt = new Date(b.timestamp ?? b.completedAt ?? 0).getTime();
    const at = new Date(a.timestamp ?? a.completedAt ?? 0).getTime();
    return bt - at;
  });
  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  for (const session of sorted) {
    const sessionDate = new Date(session.timestamp ?? session.completedAt ?? new Date());
    sessionDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor(
      (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff === streak) streak++;
    else if (daysDiff > streak) break;
  }
  return streak;
}

function updateLocalProgressSummary(sessions: GameSession[]): void {
  const progress = {
    totalSessions: sessions.length,
    totalPoints: sessions.reduce((sum, s) => sum + (s.score || 0), 0),
    averageScore:
      sessions.length > 0
        ? Math.round(
            sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length
          )
        : 0,
    currentStreak: calculateLocalStreak(sessions),
    cognitiveAreas: {
      memory: sessions.filter((s) => s.cognitiveArea === 'memory').length,
      focus: sessions.filter((s) => s.cognitiveArea === 'attention' || s.cognitiveArea === 'focus').length,
      processing: sessions.filter((s) => s.cognitiveArea === 'processing').length,
      math: sessions.filter((s) => s.cognitiveArea === 'executive' || s.cognitiveArea === 'math').length,
      language: sessions.filter((s) => s.cognitiveArea === 'language').length,
    },
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem(BRAIN_LS_PROGRESS, JSON.stringify(progress));
}

export function readPendingSync(): BrainGameResultPayload[] {
  try {
    const raw = localStorage.getItem(BRAIN_LS_PENDING_SYNC);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BrainGameResultPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePendingSync(items: BrainGameResultPayload[]): void {
  localStorage.setItem(BRAIN_LS_PENDING_SYNC, JSON.stringify(items.slice(-50)));
}

export function pushPendingSync(result: BrainGameResultPayload): void {
  const q = readPendingSync();
  q.push(result);
  writePendingSync(q);
}

export function removeGuestSessionsFromLocal(): GameSession[] {
  const all = readLocalBrainSessions();
  const remaining = all.filter((s) => s.userId !== 'local_user');
  writeLocalBrainSessions(remaining);
  return remaining;
}

/** Best-effort `UserProgress` when Firestore cannot be read (offline / errors). */
export function localSessionsToUserProgress(userId: string, sessions: GameSession[]): UserProgress {
  const gamesPlayedByType: Record<string, number> = {};
  const bestScoresByType: Record<string, number> = {};
  let totalAccuracy = 0;
  let totalReactionTime = 0;
  let accuracyCount = 0;
  let reactionCount = 0;
  let totalPlayTime = 0;

  for (const s of sessions) {
    const gt = s.gameType;
    gamesPlayedByType[gt] = (gamesPlayedByType[gt] || 0) + 1;
    bestScoresByType[gt] = Math.max(bestScoresByType[gt] || 0, s.score || 0);
    if (typeof s.accuracy === 'number') {
      totalAccuracy += s.accuracy;
      accuracyCount += 1;
    }
    if (typeof s.reactionTime === 'number') {
      totalReactionTime += s.reactionTime;
      reactionCount += 1;
    }
    totalPlayTime += s.duration || 0;
  }

  const totalPoints = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
  const rollupAvg =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length)
      : 0;
  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(b.timestamp ?? b.completedAt ?? 0).getTime() -
      new Date(a.timestamp ?? a.completedAt ?? 0).getTime()
  );
  const last = sorted[0];
  const lastPlayedAt = last ? new Date(last.timestamp ?? last.completedAt ?? Date.now()) : new Date();

  return {
    userId,
    totalGamesPlayed: sessions.length,
    totalScore: totalPoints,
    averageAccuracy: accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : rollupAvg,
    averageReactionTime: reactionCount > 0 ? Math.round(totalReactionTime / reactionCount) : 0,
    gamesPlayedByType,
    bestScoresByType,
    currentStreaks: {
      daily: calculateLocalStreak(sessions),
      weekly: 0,
      monthly: 0,
    },
    lastPlayedAt,
    totalPlayTime,
    cognitiveScores: {
      memory: 50,
      attention: 50,
      processing: 50,
      executive: 50,
    },
    achievements: [],
    level: Math.max(1, Math.floor(sessions.length / 10) + 1),
    xp: sessions.length * 50,
  };
}

export function summarizeLocalSessions(sessions: GameSession[]) {
  const totalSessions = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
  const averageScore =
    totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / totalSessions)
      : 0;
  const gamesPlayedByType: Record<string, number> = {};
  sessions.forEach((s) => {
    gamesPlayedByType[s.gameType] = (gamesPlayedByType[s.gameType] || 0) + 1;
  });
  const favoriteGame =
    Object.entries(gamesPlayedByType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
  return {
    totalSessions,
    totalPoints,
    averageScore,
    currentStreak: calculateLocalStreak(sessions),
    favoriteGame,
  };
}
