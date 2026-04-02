import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameResult } from '../GameResultProvider';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface SequenceItem {
  id: number;
  color: string;
  bgColor: string;
  active: boolean;
}

interface GameStats {
  score: number;
  level: number;
  currentSequenceLength: number;
  correctSequences: number;
  totalAttempts: number;
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'instructions' | 'show' | 'input' | 'feedback' | 'results';
  mistakes: number;
}

const SequenceRecallGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    currentSequenceLength: 3,
    correctSequences: 0,
    totalAttempts: 0,
    timeRemaining: 0,
    isGameActive: false,
    currentPhase: 'instructions',
    mistakes: 0
  });

  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [currentShowIndex, setCurrentShowIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  });

  const colors: SequenceItem[] = [
    { id: 0, color: 'Blue', bgColor: 'bg-blue-500', active: false },
    { id: 1, color: 'Red', bgColor: 'bg-red-500', active: false },
    { id: 2, color: 'Green', bgColor: 'bg-emerald-500', active: false },
    { id: 3, color: 'Yellow', bgColor: 'bg-amber-400', active: false },
    { id: 4, color: 'Purple', bgColor: 'bg-purple-500', active: false },
    { id: 5, color: 'Orange', bgColor: 'bg-orange-500', active: false },
    { id: 6, color: 'Pink', bgColor: 'bg-pink-500', active: false },
    { id: 7, color: 'Indigo', bgColor: 'bg-indigo-500', active: false },
  ];

  const generateSequence = useCallback(() => {
    const length = gameStats.currentSequenceLength;
    const maxColorIndex = Math.min(4 + gameStats.level, colors.length);
    const newSequence: number[] = [];

    for (let i = 0; i < length; i++) {
      newSequence.push(Math.floor(Math.random() * maxColorIndex));
    }

    setSequence(newSequence);
    setUserSequence([]);
  }, [gameStats.currentSequenceLength, gameStats.level]);

  const startGame = useCallback(() => {
    generateSequence();
    setGameStats(prev => ({
      ...prev,
      currentPhase: 'show',
      isGameActive: true,
      timeRemaining: 0
    }));
    setCurrentShowIndex(0);
  }, [generateSequence]);

  const showSequence = useCallback(() => {
    if (currentShowIndex < sequence.length) {
      // Show current item
      setTimeout(() => {
        setCurrentShowIndex(prev => prev + 1);
      }, 600); // Show each item for 600ms
    } else {
      // Sequence shown, start input phase
      setGameStats(prev => ({
        ...prev,
        currentPhase: 'input',
        timeRemaining: 10 + gameStats.level * 2
      }));
    }
  }, [currentShowIndex, sequence.length, gameStats.level]);

  const handleColorClick = (colorId: number) => {
    if (gameStats.currentPhase !== 'input') return;

    const newUserSequence = [...userSequence, colorId];
    setUserSequence(newUserSequence);

    // Check if sequence is complete
    if (newUserSequence.length === sequence.length) {
      checkSequence(newUserSequence);
    }
  };

  const checkSequence = (userSeq: number[]) => {
    const isCorrect = userSeq.every((color, index) => color === sequence[index]);

    setGameStats(prev => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
      correctSequences: prev.correctSequences + (isCorrect ? 1 : 0),
      score: prev.score + (isCorrect ? prev.currentSequenceLength * 10 * prev.level : 0),
      currentPhase: 'feedback',
      isGameActive: false,
      mistakes: prev.mistakes + (isCorrect ? 0 : 1)
    }));

    setFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect
        ? `Perfect! You remembered the ${sequence.length}-item sequence!`
        : `Not quite right. The correct sequence was: ${sequence.map(i => colors[i].color).join(', ')}`
    });
  };

  const nextRound = () => {
    if (gameStats.mistakes >= 3) {
      endGame();
      return;
    }

    const newLength = gameStats.correctSequences % 3 === 2 && gameStats.correctSequences > 0
      ? gameStats.currentSequenceLength + 1
      : gameStats.currentSequenceLength;

    const newLevel = Math.floor(gameStats.correctSequences / 3) + 1;

    setGameStats(prev => ({
      ...prev,
      currentSequenceLength: newLength,
      level: newLevel,
      currentPhase: 'instructions'
    }));

    setFeedback({ show: false, correct: false, message: '' });
    setCurrentShowIndex(0);
  };

  const endGame = () => {
    setGameStats(prev => ({ ...prev, currentPhase: 'results' }));
    setFeedback({ show: false, correct: false, message: '' });

    const accuracy = gameStats.totalAttempts > 0
      ? Math.round((gameStats.correctSequences / gameStats.totalAttempts) * 100)
      : 0;

    saveResult({
      gameType: 'sequence-recall',
      score: gameStats.score,
      accuracy: accuracy,
      level: gameStats.level,
      details: {
        correctSequences: gameStats.correctSequences,
        totalAttempts: gameStats.totalAttempts,
        maxSequenceLength: gameStats.currentSequenceLength
      },
      duration: 0
    });
  };

  const resetGame = () => {
    setGameStats({
      score: 0,
      level: 1,
      currentSequenceLength: 3,
      correctSequences: 0,
      totalAttempts: 0,
      timeRemaining: 0,
      isGameActive: false,
      currentPhase: 'instructions',
      mistakes: 0
    });
    setSequence([]);
    setUserSequence([]);
    setCurrentShowIndex(0);
    setFeedback({ show: false, correct: false, message: '' });
  };

  // Show sequence effect
  useEffect(() => {
    if (gameStats.currentPhase === 'show') {
      showSequence();
    }
  }, [gameStats.currentPhase, showSequence]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameStats.currentPhase === 'input' && gameStats.timeRemaining > 0) {
      interval = setInterval(() => {
        setGameStats(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
    } else if (gameStats.timeRemaining === 0 && gameStats.currentPhase === 'input') {
      checkSequence(userSequence);
    }

    return () => clearInterval(interval);
  }, [gameStats.currentPhase, gameStats.timeRemaining, userSequence]);

  const accuracy = gameStats.totalAttempts > 0
    ? Math.round((gameStats.correctSequences / gameStats.totalAttempts) * 100)
    : 0;

  const immersive =
    gameStats.currentPhase === 'show' ||
    gameStats.currentPhase === 'input' ||
    gameStats.currentPhase === 'feedback';

  return (
    <BrainGameShell
      title="Sequence Recall"
      immersive={immersive}
      theme="dark"
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {immersive && (
            <span className="bt-glass-hud max-w-[min(72vw,320px)] text-left text-[11px] leading-snug md:text-xs">
              {gameStats.score} pts · Lv {gameStats.level} · {gameStats.currentSequenceLength} steps
              {gameStats.currentPhase === 'input' ? ` · ${gameStats.timeRemaining}s` : ''} · {gameStats.mistakes}/3
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
        {gameStats.currentPhase === 'instructions' && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
              <h2 className="font-light text-2xl text-neutral-900 md:text-3xl">Sequence recall</h2>
              <p className="mt-4 text-sm text-neutral-600">
                Watch the flashes, then tap the same order. Three mistakes end the run.
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                Level {gameStats.level} · {gameStats.currentSequenceLength} items ·{' '}
                {Math.min(4 + gameStats.level, colors.length)} colors
              </p>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start sequence recall">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'show' && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
            <p className="text-base font-medium text-white">Watch the pattern</p>
            <p className="mt-1 text-xs text-white/45">
              {currentShowIndex} / {sequence.length}
            </p>
            <div className="mt-10 flex max-w-lg flex-wrap items-center justify-center gap-4">
              {colors.slice(0, Math.min(4 + gameStats.level, colors.length)).map((color) => (
                <div
                  key={color.id}
                  className={`h-24 w-24 shrink-0 rounded-2xl transition-all duration-300 md:h-28 md:w-28 ${
                    currentShowIndex > 0 && sequence[currentShowIndex - 1] === color.id
                      ? `${color.bgColor} scale-110 shadow-[0_0_28px_rgba(255,255,255,0.25)] ring-2 ring-white/40`
                      : `${color.bgColor} opacity-25`
                  }`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'input' && (
          <div className="flex flex-1 flex-col justify-center px-4 py-6">
            <p className="text-center text-base font-medium text-white">Repeat the sequence</p>
            <div className="mt-4 px-2">
              <div className="bt-progress-track mx-auto max-w-md">
                <div
                  className="bt-progress-fill"
                  style={{
                    width: `${(gameStats.timeRemaining / Math.max(1, 10 + gameStats.level * 2)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <p className="mt-3 text-center text-sm tabular-nums text-white/55">
              {userSequence.length} / {sequence.length}
            </p>
            <div className="mt-5 flex min-h-10 flex-wrap items-center justify-center gap-2">
              {userSequence.map((colorId, index) => (
                <div key={index} className={`h-8 w-8 rounded-full shadow-md ${colors[colorId].bgColor}`} />
              ))}
              {Array.from({ length: sequence.length - userSequence.length }).map((_, index) => (
                <div
                  key={`e-${index}`}
                  className="h-8 w-8 rounded-full border border-dashed border-white/20 bg-white/5"
                />
              ))}
            </div>
            <div className="mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-4">
              {colors.slice(0, Math.min(4 + gameStats.level, colors.length)).map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => handleColorClick(color.id)}
                  aria-label={color.color}
                  className={`h-24 w-24 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95 md:h-28 md:w-28 ${color.bgColor} ring-2 ring-white/15 hover:ring-white/35`}
                />
              ))}
            </div>
          </div>
        )}

        {feedback.show && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
            <div className="bt-glass-dark max-w-md p-8 text-center">
              <p
                className={`text-sm font-medium ${
                  feedback.correct ? 'text-[var(--bt-correct)]' : 'text-[var(--bt-wrong)]'
                }`}
              >
                {feedback.message}
              </p>
              <p className="mt-4 text-xs text-white/55">
                +{feedback.correct ? gameStats.currentSequenceLength * 10 * gameStats.level : 0} this round · total{' '}
                {gameStats.score}
                {!feedback.correct && ` · mistakes ${gameStats.mistakes}/3`}
              </p>
              <AnimatedButton onClick={nextRound} className="mt-6" aria-label="Continue">
                {gameStats.mistakes >= 3 ? 'See results' : 'Continue'}
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Run over</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-neutral-900">{gameStats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                {accuracy}% · max length {gameStats.currentSequenceLength}
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

export default SequenceRecallGame;
