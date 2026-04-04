import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useGameResult } from '../GameResultProvider';
import { useTrackedTimers } from '../useTrackedTimers';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface VisualTarget {
  id: number;
  x: number;
  y: number;
  symbol: string;
  isTarget: boolean;
  clicked: boolean;
}

interface GameStats {
  score: number;
  level: number;
  correctClicks: number;
  incorrectClicks: number;
  totalTargets: number;
  missedTargets: number;
  reactionTimes: number[];
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'instructions' | 'playing' | 'results';
}

const RapidVisualGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    correctClicks: 0,
    incorrectClicks: 0,
    totalTargets: 0,
    missedTargets: 0,
    reactionTimes: [],
    timeRemaining: 30,
    isGameActive: false,
    currentPhase: 'instructions'
  });

  const [visualTargets, setVisualTargets] = useState<VisualTarget[]>([]);
  const [currentTargetSymbol, setCurrentTargetSymbol] = useState<string>('');
  const [showTargets, setShowTargets] = useState(false);
  const [targetStartTime, setTargetStartTime] = useState<number>(0);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  });
  const hasSavedResultsRef = useRef(false);
  const saveResultRef = useRef(saveResult);
  saveResultRef.current = saveResult;
  const { clearAll, trackTimeout, trackInterval, untrack } = useTrackedTimers();

  const symbols = ['●', '■', '▲', '◆', '★', '♦', '◎', '□', '△', '◇', '☆', '♠', '♥', '♣', '♪', '♫'];
  const colors = ['#5f7daa', '#b85c5c', '#5c936f', '#c4a14e', '#8975ad', '#c0889a', '#6b6e78'];

  const generateTargets = useCallback(() => {
    const numTargets = 8 + (gameStats.level * 2); // Increase with level
    const numActualTargets = Math.min(2 + Math.floor(gameStats.level / 2), 4); // 2-4 targets

    const targetSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    setCurrentTargetSymbol(targetSymbol);

    const targets: VisualTarget[] = [];
    const usedPositions = new Set<string>();

    // Generate targets with collision detection
    for (let i = 0; i < numTargets; i++) {
      let x, y, positionKey;
      let attempts = 0;

      do {
        x = Math.random() * 80 + 5; // 5% to 85% from left
        y = Math.random() * 80 + 5; // 5% to 85% from top
        positionKey = `${Math.floor(x / 10)}-${Math.floor(y / 10)}`;
        attempts++;
      } while (usedPositions.has(positionKey) && attempts < 20);

      usedPositions.add(positionKey);

      const isTarget = i < numActualTargets;
      let symbol = isTarget ? targetSymbol : symbols[Math.floor(Math.random() * symbols.length)];

      // Ensure distractors are different from target
      while (!isTarget && symbol === targetSymbol) {
        symbol = symbols[Math.floor(Math.random() * symbols.length)];
      }

      targets.push({
        id: i,
        x,
        y,
        symbol,
        isTarget,
        clicked: false
      });
    }

    // Shuffle array to randomize target positions
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }

    setVisualTargets(targets);
    setGameStats(prev => ({
      ...prev,
      totalTargets: prev.totalTargets + numActualTargets
    }));

    setTargetStartTime(Date.now());
  }, [gameStats.level, symbols]);

  const startGame = useCallback(() => {
    clearAll();
    hasSavedResultsRef.current = false;
    setGameStartTime(Date.now());
    generateTargets();
    setGameStats(prev => ({
      ...prev,
      currentPhase: 'playing',
      isGameActive: true,
      timeRemaining: 30 + (prev.level * 5),
      totalTargets: 0,
      correctClicks: 0,
      incorrectClicks: 0,
      missedTargets: 0,
      reactionTimes: []
    }));
    setShowTargets(true);
  }, [generateTargets, clearAll]);

  const handleTargetClick = (target: VisualTarget) => {
    if (!showTargets || target.clicked) return;

    const reactionTime = Date.now() - targetStartTime;

    // Mark target as clicked
    setVisualTargets(prev =>
      prev.map(t => t.id === target.id ? { ...t, clicked: true } : t)
    );

    if (target.isTarget) {
      // Correct click
      const baseScore = 50;
      const speedBonus = Math.max(0, 1000 - reactionTime) / 10; // Bonus for speed
      const levelBonus = gameStats.level * 10;
      const totalScore = Math.round(baseScore + speedBonus + levelBonus);

      setGameStats(prev => ({
        ...prev,
        score: prev.score + totalScore,
        correctClicks: prev.correctClicks + 1,
        reactionTimes: [...prev.reactionTimes, reactionTime]
      }));

      setFeedback({
        show: true,
        correct: true,
        message: `Correct! +${totalScore} points (${reactionTime}ms)`
      });

      // Check if all targets found
      const allTargetsFound = visualTargets
        .filter(t => t.isTarget)
        .every(t => t.id === target.id || t.clicked);

      if (allTargetsFound) {
        trackTimeout(() => {
          generateNextRound();
        }, 1000);
      }
    } else {
      // Incorrect click
      const penalty = 20;

      setGameStats(prev => ({
        ...prev,
        score: Math.max(0, prev.score - penalty),
        incorrectClicks: prev.incorrectClicks + 1
      }));

      setFeedback({
        show: true,
        correct: false,
        message: `Wrong target! -${penalty} points`
      });
    }

    trackTimeout(() => {
      setFeedback({ show: false, correct: false, message: '' });
    }, 1500);
  };

  const generateNextRound = () => {
    setShowTargets(false);
    trackTimeout(() => {
      generateTargets();
      setShowTargets(true);
    }, 500);
  };

  const nextLevel = () => {
    setGameStats(prev => ({
      ...prev,
      level: prev.level + 1,
      currentPhase: 'instructions'
    }));
  };

  const resetGame = () => {
    clearAll();
    hasSavedResultsRef.current = false;
    setGameStats({
      score: 0,
      level: 1,
      correctClicks: 0,
      incorrectClicks: 0,
      totalTargets: 0,
      missedTargets: 0,
      reactionTimes: [],
      timeRemaining: 30,
      isGameActive: false,
      currentPhase: 'instructions'
    });
    setVisualTargets([]);
    setCurrentTargetSymbol('');
    setShowTargets(false);
    setFeedback({ show: false, correct: false, message: '' });
  };

  const endGame = useCallback(async () => {
    setGameStats(prev => {
      if (prev.currentPhase === 'results') return prev;
      return {
        ...prev,
        currentPhase: 'results',
        isGameActive: false
      };
    });

    setShowTargets(false);
  }, []);

  useEffect(() => {
    if (gameStats.currentPhase !== 'results' || hasSavedResultsRef.current) return;

    hasSavedResultsRef.current = true;
    const finalAccuracy = (gameStats.correctClicks + gameStats.incorrectClicks) > 0
      ? Math.round((gameStats.correctClicks / (gameStats.correctClicks + gameStats.incorrectClicks)) * 100)
      : 0;

    const duration = Math.round((Date.now() - gameStartTime) / 1000);
    const averageReactionTime = gameStats.reactionTimes.length > 0
      ? Math.round(gameStats.reactionTimes.reduce((a, b) => a + b, 0) / gameStats.reactionTimes.length)
      : 0;

    saveResultRef.current({
      gameType: 'rapid-visual',
      score: gameStats.score,
      level: gameStats.level,
      accuracy: finalAccuracy,
      duration,
      details: {
        correctClicks: gameStats.correctClicks,
        incorrectClicks: gameStats.incorrectClicks,
        totalTargets: gameStats.totalTargets,
        averageReactionTime,
        topLevel: gameStats.level
      }
    });
  }, [gameStats, gameStartTime]);

  // Timer effect
  useEffect(() => {
    if (gameStats.isGameActive && gameStats.timeRemaining > 0) {
      const id = trackInterval(() => {
        setGameStats(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;

          if (newTimeRemaining <= 0) {
            trackTimeout(() => endGame(), 0);
            return {
              ...prev,
              timeRemaining: 0,
              isGameActive: false
            };
          }

          return {
            ...prev,
            timeRemaining: newTimeRemaining
          };
        });
      }, 1000);
      return () => untrack(id);
    }
  }, [gameStats.isGameActive, gameStats.timeRemaining, endGame, trackInterval, untrack, trackTimeout]);

  const accuracy = (gameStats.correctClicks + gameStats.incorrectClicks) > 0
    ? Math.round((gameStats.correctClicks / (gameStats.correctClicks + gameStats.incorrectClicks)) * 100)
    : 0;

  const averageReactionTime = gameStats.reactionTimes.length > 0
    ? Math.round(gameStats.reactionTimes.reduce((a, b) => a + b, 0) / gameStats.reactionTimes.length)
    : 0;

  return (
    <BrainGameShell
      title="Rapid Visual Processing"
      immersive={gameStats.currentPhase === 'playing'}
      theme="dark"
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {gameStats.currentPhase === 'playing' && (
            <span className="bt-glass-hud tabular-nums">
              {gameStats.score} pts · {gameStats.timeRemaining}s · {gameStats.correctClicks} hit · {accuracy}%
            </span>
          )}
          <button
            type="button"
            onClick={resetGame}
            className="bt-reset-btn flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium md:text-sm"
            aria-label="Reset game"
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            Reset
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl">
        {gameStats.currentPhase === 'instructions' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
            <div className="w-full max-w-lg rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <h2 className="font-light text-3xl tracking-wide text-neutral-900">Rapid visual</h2>
              <p className="mt-4 text-sm text-neutral-600 md:text-base">
                Tap every target symbol as fast as you can. Wrong taps cost you; speed feeds your score.
              </p>
              <div className="bt-panel-warm mt-6 rounded-xl border border-black/10 p-5 text-left text-sm text-neutral-700">
                <p className="font-medium text-neutral-900">Level {gameStats.level}</p>
                <p className="mt-2">
                  {gameStats.level === 1 && '8 symbols, 2 targets.'}
                  {gameStats.level === 2 && '10 symbols, 2–3 targets.'}
                  {gameStats.level === 3 && '12 symbols, 3 targets.'}
                  {gameStats.level === 4 && '14 symbols, 3–4 targets.'}
                  {gameStats.level >= 5 &&
                    `${8 + gameStats.level * 2} symbols, ${Math.min(2 + Math.floor(gameStats.level / 2), 4)} targets.`}
                </p>
                <p className="mt-2 text-neutral-500">{30 + gameStats.level * 5}s</p>
              </div>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'playing' && (
          <div className="flex min-h-0 flex-1 flex-col px-2 py-2 md:py-4">
            <div className="mb-4 text-center">
              <p className="text-sm font-medium text-white/80">Tap all</p>
              <div
                className="mt-2 inline-flex min-h-[52px] min-w-[52px] items-center justify-center text-5xl font-bold md:text-6xl"
                style={{ color: colors[Math.floor(Math.random() * colors.length)] }}
              >
                {currentTargetSymbol}
              </div>
            </div>

            <div
              className="relative mx-auto min-h-[min(68vh,560px)] w-full flex-1 rounded-2xl bg-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
              style={{ maxWidth: '880px' }}
            >
              {showTargets &&
                visualTargets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => handleTargetClick(target)}
                    disabled={target.clicked}
                    className={`absolute flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 transform items-center justify-center text-4xl font-bold transition-all hover:scale-110 active:scale-95 md:text-5xl ${
                      target.clicked
                        ? target.isTarget
                          ? 'scale-125 bt-feedback-text-correct'
                          : 'bt-feedback-text-wrong opacity-50'
                        : ''
                    }`}
                    style={{
                      left: `${target.x}%`,
                      top: `${target.y}%`,
                      color: target.clicked
                        ? undefined
                        : colors[Math.floor(Math.random() * colors.length)],
                    }}
                  >
                    {target.symbol}
                  </button>
                ))}

              <div className="absolute bottom-3 left-3 right-3">
                <div className="bt-progress-track w-full">
                  <div
                    className="bt-progress-fill"
                    style={{ width: `${(gameStats.timeRemaining / (30 + gameStats.level * 5)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
            <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Round complete</p>
              <h2 className="mt-3 font-light text-2xl text-neutral-900 md:text-3xl">Rapid visual</h2>
              <p className="mt-4 text-3xl font-semibold tabular-nums text-neutral-900">{gameStats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                {gameStats.correctClicks}/{gameStats.totalTargets} targets · {accuracy}% · ~{averageReactionTime}
                ms
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {averageReactionTime < 800
                  ? 'Quick eyes.'
                  : averageReactionTime < 1200
                    ? 'Solid tempo.'
                    : 'Build speed next round.'}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <AnimatedButton onClick={nextLevel} aria-label="Next level">
                  Next level
                </AnimatedButton>
                <AnimatedButton variant="ghost" onClick={resetGame} aria-label="Play again">
                  Again
                </AnimatedButton>
                <AnimatedButton variant="ghost" onClick={() => navigate('/brain-training')} aria-label="Hub">
                  Hub
                </AnimatedButton>
              </div>
            </div>
          </div>
        )}

        {feedback.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bt-glass-dark max-w-sm p-8 text-center">
              <p className="text-4xl" aria-hidden>
                {feedback.correct ? '✓' : '✕'}
              </p>
              <p
                className={`mt-4 text-lg font-semibold ${
                  feedback.correct ? 'text-[var(--bt-correct)]' : 'text-[var(--bt-wrong)]'
                }`}
              >
                {feedback.message}
              </p>
            </div>
          </div>
        )}
      </div>
    </BrainGameShell>
  );
};

export default RapidVisualGame;
