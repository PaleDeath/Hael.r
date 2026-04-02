import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  appendLocalBrainSession,
  readLocalBrainSessions,
  readPendingSync,
  writeLocalBrainSessions,
  writePendingSync,
  type BrainGameResultPayload,
} from './brain-training-local.storage';

// Types
export interface GameSession {
  id?: string;
  gameType: string;
  userId: string;
  score: number;
  level: number;
  accuracy: number;
  reactionTime?: number;
  duration: number;
  completedAt?: Date;
  timestamp?: Date;
  cognitiveArea?: string;
  details: Record<string, any>;
}

export interface UserProgress {
  userId: string;
  totalGamesPlayed: number;
  totalScore: number;
  averageAccuracy: number;
  averageReactionTime: number;
  gamesPlayedByType: Record<string, number>;
  bestScoresByType: Record<string, number>;
  currentStreaks: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  lastPlayedAt: Date;
  totalPlayTime: number;
  cognitiveScores: {
    memory: number;
    attention: number;
    processing: number;
    executive: number;
  };
  achievements: string[];
  level: number;
  xp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'score' | 'streak' | 'games_played' | 'accuracy' | 'speed' | 'special';
  category: 'memory' | 'attention' | 'processing' | 'executive' | 'general';
  requirement: {
    value: number;
    gameType?: string;
  };
  xpReward: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface CognitiveAssessment {
  userId: string;
  date: Date;
  cognitiveScores: {
    memory: number;
    attention: number;
    processing: number;
    executive: number;
    overall: number;
  };
  recommendedGames: string[];
  mentalHealthCorrelation?: {
    stressLevel: number;
    moodLevel: number;
    anxietyLevel: number;
  };
}

// Predefined achievements
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_score',
    title: 'First Steps',
    description: 'Complete your first brain training game',
    icon: '🎯',
    type: 'games_played',
    category: 'general',
    requirement: { value: 1 },
    xpReward: 50,
    rarity: 'common'
  },
  {
    id: 'score_master',
    title: 'Score Master',
    description: 'Achieve a score of 1000 in any game',
    icon: '🏆',
    type: 'score',
    category: 'general',
    requirement: { value: 1000 },
    xpReward: 200,
    rarity: 'uncommon'
  },
  {
    id: 'memory_streak',
    title: 'Memory Champion',
    description: 'Play memory games for 5 consecutive days',
    icon: '🧠',
    type: 'streak',
    category: 'memory',
    requirement: { value: 5 },
    xpReward: 300,
    rarity: 'rare'
  },
  {
    id: 'perfect_accuracy',
    title: 'Perfectionist',
    description: 'Achieve 100% accuracy in any game',
    icon: '💎',
    type: 'accuracy',
    category: 'general',
    requirement: { value: 100 },
    xpReward: 150,
    rarity: 'uncommon'
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Average reaction time under 300ms',
    icon: '⚡',
    type: 'speed',
    category: 'processing',
    requirement: { value: 300 },
    xpReward: 250,
    rarity: 'rare'
  },
  {
    id: 'attention_master',
    title: 'Attention Master',
    description: 'Complete 25 attention training sessions',
    icon: '👁️',
    type: 'games_played',
    category: 'attention',
    requirement: { value: 25, gameType: 'attention-trainer' },
    xpReward: 400,
    rarity: 'epic'
  },
  {
    id: 'cognitive_scholar',
    title: 'Cognitive Scholar',
    description: 'Complete 100 brain training games',
    icon: '🎓',
    type: 'games_played',
    category: 'general',
    requirement: { value: 100 },
    xpReward: 500,
    rarity: 'legendary'
  }
];

class BrainTrainingService {
  private static instance: BrainTrainingService;
  private readonly sessionsCollection = 'brain_training_sessions';
  private readonly progressCollection = 'brain_training_progress';

  static getInstance(): BrainTrainingService {
    if (!BrainTrainingService.instance) {
      BrainTrainingService.instance = new BrainTrainingService();
    }
    return BrainTrainingService.instance;
  }

  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  private normalizeDate(value: any): Date {
    if (value instanceof Date) return value;
    if (value?.toDate) return value.toDate();
    return new Date(value ?? Date.now());
  }

  /** Public alias for hooks / local storage mirroring */
  getCognitiveAreaPublic(gameType: string): keyof UserProgress['cognitiveScores'] {
    return this.getCognitiveArea(gameType);
  }

  private getCognitiveArea(gameType: string): keyof UserProgress['cognitiveScores'] {
    const mapping: Record<string, keyof UserProgress['cognitiveScores']> = {
      'memory-matrix': 'memory',
      'word-pairs': 'memory',
      'sequence-recall': 'memory',
      'color-match': 'attention',
      'attention-trainer': 'attention',
      'dual-task': 'attention',
      'speed-match': 'processing',
      'rapid-visual': 'processing',
      'reaction-time': 'processing',
      'mental-math': 'executive',
      'number-sequences': 'executive',
      'fraction-frenzy': 'executive',
      'word-builder': 'executive',
      'synonym-challenge': 'executive',
      'reading-comprehension': 'executive'
    };

    return mapping[gameType] || 'executive';
  }

  private createDefaultProgress(userId: string): UserProgress {
    return {
      userId,
      totalGamesPlayed: 0,
      totalScore: 0,
      averageAccuracy: 0,
      averageReactionTime: 0,
      gamesPlayedByType: {},
      bestScoresByType: {},
      currentStreaks: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
      lastPlayedAt: new Date(),
      totalPlayTime: 0,
      cognitiveScores: {
        memory: 50,
        attention: 50,
        processing: 50,
        executive: 50,
      },
      achievements: [],
      level: 1,
      xp: 0
    };
  }

  private async fetchUserSessions(userId: string): Promise<GameSession[]> {
    const snapshot = await getDocs(
      query(
        collection(db, this.sessionsCollection),
        where('userId', '==', userId),
        limit(500)
      )
    );

    return snapshot.docs
      .map((entry) => {
        const data = entry.data() as any;
        return {
          id: entry.id,
          userId: data.userId,
          gameType: data.gameType,
          score: data.score,
          level: data.level,
          accuracy: data.accuracy,
          reactionTime: data.reactionTime,
          duration: data.duration,
          completedAt: this.normalizeDate(data.completedAt),
          timestamp: this.normalizeDate(data.completedAt),
          cognitiveArea: data.cognitiveArea,
          details: data.details || {}
        } as GameSession;
      })
      .sort((a, b) => this.normalizeDate(b.completedAt).getTime() - this.normalizeDate(a.completedAt).getTime());
  }

  private calculateCurrentStreak(sessions: GameSession[]): number {
    if (sessions.length === 0) return 0;

    const uniqueDays = [...new Set(
      sessions.map((session) => {
        const date = this.normalizeDate(session.completedAt ?? session.timestamp);
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      })
    )]
      .map((iso) => new Date(iso))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const playedDay of uniqueDays) {
      const delta = Math.floor((cursor.getTime() - playedDay.getTime()) / (1000 * 60 * 60 * 24));
      if (delta === streak) {
        streak += 1;
      } else if (delta > streak) {
        break;
      }
    }

    return streak;
  }

  private calculatePeriodStreak(sessions: GameSession[], period: 'weekly' | 'monthly'): number {
    if (sessions.length === 0) return 0;

    const sorted = [...sessions].sort(
      (a, b) => this.normalizeDate(b.completedAt ?? b.timestamp).getTime() - this.normalizeDate(a.completedAt ?? a.timestamp).getTime()
    );

    const now = new Date();
    const seen = new Set<string>();
    let streak = 0;

    for (const session of sorted) {
      const date = this.normalizeDate(session.completedAt ?? session.timestamp);
      const key = period === 'weekly'
        ? `${date.getUTCFullYear()}-${this.getWeekNumber(date)}`
        : `${date.getUTCFullYear()}-${date.getUTCMonth()}`;

      if (seen.has(key)) continue;
      seen.add(key);

      if (period === 'weekly') {
        const expected = this.getWeekNumber(new Date(now.getTime() - streak * 7 * 24 * 60 * 60 * 1000));
        if (this.getWeekNumber(date) === expected) {
          streak += 1;
          continue;
        }
      } else {
        const expectedDate = new Date(now.getFullYear(), now.getMonth() - streak, 1);
        if (date.getFullYear() === expectedDate.getFullYear() && date.getMonth() === expectedDate.getMonth()) {
          streak += 1;
          continue;
        }
      }

      break;
    }

    return streak;
  }

  private getWeekNumber(date: Date): number {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const diff = date.getTime() - start.getTime();
    return Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getUTCDay() + 1) / 7);
  }

  private getAchievementProgressValue(achievement: Achievement, sessions: GameSession[], progress: UserProgress): number {
    switch (achievement.type) {
      case 'games_played':
        if (achievement.requirement.gameType) {
          return sessions.filter((session) => session.gameType === achievement.requirement.gameType).length;
        }
        return progress.totalGamesPlayed;
      case 'score':
        return Math.max(0, ...sessions.map((session) => session.score));
      case 'accuracy':
        return Math.max(0, ...sessions.map((session) => session.accuracy));
      case 'speed':
        return Math.min(...sessions.filter((session) => typeof session.reactionTime === 'number').map((session) => session.reactionTime as number), Number.POSITIVE_INFINITY);
      case 'streak':
        return progress.currentStreaks.daily;
      default:
        return 0;
    }
  }

  private async rebuildUserProgress(userId: string): Promise<UserProgress> {
    const sessions = await this.fetchUserSessions(userId);
    if (sessions.length === 0) {
      const emptyProgress = this.createDefaultProgress(userId);
      await setDoc(doc(db, this.progressCollection, userId), {
        ...emptyProgress,
        lastPlayedAt: Timestamp.fromDate(emptyProgress.lastPlayedAt)
      });
      return emptyProgress;
    }

    const progress = this.createDefaultProgress(userId);
    progress.totalGamesPlayed = sessions.length;
    progress.totalScore = sessions.reduce((sum, session) => sum + session.score, 0);
    progress.averageAccuracy = Math.round(progress.totalScore === 0 ? 0 : sessions.reduce((sum, session) => sum + session.accuracy, 0) / sessions.length);

    const reactionTimes = sessions
      .map((session) => session.reactionTime)
      .filter((value): value is number => typeof value === 'number');
    progress.averageReactionTime = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((sum, value) => sum + value, 0) / reactionTimes.length)
      : 0;

    progress.totalPlayTime = sessions.reduce((sum, session) => sum + session.duration, 0);
    progress.lastPlayedAt = this.normalizeDate(sessions[0].completedAt ?? sessions[0].timestamp);

    const domainStats: Record<keyof UserProgress['cognitiveScores'], { total: number; count: number }> = {
      memory: { total: 0, count: 0 },
      attention: { total: 0, count: 0 },
      processing: { total: 0, count: 0 },
      executive: { total: 0, count: 0 }
    };

    let earnedXp = 0;

    for (const session of sessions) {
      progress.gamesPlayedByType[session.gameType] = (progress.gamesPlayedByType[session.gameType] || 0) + 1;
      progress.bestScoresByType[session.gameType] = Math.max(progress.bestScoresByType[session.gameType] || 0, session.score);

      const domain = this.getCognitiveArea(session.gameType);
      const performanceScore = Math.min(100, Math.round((session.accuracy + Math.min(session.score / 10, 100)) / 2));
      domainStats[domain].total += performanceScore;
      domainStats[domain].count += 1;

      earnedXp += Math.round(session.score / 10) + (session.accuracy >= 90 ? 50 : 0);
    }

    (Object.keys(domainStats) as Array<keyof UserProgress['cognitiveScores']>).forEach((domain) => {
      const stats = domainStats[domain];
      progress.cognitiveScores[domain] = stats.count > 0
        ? Math.round(stats.total / stats.count)
        : 50;
    });

    progress.currentStreaks = {
      daily: this.calculateCurrentStreak(sessions),
      weekly: this.calculatePeriodStreak(sessions, 'weekly'),
      monthly: this.calculatePeriodStreak(sessions, 'monthly')
    };

    const unlockedAchievements = ACHIEVEMENTS.filter((achievement) => {
      const value = this.getAchievementProgressValue(achievement, sessions, progress);
      if (achievement.type === 'speed') {
        return Number.isFinite(value) && value <= achievement.requirement.value;
      }
      return value >= achievement.requirement.value;
    });

    progress.achievements = unlockedAchievements.map((achievement) => achievement.id);
    progress.xp = earnedXp + unlockedAchievements.reduce((sum, achievement) => sum + achievement.xpReward, 0);
    progress.level = Math.max(1, Math.floor(progress.xp / 1000) + 1);

    await setDoc(doc(db, this.progressCollection, userId), {
      ...progress,
      lastPlayedAt: Timestamp.fromDate(progress.lastPlayedAt)
    });

    return progress;
  }

  // ─── Incremental progress update (O(1) reads) ─────────────────────────────
  // Replaces the O(N) rebuildUserProgress on every game save.
  // Weekly/monthly streaks are preserved from the existing document and only
  // rebuilt when the user explicitly requests a full recalculation (importSessions).
  private async updateProgressIncremental(userId: string, session: GameSession): Promise<void> {
    const progressRef = doc(db, this.progressCollection, userId);
    const snapshot = await getDoc(progressRef);

    // No existing document → fall back to full rebuild (first game ever)
    if (!snapshot.exists()) {
      await this.rebuildUserProgress(userId);
      return;
    }

    const data = snapshot.data() as any;
    const prevTotal = Math.max(0, Number(data.totalGamesPlayed) || 0);
    const baseCognitive = {
      memory: 50,
      attention: 50,
      processing: 50,
      executive: 50,
    };
    const cognitiveScores = {
      ...baseCognitive,
      ...(typeof data.cognitiveScores === 'object' && data.cognitiveScores ? data.cognitiveScores : {}),
    } as UserProgress['cognitiveScores'];
    const streaks = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      ...(typeof data.currentStreaks === 'object' && data.currentStreaks ? data.currentStreaks : {}),
    };

    const current: UserProgress = {
      userId: String(data.userId || userId),
      totalGamesPlayed: prevTotal,
      totalScore: Number(data.totalScore) || 0,
      averageAccuracy: Number(data.averageAccuracy) || 0,
      averageReactionTime: Number(data.averageReactionTime) || 0,
      gamesPlayedByType: { ...(data.gamesPlayedByType || {}) },
      bestScoresByType: { ...(data.bestScoresByType || {}) },
      currentStreaks: streaks,
      lastPlayedAt: this.normalizeDate(data.lastPlayedAt),
      totalPlayTime: Number(data.totalPlayTime) || 0,
      cognitiveScores,
      achievements: Array.isArray(data.achievements) ? [...data.achievements] : [],
      level: Math.max(1, Number(data.level) || 1),
      xp: Number(data.xp) || 0,
    };

    const cognitiveArea = this.getCognitiveArea(session.gameType);
    const performanceScore = Math.min(
      100,
      Math.round((session.accuracy + Math.min(session.score / 10, 100)) / 2)
    );

    const newTotal = prevTotal + 1;
    const newTotalScore = current.totalScore + session.score;
    const newAvgAccuracy = Math.round(
      (current.averageAccuracy * prevTotal + session.accuracy) / newTotal
    );

    let newAvgReactionTime = current.averageReactionTime;
    if (typeof session.reactionTime === 'number') {
      newAvgReactionTime = Math.round(
        (current.averageReactionTime * prevTotal + session.reactionTime) / newTotal
      );
    }

    const newGamesPlayedByType = { ...current.gamesPlayedByType };
    newGamesPlayedByType[session.gameType] = (newGamesPlayedByType[session.gameType] || 0) + 1;

    const newBestScoresByType = { ...current.bestScoresByType };
    newBestScoresByType[session.gameType] = Math.max(
      newBestScoresByType[session.gameType] || 0,
      session.score
    );

    const currentCogScore = cognitiveScores[cognitiveArea] ?? 50;
    const isBaseline = prevTotal === 0;
    const newCogScore = isBaseline
      ? Math.round(performanceScore)
      : Math.round(currentCogScore * 0.9 + performanceScore * 0.1);

    const xpGained = Math.round(session.score / 10) + (session.accuracy >= 90 ? 50 : 0);
    let newXP = current.xp + xpGained;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastPlayed = new Date(current.lastPlayedAt);
    lastPlayed.setHours(0, 0, 0, 0);
    const daysDiff = Math.round((today.getTime() - lastPlayed.getTime()) / (1_000 * 60 * 60 * 24));

    let newDailyStreak = Number(streaks.daily) || 0;
    if (daysDiff === 0) {
      // already logged a session today in Firestore — keep streak
    } else if (daysDiff === 1) {
      newDailyStreak += 1;
    } else {
      newDailyStreak = 1;
    }

    const newAchievements = [...current.achievements];
    for (const achievement of ACHIEVEMENTS) {
      if (newAchievements.includes(achievement.id)) continue;

      let earned = false;
      switch (achievement.type) {
        case 'games_played': {
          const count = achievement.requirement.gameType
            ? (newGamesPlayedByType[achievement.requirement.gameType] || 0)
            : newTotal;
          earned = count >= achievement.requirement.value;
          break;
        }
        case 'score':    earned = session.score >= achievement.requirement.value; break;
        case 'accuracy': earned = session.accuracy >= achievement.requirement.value; break;
        case 'speed':    earned = typeof session.reactionTime === 'number' && session.reactionTime <= achievement.requirement.value; break;
        case 'streak':   earned = newDailyStreak >= achievement.requirement.value; break;
      }

      if (earned) {
        newAchievements.push(achievement.id);
        newXP += achievement.xpReward;
      }
    }

    const newLevel = Math.max(1, Math.floor(newXP / 1000) + 1);

    await setDoc(progressRef, {
      userId,
      totalGamesPlayed: newTotal,
      totalScore: newTotalScore,
      averageAccuracy: newAvgAccuracy,
      averageReactionTime: newAvgReactionTime,
      gamesPlayedByType: newGamesPlayedByType,
      bestScoresByType: newBestScoresByType,
      currentStreaks: {
        daily: newDailyStreak,
        weekly: Number(streaks.weekly) || 0,
        monthly: Number(streaks.monthly) || 0,
      },
      lastPlayedAt: Timestamp.fromDate(new Date()),
      totalPlayTime: current.totalPlayTime + session.duration,
      cognitiveScores: { ...cognitiveScores, [cognitiveArea]: newCogScore },
      achievements: newAchievements,
      level: newLevel,
      xp: newXP
    });
  }

  // Save game session to Firestore
  async saveGameSession(
    sessionData: Omit<GameSession, 'id' | 'userId' | 'completedAt'>,
    options?: { skipLocalMirror?: boolean }
  ): Promise<GameSession> {
    const userId = this.getCurrentUserId();
    const completedAt = new Date();
    const session: GameSession = {
      ...sessionData,
      userId,
      completedAt,
      timestamp: completedAt,
      cognitiveArea: this.getCognitiveArea(sessionData.gameType)
    };

    const docPayload: Record<string, unknown> = {
      userId: session.userId,
      gameType: session.gameType,
      score: session.score,
      level: session.level,
      accuracy: session.accuracy,
      duration: session.duration,
      completedAt: Timestamp.fromDate(completedAt),
      details: session.details && typeof session.details === 'object' ? session.details : {},
      cognitiveArea: session.cognitiveArea ?? this.getCognitiveArea(session.gameType),
    };
    if (typeof session.reactionTime === 'number' && !Number.isNaN(session.reactionTime)) {
      docPayload.reactionTime = session.reactionTime;
    }

    const ref = await addDoc(collection(db, this.sessionsCollection), docPayload as any);

    // O(1) incremental update — replaces the previous O(N) full rebuild
    await this.updateProgressIncremental(userId, session);

    const saved = { ...session, id: ref.id };
    if (!options?.skipLocalMirror) {
      appendLocalBrainSession(saved);
    }
    return saved;
  }

  /**
   * Upload anonymous (guest) sessions from this device, then remove them from localStorage.
   * Safe to call on each login; no-op if there are no guest sessions.
   */
  async migrateGuestLocalSessionsToCloud(): Promise<number> {
    const userId = this.getCurrentUserId();
    const sessions = readLocalBrainSessions();
    const guest = sessions.filter((s) => s.userId === 'local_user');
    if (guest.length === 0) return 0;

    await this.importSessions(
      guest.map((s) => ({
        ...s,
        userId,
        timestamp: this.normalizeDate(s.timestamp ?? s.completedAt ?? Date.now()),
        completedAt: this.normalizeDate(s.completedAt ?? s.timestamp ?? Date.now()),
        details: s.details && typeof s.details === 'object' ? s.details : {},
      }))
    );

    writeLocalBrainSessions(sessions.filter((s) => s.userId !== 'local_user'));
    return guest.length;
  }

  /**
   * Retry game results that could not be saved to Firestore (offline / rules / errors).
   */
  async flushPendingGameResultsFromLocalStorage(): Promise<number> {
    const pending = readPendingSync();
    if (pending.length === 0) return 0;

    const remaining: BrainGameResultPayload[] = [];
    let flushed = 0;

    for (const payload of pending) {
      try {
        await this.saveGameSession(
          {
            gameType: payload.gameType,
            score: payload.score,
            level: payload.level,
            accuracy: payload.accuracy,
            reactionTime: payload.reactionTime,
            duration: payload.duration,
            details: (payload.details || {}) as Record<string, any>,
          },
          { skipLocalMirror: true }
        );
        flushed += 1;
      } catch {
        remaining.push(payload);
      }
    }

    writePendingSync(remaining);
    return flushed;
  }

  // Get user progress
  async getUserProgress(): Promise<UserProgress | null> {
    const userId = this.getCurrentUserId();
    const progressRef = doc(db, this.progressCollection, userId);
    const snapshot = await getDoc(progressRef);

    if (!snapshot.exists()) {
      return this.rebuildUserProgress(userId);
    }

    const data = snapshot.data() as any;
    return {
      ...data,
      lastPlayedAt: this.normalizeDate(data.lastPlayedAt)
    } as UserProgress;
  }

  // Get user analytics
  async getUserAnalytics(days: number = 30): Promise<any> {
    const userId = this.getCurrentUserId();
    try {
      const sessions = await this.fetchUserSessions(userId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const filtered = sessions.filter((session) => this.normalizeDate(session.completedAt ?? session.timestamp) >= startDate);
      const dailyStats: Record<string, { date: string; gamesPlayed: number; totalScore: number; totalAccuracy: number; }> = {};
      const performanceByGame: Record<string, { name: string; sessions: number; totalScore: number; bestScore: number; totalAccuracy: number; }> = {};

      filtered.forEach((session) => {
        const playedAt = this.normalizeDate(session.completedAt ?? session.timestamp);
        const dateKey = playedAt.toISOString().split('T')[0];
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { date: dateKey, gamesPlayed: 0, totalScore: 0, totalAccuracy: 0 };
        }
        dailyStats[dateKey].gamesPlayed += 1;
        dailyStats[dateKey].totalScore += session.score;
        dailyStats[dateKey].totalAccuracy += session.accuracy;

        if (!performanceByGame[session.gameType]) {
          performanceByGame[session.gameType] = {
            name: session.gameType,
            sessions: 0,
            totalScore: 0,
            bestScore: 0,
            totalAccuracy: 0
          };
        }

        performanceByGame[session.gameType].sessions += 1;
        performanceByGame[session.gameType].totalScore += session.score;
        performanceByGame[session.gameType].bestScore = Math.max(performanceByGame[session.gameType].bestScore, session.score);
        performanceByGame[session.gameType].totalAccuracy += session.accuracy;
      });

      return {
        totalSessions: filtered.length,
        gameTypes: [...new Set(filtered.map((session) => session.gameType))],
        dailyStats: Object.values(dailyStats).map((entry) => ({
          ...entry,
          averageAccuracy: entry.gamesPlayed > 0 ? Math.round(entry.totalAccuracy / entry.gamesPlayed) : 0
        })),
        performanceByGame: Object.values(performanceByGame).map((entry) => ({
          ...entry,
          averageScore: entry.sessions > 0 ? Math.round(entry.totalScore / entry.sessions) : 0,
          averageAccuracy: entry.sessions > 0 ? Math.round(entry.totalAccuracy / entry.sessions) : 0
        })),
        cognitiveProgress: []
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return {
        totalSessions: 0,
        gameTypes: [],
        dailyStats: [],
        performanceByGame: [],
        cognitiveProgress: []
      };
    }
  }

  // Batch import sessions (for localStorage migration)
  async importSessions(sessions: GameSession[]): Promise<{ success: boolean; count: number }> {
    const userId = this.getCurrentUserId();

    for (const session of sessions) {
      const completedAt = this.normalizeDate(session.timestamp ?? session.completedAt);
      const row: Record<string, unknown> = {
        userId,
        gameType: session.gameType,
        score: session.score,
        level: session.level,
        accuracy: session.accuracy,
        duration: session.duration,
        details: session.details && typeof session.details === 'object' ? session.details : {},
        cognitiveArea: this.getCognitiveArea(session.gameType),
        completedAt: Timestamp.fromDate(completedAt),
      };
      if (typeof session.reactionTime === 'number' && !Number.isNaN(session.reactionTime)) {
        row.reactionTime = session.reactionTime;
      }
      await addDoc(collection(db, this.sessionsCollection), row as any);
    }

    await this.rebuildUserProgress(userId);

    return {
      success: true,
      count: sessions.length
    };
  }

  // Get cognitive assessment recommendations
  async getCognitiveRecommendations(): Promise<string[]> {
    try {
      const progress = await this.getUserProgress();
      if (!progress) return [];

      const recommendations: string[] = [];
      const { cognitiveScores } = progress;

      // Find weakest cognitive areas
      const sortedDomains = Object.entries(cognitiveScores)
        .sort(([, a], [, b]) => a - b);

      const weakestDomain = sortedDomains[0][0];

      // Recommend games for improvement
      const gameRecommendations: Record<string, string[]> = {
        memory: ['memory-matrix', 'word-pairs', 'sequence-recall'],
        attention: ['attention-trainer', 'color-match', 'dual-task'],
        processing: ['speed-match', 'rapid-visual', 'reaction-time'],
        executive: ['mental-math', 'number-sequences', 'fraction-frenzy']
      };

      recommendations.push(...gameRecommendations[weakestDomain] || []);

      return recommendations;
    } catch (error) {
      console.error('Error getting cognitive recommendations:', error);
      return [];
    }
  }
}

export default BrainTrainingService;
