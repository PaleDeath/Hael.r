import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useGameResult } from '../GameResultProvider';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface FractionProblem {
  id: number;
  type: 'add' | 'subtract' | 'multiply' | 'divide' | 'compare' | 'simplify' | 'mixed';
  numerator1: number;
  denominator1: number;
  numerator2?: number;
  denominator2?: number;
  operation?: string;
  question: string;
  options: string[];
  correctAnswer: string;
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
  averageTime: number;
  totalTime: number;
}

const FractionFrenzyGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    correctAnswers: 0,
    totalQuestions: 0,
    currentStreak: 0,
    bestStreak: 0,
    timeRemaining: 120,
    isGameActive: false,
    currentPhase: 'instructions',
    averageTime: 0,
    totalTime: 0
  });

  const [currentProblem, setCurrentProblem] = useState<FractionProblem | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  });

  // Utility functions
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

  const simplifyFraction = (num: number, den: number): [number, number] => {
    const divisor = gcd(Math.abs(num), Math.abs(den));
    return [num / divisor, den / divisor];
  };

  const fractionToString = (num: number, den: number, simplified = true): string => {
    if (simplified) {
      const [sNum, sDen] = simplifyFraction(num, den);
      return sDen === 1 ? sNum.toString() : `${sNum}/${sDen}`;
    }
    return den === 1 ? num.toString() : `${num}/${den}`;
  };

  const generateAdditionProblem = (difficulty: number): FractionProblem => {
    const maxDenom = Math.min(4 + difficulty * 2, 12);
    const den1 = Math.floor(Math.random() * maxDenom) + 2;
    const den2 = Math.floor(Math.random() * maxDenom) + 2;
    const num1 = Math.floor(Math.random() * (den1 - 1)) + 1;
    const num2 = Math.floor(Math.random() * (den2 - 1)) + 1;

    // Calculate result: num1/den1 + num2/den2
    const resultNum = num1 * den2 + num2 * den1;
    const resultDen = den1 * den2;
    const [simplifiedNum, simplifiedDen] = simplifyFraction(resultNum, resultDen);

    const correctAnswer = fractionToString(simplifiedNum, simplifiedDen);

    // Generate wrong answers
    const wrongAnswers = [
      fractionToString(num1 + num2, den1 + den2), // Common mistake
      fractionToString(resultNum, resultDen), // Unsimplified
      fractionToString(simplifiedNum + 1, simplifiedDen), // Off by 1
    ].filter(ans => ans !== correctAnswer);

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)]
      .sort(() => 0.5 - Math.random());

    return {
      id: Date.now(),
      type: 'add',
      numerator1: num1,
      denominator1: den1,
      numerator2: num2,
      denominator2: den2,
      operation: '+',
      question: `${fractionToString(num1, den1)} + ${fractionToString(num2, den2)} = ?`,
      options,
      correctAnswer,
      difficulty
    };
  };

  const generateSubtractionProblem = (difficulty: number): FractionProblem => {
    const maxDenom = Math.min(4 + difficulty * 2, 12);
    const den1 = Math.floor(Math.random() * maxDenom) + 2;
    const den2 = Math.floor(Math.random() * maxDenom) + 2;
    const num1 = Math.floor(Math.random() * (den1 - 1)) + 2; // Ensure positive result
    const num2 = Math.floor(Math.random() * Math.min(num1, den2 - 1)) + 1;

    // Calculate result: num1/den1 - num2/den2
    const resultNum = num1 * den2 - num2 * den1;
    const resultDen = den1 * den2;
    const [simplifiedNum, simplifiedDen] = simplifyFraction(resultNum, resultDen);

    const correctAnswer = fractionToString(simplifiedNum, simplifiedDen);

    const wrongAnswers = [
      fractionToString(Math.abs(num1 - num2), Math.abs(den1 - den2)), // Common mistake
      fractionToString(resultNum, resultDen), // Unsimplified
      fractionToString(simplifiedNum + 1, simplifiedDen), // Off by 1
    ].filter(ans => ans !== correctAnswer);

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)]
      .sort(() => 0.5 - Math.random());

    return {
      id: Date.now(),
      type: 'subtract',
      numerator1: num1,
      denominator1: den1,
      numerator2: num2,
      denominator2: den2,
      operation: '-',
      question: `${fractionToString(num1, den1)} - ${fractionToString(num2, den2)} = ?`,
      options,
      correctAnswer,
      difficulty
    };
  };

  const generateMultiplicationProblem = (difficulty: number): FractionProblem => {
    const maxNum = Math.min(3 + difficulty, 8);
    const maxDenom = Math.min(4 + difficulty, 10);

    const num1 = Math.floor(Math.random() * maxNum) + 1;
    const den1 = Math.floor(Math.random() * maxDenom) + 2;
    const num2 = Math.floor(Math.random() * maxNum) + 1;
    const den2 = Math.floor(Math.random() * maxDenom) + 2;

    // Calculate result: (num1/den1) × (num2/den2)
    const resultNum = num1 * num2;
    const resultDen = den1 * den2;
    const [simplifiedNum, simplifiedDen] = simplifyFraction(resultNum, resultDen);

    const correctAnswer = fractionToString(simplifiedNum, simplifiedDen);

    const wrongAnswers = [
      fractionToString(num1 * num2, den1 + den2), // Wrong operation
      fractionToString(resultNum, resultDen), // Unsimplified
      fractionToString(num1 + num2, den1 * den2), // Mixed up
    ].filter(ans => ans !== correctAnswer);

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)]
      .sort(() => 0.5 - Math.random());

    return {
      id: Date.now(),
      type: 'multiply',
      numerator1: num1,
      denominator1: den1,
      numerator2: num2,
      denominator2: den2,
      operation: '×',
      question: `${fractionToString(num1, den1)} × ${fractionToString(num2, den2)} = ?`,
      options,
      correctAnswer,
      difficulty
    };
  };

  const generateCompareProblem = (difficulty: number): FractionProblem => {
    const maxDenom = Math.min(6 + difficulty, 15);
    const den1 = Math.floor(Math.random() * maxDenom) + 3;
    const den2 = Math.floor(Math.random() * maxDenom) + 3;
    const num1 = Math.floor(Math.random() * (den1 - 1)) + 1;
    const num2 = Math.floor(Math.random() * (den2 - 1)) + 1;

    // Compare fractions by cross multiplication
    const cross1 = num1 * den2;
    const cross2 = num2 * den1;

    let correctAnswer: string;
    if (cross1 > cross2) {
      correctAnswer = '>';
    } else if (cross1 < cross2) {
      correctAnswer = '<';
    } else {
      correctAnswer = '=';
    }

    const options = ['>', '<', '='].sort(() => 0.5 - Math.random());

    return {
      id: Date.now(),
      type: 'compare',
      numerator1: num1,
      denominator1: den1,
      numerator2: num2,
      denominator2: den2,
      question: `Which is correct? ${fractionToString(num1, den1)} ___ ${fractionToString(num2, den2)}`,
      options,
      correctAnswer,
      difficulty
    };
  };

  const generateSimplifyProblem = (difficulty: number): FractionProblem => {
    const maxFactor = Math.min(3 + difficulty, 8);
    const factor = Math.floor(Math.random() * maxFactor) + 2;
    const simpleNum = Math.floor(Math.random() * 5) + 1;
    const simpleDen = Math.floor(Math.random() * 8) + 2;

    const num = simpleNum * factor;
    const den = simpleDen * factor;

    const correctAnswer = fractionToString(simpleNum, simpleDen);

    const wrongAnswers = [
      fractionToString(num, den), // Original (not simplified)
      fractionToString(simpleNum, simpleDen * 2), // Wrong simplification
      fractionToString(simpleNum * 2, simpleDen), // Wrong simplification
    ].filter(ans => ans !== correctAnswer);

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)]
      .sort(() => 0.5 - Math.random());

    return {
      id: Date.now(),
      type: 'simplify',
      numerator1: num,
      denominator1: den,
      question: `Simplify: ${fractionToString(num, den, false)}`,
      options,
      correctAnswer,
      difficulty
    };
  };

  const generateProblem = useCallback(() => {
    const difficulty = gameStats.level;
    const problemTypes = ['add', 'simplify'];

    if (difficulty >= 2) problemTypes.push('subtract');
    if (difficulty >= 3) problemTypes.push('multiply');
    if (difficulty >= 4) problemTypes.push('compare');

    const problemType = problemTypes[Math.floor(Math.random() * problemTypes.length)];

    let problem: FractionProblem;

    switch (problemType) {
      case 'add':
        problem = generateAdditionProblem(difficulty);
        break;
      case 'subtract':
        problem = generateSubtractionProblem(difficulty);
        break;
      case 'multiply':
        problem = generateMultiplicationProblem(difficulty);
        break;
      case 'compare':
        problem = generateCompareProblem(difficulty);
        break;
      case 'simplify':
        problem = generateSimplifyProblem(difficulty);
        break;
      default:
        problem = generateAdditionProblem(difficulty);
    }

    setCurrentProblem(problem);
    setQuestionStartTime(Date.now());
  }, [gameStats.level]);

  const startGame = useCallback(() => {
    generateProblem();
    setGameStats(prev => ({
      ...prev,
      currentPhase: 'playing',
      isGameActive: true,
      timeRemaining: 120 + (prev.level * 15),
      totalQuestions: 0,
      correctAnswers: 0,
      currentStreak: 0,
      totalTime: 0
    }));
  }, [generateProblem]);

  const endGame = useCallback(() => {
    setGameStats(prev => ({ ...prev, isGameActive: false, currentPhase: 'results' }));

    const accuracy = gameStats.totalQuestions > 0
      ? Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100)
      : 0;

    saveResult({
      gameType: 'fraction-frenzy',
      score: gameStats.score,
      level: gameStats.level,
      accuracy: accuracy,
      duration: 120 + (gameStats.level * 15) - gameStats.timeRemaining,
      details: {
        correctAnswers: gameStats.correctAnswers,
        totalQuestions: gameStats.totalQuestions,
        currentStreak: gameStats.currentStreak,
        bestStreak: gameStats.bestStreak
      }
    });
  }, [gameStats, saveResult]);

  const handleAnswer = (answer: string) => {
    if (!currentProblem) return;

    const responseTime = Date.now() - questionStartTime;
    const isCorrect = answer === currentProblem.correctAnswer;

    const baseScore = 25 * gameStats.level;
    const timeBonus = Math.max(0, 5000 - responseTime) / 50; // Bonus for speed
    const streakBonus = gameStats.currentStreak * 10;
    const difficultyBonus = currentProblem.difficulty * 5;

    const totalScore = isCorrect ? Math.round(baseScore + timeBonus + streakBonus + difficultyBonus) : 0;

    // Calculate new stats
    const newCorrectAnswers = gameStats.correctAnswers + (isCorrect ? 1 : 0);
    const newTotalQuestions = gameStats.totalQuestions + 1;
    const newTotalTime = gameStats.totalTime + responseTime;
    const newAverageTime = Math.round(newTotalTime / newTotalQuestions);

    setGameStats(prev => ({
      ...prev,
      score: prev.score + totalScore,
      correctAnswers: newCorrectAnswers,
      totalQuestions: newTotalQuestions,
      currentStreak: isCorrect ? prev.currentStreak + 1 : 0,
      bestStreak: isCorrect ? Math.max(prev.bestStreak, prev.currentStreak + 1) : prev.bestStreak,
      totalTime: newTotalTime,
      averageTime: newAverageTime
    }));

    setFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect
        ? `Correct! +${totalScore} points (${responseTime}ms)`
        : `Incorrect. The answer was ${currentProblem.correctAnswer}`
    });

    setTimeout(() => {
      setFeedback({ show: false, correct: false, message: '' });
      if (newTotalQuestions >= 15) {
        endGame();
      } else {
        generateProblem();
      }
    }, 2000);
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
    setGameStats({
      score: 0,
      level: 1,
      correctAnswers: 0,
      totalQuestions: 0,
      currentStreak: 0,
      bestStreak: 0,
      timeRemaining: 120,
      isGameActive: false,
      currentPhase: 'instructions',
      averageTime: 0,
      totalTime: 0
    });
    setCurrentProblem(null);
    setFeedback({ show: false, correct: false, message: '' });
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameStats.isGameActive && gameStats.timeRemaining > 0) {
      interval = setInterval(() => {
        setGameStats(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
    } else if (gameStats.timeRemaining === 0 && gameStats.isGameActive) {
      endGame();
    }

    return () => clearInterval(interval);
  }, [gameStats.isGameActive, gameStats.timeRemaining, endGame]);

  const accuracy = gameStats.totalQuestions > 0
    ? Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100)
    : 0;

  return (
    <BrainGameShell
      title="Fraction Frenzy"
      immersive={gameStats.currentPhase === 'playing'}
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {gameStats.currentPhase === 'playing' && (
            <span className="bt-glass-hud tabular-nums">
              {gameStats.score} pts · {gameStats.timeRemaining}s · Lv {gameStats.level} · ~{gameStats.averageTime}ms
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
              <h2 className="font-light text-3xl tracking-wide text-neutral-900">Fraction frenzy</h2>
              <p className="mt-4 text-sm text-neutral-600 md:text-base">
                Add, subtract, multiply, compare, and simplify fractions. Difficulty scales with your level.
              </p>
              <div className="mt-6 rounded-xl border border-black/10 bg-[#fafaf7] p-5 text-left text-sm text-neutral-700">
                <p className="font-medium text-neutral-900">Level {gameStats.level}</p>
                <p className="mt-2">
                  {gameStats.level === 1 && 'Addition and simplification.'}
                  {gameStats.level === 2 && '+ subtraction.'}
                  {gameStats.level === 3 && '+ multiplication.'}
                  {gameStats.level === 4 && '+ comparison.'}
                  {gameStats.level >= 5 && 'All operations, harder fractions.'}
                </p>
                <p className="mt-2 text-neutral-500">15 problems · {120 + gameStats.level * 15}s</p>
              </div>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'playing' && currentProblem && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-neutral-900">Solve</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Problem {gameStats.totalQuestions + 1} of 15
              </p>
              <div className="bt-progress-track mx-auto mt-4 max-w-md">
                <div
                  className="bt-progress-fill"
                  style={{ width: `${(gameStats.timeRemaining / (120 + gameStats.level * 15)) * 100}%` }}
                />
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-2xl">
              <p className="text-center text-2xl font-semibold text-neutral-900 md:text-3xl">
                {currentProblem.question}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-2">
                {currentProblem.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAnswer(option)}
                    className="bt-option-light min-h-14 text-lg"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
            <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Round complete</p>
              <h2 className="mt-3 font-light text-2xl text-neutral-900 md:text-3xl">Fraction frenzy</h2>
              <p className="mt-4 text-3xl font-semibold tabular-nums text-neutral-900">{gameStats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                {gameStats.correctAnswers}/{gameStats.totalQuestions} · {accuracy}% · best streak{' '}
                {gameStats.bestStreak}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {accuracy >= 85 ? 'Sharp reasoning.' : accuracy >= 70 ? 'Nice work.' : 'Room to grow.'}
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
            <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
              <p className="text-4xl" aria-hidden>
                {feedback.correct ? '✓' : '✕'}
              </p>
              <p
                className={`mt-4 text-lg font-semibold ${
                  feedback.correct ? 'text-emerald-600' : 'text-red-600'
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

export default FractionFrenzyGame;
