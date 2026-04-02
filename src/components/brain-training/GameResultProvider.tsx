import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useBrainTraining } from '../../hooks/useBrainTraining';
import { SaveResultToast, type SaveToastKind } from './ui/SaveResultToast';
import './brain-training.css';

interface GameResult {
  gameType: string;
  score: number;
  level: number;
  accuracy: number;
  reactionTime?: number;
  duration: number;
  details?: Record<string, any>;
}

interface GameResultContextType {
  saveResult: (result: GameResult) => Promise<void>;
  saving: boolean;
  error: string | null;
  clearError: () => void;
}

const GameResultContext = createContext<GameResultContextType | null>(null);

export const useGameResult = () => {
  const context = useContext(GameResultContext);
  if (!context) {
    throw new Error('useGameResult must be used within GameResultProvider');
  }
  return context;
};

interface GameResultProviderProps {
  children: ReactNode;
}

export const GameResultProvider: React.FC<GameResultProviderProps> = ({ children }) => {
  const { saveGameResult, saving, error, clearError } = useBrainTraining();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<SaveToastKind | null>(null);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
    setToastKind(null);
  }, []);

  const saveResult = useCallback(
    async (result: GameResult) => {
      clearError();
      try {
        const { session, deferredSync } = await saveGameResult(result);
        if (!session) {
          setToastKind('error');
          setToastMessage("Couldn't save — will retry when you play again.");
          return;
        }
        if (deferredSync) {
          setToastKind('offline');
          setToastMessage("Couldn't reach cloud — saved on this device. Will sync when online.");
        } else {
          setToastKind('success');
          setToastMessage('Score saved.');
        }
      } catch {
        setToastKind('error');
        setToastMessage("Couldn't save — will retry when you play again.");
      }
    },
    [saveGameResult, clearError]
  );

  return (
    <GameResultContext.Provider
      value={{ saveResult, saving, error, clearError }}
    >
      {children}
      <SaveResultToast message={toastMessage} kind={toastKind} onDismiss={dismissToast} />
    </GameResultContext.Provider>
  );
};

export type { GameResult };
