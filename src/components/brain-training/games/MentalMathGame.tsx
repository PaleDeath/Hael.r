import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGameResult } from '../GameResultProvider';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface MathProblem {
  question: string;
  answer: number;
  options: number[];
  difficulty: number;
  operation: string;
}

interface GameStats {
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  streak: number;
  level: number;
  avgResponseTime: number;
  responseTimes: number[];
}

const MentalMathGame: React.FC = () => {
  const navigate = useNavigate();
  const gameRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const { saveResult } = useGameResult();

  const [gameState, setGameState] = useState<'menu' | 'countdown' | 'playing' | 'results'>('menu');
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    streak: 0,
    level: 1,
    avgResponseTime: 0,
    responseTimes: []
  });
  const [timeLeft, setTimeLeft] = useState(90);
  const [startTime, setStartTime] = useState<number>(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const operations = [
    { symbol: '+', name: 'addition', minLevel: 1 },
    { symbol: '−', name: 'subtraction', minLevel: 1 },
    { symbol: '×', name: 'multiplication', minLevel: 2 },
    { symbol: '÷', name: 'division', minLevel: 3 }
  ];

  const accuracy = stats.totalAnswers > 0
    ? (stats.correctAnswers / stats.totalAnswers) * 100
    : 0;

  const endGame = useCallback(() => {
    setGameState('results');

    saveResult({
      gameType: 'mental-math',
      score: stats.score,
      level: stats.level,
      accuracy: Math.round(accuracy),
      duration: 90 - timeLeft,
      details: {
        correctAnswers: stats.correctAnswers,
        totalAnswers: stats.totalAnswers,
        streak: stats.streak,
        avgReactionTime: Math.round(stats.avgResponseTime)
      }
    });
  }, [stats, accuracy, timeLeft, saveResult]);

  const generateProblem = useCallback((): MathProblem => {
    const availableOps = operations.filter(op => stats.level >= op.minLevel);
    const operation = availableOps[Math.floor(Math.random() * availableOps.length)];

    let num1: number, num2: number, answer: number, question: string;
    const difficulty = Math.min(stats.level, 10);

    switch (operation.symbol) {
      case '+':
        num1 = Math.floor(Math.random() * (10 * difficulty)) + 1;
        num2 = Math.floor(Math.random() * (10 * difficulty)) + 1;
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;

      case '−':
        num1 = Math.floor(Math.random() * (10 * difficulty)) + 10;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        question = `${num1} − ${num2}`;
        break;

      case '×':
        num1 = Math.floor(Math.random() * (5 + difficulty)) + 2;
        num2 = Math.floor(Math.random() * (5 + difficulty)) + 2;
        answer = num1 * num2;
        question = `${num1} × ${num2}`;
        break;

      case '÷':
        answer = Math.floor(Math.random() * (5 + difficulty)) + 2;
        num2 = Math.floor(Math.random() * (3 + difficulty)) + 2;
        num1 = answer * num2;
        answer = num1 / num2;
        question = `${num1} ÷ ${num2}`;
        break;

      default:
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
    }

    // Generate wrong answer options
    const options: number[] = [answer];
    while (options.length < 4) {
      let wrongAnswer: number;

      if (operation.symbol === '÷' && answer < 20) {
        // For division, create close integer answers
        wrongAnswer = answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      } else {
        // For other operations, create answers within reasonable range
        const variance = Math.max(Math.floor(answer * 0.3), 5);
        wrongAnswer = answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * variance) + 1);
      }

      if (wrongAnswer > 0 && !options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      question,
      answer,
      options,
      difficulty,
      operation: operation.symbol
    };
  }, [stats.level]);

  const nextProblem = useCallback(() => {
    const problem = generateProblem();
    setCurrentProblem(problem);
    setStartTime(Date.now());
    setFeedback(null);
    setSelectedAnswer(null);

    // Animate problem appearance
    if (problemRef.current) {
      gsap.fromTo(problemRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    }

    if (optionsRef.current) {
      const children = Array.from(optionsRef.current.children);
      gsap.fromTo(children,
        { scale: 0, rotation: -10 },
        {
          scale: 1,
          rotation: 0,
          duration: 0.3,
          stagger: 0.1,
          ease: "back.out(1.7)"
        }
      );
    }
  }, [generateProblem]);

  const startGame = () => {
    setGameState('countdown');
    setCountdown(3);

    // Reset stats
    setStats({
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      streak: 0,
      level: 1,
      avgResponseTime: 0,
      responseTimes: []
    });

    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          setGameState('playing');
          setTimeLeft(90);
          nextProblem();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetGame = () => {
    setGameState('menu');
    setStats({
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      streak: 0,
      level: 1,
      avgResponseTime: 0,
      responseTimes: []
    });
    setTimeLeft(90);
    setCurrentProblem(null);
    setFeedback(null);
    setSelectedAnswer(null);
  };

  const handleAnswer = (selectedAnswer: number) => {
    if (!currentProblem || gameState !== 'playing') return;

    const responseTime = Date.now() - startTime;
    const isCorrect = selectedAnswer === currentProblem.answer;

    setSelectedAnswer(selectedAnswer);

    const newResponseTimes = [...stats.responseTimes, responseTime];
    const newAvgResponseTime = newResponseTimes.reduce((a, b) => a + b, 0) / newResponseTimes.length;

    if (isCorrect) {
      const basePoints = 10 * stats.level;
      const speedBonus = Math.max(0, 50 - Math.floor(responseTime / 100));
      const streakBonus = stats.streak * 5;
      const totalPoints = basePoints + speedBonus + streakBonus;

      setStats(prev => ({
        ...prev,
        score: prev.score + totalPoints,
        correctAnswers: prev.correctAnswers + 1,
        totalAnswers: prev.totalAnswers + 1,
        streak: prev.streak + 1,
        level: Math.floor((prev.correctAnswers + 1) / 8) + 1,
        avgResponseTime: newAvgResponseTime,
        responseTimes: newResponseTimes
      }));

      setFeedback('correct');

      // Animate correct feedback
      if (optionsRef.current) {
        const buttons = Array.from(optionsRef.current.children) as HTMLElement[];
        const correctButton = buttons.find(btn =>
          parseInt(btn.textContent || '0') === currentProblem.answer
        );

        if (correctButton) {
          gsap.to(correctButton, {
            scale: 1.1,
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            duration: 0.3,
            ease: "back.out(1.7)"
          });
        }
      }

      // Next problem after delay
      setTimeout(() => {
        nextProblem();
      }, 1000);

    } else {
      setStats(prev => ({
        ...prev,
        totalAnswers: prev.totalAnswers + 1,
        streak: 0,
        avgResponseTime: newAvgResponseTime,
        responseTimes: newResponseTimes
      }));

      setFeedback('incorrect');

      // Animate incorrect feedback
      if (optionsRef.current) {
        const buttons = Array.from(optionsRef.current.children) as HTMLElement[];
        const selectedButton = buttons.find(btn =>
          parseInt(btn.textContent || '0') === selectedAnswer
        );
        const correctButton = buttons.find(btn =>
          parseInt(btn.textContent || '0') === currentProblem.answer
        );

        if (selectedButton) {
          gsap.to(selectedButton, {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            x: 5,
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            ease: "power2.inOut"
          });
        }

        if (correctButton) {
          gsap.to(correctButton, {
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            scale: 1.1,
            duration: 0.3,
            ease: "back.out(1.7)"
          });
        }
      }

      // Next problem after delay
      setTimeout(() => {
        nextProblem();
      }, 1500);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft, endGame]);

  const immersive = gameState !== 'menu';

  return (
    <BrainGameShell
      title="Mental Math"
      immersive={immersive}
      onErrorReset={resetGame}
      topAccessory={
        gameState === 'playing' ? (
          <span className="bt-glass-hud tabular-nums">
            {stats.score} pts · {timeLeft}s · Lv {stats.level} · {stats.streak} str
          </span>
        ) : null
      }
    >
      <div ref={gameRef} className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        {gameState === 'menu' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
              <h1 className="font-light text-3xl tracking-wide text-neutral-900 md:text-4xl">Mental Math</h1>
              <p className="mt-4 text-sm text-neutral-600">
                Ninety seconds of picks. Faster correct answers score higher; streaks add bonus points.
              </p>
              <p className="mt-4 text-xs text-neutral-500">
                Levels 1–2: + and − · 3–4: × · 5+: ÷
              </p>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start mental math">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2">
            <div className="bt-play-surface-light w-full max-w-sm p-12 text-center">
              <p className="text-sm text-neutral-500">Get ready</p>
              <div className="mt-6 font-light text-8xl tabular-nums text-neutral-900 animate-pulse">{countdown}</div>
            </div>
          </div>
        )}

        {gameState === 'playing' && currentProblem && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <div ref={problemRef} className="text-center">
              <div className="text-4xl font-semibold text-neutral-900 md:text-6xl">
                {currentProblem.question} = ?
              </div>
              <div className="mt-3 text-sm text-neutral-500">
                Lv {stats.level} ·{' '}
                {currentProblem.operation === '+'
                  ? 'Add'
                  : currentProblem.operation === '−'
                    ? 'Subtract'
                    : currentProblem.operation === '×'
                      ? 'Multiply'
                      : 'Divide'}
              </div>
            </div>
            {feedback && (
              <div
                className={`mb-2 mt-6 text-center text-lg font-medium ${
                  feedback === 'correct' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {feedback === 'correct' ? 'Correct' : 'Incorrect'}
              </div>
            )}
            <div ref={optionsRef} className="mx-auto mt-8 grid w-full max-w-md grid-cols-2 gap-3">
              {currentProblem.options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAnswer(option)}
                  disabled={feedback !== null}
                  className={`bt-option-light min-h-[52px] text-xl disabled:opacity-50 ${
                    selectedAnswer === option
                      ? feedback === 'correct'
                        ? 'bt-option-light--correct'
                        : 'bt-option-light--wrong'
                      : option === currentProblem.answer && feedback === 'incorrect'
                        ? 'bt-option-light--correct'
                        : ''
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2">
            <div className="bt-glass-dark w-full max-w-md p-8 text-center">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Time&apos;s up</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-neutral-900">{stats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                Lv {stats.level} · {accuracy.toFixed(0)}% · ~{Math.round(stats.avgResponseTime / 1000)}s avg
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <AnimatedButton onClick={resetGame} aria-label="Play again">
                  Again
                </AnimatedButton>
                <AnimatedButton variant="ghost" onClick={() => navigate('/brain-training')} aria-label="Hub">
                  Hub
                </AnimatedButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </BrainGameShell>
  );
};

export default MentalMathGame;
