import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useGameResult } from '../GameResultProvider';
import { useTrackedTimers } from '../useTrackedTimers';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface SequencePattern {
  id: number;
  numbers: number[];
  pattern: 'arithmetic' | 'geometric' | 'fibonacci' | 'square' | 'prime' | 'custom';
  rule: string;
  nextNumber: number;
  difficulty: number;
}

interface GameStats {
  score: number;
  level: number;
  correctAnswers: number;
  totalQuestions: number;
  currentStreak: number;
  bestStreak: number;
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'instructions' | 'playing' | 'results';
}

const NumberSequencesGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();
  const gameStartTimeRef = useRef<number>(0);

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    correctAnswers: 0,
    totalQuestions: 0,
    currentStreak: 0,
    bestStreak: 0,
    timeRemaining: 45,
    isGameActive: false,
    currentPhase: 'instructions'
  });

  const [currentSequence, setCurrentSequence] = useState<SequencePattern | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  });
  const hasSavedResultsRef = useRef(false);
  const saveResultRef = useRef(saveResult);
  saveResultRef.current = saveResult;
  const { clearAll, trackTimeout, trackInterval, untrack } = useTrackedTimers();

  const generateArithmeticSequence = (difficulty: number): SequencePattern => {
    const start = Math.floor(Math.random() * 20) + 1;
    const step = Math.floor(Math.random() * (difficulty * 2)) + 1;
    const length = Math.min(4 + Math.floor(difficulty / 2), 7);

    const numbers = [];
    for (let i = 0; i < length; i++) {
      numbers.push(start + (i * step));
    }

    return {
      id: Date.now(),
      numbers,
      pattern: 'arithmetic',
      rule: `Add ${step} each time`,
      nextNumber: start + (length * step),
      difficulty
    };
  };

  const generateGeometricSequence = (difficulty: number): SequencePattern => {
    const start = Math.floor(Math.random() * 5) + 1;
    const ratio = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
    const length = Math.min(3 + Math.floor(difficulty / 3), 5);

    const numbers = [];
    for (let i = 0; i < length; i++) {
      numbers.push(start * Math.pow(ratio, i));
    }

    return {
      id: Date.now(),
      numbers,
      pattern: 'geometric',
      rule: `Multiply by ${ratio} each time`,
      nextNumber: start * Math.pow(ratio, length),
      difficulty
    };
  };

  const generateFibonacciSequence = (difficulty: number): SequencePattern => {
    const start1 = Math.floor(Math.random() * 5) + 1;
    const start2 = Math.floor(Math.random() * 5) + 1;
    const length = Math.min(4 + Math.floor(difficulty / 2), 6);

    const numbers = [start1, start2];
    for (let i = 2; i < length; i++) {
      numbers.push(numbers[i - 1] + numbers[i - 2]);
    }

    return {
      id: Date.now(),
      numbers,
      pattern: 'fibonacci',
      rule: 'Each number is the sum of the two preceding ones',
      nextNumber: numbers[numbers.length - 1] + numbers[numbers.length - 2],
      difficulty
    };
  };

  const generateSquareSequence = (difficulty: number): SequencePattern => {
    const start = Math.floor(Math.random() * 5) + 1;
    const length = Math.min(3 + Math.floor(difficulty / 2), 6);

    const numbers = [];
    for (let i = 0; i < length; i++) {
      numbers.push(Math.pow(start + i, 2));
    }

    return {
      id: Date.now(),
      numbers,
      pattern: 'square',
      rule: 'Perfect squares starting from ' + start,
      nextNumber: Math.pow(start + length, 2),
      difficulty
    };
  };

  const generatePrimeSequence = (difficulty: number): SequencePattern => {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
    const startIndex = Math.floor(Math.random() * 3);
    const length = Math.min(4 + Math.floor(difficulty / 3), 6);

    const numbers = primes.slice(startIndex, startIndex + length);

    return {
      id: Date.now(),
      numbers,
      pattern: 'prime',
      rule: 'Prime number sequence',
      nextNumber: primes[startIndex + length],
      difficulty
    };
  };

  const generateCustomSequence = (difficulty: number): SequencePattern => {
    const patterns = [
      // Alternating add/subtract
      () => {
        const start = Math.floor(Math.random() * 10) + 5;
        const add = Math.floor(Math.random() * 5) + 2;
        const sub = Math.floor(Math.random() * 3) + 1;
        const numbers = [start];

        for (let i = 1; i < 5; i++) {
          if (i % 2 === 1) {
            numbers.push(numbers[i - 1] + add);
          } else {
            numbers.push(numbers[i - 1] - sub);
          }
        }

        const nextNumber = numbers.length % 2 === 1 ? numbers[numbers.length - 1] + add : numbers[numbers.length - 1] - sub;

        return {
          numbers,
          rule: `Alternating: +${add}, -${sub}`,
          nextNumber
        };
      },
      // Powers of 2 with offset
      () => {
        const offset = Math.floor(Math.random() * 5) + 1;
        const numbers = [];
        for (let i = 0; i < 5; i++) {
          numbers.push(Math.pow(2, i) + offset);
        }

        return {
          numbers,
          rule: `Powers of 2 plus ${offset}`,
          nextNumber: Math.pow(2, 5) + offset
        };
      }
    ];

    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)]();

    return {
      id: Date.now(),
      numbers: selectedPattern.numbers,
      pattern: 'custom',
      rule: selectedPattern.rule,
      nextNumber: selectedPattern.nextNumber,
      difficulty
    };
  };

  const generateSequence = useCallback(() => {
    const difficulty = gameStats.level;
    const patternTypes = [];

    // Add patterns based on difficulty
    patternTypes.push('arithmetic');

    if (difficulty >= 2) patternTypes.push('geometric');
    if (difficulty >= 3) patternTypes.push('fibonacci');
    if (difficulty >= 4) patternTypes.push('square');
    if (difficulty >= 5) patternTypes.push('prime');
    if (difficulty >= 6) patternTypes.push('custom');

    const selectedType = patternTypes[Math.floor(Math.random() * patternTypes.length)];

    let sequence: SequencePattern;

    switch (selectedType) {
      case 'arithmetic':
        sequence = generateArithmeticSequence(difficulty);
        break;
      case 'geometric':
        sequence = generateGeometricSequence(difficulty);
        break;
      case 'fibonacci':
        sequence = generateFibonacciSequence(difficulty);
        break;
      case 'square':
        sequence = generateSquareSequence(difficulty);
        break;
      case 'prime':
        sequence = generatePrimeSequence(difficulty);
        break;
      case 'custom':
        sequence = generateCustomSequence(difficulty);
        break;
      default:
        sequence = generateArithmeticSequence(difficulty);
    }

    setCurrentSequence(sequence);
    setUserAnswer('');
  }, [gameStats.level]);

  const startGame = useCallback(() => {
    clearAll();
    hasSavedResultsRef.current = false;
    gameStartTimeRef.current = Date.now();
    generateSequence();
    setGameStats(prev => ({
      ...prev,
      currentPhase: 'playing',
      isGameActive: true,
      timeRemaining: 45 + (prev.level * 5),
      totalQuestions: 0,
      correctAnswers: 0,
      currentStreak: 0
    }));
  }, [generateSequence, clearAll]);

  const endGame = useCallback(async () => {
    setGameStats(prev => {
      if (prev.currentPhase === 'results') {
        return prev;
      }
      return {
        ...prev,
        currentPhase: 'results',
        isGameActive: false
      };
    });
  }, []);

  useEffect(() => {
    if (gameStats.currentPhase !== 'results' || hasSavedResultsRef.current) return;

    hasSavedResultsRef.current = true;
    const accuracy = gameStats.totalQuestions > 0
      ? Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100)
      : 0;
    const duration = gameStartTimeRef.current > 0
      ? Math.round((Date.now() - gameStartTimeRef.current) / 1000)
      : 0;

    saveResultRef.current({
      gameType: 'number-sequences',
      score: gameStats.score,
      level: gameStats.level,
      accuracy,
      duration,
      details: {
        correctAnswers: gameStats.correctAnswers,
        totalQuestions: gameStats.totalQuestions,
        bestStreak: gameStats.bestStreak,
        currentStreak: gameStats.currentStreak,
        finalLevel: gameStats.level
      }
    });
  }, [gameStats]);

  const handleAnswerSubmit = () => {
    if (!currentSequence || !userAnswer.trim()) return;

    const userNumber = parseInt(userAnswer.trim());
    const isCorrect = userNumber === currentSequence.nextNumber;

    const basePoints = 10 * gameStats.level;
    const streakBonus = gameStats.currentStreak * 5;
    const timeBonus = Math.floor((gameStats.timeRemaining / (45 + gameStats.level * 5)) * 10);
    const difficultyBonus = currentSequence.difficulty * 5;

    const totalPoints = isCorrect ? basePoints + streakBonus + timeBonus + difficultyBonus : 0;

    // Calculate updated values before state update
    const updatedTotalQuestions = gameStats.totalQuestions + 1;
    const updatedCorrectAnswers = gameStats.correctAnswers + (isCorrect ? 1 : 0);
    const updatedStreak = isCorrect ? gameStats.currentStreak + 1 : 0;
    const updatedBestStreak = isCorrect ? Math.max(gameStats.bestStreak, gameStats.currentStreak + 1) : gameStats.bestStreak;

    setGameStats(prev => ({
      ...prev,
      score: prev.score + totalPoints,
      correctAnswers: updatedCorrectAnswers,
      totalQuestions: updatedTotalQuestions,
      currentStreak: updatedStreak,
      bestStreak: updatedBestStreak
    }));

    setFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect
        ? `Correct! The pattern: ${currentSequence.rule}`
        : `Incorrect. The answer was ${currentSequence.nextNumber}. Pattern: ${currentSequence.rule}`
    });

    trackTimeout(() => {
      setFeedback({ show: false, correct: false, message: '' });
      if (updatedTotalQuestions >= 10) {
        endGame();
      } else {
        generateSequence();
      }
    }, 3000);
  };

  const nextLevel = () => {
    setGameStats(prev => ({
      ...prev,
      level: prev.level + 1,
      currentPhase: 'instructions',
      currentStreak: 0
    }));
  };

  const resetGame = () => {
    clearAll();
    hasSavedResultsRef.current = false;
    gameStartTimeRef.current = 0;
    setGameStats({
      score: 0,
      level: 1,
      correctAnswers: 0,
      totalQuestions: 0,
      currentStreak: 0,
      bestStreak: 0,
      timeRemaining: 45,
      isGameActive: false,
      currentPhase: 'instructions'
    });
    setCurrentSequence(null);
    setUserAnswer('');
    setFeedback({ show: false, correct: false, message: '' });
  };

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

  const accuracy = gameStats.totalQuestions > 0
    ? Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100)
    : 0;

  return (
    <BrainGameShell
      title="Number Sequences"
      immersive={gameStats.currentPhase === 'playing'}
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {gameStats.currentPhase === 'playing' && (
            <span className="bt-glass-hud tabular-nums">
              {gameStats.score} pts · {gameStats.timeRemaining}s · Lv {gameStats.level} · {gameStats.currentStreak} st
            </span>
          )}
          <button
            type="button"
            onClick={resetGame}
            className={`bt-reset-btn flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium md:text-sm ${
              gameStats.currentPhase === 'playing' ? '' : 'border-black/10 bg-white text-neutral-600 shadow-sm'
            }`}
            aria-label="Reset game"
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            Reset
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl">
        {gameStats.currentPhase === 'instructions' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
            <div className="w-full max-w-lg rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <h2 className="font-light text-3xl tracking-wide text-neutral-900">Number sequences</h2>
              <p className="mt-4 text-sm text-neutral-600 md:text-base">
                Spot the pattern (arithmetic, geometric, Fib-ish, primes…) and enter the next number.
              </p>
              <div className="bt-panel-warm mt-6 rounded-xl border border-black/10 p-5 text-left text-sm text-neutral-700">
                <p className="font-medium text-neutral-900">Level {gameStats.level}</p>
                <p className="mt-2">
                  {gameStats.level === 1 && 'Simple arithmetic sequences.'}
                  {gameStats.level === 2 && 'Arithmetic and geometric.'}
                  {gameStats.level === 3 && 'Including Fibonacci-style patterns.'}
                  {gameStats.level === 4 && 'Perfect squares mixed in.'}
                  {gameStats.level === 5 && 'Prime-based sequences.'}
                  {gameStats.level >= 6 && 'Custom complex patterns.'}
                </p>
                <p className="mt-2 text-neutral-500">
                  10 sequences · {45 + gameStats.level * 5}s
                </p>
              </div>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'playing' && currentSequence && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-neutral-900">Next number</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Question {gameStats.totalQuestions + 1} of 10
              </p>
              <div className="bt-progress-track mx-auto mt-4 max-w-md">
                <div
                  className="bt-progress-fill"
                  style={{ width: `${(gameStats.timeRemaining / (45 + gameStats.level * 5)) * 100}%` }}
                />
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-2xl">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {currentSequence.numbers.map((num, index) => (
                  <React.Fragment key={index}>
                    <div className="rounded-xl bg-neutral-100 px-5 py-3 shadow-sm">
                      <div className="text-2xl font-bold tabular-nums text-neutral-900">{num}</div>
                    </div>
                    {index < currentSequence.numbers.length - 1 && (
                      <span className="text-xl text-neutral-400">→</span>
                    )}
                  </React.Fragment>
                ))}
                <span className="text-xl text-neutral-400">→</span>
                <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-white px-5 py-3">
                  <div className="text-2xl font-bold tabular-nums text-neutral-400">?</div>
                </div>
              </div>
              <p className="mt-6 text-center text-sm text-neutral-500">What comes next?</p>

              <div className="mt-8 text-center">
                <input
                  type="number"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAnswerSubmit();
                    }
                  }}
                  className="w-44 rounded-xl border border-neutral-200 bg-white px-4 py-4 text-center text-2xl font-bold tabular-nums text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  placeholder="Answer"
                  autoFocus
                />
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleAnswerSubmit}
                    disabled={!userAnswer.trim()}
                    className="bt-btn-solid px-10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Submit
                  </button>
                </div>
                <p className="mt-6 text-sm text-neutral-500">Best streak {gameStats.bestStreak}</p>
              </div>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
            <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Round complete</p>
              <h2 className="mt-3 font-light text-2xl text-neutral-900 md:text-3xl">Number sequences</h2>
              <p className="mt-4 text-3xl font-semibold tabular-nums text-neutral-900">{gameStats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                {gameStats.correctAnswers}/{gameStats.totalQuestions} correct · {accuracy}% · best streak{' '}
                {gameStats.bestStreak}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {accuracy >= 80 ? 'Strong pattern sense.' : accuracy >= 60 ? 'Solid work.' : 'Keep practicing.'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
              <p className="text-4xl" aria-hidden>
                {feedback.correct ? '✓' : '✕'}
              </p>
              <p
                className={`mt-4 text-lg font-semibold ${
                  feedback.correct ? 'bt-feedback-text-correct' : 'bt-feedback-text-wrong'
                }`}
              >
                {feedback.message}
              </p>
              {feedback.correct && (
                <p className="mt-2 text-sm text-neutral-500">
                  +{10 * gameStats.level + gameStats.currentStreak * 5} pts
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </BrainGameShell>
  );
};

export default NumberSequencesGame;
