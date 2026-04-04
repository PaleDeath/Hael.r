import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGameResult } from '../GameResultProvider';
import { useTrackedTimers } from '../useTrackedTimers';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface GameStats {
  correctAnswers: number;
  totalAnswers: number;
  streak: number;
  avgReactionTime: number;
  reactionTimes: number[];
}

interface ColorWord {
  text: string;
  color: string;
  isMatch: boolean;
}

/** Ink-friendly saturations (pairs with --bt-* in brain-training.css) */
const STROOP_COLORS = [
  { name: 'RED', hex: '#b85c5c' },
  { name: 'BLUE', hex: '#4a6fa5' },
  { name: 'GREEN', hex: '#4d8f63' },
  { name: 'YELLOW', hex: '#c9a227' },
  { name: 'PURPLE', hex: '#6b4d7a' },
  { name: 'ORANGE', hex: '#c9855a' },
  { name: 'PINK', hex: '#c98fa8' },
  { name: 'BROWN', hex: '#7a5240' }
] as const;

const ColorMatchGame: React.FC = () => {
  const navigate = useNavigate();
  const gameRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const { saveResult } = useGameResult();

  const [gameState, setGameState] = useState<'menu' | 'instructions' | 'countdown' | 'playing' | 'results'>('menu');
  const [currentWord, setCurrentWord] = useState<ColorWord | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [startTime, setStartTime] = useState<number>(0);
  const [stats, setStats] = useState<GameStats>({
    correctAnswers: 0,
    totalAnswers: 0,
    streak: 0,
    avgReactionTime: 0,
    reactionTimes: []
  });
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [countdown, setCountdown] = useState(3);
  const hasSavedResultsRef = useRef(false);
  const saveResultRef = useRef(saveResult);
  saveResultRef.current = saveResult;
  const { clearAll, trackTimeout, trackInterval, untrack } = useTrackedTimers();

  const generateWord = useCallback((): ColorWord => {
    const textIndex = Math.floor(Math.random() * STROOP_COLORS.length);
    const colorIndex = Math.floor(Math.random() * STROOP_COLORS.length);

    return {
      text: STROOP_COLORS[textIndex].name,
      color: STROOP_COLORS[colorIndex].hex,
      isMatch: textIndex === colorIndex
    };
  }, []);

  const startGame = () => {
    clearAll();
    hasSavedResultsRef.current = false;
    setGameState('countdown');
    setCountdown(3);

    const id = trackInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          untrack(id);
          setGameState('playing');
          setTimeLeft(60);
          nextWord();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const nextWord = () => {
    const word = generateWord();
    setCurrentWord(word);
    setStartTime(Date.now());
    setFeedback(null);

    // Animate word appearance
    if (wordRef.current) {
      gsap.fromTo(wordRef.current,
        { scale: 0, rotation: -10, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
      );
    }
  };

  const handleAnswer = (answer: boolean) => {
    if (!currentWord || gameState !== 'playing') return;

    const reactionTime = Date.now() - startTime;
    const isCorrect = answer === currentWord.isMatch;

    setStats(prev => ({
      ...prev,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      totalAnswers: prev.totalAnswers + 1,
      streak: isCorrect ? prev.streak + 1 : 0,
      reactionTimes: [...prev.reactionTimes, reactionTime],
      avgReactionTime: [...prev.reactionTimes, reactionTime].reduce((a, b) => a + b, 0) / [...prev.reactionTimes, reactionTime].length
    }));

    if (isCorrect) {
      setScore(prev => prev + (10 * level) + Math.max(0, 1000 - reactionTime));
      setFeedback('correct');

      // Animate correct feedback
      if (wordRef.current) {
        gsap.to(wordRef.current, {
          scale: 1.2,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut"
        });
      }
    } else {
      setFeedback('incorrect');

      // Animate incorrect feedback
      if (wordRef.current) {
        gsap.to(wordRef.current, {
          x: 10,
          duration: 0.1,
          yoyo: true,
          repeat: 3,
          ease: "power2.inOut"
        });
      }
    }

    if (isCorrect) {
      const newCorrectCount = stats.correctAnswers + 1;
      if (newCorrectCount > 0 && newCorrectCount % 10 === 0) {
        setLevel(prev => prev + 1);
      }
    }

    trackTimeout(() => {
      nextWord();
    }, 800);
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const id = trackTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => untrack(id);
    }
    if (gameState === 'playing' && timeLeft === 0) {
      setGameState('results');
    }
  }, [gameState, timeLeft, trackTimeout, untrack]);

  useEffect(() => {
    if (gameState !== 'results' || hasSavedResultsRef.current) return;
    hasSavedResultsRef.current = true;
    const accuracy = stats.totalAnswers > 0 ? (stats.correctAnswers / stats.totalAnswers * 100) : 0;
    saveResultRef.current({
      gameType: 'color-match',
      score,
      level,
      accuracy: Math.round(accuracy),
      duration: 60,
      details: {
        correctAnswers: stats.correctAnswers,
        totalAnswers: stats.totalAnswers,
        streak: stats.streak,
        avgReactionTime: stats.avgReactionTime
      }
    });
  }, [gameState, stats, score, level]);

  // Timer animation
  useEffect(() => {
    if (timerRef.current && gameState === 'playing') {
      if (timeLeft <= 10) {
        gsap.to(timerRef.current, {
          scale: 1.1,
          color: timeLeft <= 5 ? '#a84848' : '#b45309',
          duration: 0.5,
          yoyo: true,
          ease: "power2.inOut"
        });
      }
    }
  }, [timeLeft, gameState]);

  const resetGame = () => {
    clearAll();
    hasSavedResultsRef.current = false;
    setGameState('menu');
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setStats({
      correctAnswers: 0,
      totalAnswers: 0,
      streak: 0,
      avgReactionTime: 0,
      reactionTimes: []
    });
    setCurrentWord(null);
    setFeedback(null);
  };

  const accuracy = stats.totalAnswers > 0 ? (stats.correctAnswers / stats.totalAnswers * 100) : 0;

  const immersive = gameState !== 'menu';

  return (
    <BrainGameShell
      title="Color Match"
      immersive={immersive}
      onErrorReset={resetGame}
      topAccessory={
        gameState === 'playing' ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span ref={timerRef} className="bt-glass-hud tabular-nums">
              {score} pts · {timeLeft}s · Lv {level}
            </span>
          </div>
        ) : null
      }
    >
      <div ref={gameRef} className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {gameState === 'menu' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
              <h1 className="font-light text-3xl tracking-wide text-neutral-900 md:text-4xl">Color Match</h1>
              <p className="mt-4 text-sm text-neutral-600 md:text-base">
                Classic Stroop: decide if the word and the ink color match (e.g. RED in red ink = match).
              </p>
              <ul className="mt-6 space-y-2 text-left text-sm text-neutral-600">
                <li>• MATCH when the word and the color are the same</li>
                <li>• NO MATCH when they differ</li>
                <li>• Speed bonus; level rises every 10 correct</li>
              </ul>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start color match">
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

        {gameState === 'playing' && currentWord && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <div ref={wordRef} className="text-center">
              <div className="text-6xl font-semibold tracking-tight md:text-8xl" style={{ color: currentWord.color }}>
                {currentWord.text}
              </div>
            </div>
            {feedback && (
              <div
                className={`mt-6 text-center text-lg font-medium ${
                  feedback === 'correct' ? 'bt-feedback-text-correct' : 'bt-feedback-text-wrong'
                }`}
              >
                {feedback === 'correct' ? 'Correct' : 'Incorrect'}
              </div>
            )}
            <div className="mx-auto mt-10 flex w-full max-w-lg flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => handleAnswer(false)}
                disabled={feedback !== null}
                className="bt-play-surface-light min-h-14 min-w-[140px] flex-1 rounded-xl px-10 py-4 text-lg font-semibold text-neutral-900 shadow-[var(--bt-card-shadow)] transition-[transform,box-shadow] hover:shadow-[var(--bt-card-shadow-hover)] disabled:opacity-40"
              >
                No match
              </button>
              <button
                type="button"
                onClick={() => handleAnswer(true)}
                disabled={feedback !== null}
                className="min-h-14 min-w-[140px] flex-1 rounded-xl bg-[#1a1a1a] px-10 py-4 text-lg font-semibold text-white shadow-md transition-[transform,background-color] hover:bg-neutral-800 disabled:opacity-40"
              >
                Match
              </button>
            </div>
          </div>
        )}

        {gameState === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2">
            <div className="bt-glass-dark w-full max-w-md p-8 text-center">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Round complete</p>
              <h2 className="mt-3 font-light text-2xl text-neutral-900 md:text-3xl">Color Match</h2>
              <p className="mt-4 text-3xl font-semibold tabular-nums text-neutral-900">{score}</p>
              <p className="text-sm text-neutral-600">
                Level {level} · {accuracy.toFixed(1)}% accuracy · ~{Math.round(stats.avgReactionTime)} ms
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

export default ColorMatchGame;
