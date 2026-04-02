import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameResult } from '../GameResultProvider';
import { BrainGameShell } from '../ui/BrainGameShell';
import { AnimatedButton } from '../ui/AnimatedButton';

interface GameStats {
  score: number;
  level: number;
  correctAnswers: number;
  totalQuestions: number;
  timeRemaining: number;
  isGameActive: boolean;
  currentPhase: 'instructions' | 'playing' | 'results';
  streak: number;
  bestStreak: number;
}

interface SynonymQuestion {
  word: string;
  correctSynonym: string;
  options: string[];
  difficulty: number;
}

const SynonymChallengeGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    correctAnswers: 0,
    totalQuestions: 0,
    timeRemaining: 60,
    isGameActive: false,
    currentPhase: 'instructions',
    streak: 0,
    bestStreak: 0
  });

  const [currentQuestion, setCurrentQuestion] = useState<SynonymQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  });
  const [questionStartTime, setQuestionStartTime] = useState(0);


  // Synonym database organized by difficulty
  const synonymDatabase = {
    1: [
      { word: 'Happy', synonym: 'Joyful', distractors: ['Sad', 'Angry', 'Tired'] },
      { word: 'Big', synonym: 'Large', distractors: ['Small', 'Tiny', 'Narrow'] },
      { word: 'Fast', synonym: 'Quick', distractors: ['Slow', 'Late', 'Heavy'] },
      { word: 'Good', synonym: 'Great', distractors: ['Bad', 'Worse', 'Poor'] },
      { word: 'Cold', synonym: 'Chilly', distractors: ['Hot', 'Warm', 'Sunny'] },
      { word: 'Bright', synonym: 'Shiny', distractors: ['Dark', 'Dull', 'Dim'] },
      { word: 'Loud', synonym: 'Noisy', distractors: ['Quiet', 'Silent', 'Soft'] },
      { word: 'Smart', synonym: 'Clever', distractors: ['Dumb', 'Silly', 'Slow'] },
      { word: 'Pretty', synonym: 'Beautiful', distractors: ['Ugly', 'Plain', 'Rough'] },
      { word: 'Strong', synonym: 'Powerful', distractors: ['Weak', 'Frail', 'Gentle'] }
    ],
    2: [
      { word: 'Enormous', synonym: 'Massive', distractors: ['Tiny', 'Moderate', 'Average'] },
      { word: 'Brilliant', synonym: 'Intelligent', distractors: ['Foolish', 'Average', 'Confused'] },
      { word: 'Ancient', synonym: 'Old', distractors: ['Modern', 'Recent', 'New'] },
      { word: 'Furious', synonym: 'Angry', distractors: ['Calm', 'Peaceful', 'Happy'] },
      { word: 'Delicious', synonym: 'Tasty', distractors: ['Bland', 'Bitter', 'Sour'] },
      { word: 'Exhausted', synonym: 'Tired', distractors: ['Energetic', 'Alert', 'Active'] },
      { word: 'Magnificent', synonym: 'Splendid', distractors: ['Ordinary', 'Plain', 'Simple'] },
      { word: 'Terrified', synonym: 'Scared', distractors: ['Brave', 'Confident', 'Calm'] },
      { word: 'Remarkable', synonym: 'Amazing', distractors: ['Ordinary', 'Common', 'Typical'] },
      { word: 'Abundant', synonym: 'Plentiful', distractors: ['Scarce', 'Limited', 'Few'] }
    ],
    3: [
      { word: 'Meticulous', synonym: 'Careful', distractors: ['Careless', 'Hasty', 'Reckless'] },
      { word: 'Benevolent', synonym: 'Kind', distractors: ['Cruel', 'Mean', 'Harsh'] },
      { word: 'Eloquent', synonym: 'Articulate', distractors: ['Stammering', 'Unclear', 'Silent'] },
      { word: 'Tenacious', synonym: 'Persistent', distractors: ['Giving-up', 'Weak', 'Lazy'] },
      { word: 'Lucid', synonym: 'Clear', distractors: ['Confusing', 'Murky', 'Vague'] },
      { word: 'Candid', synonym: 'Honest', distractors: ['Deceptive', 'False', 'Lying'] },
      { word: 'Vivacious', synonym: 'Lively', distractors: ['Dull', 'Boring', 'Lifeless'] },
      { word: 'Ostentatious', synonym: 'Showy', distractors: ['Modest', 'Simple', 'Plain'] },
      { word: 'Pragmatic', synonym: 'Practical', distractors: ['Idealistic', 'Impractical', 'Theoretical'] },
      { word: 'Ephemeral', synonym: 'Temporary', distractors: ['Permanent', 'Lasting', 'Eternal'] }
    ]
  };

  const generateQuestion = useCallback((): SynonymQuestion => {
    const difficulty = Math.min(gameStats.level, 3) as 1 | 2 | 3;
    const wordList = synonymDatabase[difficulty];
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const selectedPair = wordList[randomIndex];

    // Create options by mixing correct synonym with distractors
    const options = [selectedPair.synonym, ...selectedPair.distractors]
      .sort(() => 0.5 - Math.random());

    return {
      word: selectedPair.word,
      correctSynonym: selectedPair.synonym,
      options: options,
      difficulty: difficulty
    };
  }, [gameStats.level]);

  const endGame = useCallback(() => {
    setGameStats(prev => ({ ...prev, isGameActive: false, currentPhase: 'results' }));

    const accuracy = gameStats.totalQuestions > 0
      ? Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100)
      : 0;

    saveResult({
      gameType: 'synonym-challenge',
      score: gameStats.score,
      level: gameStats.level,
      accuracy: accuracy,
      duration: 60 + (gameStats.level * 10) - gameStats.timeRemaining,
      details: {
        questionsAnswered: gameStats.totalQuestions,
        correctAnswers: gameStats.correctAnswers,
        bestStreak: gameStats.bestStreak,
        avgReactionTime: 0
      }
    });
  }, [gameStats, saveResult]);

  const startGame = useCallback(() => {

    setCurrentQuestion(generateQuestion());
    setQuestionStartTime(Date.now());

    setGameStats(prev => ({
      ...prev,
      currentPhase: 'playing',
      isGameActive: true,
      timeRemaining: 60 + (prev.level * 10), // More time for higher levels
      correctAnswers: 0,
      totalQuestions: 0,
      streak: 0
    }));
  }, [generateQuestion]);

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion || selectedAnswer !== '') return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctSynonym;
    const reactionTime = Date.now() - questionStartTime;

    // Calculate points
    let points = 0;
    if (isCorrect) {
      const basePoints = 10 * currentQuestion.difficulty;
      const speedBonus = Math.max(0, 3000 - reactionTime) / 100; // Bonus for quick answers
      const streakBonus = gameStats.streak * 5;
      points = Math.round(basePoints + speedBonus + streakBonus);
    }

    setGameStats(prev => ({
      ...prev,
      score: prev.score + points,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      totalQuestions: prev.totalQuestions + 1,
      streak: isCorrect ? prev.streak + 1 : 0,
      bestStreak: Math.max(prev.bestStreak, isCorrect ? prev.streak + 1 : prev.streak)
    }));

    setFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect
        ? `Correct! +${points} points`
        : `Incorrect. "${currentQuestion.word}" means "${currentQuestion.correctSynonym}"`
    });

    setTimeout(() => {
      setFeedback({ show: false, correct: false, message: '' });
      setSelectedAnswer('');

      // Generate next question or end game
      if (gameStats.totalQuestions + 1 >= 15) { // 15 questions per level
        endGame();
      } else {
        setCurrentQuestion(generateQuestion());
        setQuestionStartTime(Date.now());
      }
    }, 1500);
  };

  const nextLevel = () => {
    setGameStats(prev => ({
      ...prev,
      level: prev.level + 1,
      score: prev.score,
      currentPhase: 'instructions'
    }));
  };

  const resetGame = () => {
    setGameStats({
      score: 0,
      level: 1,
      correctAnswers: 0,
      totalQuestions: 0,
      timeRemaining: 60,
      isGameActive: false,
      currentPhase: 'instructions',
      streak: 0,
      bestStreak: 0
    });
    setCurrentQuestion(null);
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

  const accuracy = gameStats.totalQuestions > 0
    ? Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playing = gameStats.currentPhase === 'playing';

  return (
    <BrainGameShell
      title="Synonym Challenge"
      immersive={playing}
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {playing && (
            <span className="bt-glass-hud text-[11px] md:text-xs">
              {gameStats.score} pts · {formatTime(gameStats.timeRemaining)} · Q{gameStats.totalQuestions + 1}/15 ·{' '}
              {gameStats.streak}×
            </span>
          )}
          <button
            type="button"
            onClick={resetGame}
            className={`bt-reset-btn flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium md:text-sm ${
              playing ? '' : 'border-black/10 bg-white text-neutral-600 shadow-sm'
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
              <h2 className="font-light text-2xl text-neutral-900 md:text-3xl">Synonym challenge</h2>
              <p className="mt-4 text-sm text-neutral-600">
                Pick the closest meaning. Streaks and quick answers score higher.
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                Level {gameStats.level} · 15 questions · {formatTime(60 + gameStats.level * 10)}
              </p>
              <AnimatedButton onClick={startGame} className="mt-8 min-w-[200px]" aria-label="Start synonym challenge">
                Start
              </AnimatedButton>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'playing' && currentQuestion && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <p className="text-center text-[11px] text-neutral-500">
              {accuracy}% so far · best streak {gameStats.bestStreak}
            </p>
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">Synonym for</p>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">
                {currentQuestion.word}
              </div>
            </div>
            <div className="mx-auto mt-10 grid w-full max-w-xl gap-3 md:grid-cols-2">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAnswerSelect(option)}
                  disabled={selectedAnswer !== ''}
                  className={`bt-option-light min-h-14 text-base disabled:cursor-not-allowed ${
                    selectedAnswer === option
                      ? selectedAnswer === currentQuestion.correctSynonym
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
                style={{ width: `${(gameStats.totalQuestions / 15) * 100}%` }}
              />
            </div>
            {feedback.show && (
              <p
                className={`mt-4 text-center text-sm font-medium ${
                  feedback.correct ? 'text-emerald-600' : 'text-red-600'
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
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Complete</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-900">
                {gameStats.correctAnswers}/{gameStats.totalQuestions} correct
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                {gameStats.score} pts · {accuracy}% · best streak {gameStats.bestStreak}
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

export default SynonymChallengeGame;
