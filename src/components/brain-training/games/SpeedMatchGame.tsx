import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGameResult } from '../GameResultProvider';
import { useTrackedTimers } from '../useTrackedTimers';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface Symbol {
  id: number;
  shape: string;
  color: string;
  symbol: string;
}

interface GameStats {
  score: number;
  matches: number;
  misses: number;
  streak: number;
  level: number;
  timeBonus: number;
}

const SpeedMatchGame: React.FC = () => {
  const navigate = useNavigate();
  const gameRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { saveResult } = useGameResult();

  const [gameState, setGameState] = useState<'menu' | 'countdown' | 'playing' | 'results'>('menu');
  const [targetSymbol, setTargetSymbol] = useState<Symbol | null>(null);
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    matches: 0,
    misses: 0,
    streak: 0,
    level: 1,
    timeBonus: 0
  });
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const hasSavedResultsRef = useRef(false);
  const saveResultRef = useRef(saveResult);
  saveResultRef.current = saveResult;
  const { clearAll, trackTimeout, trackInterval, untrack } = useTrackedTimers();

  const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'heart'];
  const colors = ['#c97878', '#5aa8a0', '#5f8eb0', '#8fb89e', '#d4c48a', '#b898c4'];
  const symbolEmojis = ['🔥', '⭐', '💎', '🌟', '⚡', '🎯', '🚀', '💫', '🔮', '🎪'];

  const generateSymbol = useCallback((id: number): Symbol => {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const symbol = symbolEmojis[Math.floor(Math.random() * symbolEmojis.length)];

    return { id, shape, color, symbol };
  }, []);

  const generateGrid = useCallback(() => {
    const gridSize = Math.min(12, 6 + Math.floor(stats.level / 2)); // Increase difficulty with level
    const newSymbols: Symbol[] = [];

    // Generate target symbol
    const target = generateSymbol(0);
    setTargetSymbol(target);

    // Place target in random positions (1-3 matches based on level)
    const numMatches = Math.min(3, Math.floor(stats.level / 3) + 1);
    const matchPositions = new Set<number>();

    while (matchPositions.size < numMatches) {
      matchPositions.add(Math.floor(Math.random() * gridSize));
    }

    // Generate grid
    for (let i = 0; i < gridSize; i++) {
      if (matchPositions.has(i)) {
        newSymbols.push({ ...target, id: i });
      } else {
        let nonMatch: Symbol;
        do {
          nonMatch = generateSymbol(i);
        } while (nonMatch.symbol === target.symbol);
        newSymbols.push({ ...nonMatch, id: i });
      }
    }

    setSymbols(newSymbols);
  }, [generateSymbol, stats.level]);

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
          generateGrid();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSymbolClick = (clickedSymbol: Symbol) => {
    if (!targetSymbol || gameState !== 'playing') return;

    const isMatch = clickedSymbol.symbol === targetSymbol.symbol;

    if (isMatch) {
      const basePoints = 10 * stats.level;
      const streakBonus = stats.streak * 5;
      const timeBonus = Math.max(0, Math.floor((timeLeft / 60) * 20));
      const totalPoints = basePoints + streakBonus + timeBonus;

      setStats(prev => ({
        ...prev,
        score: prev.score + totalPoints,
        matches: prev.matches + 1,
        streak: prev.streak + 1,
        timeBonus: prev.timeBonus + timeBonus,
        level: Math.floor((prev.matches + 1) / 10) + 1
      }));

      setFeedback('correct');

      // Animate correct feedback
      if (gridRef.current) {
        const clickedElement = gridRef.current.children[clickedSymbol.id] as HTMLElement;
        if (clickedElement) {
          gsap.to(clickedElement, {
            scale: 1.2,
            rotation: 360,
            duration: 0.3,
            ease: "back.out(1.7)"
          });
        }
      }

      if (targetRef.current) {
        // Use keyframes object to avoid array type errors in strict typing
        gsap.to(targetRef.current, {
          keyframes: {
            scale: [1, 1.1, 1],
            duration: 0.4,
            ease: "power2.inOut"
          }
        });
      }
    } else {
      setStats(prev => ({
        ...prev,
        misses: prev.misses + 1,
        streak: 0
      }));

      setFeedback('incorrect');

      // Animate incorrect feedback
      if (gridRef.current) {
        const clickedElement = gridRef.current.children[clickedSymbol.id] as HTMLElement;
        if (clickedElement) {
          // Use keyframes object to avoid array type errors in strict typing
          gsap.to(clickedElement, {
            keyframes: {
              x: [-5, 5, -5, 5, 0],
              duration: 0.4,
              ease: "power2.inOut"
            }
          });
        }
      }
    }

    trackTimeout(() => {
      setFeedback(null);
      generateGrid();
    }, 500);
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const id = trackTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => untrack(id);
    }
    if (timeLeft === 0 && gameState === 'playing') {
      setGameState('results');
    }
  }, [gameState, timeLeft, trackTimeout, untrack]);

  useEffect(() => {
    if (gameState !== 'results' || hasSavedResultsRef.current) return;
    hasSavedResultsRef.current = true;
    const accuracy = stats.matches + stats.misses > 0 ? Math.round((stats.matches / (stats.matches + stats.misses) * 100)) : 0;
    saveResultRef.current({
      gameType: 'speed-match',
      score: stats.score,
      accuracy,
      level: stats.level,
      details: {
        matches: stats.matches,
        misses: stats.misses,
        streak: stats.streak,
        timeBonus: stats.timeBonus
      },
      duration: 60 - timeLeft
    });
  }, [gameState, stats, timeLeft]);

  // Animate grid appearance
  useEffect(() => {
    if (gameState === 'playing' && gridRef.current) {
      const children = Array.from(gridRef.current.children);
      gsap.fromTo(children,
        { scale: 0, rotation: -180, opacity: 0 },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 0.3,
          stagger: 0.05,
          ease: "back.out(1.7)"
        }
      );
    }
  }, [symbols, gameState]);

  const resetGame = () => {
    clearAll();
    hasSavedResultsRef.current = false;
    setGameState('menu');
    setStats({
      score: 0,
      matches: 0,
      misses: 0,
      streak: 0,
      level: 1,
      timeBonus: 0
    });
    setTimeLeft(60);
    setTargetSymbol(null);
    setSymbols([]);
    setFeedback(null);
  };

  const renderSymbol = (symbol: Symbol) => {
    const shapeStyle = {
      backgroundColor: symbol.color,
      borderRadius: symbol.shape === 'circle' ? '50%' :
        symbol.shape === 'diamond' ? '0' : '8px',
      // Only rotate for diamond; triangles/stars are handled via clipPath
      transform: symbol.shape === 'diamond' ? 'rotate(45deg)' : 'none',
      clipPath: symbol.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' :
        symbol.shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none'
    } as React.CSSProperties;

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="w-12 h-12 flex items-center justify-center shadow-lg"
          style={shapeStyle}
        >
          <span className="text-2xl">{symbol.symbol}</span>
        </div>
      </div>
    );
  };

  const accuracy = stats.matches + stats.misses > 0 ? (stats.matches / (stats.matches + stats.misses) * 100) : 0;

  const immersive = gameState !== 'menu';

  return (
    <BrainGameShell
      title="Speed Match"
      immersive={immersive}
      onErrorReset={resetGame}
      topAccessory={
        gameState === 'playing' ? (
          <span className="bt-glass-hud tabular-nums">
            {stats.score} pts · {timeLeft}s · Lv {stats.level} · {stats.streak}×
          </span>
        ) : null
      }
    >
      <div ref={gameRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        {gameState === 'menu' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
              <h1 className="font-light text-3xl tracking-wide text-neutral-900 md:text-4xl">Speed Match</h1>
              <p className="mt-4 text-sm text-neutral-600 md:text-base">
                Tap every cell that exactly matches the target shape, icon, and color. One minute.
              </p>
              <ul className="mt-6 space-y-2 text-left text-sm text-neutral-600">
                <li>• Streak and time bonuses stack</li>
                <li>• Level increases as you find matches</li>
              </ul>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start speed match">
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

        {gameState === 'playing' && targetSymbol && (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 px-4 py-6">
            <div className="bt-play-surface-light mx-auto w-full max-w-md p-8 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Match this</p>
              <div ref={targetRef} className="mt-6 flex justify-center">
                <div className="rounded-2xl bg-neutral-50 p-4 shadow-inner">{renderSymbol(targetSymbol)}</div>
              </div>
            </div>
            {feedback && (
              <p
                className={`text-center text-lg font-medium ${
                  feedback === 'correct' ? 'bt-feedback-text-correct' : 'bt-feedback-text-wrong'
                }`}
              >
                {feedback === 'correct' ? 'Nice' : 'Keep going'}
              </p>
            )}
            <div ref={gridRef} className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-3 md:grid-cols-6">
              {symbols.map((symbol) => (
                <button
                  key={symbol.id}
                  type="button"
                  onClick={() => handleSymbolClick(symbol)}
                  className="bt-play-surface-light aspect-square rounded-xl p-2 shadow-[var(--bt-card-shadow)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--bt-card-shadow-hover)] disabled:opacity-50"
                  disabled={feedback !== null}
                >
                  {renderSymbol(symbol)}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2">
            <div className="bt-glass-dark w-full max-w-md p-8 text-center">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Complete</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-neutral-900">{stats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                {stats.matches} matches · {accuracy.toFixed(0)}% · Lv {stats.level}
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

export default SpeedMatchGame;
