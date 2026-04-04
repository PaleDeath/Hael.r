import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useGameResult } from '../GameResultProvider';
import { useTrackedTimers } from '../useTrackedTimers';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface TaskState {
  primaryTask: {
    type: 'math' | 'visual' | 'memory';
    question: string;
    options: string[];
    correctAnswer: string;
    timeLimit: number;
  };
  secondaryTask: {
    type: 'tracking' | 'counting' | 'monitoring';
    active: boolean;
    targets: number;
    currentCount: number;
    direction: 'left' | 'right' | 'up' | 'down';
  };
}

interface GameStats {
  score: number;
  level: number;
  primaryTaskCorrect: number;
  secondaryTaskCorrect: number;
  totalTasks: number;
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'instructions' | 'playing' | 'results';
}

const DualTaskGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    primaryTaskCorrect: 0,
    secondaryTaskCorrect: 0,
    totalTasks: 0,
    timeRemaining: 60,
    isGameActive: false,
    currentPhase: 'instructions'
  });

  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [secondaryCounter, setSecondaryCounter] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; message: string; correct: boolean }>({
    show: false,
    message: '',
    correct: false
  });
  const hasSavedResultsRef = useRef(false);
  const saveResultRef = useRef(saveResult);
  saveResultRef.current = saveResult;
  const { clearAll, trackTimeout, trackInterval, untrack } = useTrackedTimers();

  const generatePrimaryTask = useCallback(() => {
    const taskTypes = ['math', 'visual', 'memory'];
    const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)] as 'math' | 'visual' | 'memory';

    let question = '';
    let options: string[] = [];
    let correctAnswer = '';
    let timeLimit = 8;

    switch (taskType) {
      case 'math': {
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 20) + 1;
        const operation = Math.random() < 0.5 ? '+' : '-';
        const result = operation === '+' ? num1 + num2 : num1 - num2;

        question = `${num1} ${operation} ${num2} = ?`;
        correctAnswer = result.toString();

        // Generate wrong options
        const wrongOptions = [
          (result + Math.floor(Math.random() * 5) + 1).toString(),
          (result - Math.floor(Math.random() * 5) - 1).toString(),
          (result + Math.floor(Math.random() * 10) + 5).toString()
        ];

        options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());
        break;
      }

      case 'visual': {
        const shapes = ['🔵', '🔴', '🟢', '🟡', '🟣', '🟠'];
        const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
        const shapeCount = Math.floor(Math.random() * 5) + 3;

        question = `How many ${targetShape} are there?`;
        correctAnswer = shapeCount.toString();

        // Generate visual pattern
        const pattern = [];
        for (let i = 0; i < shapeCount; i++) {
          pattern.push(targetShape);
        }
        // Add random shapes (always exact distractor count; re-roll if same as target)
        for (let i = 0; i < Math.floor(Math.random() * 8) + 2; i++) {
          let randomShape: string;
          do {
            randomShape = shapes[Math.floor(Math.random() * shapes.length)];
          } while (randomShape === targetShape);
          pattern.push(randomShape);
        }

        question = `Count ${targetShape}: ${pattern.sort(() => 0.5 - Math.random()).join(' ')}`;

        options = [
          correctAnswer,
          (shapeCount + 1).toString(),
          (shapeCount - 1).toString(),
          (shapeCount + 2).toString()
        ].sort(() => 0.5 - Math.random());
        break;
      }

      case 'memory': {
        const words = ['cat', 'dog', 'bird', 'fish', 'lion', 'bear', 'wolf', 'deer'];
        const sequenceLength = Math.min(3 + Math.floor(gameStats.level / 2), 6);
        const shuffled = [...words];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const wordSequence = shuffled.slice(0, sequenceLength);

        question = `Remember: ${wordSequence.join(', ')}. Which was first?`;
        correctAnswer = wordSequence[0];

        const wrongWords: string[] = [];
        for (const w of shuffled.slice(sequenceLength)) {
          if (wrongWords.length >= 3) break;
          if (w !== correctAnswer) wrongWords.push(w);
        }
        while (wrongWords.length < 3) {
          const w = words[Math.floor(Math.random() * words.length)];
          if (w !== correctAnswer && !wrongWords.includes(w)) wrongWords.push(w);
        }

        options = [correctAnswer, ...wrongWords.slice(0, 3)].sort(() => 0.5 - Math.random());
        timeLimit = 12;
        break;
      }
    }

    return {
      type: taskType,
      question,
      options,
      correctAnswer,
      timeLimit
    };
  }, [gameStats.level]);

  const generateSecondaryTask = useCallback(() => {
    const taskTypes = ['tracking', 'counting', 'monitoring'];
    const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)] as 'tracking' | 'counting' | 'monitoring';

    const directions = ['left', 'right', 'up', 'down'];
    const direction = directions[Math.floor(Math.random() * directions.length)] as 'left' | 'right' | 'up' | 'down';

    return {
      type: taskType,
      active: true,
      targets: Math.floor(Math.random() * 5) + 3,
      currentCount: 0,
      direction
    };
  }, []);

  const generateNewTasks = useCallback(() => {
    const primaryTask = generatePrimaryTask();
    const secondaryTask = generateSecondaryTask();

    setTaskState({
      primaryTask,
      secondaryTask
    });

    setSecondaryCounter(0);
  }, [generatePrimaryTask, generateSecondaryTask]);

  const startGame = useCallback(() => {
    clearAll();
    hasSavedResultsRef.current = false;
    generateNewTasks();
    setGameStats(prev => ({
      ...prev,
      currentPhase: 'playing',
      isGameActive: true,
      timeRemaining: 60 + (prev.level * 10),
      totalTasks: 0,
      primaryTaskCorrect: 0,
      secondaryTaskCorrect: 0
    }));
  }, [generateNewTasks, clearAll]);

  const handlePrimaryTaskAnswer = (answer: string) => {
    if (!taskState) return;

    const isCorrect = answer === taskState.primaryTask.correctAnswer;
    const primaryScore = isCorrect ? 20 * gameStats.level : 0;

    setGameStats(prev => ({
      ...prev,
      primaryTaskCorrect: prev.primaryTaskCorrect + (isCorrect ? 1 : 0),
      totalTasks: prev.totalTasks + 1,
      score: prev.score + primaryScore
    }));

    setFeedback({
      show: true,
      message: isCorrect ? 'Primary task correct!' : `Primary task incorrect. Answer was ${taskState.primaryTask.correctAnswer}`,
      correct: isCorrect
    });

    trackTimeout(() => {
      setFeedback({ show: false, message: '', correct: false });
      generateNewTasks();
    }, 1500);
  };

  const handleSecondaryTaskClick = () => {
    if (!taskState || !taskState.secondaryTask.active) return;

    const newCount = secondaryCounter + 1;
    setSecondaryCounter(newCount);

    if (newCount >= taskState.secondaryTask.targets) {
      // Secondary task completed
      const secondaryScore = 10 * gameStats.level;

      setGameStats(prev => ({
        ...prev,
        secondaryTaskCorrect: prev.secondaryTaskCorrect + 1,
        score: prev.score + secondaryScore
      }));

      // Reset secondary task
      setTaskState(prev => prev ? {
        ...prev,
        secondaryTask: {
          ...generateSecondaryTask(),
          active: true
        }
      } : null);
      setSecondaryCounter(0);
    }
  };

  const resetGame = () => {
    clearAll();
    hasSavedResultsRef.current = false;
    setGameStats({
      score: 0,
      level: 1,
      primaryTaskCorrect: 0,
      secondaryTaskCorrect: 0,
      totalTasks: 0,
      timeRemaining: 60,
      isGameActive: false,
      currentPhase: 'instructions'
    });
    setTaskState(null);
    setSecondaryCounter(0);
    setFeedback({ show: false, message: '', correct: false });
  };

  const nextLevel = () => {
    setGameStats(prev => ({
      ...prev,
      level: prev.level + 1,
      currentPhase: 'instructions',
      primaryTaskCorrect: 0,
      secondaryTaskCorrect: 0,
      totalTasks: 0
    }));
  };

  useEffect(() => {
    if (gameStats.isGameActive && gameStats.timeRemaining > 0) {
      const id = trackInterval(() => {
        setGameStats(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
      return () => untrack(id);
    }
    if (gameStats.timeRemaining === 0 && gameStats.isGameActive) {
      setGameStats(prev => ({
        ...prev,
        currentPhase: 'results',
        isGameActive: false
      }));
    }
  }, [gameStats.isGameActive, gameStats.timeRemaining, trackInterval, untrack]);

  useEffect(() => {
    if (gameStats.currentPhase !== 'results' || hasSavedResultsRef.current) return;

    hasSavedResultsRef.current = true;
    const primaryAccuracy = gameStats.totalTasks > 0
      ? Math.round((gameStats.primaryTaskCorrect / gameStats.totalTasks) * 100)
      : 0;

    saveResultRef.current({
      gameType: 'dual-task',
      score: gameStats.score,
      accuracy: primaryAccuracy,
      level: gameStats.level,
      details: {
        primaryTaskCorrect: gameStats.primaryTaskCorrect,
        secondaryTaskCorrect: gameStats.secondaryTaskCorrect,
        totalTasks: gameStats.totalTasks
      },
      duration: (60 + gameStats.level * 10) - gameStats.timeRemaining
    });
  }, [gameStats]);

  const primaryAccuracy = gameStats.totalTasks > 0
    ? Math.round((gameStats.primaryTaskCorrect / gameStats.totalTasks) * 100)
    : 0;

  const secondaryAccuracy = gameStats.totalTasks > 0
    ? Math.round((gameStats.secondaryTaskCorrect / gameStats.totalTasks) * 100)
    : 0;

  return (
    <BrainGameShell
      title="Dual Task Challenge"
      immersive={gameStats.currentPhase === 'playing'}
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {gameStats.currentPhase === 'playing' && (
            <span className="bt-glass-hud max-w-[min(72vw,340px)] text-left text-[11px] leading-snug md:text-xs">
              {gameStats.score} pts · {gameStats.timeRemaining}s · Lv {gameStats.level} · {primaryAccuracy}% /{' '}
              {secondaryAccuracy}%
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
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[var(--bt-card-shadow)]">
            <div className="bt-panel-warm border-b border-black/8 px-4 py-3">
              <h3 className="text-lg font-semibold text-neutral-900">Primary</h3>
              <p className="text-sm text-neutral-600">Solve each prompt</p>
            </div>

            <div className="p-6">
              {gameStats.currentPhase === 'instructions' && (
                <div className="text-center">
                  <h4 className="text-xl font-semibold text-neutral-900">Dual task</h4>
                  <p className="mt-3 text-sm text-neutral-600">
                    Work the primary problems on the left while monitoring the counter on the right.
                  </p>
                  <div className="bt-panel-warm mt-5 rounded-xl border border-black/10 p-4 text-left text-sm text-neutral-700">
                    <p className="font-medium text-neutral-900">Level {gameStats.level}</p>
                    <p className="mt-1">
                      {gameStats.level <= 2 && 'Basic load.'}
                      {gameStats.level > 2 && gameStats.level <= 4 && 'More moving parts.'}
                      {gameStats.level > 4 && 'Heavier multitasking.'}
                    </p>
                  </div>
                  <AnimatedButton onClick={startGame} className="mt-6 min-w-[200px]" aria-label="Start">
                    Start
                  </AnimatedButton>
                </div>
              )}

              {gameStats.currentPhase === 'playing' && taskState && (
                <div>
                  <p className="mb-5 text-center text-xl font-semibold text-neutral-900 md:text-2xl">
                    {taskState.primaryTask.question}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {taskState.primaryTask.options.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handlePrimaryTaskAnswer(option)}
                        className="bt-option-light min-h-[52px] p-3 text-left text-sm"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-[11px] text-neutral-500">
                    Tasks {gameStats.totalTasks} · primary {primaryAccuracy}%
                  </p>
                </div>
              )}

              {gameStats.currentPhase === 'results' && (
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Primary</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {gameStats.primaryTaskCorrect}/{gameStats.totalTasks} ({primaryAccuracy}%)
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    Secondary runs: {gameStats.secondaryTaskCorrect}
                  </p>
                  <p className="mt-4 text-2xl font-semibold tabular-nums text-neutral-900">{gameStats.score}</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <AnimatedButton onClick={nextLevel} aria-label="Next level">
                      Next level
                    </AnimatedButton>
                    <AnimatedButton variant="ghost" onClick={resetGame} aria-label="Again">
                      Again
                    </AnimatedButton>
                    <AnimatedButton variant="ghost" onClick={() => navigate('/brain-training')} aria-label="Hub">
                      Hub
                    </AnimatedButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[var(--bt-card-shadow)]">
            <div className="bt-panel-warm border-b border-black/8 px-4 py-3">
              <h3 className="text-lg font-semibold text-neutral-900">Secondary</h3>
              <p className="text-sm text-neutral-600">Tap up to the target count</p>
            </div>

            <div className="p-6">
              {gameStats.currentPhase === 'instructions' && (
                <div className="text-center">
                  <p className="text-4xl text-neutral-400" aria-hidden>
                    ◎
                  </p>
                  <h4 className="mt-3 text-lg font-semibold text-neutral-900">Monitor</h4>
                  <p className="mt-3 text-sm text-neutral-600">
                    When the tally hits the target, tap the big button. Keep working the left panel in parallel.
                  </p>
                </div>
              )}

              {gameStats.currentPhase === 'playing' && taskState && (
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-600">
                    Reach {taskState.secondaryTask.targets} taps
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-neutral-900">
                    {secondaryCounter} / {taskState.secondaryTask.targets}
                  </p>
                  <div className="bt-progress-track mx-auto mt-4 max-w-xs">
                    <div
                      className="bt-progress-fill"
                      style={{
                        width: `${(secondaryCounter / taskState.secondaryTask.targets) * 100}%`,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSecondaryTaskClick}
                    className="mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#1a1a1a] text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-neutral-800 active:scale-95"
                  >
                    Tap
                  </button>
                  <p className="mt-6 text-[11px] text-neutral-500">Completed {gameStats.secondaryTaskCorrect}</p>
                </div>
              )}

              {gameStats.currentPhase === 'results' && (
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Blend</p>
                  <p className="mt-3 text-2xl font-semibold text-neutral-900">
                    {Math.round((primaryAccuracy + secondaryAccuracy) / 2)}%
                  </p>
                  <p className="mt-2 text-sm text-neutral-600">
                    {Math.round((primaryAccuracy + secondaryAccuracy) / 2) >= 80 && 'Strong split attention.'}
                    {Math.round((primaryAccuracy + secondaryAccuracy) / 2) >= 60 &&
                      Math.round((primaryAccuracy + secondaryAccuracy) / 2) < 80 &&
                      'Balanced load.'}
                    {Math.round((primaryAccuracy + secondaryAccuracy) / 2) < 60 && 'Keep stacking reps.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

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

export default DualTaskGame;
