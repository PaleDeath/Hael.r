import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useGameResult } from '../GameResultProvider';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface WordPair {
  id: number;
  word1: string;
  word2: string;
}

interface GameStats {
  score: number;
  level: number;
  correctMatches: number;
  totalAttempts: number;
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'study' | 'test' | 'results';
}

const WordPairsGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    correctMatches: 0,
    totalAttempts: 0,
    timeRemaining: 30,
    isGameActive: false,
    currentPhase: 'study'
  });

  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [studyPairs, setStudyPairs] = useState<WordPair[]>([]);
  const [currentTestPair, setCurrentTestPair] = useState<WordPair | null>(null);
  const [testOptions, setTestOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  });
  const [gameStartTime, setGameStartTime] = useState(0);

  // Word pairs database for different difficulty levels
  const allWordPairs = {
    1: [
      { word1: 'Cat', word2: 'Meow' },
      { word1: 'Dog', word2: 'Bark' },
      { word1: 'Sun', word2: 'Bright' },
      { word1: 'Ocean', word2: 'Blue' },
      { word1: 'Fire', word2: 'Hot' }
    ],
    2: [
      { word1: 'Thunder', word2: 'Lightning' },
      { word1: 'Rose', word2: 'Fragrant' },
      { word1: 'Mountain', word2: 'Tall' },
      { word1: 'Library', word2: 'Quiet' },
      { word1: 'Butterfly', word2: 'Colorful' },
      { word1: 'Winter', word2: 'Cold' }
    ],
    3: [
      { word1: 'Democracy', word2: 'Freedom' },
      { word1: 'Philosophy', word2: 'Wisdom' },
      { word1: 'Symphony', word2: 'Harmony' },
      { word1: 'Architecture', word2: 'Design' },
      { word1: 'Innovation', word2: 'Progress' },
      { word1: 'Serenity', word2: 'Peace' },
      { word1: 'Excellence', word2: 'Quality' }
    ]
  };

  const generateWordPairs = useCallback(() => {
    const level = Math.min(gameStats.level, 3) as 1 | 2 | 3;
    const availablePairs = allWordPairs[level];
    const numPairs = Math.min(3 + gameStats.level, availablePairs.length);

    const shuffled = [...availablePairs].sort(() => 0.5 - Math.random());
    const selectedPairs = shuffled.slice(0, numPairs).map((pair, index) => ({
      id: index,
      word1: pair.word1,
      word2: pair.word2
    }));

    setWordPairs(selectedPairs);
    setStudyPairs(selectedPairs);
  }, [gameStats.level]);

  const startStudyPhase = useCallback(() => {
    generateWordPairs();
    setGameStartTime(Date.now());
    setGameStats(prev => ({
      ...prev,
      currentPhase: 'study',
      timeRemaining: 15 + (gameStats.level * 5),
      isGameActive: true
    }));
  }, [generateWordPairs, gameStats.level]);

  const startTestPhase = useCallback(() => {
    if (wordPairs.length === 0) return;

    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    setCurrentTestPair(randomPair);

    // Generate test options
    const correctAnswer = randomPair.word2;
    const wrongAnswers = allWordPairs[Math.min(gameStats.level, 3) as 1 | 2 | 3]
      .filter(pair => pair.word2 !== correctAnswer)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(pair => pair.word2);

    const options = [correctAnswer, ...wrongAnswers].sort(() => 0.5 - Math.random());
    setTestOptions(options);
    setSelectedAnswer('');

    setGameStats(prev => ({
      ...prev,
      currentPhase: 'test',
      timeRemaining: 10,
      isGameActive: true
    }));
  }, [wordPairs, gameStats.level]);

  const endGame = useCallback(async () => {
    // Use functional update to ensure we have the latest state
    setGameStats(prev => {
      if (prev.currentPhase === 'results') return prev;

      const accuracy = prev.totalAttempts > 0 ? Math.round((prev.correctMatches / prev.totalAttempts) * 100) : 0;
      const duration = Math.round((Date.now() - gameStartTime) / 1000);

      // Save game result
      saveResult({
        gameType: 'word-pairs',
        score: prev.score,
        level: prev.level,
        accuracy: accuracy,
        duration: duration,
        details: {
          matches: prev.correctMatches,
          attempts: prev.totalAttempts,
          totalPairs: wordPairs.length
        }
      });

      return {
        ...prev,
        currentPhase: 'results',
        isGameActive: false
      };
    });
  }, [gameStartTime, wordPairs.length, saveResult]);

  const handleAnswerSelect = (answer: string) => {
    if (!currentTestPair) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentTestPair.word2;

    setGameStats(prev => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
      correctMatches: prev.correctMatches + (isCorrect ? 1 : 0),
      score: prev.score + (isCorrect ? 10 * prev.level : 0)
    }));

    setFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect
        ? 'Excellent! Correct match!'
        : `Incorrect. ${currentTestPair.word1} pairs with ${currentTestPair.word2}`
    });

    setTimeout(() => {
      setFeedback({ show: false, correct: false, message: '' });
      if (gameStats.totalAttempts + 1 >= wordPairs.length) {
        // Round complete
        endGame();
      } else {
        startTestPhase();
      }
    }, 2000);
  };

  const nextLevel = () => {
    setGameStats(prev => ({
      ...prev,
      level: prev.level + 1,
      totalAttempts: 0,
      correctMatches: 0
    }));
    startStudyPhase();
  };

  const resetGame = () => {
    setGameStats({
      score: 0,
      level: 1,
      correctMatches: 0,
      totalAttempts: 0,
      timeRemaining: 30,
      isGameActive: false,
      currentPhase: 'study'
    });
    setWordPairs([]);
    setCurrentTestPair(null);
    setSelectedAnswer('');
    setFeedback({ show: false, correct: false, message: '' });
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameStats.isGameActive && gameStats.timeRemaining > 0) {
      interval = setInterval(() => {
        setGameStats(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;

          if (newTimeRemaining <= 0) {
            if (prev.currentPhase === 'study') {
              // Use setTimeout to avoid state update during render
              setTimeout(() => startTestPhase(), 0);
              return prev;
            } else if (prev.currentPhase === 'test') {
              // Use setTimeout to avoid state update during render
              setTimeout(() => handleAnswerSelect(''), 0); // Time's up, wrong answer
              return prev;
            }
          }

          return {
            ...prev,
            timeRemaining: newTimeRemaining
          };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [gameStats.isGameActive, gameStats.timeRemaining, gameStats.currentPhase, startTestPhase]); // Added startTestPhase to dependencies

  const accuracy = gameStats.totalAttempts > 0
    ? Math.round((gameStats.correctMatches / gameStats.totalAttempts) * 100)
    : 0;

  const immersive =
    (gameStats.currentPhase === 'study' && gameStats.isGameActive) ||
    gameStats.currentPhase === 'test';

  return (
    <BrainGameShell
      title="Word Pairs"
      immersive={immersive}
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {immersive && (
            <span className="bt-glass-hud max-w-[220px] text-left text-[11px] leading-snug md:max-w-none md:text-xs">
              Lv {gameStats.level} · {gameStats.score} pts · {gameStats.timeRemaining}s
              {wordPairs.length > 0 ? ` · ${gameStats.totalAttempts}/${wordPairs.length}` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={resetGame}
            className={`bt-reset-btn flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium md:text-sm ${
              immersive ? '' : 'border-black/10 bg-white text-neutral-600 shadow-sm'
            }`}
            aria-label="Reset game"
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            Reset
          </button>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-2">
        {!gameStats.isGameActive && gameStats.currentPhase === 'study' && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
              <h2 className="font-light text-2xl text-neutral-900 md:text-3xl">Word pairs</h2>
              <p className="mt-4 text-sm text-neutral-600">
                Study pairs, then pick the right partner under time pressure.
              </p>
              <AnimatedButton onClick={startStudyPhase} className="mt-8 min-w-[200px]" aria-label="Start word pairs">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'study' && gameStats.isGameActive && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <p className="text-center text-lg font-medium text-neutral-900">Memorize</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {studyPairs.map((pair) => (
                <div
                  key={pair.id}
                  className="rounded-2xl bg-white p-6 text-center shadow-[var(--bt-card-shadow)] ring-2 ring-amber-200/90 animate-pulse"
                  style={{ animationDuration: '2.2s' }}
                >
                  <div className="text-lg font-semibold text-neutral-900">{pair.word1}</div>
                  <div className="text-neutral-300">·</div>
                  <div className="text-lg font-semibold text-neutral-900">{pair.word2}</div>
                </div>
              ))}
            </div>
            <div className="bt-progress-track mt-8">
              <div
                className="bt-progress-fill"
                style={{
                  width: `${(gameStats.timeRemaining / Math.max(1, 15 + gameStats.level * 5)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'test' && gameStats.isGameActive && currentTestPair && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <p className="text-center text-sm text-neutral-500">What goes with this word?</p>
            <div className="mx-auto mt-6 w-full max-w-md rounded-2xl bg-white py-10 text-center shadow-[var(--bt-card-shadow)]">
              <div className="text-3xl font-semibold text-neutral-900">{currentTestPair.word1}</div>
            </div>
            <div className="mx-auto mt-8 grid w-full max-w-lg grid-cols-2 gap-3">
              {testOptions.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAnswerSelect(option)}
                  disabled={selectedAnswer !== ''}
                  className={`bt-option-light min-h-14 text-base disabled:cursor-not-allowed ${
                    selectedAnswer === option
                      ? selectedAnswer === currentTestPair.word2
                        ? 'bt-option-light--correct'
                        : 'bt-option-light--wrong'
                      : ''
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="bt-progress-track mx-auto mt-8 max-w-md">
              <div
                className="bt-progress-fill"
                style={{ width: `${(gameStats.timeRemaining / 10) * 100}%` }}
              />
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Round complete</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-900">
                {gameStats.correctMatches}/{gameStats.totalAttempts} correct
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                {accuracy}% accuracy · {gameStats.score} pts · Lv {gameStats.level}
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
            <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
              <p
                className={`text-base font-medium ${
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

export default WordPairsGame;
