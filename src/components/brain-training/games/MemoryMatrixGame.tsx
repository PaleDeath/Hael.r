import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGameResult } from '../GameResultProvider';
import { useGameFlow } from '../game-engine/useGameFlow';
import { GameContainer } from '../ui/GameContainer';
import { AnimatedButton } from '../ui/AnimatedButton';
import { ProgressBar } from '../ui/ProgressBar';

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduceMotion;
}

type Phase = 'instructions' | 'memorize' | 'recall' | 'results';

const MAX_ROUNDS = 10;
const MAX_MISTAKES = 3;
const SEQ_STEP_MS = 360;
const PATTERN_HOLD_MS = 700;
const FEEDBACK_MS = 900;

function generatePattern(level: number) {
  const gridSize = Math.min(3 + Math.floor(level / 3), 6);
  const cap = Math.floor(gridSize * gridSize * 0.6);
  const numSquares = Math.min(3 + Math.floor(level / 2), cap);
  const pattern: boolean[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(false));
  const positions = new Set<string>();
  while (positions.size < numSquares) {
    const row = Math.floor(Math.random() * gridSize);
    const col = Math.floor(Math.random() * gridSize);
    positions.add(`${row}-${col}`);
  }
  positions.forEach((pos) => {
    const [row, col] = pos.split('-').map(Number);
    pattern[row][col] = true;
  });
  return { pattern, gridSize };
}

function patternPositions(pattern: boolean[][]): [number, number][] {
  const out: [number, number][] = [];
  pattern.forEach((row, i) =>
    row.forEach((cell, j) => {
      if (cell) out.push([i, j]);
    })
  );
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MemoryMatrixGame: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveResult } = useGameResult();
  const flow = useGameFlow();
  const reduceMotion = usePrefersReducedMotion();

  const targetScore = (location.state as { targetScore?: number } | null)?.targetScore ?? 0;

  const [phase, setPhase] = useState<Phase>('instructions');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [gridSize, setGridSize] = useState(3);
  const [currentPattern, setCurrentPattern] = useState<boolean[][]>([]);
  const [userPattern, setUserPattern] = useState<boolean[][]>([]);
  const [orderedCells, setOrderedCells] = useState<[number, number][]>([]);
  const [seqRevealCount, setSeqRevealCount] = useState(0);
  const [memorizeProgress, setMemorizeProgress] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [successFlash, setSuccessFlash] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const [resultSummary, setResultSummary] = useState<{
    totalPoints: number;
    accuracy: number;
    finalLevel: number;
    correct: number;
    rounds: number;
  } | null>(null);

  const gameStartRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const roundIdRef = useRef(0);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const levelRef = useRef(1);
  const completedRef = useRef(0);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const introRef = useRef<HTMLElement | null>(null);
  const playRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  scoreRef.current = score;
  correctRef.current = correctAnswers;
  levelRef.current = level;
  completedRef.current = completedRounds;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const finishGame = useCallback(() => {
    clearTimers();
    flow.setPhase('finished');
    setPhase('results');
    const rounds = completedRef.current;
    const ca = correctRef.current;
    const sc = scoreRef.current;
    const lev = levelRef.current;
    const finalAccuracy = rounds > 0 ? Math.round((ca / rounds) * 100) : 0;
    const timeBonus = lev * 5;
    const totalPoints = sc + timeBonus;
    const duration = Math.round((performance.now() - gameStartRef.current) / 1000);
    setResultSummary({
      totalPoints,
      accuracy: finalAccuracy,
      finalLevel: lev,
      correct: ca,
      rounds,
    });
    setAnnounce(`Game over. Final score ${totalPoints}.`);
    void saveResult({
      gameType: 'memory-matrix',
      score: totalPoints,
      level: lev,
      accuracy: finalAccuracy,
      duration,
      details: {
        correctAnswers: ca,
        totalQuestions: rounds,
        finalLevel: lev,
        timeBonus,
        targetScore,
      },
    });
  }, [clearTimers, flow, saveResult, targetScore]);

  const runNextRound = useCallback(
    (nextLevel: number) => {
      clearTimers();
      roundIdRef.current += 1;
      const rid = roundIdRef.current;
      const { pattern, gridSize: g } = generatePattern(nextLevel);
      const order = patternPositions(pattern);
      setGridSize(g);
      setCurrentPattern(pattern);
      setUserPattern(
        Array(g)
          .fill(null)
          .map(() => Array(g).fill(false))
      );
      setOrderedCells(order);
      setSeqRevealCount(0);
      setMemorizeProgress(0);
      setPhase('memorize');
      setAnnounce('Watch the pattern light up in order.');
      flow.setPhase('playing');
      flow.lockInput();

      const steps = order.length;
      const stepMs = reduceMotion ? 0 : SEQ_STEP_MS;

      const afterSequence = () => {
        schedule(() => {
          if (rid !== roundIdRef.current) return;
          setMemorizeProgress(1);
          schedule(() => {
            if (rid !== roundIdRef.current) return;
            setPhase('recall');
            flow.unlockInput();
            setAnnounce('Recreate the pattern. Toggle tiles, then submit.');
          }, PATTERN_HOLD_MS);
        }, stepMs);
      };

      const revealNext = (idx: number) => {
        if (rid !== roundIdRef.current) return;
        if (idx < steps) {
          setSeqRevealCount(idx + 1);
          setMemorizeProgress((idx + 1) / Math.max(1, steps + 1));
          schedule(() => revealNext(idx + 1), stepMs);
        } else {
          setSeqRevealCount(steps);
          afterSequence();
        }
      };

      if (reduceMotion) {
        setSeqRevealCount(steps);
        setMemorizeProgress(1);
        schedule(() => {
          if (rid !== roundIdRef.current) return;
          setPhase('recall');
          flow.unlockInput();
        }, 350);
      } else {
        schedule(() => revealNext(0), 120);
      }
    },
    [clearTimers, flow, reduceMotion, schedule]
  );

  const startGame = useCallback(() => {
    gameStartRef.current = performance.now();
    setSessionStarted(true);
    setLevel(1);
    levelRef.current = 1;
    setScore(0);
    scoreRef.current = 0;
    setCorrectAnswers(0);
    correctRef.current = 0;
    setMistakeCount(0);
    setCompletedRounds(0);
    completedRef.current = 0;
    setResultSummary(null);
    runNextRound(1);
  }, [runNextRound]);

  const restart = useCallback(() => {
    clearTimers();
    roundIdRef.current += 1;
    setPhase('instructions');
    setSessionStarted(false);
    setMistakeCount(0);
    flow.resetFlow();
  }, [clearTimers, flow]);

  const handleCellClick = (row: number, col: number) => {
    if (phase !== 'recall' || flow.inputLocked) return;
    setUserPattern((prev) =>
      prev.map((r, i) => r.map((c, j) => (i === row && j === col ? !c : c)))
    );
  };

  const submitPattern = () => {
    if (phase !== 'recall') return;
    const up = userPattern;
    const isCorrect = currentPattern.every((row, i) => row.every((cell, j) => cell === up[i][j]));
    const base = level * 10;
    const add = isCorrect ? base : 0;
    flow.lockInput();

    if (isCorrect) {
      setSuccessFlash(true);
      setAnnounce('Correct.');
      schedule(() => setSuccessFlash(false), 500);
    } else {
      setWrongFlash(true);
      setAnnounce('Not quite.');
      schedule(() => setWrongFlash(false), 500);
    }

    const newScore = scoreRef.current + add;
    const newCorrect = correctRef.current + (isCorrect ? 1 : 0);
    const newCompleted = completedRef.current + 1;
    const nextMistakes = isCorrect ? mistakeCount : mistakeCount + 1;
    if (!isCorrect) {
      setMistakeCount(nextMistakes);
    }
    scoreRef.current = newScore;
    correctRef.current = newCorrect;
    completedRef.current = newCompleted;
    setScore(newScore);
    setCorrectAnswers(newCorrect);
    setCompletedRounds(newCompleted);

    schedule(() => {
      if (!isCorrect && nextMistakes >= MAX_MISTAKES) {
        finishGame();
        return;
      }
      if (newCompleted >= MAX_ROUNDS) {
        finishGame();
        return;
      }

      const nextLevel = isCorrect ? levelRef.current + 1 : levelRef.current;
      setLevel(nextLevel);
      levelRef.current = nextLevel;
      runNextRound(nextLevel);
    }, FEEDBACK_MS);
  };

  const cellLitInMemorize = (i: number, j: number) => {
    if (!currentPattern[i]?.[j]) return false;
    if (reduceMotion) return phase === 'memorize';
    let idx = -1;
    for (let k = 0; k < orderedCells.length; k++) {
      if (orderedCells[k][0] === i && orderedCells[k][1] === j) {
        idx = k;
        break;
      }
    }
    if (idx < 0) return false;
    return idx < seqRevealCount;
  };

  const cellSize = `min(max(44px, 14vw), 72px)`;

  useEffect(() => {
    if (reduceMotion || phase !== 'memorize') return;
    const root = gridWrapRef.current;
    if (!root) return;
    const lit = root.querySelectorAll<HTMLElement>('[data-mem-lit="1"]');
    lit.forEach((cell) => {
      gsap.fromTo(cell, { scale: 1 }, { scale: 1.04, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
    });
  }, [seqRevealCount, phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !wrongFlash) return;
    const root = gridWrapRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-wrong-pulse="1"]').forEach((cell) => {
      gsap.fromTo(cell, { x: 0 }, { x: [-4, 4, -2, 2, 0], duration: 0.35, ease: 'power2.out' });
    });
  }, [wrongFlash, reduceMotion, userPattern]);

  useEffect(() => {
    if (reduceMotion) return;
    if (phase === 'instructions' && introRef.current) {
      gsap.fromTo(introRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if ((phase === 'memorize' || phase === 'recall') && playRef.current) {
      gsap.fromTo(playRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (phase === 'results' && resultsRef.current) {
      gsap.fromTo(resultsRef.current, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    }
  }, [phase, reduceMotion, resultSummary]);

  const handleCellPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phase !== 'recall' || reduceMotion) return;
    gsap.to(e.currentTarget, { scale: 0.94, duration: 0.1, ease: 'power2.out' });
  };

  const handleCellPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phase !== 'recall' || reduceMotion) return;
    gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' });
  };

  const grid = (
    <div
      ref={gridWrapRef}
      className="memory-matrix-grid mx-auto grid w-full max-w-[min(90vw,420px)] gap-2"
      style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
    >
      {Array.from({ length: gridSize }, (_, i) =>
        Array.from({ length: gridSize }, (_, j) => {
          const showMem = phase === 'memorize' && cellLitInMemorize(i, j);
          const showUser = phase === 'recall' && userPattern[i]?.[j];
          const highlight = showMem || showUser;
          return (
            <button
              key={`${i}-${j}`}
              type="button"
              disabled={phase !== 'recall'}
              onClick={() => handleCellClick(i, j)}
              onPointerDown={handleCellPointerDown}
              onPointerUp={handleCellPointerUp}
              onPointerLeave={handleCellPointerUp}
              aria-label={
                phase === 'recall'
                  ? `Cell row ${i + 1} column ${j + 1}, ${userPattern[i]?.[j] ? 'selected' : 'not selected'}`
                  : `Cell row ${i + 1} column ${j + 1}`
              }
              className="min-h-11 min-w-11 rounded-2xl border-2 outline-none focus-visible:ring-2 focus-visible:ring-white/35 disabled:cursor-default data-[sel=yes]:border-white/40"
              data-sel={phase === 'recall' && userPattern[i]?.[j] ? 'yes' : undefined}
              data-mem-lit={showMem ? '1' : '0'}
              data-wrong-pulse={wrongFlash && showUser ? '1' : '0'}
              style={{
                width: cellSize,
                height: cellSize,
                borderColor: highlight ? 'rgba(253, 230, 138, 0.9)' : 'rgba(255,255,255,0.06)',
                background: highlight
                  ? 'linear-gradient(145deg, rgba(251, 191, 36, 0.85), rgba(217, 119, 6, 0.55))'
                  : 'rgba(255,255,255,0.08)',
                boxShadow: highlight
                  ? '0 0 24px rgba(251, 191, 36, 0.35), inset 0 0 0 1px rgba(255,255,255,0.12)'
                  : successFlash && showUser
                    ? '0 0 28px rgba(16, 185, 129, 0.45)'
                    : wrongFlash && showUser
                      ? '0 0 28px rgba(248, 113, 113, 0.45)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                opacity: phase === 'recall' || showMem ? 1 : 0.88,
              }}
            />
          );
        })
      )}
    </div>
  );

  return (
    <GameContainer
      immersive={sessionStarted && phase !== 'instructions'}
      theme="dark"
      onBack={() => navigate('/brain-training')}
      title={sessionStarted ? undefined : 'Memory Matrix'}
      topAccessory={
        sessionStarted && phase !== 'results' ? (
          <span className="bt-glass-hud tabular-nums">
            Lv {level} · misses {mistakeCount}/{MAX_MISTAKES}
          </span>
        ) : null
      }
      onErrorReset={restart}
    >
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>

      <>
        {phase === 'instructions' && (
          <section
            ref={introRef}
            className="flex flex-1 flex-col items-center justify-center gap-8 px-2 text-center"
          >
            <div className="max-w-md space-y-3">
              <h2 className="text-3xl font-bold" style={{ color: 'var(--bt-text)' }}>
                Lights flash in order. Repeat.
              </h2>
              <p style={{ color: 'var(--bt-text-muted)' }}>Ten rounds max. Three misses end the run.</p>
            </div>
            <AnimatedButton onClick={startGame} aria-label="Start memory matrix game">
              Play
            </AnimatedButton>
          </section>
        )}

        {(phase === 'memorize' || phase === 'recall') && (
          <div ref={playRef} className="flex flex-1 flex-col gap-4">
            {phase === 'memorize' && (
              <div className="px-4 pt-1">
                <ProgressBar progress={memorizeProgress} aria-label="Memorize phase progress" variant="dark" />
              </div>
            )}
            <p className="text-center text-sm font-medium" style={{ color: 'var(--bt-text-muted)' }}>
              {phase === 'memorize' ? 'Memorize' : 'Your turn'}
            </p>
            <div className="flex flex-1 items-center justify-center py-4">{grid}</div>
            {phase === 'recall' && (
              <div className="flex justify-center pb-4">
                <AnimatedButton onClick={submitPattern} aria-label="Submit pattern">
                  Submit
                </AnimatedButton>
              </div>
            )}
          </div>
        )}

        {phase === 'results' && resultSummary && (
          <div ref={resultsRef} className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="bt-glass-dark w-full max-w-md p-8 text-center">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">Run complete</p>
              <p className="mt-3 text-4xl font-semibold tabular-nums text-white">{resultSummary.totalPoints}</p>
              <p className="mt-2 text-sm text-white/65">
                {resultSummary.accuracy}% · {resultSummary.correct}/{resultSummary.rounds} correct
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <AnimatedButton onClick={restart} aria-label="Play memory matrix again">
                  Again
                </AnimatedButton>
                <AnimatedButton variant="ghost" onClick={() => navigate('/brain-training')} aria-label="Hub">
                  Hub
                </AnimatedButton>
              </div>
            </div>
          </div>
        )}
      </>

      <style>{`
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
      `}</style>
    </GameContainer>
  );
};

export default MemoryMatrixGame;
