import { useReducer, useCallback, useMemo } from 'react';
import type { GameFlowState, GameFlowPhase, GameFlowAction } from './types';

const initialState: GameFlowState = {
  phase: 'idle',
  inputLocked: false,
  runId: 0,
};

function gameFlowReducer(state: GameFlowState, action: GameFlowAction): GameFlowState {
  switch (action.type) {
    case 'RESET':
      return {
        ...initialState,
        runId: state.runId + 1,
      };
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'LOCK_INPUT':
      return { ...state, inputLocked: true };
    case 'UNLOCK_INPUT':
      return { ...state, inputLocked: false };
    case 'NEXT_RUN':
    case 'BUMP_RUN':
      return { ...state, runId: state.runId + 1, inputLocked: false };
    default:
      return state;
  }
}

export function useGameFlow() {
  const [state, dispatch] = useReducer(gameFlowReducer, initialState);

  const setPhase = useCallback((phase: GameFlowPhase) => {
    dispatch({ type: 'SET_PHASE', phase });
  }, []);

  const lockInput = useCallback(() => {
    dispatch({ type: 'LOCK_INPUT' });
  }, []);

  const unlockInput = useCallback(() => {
    dispatch({ type: 'UNLOCK_INPUT' });
  }, []);

  const bumpRun = useCallback(() => {
    dispatch({ type: 'BUMP_RUN' });
  }, []);

  const resetFlow = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  /** Call when cancelling async work; increments runId so stale callbacks no-op */
  const invalidateRun = useCallback(() => {
    dispatch({ type: 'NEXT_RUN' });
  }, []);

  const cleanup = useCallback(() => {
    dispatch({ type: 'NEXT_RUN' });
  }, []);

  return useMemo(
    () => ({
      phase: state.phase,
      inputLocked: state.inputLocked,
      runId: state.runId,
      setPhase,
      lockInput,
      unlockInput,
      bumpRun,
      resetFlow,
      invalidateRun,
      cleanup,
      dispatch,
    }),
    [
      state.phase,
      state.inputLocked,
      state.runId,
      setPhase,
      lockInput,
      unlockInput,
      bumpRun,
      resetFlow,
      invalidateRun,
      cleanup,
    ]
  );
}
