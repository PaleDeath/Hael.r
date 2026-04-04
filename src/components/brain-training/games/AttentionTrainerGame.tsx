import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { RotateCcw } from 'lucide-react';
import { useGameResult } from '../GameResultProvider';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface TargetItem {
  id: number;
  x: number;
  y: number;
  isTarget: boolean;
  shape: 'circle' | 'square' | 'triangle';
  color: string;
  size: number;
  clicked: boolean;
}

interface GameStats {
  score: number;
  level: number;
  targetsFound: number;
  targetsTotal: number;
  incorrectClicks: number;
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'instructions' | 'playing' | 'feedback' | 'results';
}

const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];

const colors = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
];

function minDistanceOK(x: number, y: number, positions: { x: number; y: number }[], minDist: number): boolean {
  return positions.every((p) => Math.hypot(p.x - x, p.y - y) >= minDist);
}

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

const AttentionTrainerGame: React.FC = () => {
  const { saveResult } = useGameResult();
  const saveResultRef = useRef(saveResult);
  saveResultRef.current = saveResult;
  const reduceMotion = usePrefersReducedMotion();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    targetsFound: 0,
    targetsTotal: 0,
    incorrectClicks: 0,
    timeRemaining: 30,
    isGameActive: false,
    currentPhase: 'instructions',
  });

  const [items, setItems] = useState<TargetItem[]>([]);
  const [targetCriteria, setTargetCriteria] = useState<{
    shape?: 'circle' | 'square' | 'triangle';
    color?: string;
    description: string;
  }>({ description: '' });

  const generateItems = useCallback(() => {
    const numItems = 15 + gameStats.level * 5;

    let criteria: { shape?: 'circle' | 'square' | 'triangle'; color?: string; description: string };

    if (gameStats.level <= 2) {
      const targetColor = colors[Math.floor(Math.random() * Math.min(4, colors.length))];
      criteria = {
        color: targetColor.value,
        description: `Find all ${targetColor.name.toLowerCase()} shapes`,
      };
    } else if (gameStats.level <= 4) {
      const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
      criteria = {
        shape: targetShape,
        description: `Find all ${targetShape}s`,
      };
    } else {
      const targetColor = colors[Math.floor(Math.random() * colors.length)];
      const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
      criteria = {
        color: targetColor.value,
        shape: targetShape,
        description: `Find all ${targetColor.name.toLowerCase()} ${targetShape}s`,
      };
    }

    setTargetCriteria(criteria);

    const newItems: TargetItem[] = [];
    const placed: { x: number; y: number }[] = [];
    const minDist = 11 + Math.min(gameStats.level, 4);

    for (let i = 0; i < numItems; i++) {
      let x = 50;
      let y = 45;
      let ok = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        x = 8 + Math.random() * 84;
        y = 14 + Math.random() * 72;
        if (minDistanceOK(x, y, placed, minDist)) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        const col = i % 8;
        const row = Math.floor(i / 8);
        x = 12 + col * 10;
        y = 18 + row * 9;
      }
      placed.push({ x, y });

      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 22 + Math.random() * 16;

      let isTarget = false;
      if (criteria.shape && criteria.color) {
        isTarget = shape === criteria.shape && color.value === criteria.color;
      } else if (criteria.shape) {
        isTarget = shape === criteria.shape;
      } else if (criteria.color) {
        isTarget = color.value === criteria.color;
      }

      newItems.push({
        id: i,
        x,
        y,
        isTarget,
        shape,
        color: color.value,
        size,
        clicked: false,
      });
    }

    const actualTargets = newItems.filter((item) => item.isTarget).length;
    if (actualTargets < 2) {
      const nonTargets = newItems.filter((item) => !item.isTarget);
      for (let i = 0; i < Math.min(2 - actualTargets, nonTargets.length); i++) {
        const item = nonTargets[i];
        if (criteria.shape) item.shape = criteria.shape;
        if (criteria.color) item.color = criteria.color;
        item.isTarget = true;
      }
    }

    setItems(newItems);
    setGameStats((prev) => ({
      ...prev,
      targetsTotal: newItems.filter((item) => item.isTarget).length,
      targetsFound: 0,
    }));
  }, [gameStats.level]);

  const startGame = useCallback(() => {
    generateItems();
    setGameStats((prev) => ({
      ...prev,
      currentPhase: 'playing',
      isGameActive: true,
      timeRemaining: 30 + prev.level * 5,
      incorrectClicks: 0,
    }));
  }, [generateItems]);

  const handleItemClick = (item: TargetItem) => {
    if (item.clicked || gameStats.currentPhase !== 'playing') return;

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, clicked: true } : i)));

    if (item.isTarget) {
      setGameStats((prev) => {
        const timeTotal = 30 + prev.level * 5;
        const basePoints = 20 * prev.level;
        const timeBonus = Math.floor((prev.timeRemaining / timeTotal) * 10);
        const totalPoints = basePoints + timeBonus;
        const nextFound = prev.targetsFound + 1;
        if (nextFound >= prev.targetsTotal) {
          return {
            ...prev,
            score: prev.score + totalPoints,
            targetsFound: nextFound,
            currentPhase: 'feedback',
            isGameActive: false,
          };
        }
        return {
          ...prev,
          score: prev.score + totalPoints,
          targetsFound: nextFound,
        };
      });
    } else {
      setGameStats((prev) => ({
        ...prev,
        incorrectClicks: prev.incorrectClicks + 1,
        score: Math.max(0, prev.score - 5),
      }));
    }
  };

  const nextLevel = () => {
    setGameStats((prev) => ({
      ...prev,
      level: prev.level + 1,
      currentPhase: 'instructions',
    }));
  };

  const resetGame = () => {
    setGameStats({
      score: 0,
      level: 1,
      targetsFound: 0,
      targetsTotal: 0,
      incorrectClicks: 0,
      timeRemaining: 30,
      isGameActive: false,
      currentPhase: 'instructions',
    });
    setItems([]);
    setTargetCriteria({ description: '' });
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (gameStats.isGameActive && gameStats.timeRemaining > 0) {
      interval = setInterval(() => {
        setGameStats((prev) => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
    } else if (gameStats.timeRemaining === 0 && gameStats.isGameActive) {
      setGameStats((prev) => ({
        ...prev,
        currentPhase: 'results',
        isGameActive: false,
      }));

      const accuracy =
        gameStats.targetsFound + gameStats.incorrectClicks > 0
          ? Math.round(
              (gameStats.targetsFound / (gameStats.targetsFound + gameStats.incorrectClicks)) * 100
            )
          : 0;

      void saveResultRef.current({
        gameType: 'attention-trainer',
        score: gameStats.score,
        accuracy,
        level: gameStats.level,
        details: {
          targetsFound: gameStats.targetsFound,
          targetsTotal: gameStats.targetsTotal,
        },
        duration: 30 + gameStats.level * 5 - gameStats.timeRemaining,
      });
    }

    return () => clearInterval(interval);
  }, [
    gameStats.isGameActive,
    gameStats.timeRemaining,
    gameStats.score,
    gameStats.level,
    gameStats.targetsFound,
    gameStats.targetsTotal,
    gameStats.incorrectClicks,
  ]);

  const accuracy =
    gameStats.targetsFound + gameStats.incorrectClicks > 0
      ? Math.round((gameStats.targetsFound / (gameStats.targetsFound + gameStats.incorrectClicks)) * 100)
      : 0;

  const timeTotal = 30 + gameStats.level * 5;
  const timeFrac = gameStats.currentPhase === 'playing' ? gameStats.timeRemaining / timeTotal : 0;

  const renderShape = (item: TargetItem) => {
    const shadow = '0 3px 10px rgba(0,0,0,0.14)';
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${item.x}%`,
      top: `${item.y}%`,
      width: `${item.size}px`,
      height: `${item.size}px`,
      cursor: item.clicked ? 'default' : 'pointer',
      opacity: item.clicked ? (item.isTarget ? 0.65 : 0.28) : 1,
      transform: item.clicked ? 'scale(0.88)' : 'scale(1)',
      transition: reduceMotion ? undefined : 'opacity 0.2s ease, transform 0.2s ease',
      boxShadow: item.clicked ? undefined : shadow,
      border:
        item.clicked && item.isTarget
          ? `2px solid var(--bt-correct)`
          : item.clicked && !item.isTarget
            ? `2px solid var(--bt-wrong)`
            : undefined,
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      gsap.to(e.currentTarget, { scale: 0.95, duration: 0.1, ease: 'power2.out' });
    };
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' });
    };

    const onClick = () => handleItemClick(item);

    switch (item.shape) {
      case 'circle':
        return (
          <div
            key={item.id}
            role="presentation"
            style={{ ...baseStyle, borderRadius: '50%', backgroundColor: item.color }}
            onClick={onClick}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        );
      case 'square':
        return (
          <div
            key={item.id}
            role="presentation"
            style={{ ...baseStyle, backgroundColor: item.color }}
            onClick={onClick}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        );
      case 'triangle':
        return (
          <div
            key={item.id}
            role="presentation"
            style={{
              ...baseStyle,
              backgroundColor: 'transparent',
              width: 0,
              height: 0,
              borderLeft: `${item.size / 2}px solid transparent`,
              borderRight: `${item.size / 2}px solid transparent`,
              borderBottom: `${item.size}px solid ${item.color}`,
              boxShadow: 'none',
              filter: item.clicked ? undefined : 'drop-shadow(0 3px 6px rgba(0,0,0,0.18))',
            }}
            onClick={onClick}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        );
      default:
        return null;
    }
  };

  const immersive = gameStats.currentPhase === 'playing';

  return (
    <BrainGameShell
      title="Attention Trainer"
      immersive={immersive}
      onErrorReset={resetGame}
      topAccessory={
        gameStats.currentPhase === 'playing' ? (
          <span className="bt-glass-hud max-w-[85vw] text-left text-xs md:text-sm">
            {gameStats.targetsFound}/{gameStats.targetsTotal} · {gameStats.timeRemaining}s
          </span>
        ) : (
          <button
            type="button"
            onClick={resetGame}
            className="bt-reset-btn flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm md:text-sm"
            aria-label="Reset game"
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            Reset
          </button>
        )
      }
    >
      {gameStats.currentPhase === 'instructions' && (
        <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-8 px-2 text-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-light tracking-wide text-neutral-900 md:text-4xl">
              Focus your attention
            </h2>
            <p className="text-sm text-neutral-600 md:text-base">
              Tap only shapes that fit the rule. Ignore everything else. One short round at a time.
            </p>
            <p className="text-xs text-neutral-500">Level {gameStats.level}</p>
          </div>
          <AnimatedButton onClick={startGame} aria-label="Start attention training" className="min-w-[200px]">
            Start
          </AnimatedButton>
        </div>
      )}

      {gameStats.currentPhase === 'playing' && (
        <div className="relative h-full min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-[#F5F5F0] to-[#EEEDE8]">
          <div
            className="absolute left-0 right-0 top-0 z-10 h-1 bg-gray-200/90"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(timeFrac * 100)}
          >
            <div
              className="h-full origin-left bg-neutral-800/70 transition-[width] duration-1000 ease-linear"
              style={{ width: `${timeFrac * 100}%` }}
            />
          </div>
          <p className="absolute left-1/2 top-[max(0.85rem,env(safe-area-inset-top))] z-10 -translate-x-1/2 px-4 text-center text-xs font-medium text-neutral-600 md:text-sm">
            {targetCriteria.description}
          </p>
          <div className="absolute inset-0 pt-14">{items.map((item) => renderShape(item))}</div>
        </div>
      )}

      {gameStats.currentPhase === 'feedback' && (
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
          <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Level clear</p>
            <p className="mt-3 text-2xl font-semibold text-neutral-900">
              {gameStats.targetsFound}/{gameStats.targetsTotal} found
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Accuracy {accuracy}% · Errors {gameStats.incorrectClicks} · Score {gameStats.score}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <AnimatedButton onClick={nextLevel} aria-label="Next level">
                Next level
              </AnimatedButton>
              <AnimatedButton variant="ghost" onClick={resetGame} aria-label="Reset game">
                Reset
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      {gameStats.currentPhase === 'results' && (
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
          <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Time&apos;s up</p>
            <p className="mt-3 text-2xl font-semibold text-neutral-900">
              {gameStats.targetsFound}/{gameStats.targetsTotal} found
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Accuracy {accuracy}% · Score {gameStats.score}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <AnimatedButton
                onClick={() => setGameStats((prev) => ({ ...prev, currentPhase: 'instructions' }))}
                aria-label="Try again"
              >
                Try again
              </AnimatedButton>
              <AnimatedButton variant="ghost" onClick={resetGame} aria-label="Reset game">
                Reset
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
    </BrainGameShell>
  );
};

export default AttentionTrainerGame;
