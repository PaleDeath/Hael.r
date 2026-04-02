import { useState, useCallback } from 'react';
import BrainTrainingService, { GameSession } from '../services/brain-training.service';
import { useAuth } from '../contexts/AuthContext';
import {
  appendLocalBrainSession,
  readLocalBrainSessions,
  pushPendingSync,
  type BrainGameResultPayload,
} from '../services/brain-training-local.storage';

interface GameResult {
  gameType: string;
  score: number;
  level: number;
  accuracy: number;
  reactionTime?: number;
  duration: number;
  details?: Record<string, any>;
}

export interface SaveGameResultOutcome {
  session: GameSession | null;
  /** True when logged-in cloud save failed but result was queued / saved locally */
  deferredSync: boolean;
}

interface UseBrainTrainingReturn {
  saveGameResult: (result: GameResult) => Promise<SaveGameResultOutcome>;
  saving: boolean;
  error: string | null;
  clearError: () => void;
  refreshStats?: () => void;
}

function buildLocalSession(result: GameResult, userId: string, cognitiveArea: string): GameSession {
  const ts = new Date();
  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    userId,
    gameType: result.gameType,
    score: result.score,
    level: result.level,
    accuracy: result.accuracy,
    reactionTime: result.reactionTime,
    duration: result.duration,
    details: result.details || {},
    timestamp: ts,
    completedAt: ts,
    cognitiveArea,
  };
}

export const useBrainTraining = (refreshStats?: () => void): UseBrainTrainingReturn => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const brainTrainingService = BrainTrainingService.getInstance();

  const saveGameResult = useCallback(
    async (result: GameResult): Promise<SaveGameResultOutcome> => {
      try {
        setSaving(true);
        setError(null);

        const cognitiveArea = brainTrainingService.getCognitiveAreaPublic(result.gameType);

        if (!currentUser) {
          const session = buildLocalSession(result, 'local_user', cognitiveArea);
          appendLocalBrainSession(session);
          refreshStats?.();
          window.dispatchEvent(new CustomEvent('brainTrainingStatsUpdate'));
          return { session, deferredSync: false };
        }

        try {
          const session = await brainTrainingService.saveGameSession({
            gameType: result.gameType,
            score: result.score,
            level: result.level,
            accuracy: result.accuracy,
            reactionTime: result.reactionTime,
            duration: result.duration,
            details: result.details || {},
          });

          refreshStats?.();
          window.dispatchEvent(new CustomEvent('brainTrainingStatsUpdate'));
          return { session, deferredSync: false };
        } catch (err) {
          console.error('Firebase brain training save failed; using device storage + sync queue:', err);
          const payload: BrainGameResultPayload = {
            gameType: result.gameType,
            score: result.score,
            level: result.level,
            accuracy: result.accuracy,
            reactionTime: result.reactionTime,
            duration: result.duration,
            details: result.details || {},
          };
          pushPendingSync(payload);

          const fallback = buildLocalSession(result, currentUser.uid, cognitiveArea);
          appendLocalBrainSession(fallback);

          setError(
            'Saved on this device. It will sync to your account when the connection or cloud storage is available.'
          );
          refreshStats?.();
          window.dispatchEvent(new CustomEvent('brainTrainingStatsUpdate'));
          return { session: fallback, deferredSync: true };
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save game result';
        setError(errorMessage);
        console.error('Error saving game result:', err);
        return { session: null, deferredSync: false };
      } finally {
        setSaving(false);
      }
    },
    [currentUser, brainTrainingService, refreshStats]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    saveGameResult,
    saving,
    error,
    clearError,
    refreshStats,
  };
};

export { readLocalBrainSessions };
