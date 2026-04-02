import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameResult } from '../GameResultProvider';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface GameStats {
  score: number;
  level: number;
  wordsFound: number;
  totalWords: number;
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'instructions' | 'playing' | 'results';
  streak: number;
  maxWordLength: number;
}

interface FoundWord {
  word: string;
  points: number;
  timestamp: number;
}

const WordBuilderGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    wordsFound: 0,
    totalWords: 0,
    timeRemaining: 120,
    isGameActive: false,
    currentPhase: 'instructions',
    streak: 0,
    maxWordLength: 0
  });

  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [feedback, setFeedback] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });


  // Word validation dictionary (subset for different difficulty levels)
  const wordDatabase = {
    1: ['CAT', 'DOG', 'SUN', 'RUN', 'FUN', 'BAT', 'HAT', 'RAT', 'SAT', 'MAT', 'HOT', 'NOT', 'GOT', 'LOT', 'POT', 'BOX', 'FOX', 'MIX', 'SIX', 'FIX'],
    2: ['CATS', 'DOGS', 'RUNS', 'BATS', 'HATS', 'RATS', 'SITS', 'BITS', 'HITS', 'FITS', 'CAKE', 'MAKE', 'TAKE', 'LAKE', 'WAKE', 'CAME', 'GAME', 'NAME', 'SAME', 'TAME'],
    3: ['WORDS', 'GAMES', 'MAKES', 'TAKES', 'CAKES', 'LAKES', 'WAKES', 'NAMES', 'HOMES', 'COMES', 'LOVES', 'MOVES', 'GIVES', 'LIVES', 'SAVES', 'WAVES', 'CAVES', 'PAVES', 'RAVES', 'DAVES']
  };

  // Letter frequency for generating challenging but solvable puzzles
  const getLettersForLevel = useCallback((level: number): string[] => {
    const letterSets = {
      1: ['C', 'A', 'T', 'S', 'R', 'N', 'D', 'O', 'G', 'H', 'M', 'B'],
      2: ['C', 'A', 'T', 'S', 'R', 'N', 'D', 'O', 'G', 'H', 'M', 'B', 'E', 'I', 'L', 'K'],
      3: ['C', 'A', 'T', 'S', 'R', 'N', 'D', 'O', 'G', 'H', 'M', 'B', 'E', 'I', 'L', 'K', 'W', 'V', 'P', 'F']
    };

    const baseLetters = letterSets[Math.min(level, 3) as keyof typeof letterSets];
    const numLetters = Math.min(8 + level, 12);

    // Ensure some vowels are included
    const vowels = ['A', 'E', 'I', 'O'];
    const consonants = baseLetters.filter(l => !vowels.includes(l));

    const selectedLetters = [];

    // Add at least 2 vowels
    const shuffledVowels = [...vowels].sort(() => 0.5 - Math.random());
    selectedLetters.push(...shuffledVowels.slice(0, 2));

    // Fill the rest with consonants
    const shuffledConsonants = [...consonants].sort(() => 0.5 - Math.random());
    const remainingSlots = numLetters - selectedLetters.length;
    selectedLetters.push(...shuffledConsonants.slice(0, remainingSlots));

    return selectedLetters.sort(() => 0.5 - Math.random());
  }, []);

  const isValidWord = useCallback((word: string, level: number): boolean => {
    const maxLevel = Math.min(level, 3) as keyof typeof wordDatabase;
    return wordDatabase[maxLevel].includes(word.toUpperCase());
  }, []);

  const shuffleLetters = () => {
    setAvailableLetters(prev => [...prev].sort(() => 0.5 - Math.random()));
  };

  const addLetter = (letter: string, index: number) => {
    if (currentWord.length >= 8) return; // Maximum word length

    setCurrentWord(prev => prev + letter);
    setAvailableLetters(prev => prev.filter((_, i) => i !== index));
  };

  const removeLetter = (index: number) => {
    const letter = currentWord[index];
    setCurrentWord(prev => prev.slice(0, index) + prev.slice(index + 1));
    setAvailableLetters(prev => [...prev, letter]);
  };

  const clearWord = () => {
    setAvailableLetters(prev => [...prev, ...currentWord.split('')]);
    setCurrentWord('');
  };

  const endGame = useCallback(() => {
    setGameStats(prev => ({ ...prev, isGameActive: false, currentPhase: 'results' }));

    saveResult({
      gameType: 'word-builder',
      score: gameStats.score,
      level: gameStats.level,
      accuracy: 100, // All found words are valid
      duration: 120 + (gameStats.level * 15) - gameStats.timeRemaining,
      details: {
        wordsFound: foundWords.length,
        longestWord: gameStats.maxWordLength,
        totalLettersUsed: foundWords.reduce((sum, w) => sum + w.word.length, 0),
        averageWordLength: foundWords.length > 0 ? foundWords.reduce((sum, w) => sum + w.word.length, 0) / foundWords.length : 0
      }
    });
  }, [gameStats, foundWords, saveResult]);

  const submitWord = () => {
    if (currentWord.length < 3) {
      setFeedback({
        show: true,
        message: 'Words must be at least 3 letters long!',
        type: 'error'
      });
      setTimeout(() => setFeedback({ show: false, message: '', type: 'success' }), 2000);
      return;
    }

    // Check if word already found
    if (foundWords.some(w => w.word === currentWord.toUpperCase())) {
      setFeedback({
        show: true,
        message: 'Word already found!',
        type: 'error'
      });
      setTimeout(() => setFeedback({ show: false, message: '', type: 'success' }), 2000);
      return;
    }

    // Validate word
    if (isValidWord(currentWord, gameStats.level)) {
      const wordLength = currentWord.length;
      const points = wordLength * 10 + (wordLength > 4 ? (wordLength - 4) * 15 : 0); // Bonus for longer words
      const bonusPoints = gameStats.streak * 5; // Streak bonus
      const totalPoints = points + bonusPoints;

      const newFoundWord: FoundWord = {
        word: currentWord.toUpperCase(),
        points: totalPoints,
        timestamp: Date.now()
      };

      setFoundWords(prev => [...prev, newFoundWord]);
      setGameStats(prev => ({
        ...prev,
        score: prev.score + totalPoints,
        wordsFound: prev.wordsFound + 1,
        streak: prev.streak + 1,
        maxWordLength: Math.max(prev.maxWordLength, wordLength)
      }));

      setFeedback({
        show: true,
        message: `Great! "${currentWord.toUpperCase()}" +${totalPoints} points!`,
        type: 'success'
      });

      setCurrentWord('');
    } else {
      setFeedback({
        show: true,
        message: 'Not a valid word! Try again.',
        type: 'error'
      });

      setGameStats(prev => ({ ...prev, streak: 0 })); // Reset streak
    }

    setTimeout(() => setFeedback({ show: false, message: '', type: 'success' }), 2000);
  };

  const startGame = useCallback(() => {
    const letters = getLettersForLevel(gameStats.level);
    setAvailableLetters(letters);
    setCurrentWord('');
    setFoundWords([]);


    setGameStats(prev => ({
      ...prev,
      currentPhase: 'playing',
      isGameActive: true,
      timeRemaining: 120 + (prev.level * 15), // More time for higher levels
      wordsFound: 0,

    }));
  }, [gameStats.level, getLettersForLevel]);

  const resetGame = () => {
    setGameStats({
      score: 0,
      level: 1,
      wordsFound: 0,
      totalWords: 0,
      timeRemaining: 120,
      isGameActive: false,
      currentPhase: 'instructions',
      streak: 0,
      maxWordLength: 0
    });
    setAvailableLetters([]);
    setCurrentWord('');
    setFoundWords([]);
    setFeedback({ show: false, message: '', type: 'success' });
  };

  const nextLevel = () => {
    setGameStats(prev => ({
      ...prev,
      level: prev.level + 1,
      currentPhase: 'instructions'
    }));
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameStats.isGameActive && gameStats.timeRemaining > 0) {
      interval = setInterval(() => {
        setGameStats(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;

          if (newTimeRemaining <= 0) {
            // Use setTimeout to ensure state update completes before calling endGame
            setTimeout(() => endGame(), 0);
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
    }

    return () => clearInterval(interval);
  }, [gameStats.isGameActive, gameStats.timeRemaining, endGame]);

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameStats.currentPhase !== 'playing') return;

      const key = event.key.toUpperCase();

      if (key === 'ENTER') {
        event.preventDefault();
        submitWord();
      } else if (key === 'BACKSPACE') {
        event.preventDefault();
        if (currentWord.length > 0) {
          removeLetter(currentWord.length - 1);
        }
      } else if (key === 'ESCAPE') {
        event.preventDefault();
        clearWord();
      } else if (/^[A-Z]$/.test(key)) {
        event.preventDefault();
        const letterIndex = availableLetters.findIndex(letter => letter === key);
        if (letterIndex !== -1) {
          addLetter(key, letterIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStats.currentPhase, currentWord, availableLetters]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playing = gameStats.currentPhase === 'playing';

  return (
    <BrainGameShell
      title="Word Builder"
      immersive={playing}
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {playing && (
            <span className="bt-glass-hud text-[11px] md:text-xs">
              {gameStats.score} pts · {formatTime(gameStats.timeRemaining)} · Lv {gameStats.level} ·{' '}
              {foundWords.length} words · {gameStats.streak}×
            </span>
          )}
          <button
            type="button"
            onClick={resetGame}
            className={`flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-sm md:text-sm ${
              playing ? 'bt-glass-hud border-transparent' : 'border-black/10 bg-white/90 text-neutral-800'
            }`}
            aria-label="Reset game"
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            Reset
          </button>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-2">
        {gameStats.currentPhase === 'instructions' && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="w-full rounded-2xl border border-black/8 bg-white p-8 shadow-[var(--bt-card-shadow)]">
              <h2 className="font-light text-2xl text-neutral-900 md:text-3xl">Word builder</h2>
              <p className="mt-4 text-sm text-neutral-600">
                Spell valid words from the letter tray. Longer words and streaks score more.
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                Level {gameStats.level} · {formatTime(120 + gameStats.level * 15)} · Enter submit · Backspace · Esc clear
              </p>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start word builder">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {playing && (
          <div className="flex min-h-0 flex-1 flex-col gap-5 px-2 py-6">
            <div className="bt-play-surface-light p-6">
              <p className="text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
                Current word
              </p>
              <div className="mt-4 flex min-h-[56px] flex-wrap items-center justify-center gap-2 border-b border-neutral-100 pb-4">
                {currentWord.length === 0 ? (
                  <span className="text-sm text-neutral-400">Tap letters below</span>
                ) : (
                  currentWord.split('').map((letter, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => removeLetter(index)}
                      className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-lg font-bold text-neutral-900 shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      {letter}
                    </button>
                  ))
                )}
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={submitWord}
                  disabled={currentWord.length < 3}
                  className="bt-btn-solid px-8 disabled:opacity-35"
                >
                  Submit
                </button>
                <button type="button" onClick={clearWord} className="bt-btn-outline px-6 text-sm">
                  Clear
                </button>
              </div>
            </div>

            <div className="bt-play-surface-light p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">Letters</span>
                <button
                  type="button"
                  onClick={shuffleLetters}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden />
                  Shuffle
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {availableLetters.map((letter, index) => (
                  <button
                    key={`${letter}-${index}`}
                    type="button"
                    onClick={() => addLetter(letter, index)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-200 bg-white text-lg font-bold text-neutral-900 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            <div className="bt-play-surface-light p-4">
              <p className="text-xs font-medium text-neutral-500">Found ({foundWords.length})</p>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm">
                {foundWords.map((word, index) => (
                  <div
                    key={index}
                    className="flex justify-between border-b border-neutral-100 py-2 text-neutral-800"
                  >
                    <span>{word.word}</span>
                    <span className="font-medium text-emerald-600">+{word.points}</span>
                  </div>
                ))}
              </div>
            </div>

            {feedback.show && (
              <p
                className={`text-center text-sm font-medium ${
                  feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>
        )}

        {gameStats.currentPhase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Time&apos;s up</p>
              <p className="mt-3 text-3xl font-semibold text-neutral-900">{gameStats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                {foundWords.length} words · longest {gameStats.maxWordLength} · streak {gameStats.streak}
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
      </div>
    </BrainGameShell>
  );
};

export default WordBuilderGame;
