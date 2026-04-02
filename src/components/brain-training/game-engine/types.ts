export type GameFlowPhase = 'idle' | 'playing' | 'answered' | 'finished';

export interface GameFlowState {
  phase: GameFlowPhase;
  inputLocked: boolean;
  runId: number;
}

export type GameFlowAction =
  | { type: 'RESET' }
  | { type: 'SET_PHASE'; phase: GameFlowPhase }
  | { type: 'LOCK_INPUT' }
  | { type: 'UNLOCK_INPUT' }
  | { type: 'NEXT_RUN' }
  | { type: 'BUMP_RUN' };
