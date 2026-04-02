import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
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
  currentPhase: 'instructions' | 'reading' | 'questions' | 'results';
  passagesRead: number;
  readingSpeed: number; // words per minute
}

interface ReadingPassage {
  title: string;
  content: string;
  questions: Question[];
  difficulty: number;
  wordCount: number;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const ReadingComprehensionGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();

  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    correctAnswers: 0,
    totalQuestions: 0,
    timeRemaining: 300, // 5 minutes
    isGameActive: false,
    currentPhase: 'instructions',
    passagesRead: 0,
    readingSpeed: 0
  });

  const [currentPassage, setCurrentPassage] = useState<ReadingPassage | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string; explanation: string }>({
    show: false,
    correct: false,
    message: '',
    explanation: ''
  });
  const [readingStartTime, setReadingStartTime] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [loadingAI, setLoadingAI] = useState(false);

  // Reading passages database organized by difficulty
  const passageDatabase = {
    1: [
      {
        title: "The Benefits of Exercise",
        content: "Regular exercise is important for maintaining good health. When you exercise, your heart becomes stronger and can pump blood more efficiently. Exercise also helps you maintain a healthy weight and improves your mood. Many people find that they sleep better when they exercise regularly. Even simple activities like walking for 30 minutes a day can make a big difference in your overall health. The key is to find activities you enjoy so that you will continue to do them over time.",
        questions: [
          {
            question: "According to the passage, what happens to your heart when you exercise?",
            options: ["It becomes weaker", "It becomes stronger", "It stops working", "It beats slower"],
            correctAnswer: "It becomes stronger",
            explanation: "The passage states that when you exercise, your heart becomes stronger and can pump blood more efficiently."
          },
          {
            question: "How much walking per day does the passage suggest can make a difference?",
            options: ["15 minutes", "30 minutes", "45 minutes", "60 minutes"],
            correctAnswer: "30 minutes",
            explanation: "The passage mentions that even simple activities like walking for 30 minutes a day can make a big difference."
          }
        ]
      },
      {
        title: "The Life Cycle of a Butterfly",
        content: "A butterfly goes through four main stages in its life cycle. First, it starts as a tiny egg laid on a leaf. Next, a caterpillar hatches from the egg and begins eating leaves to grow bigger. The caterpillar then forms a protective shell called a chrysalis around itself. Inside this shell, the caterpillar transforms into a butterfly. Finally, the adult butterfly emerges from the chrysalis with beautiful wings. This process is called metamorphosis and takes about one month to complete.",
        questions: [
          {
            question: "What is the third stage in a butterfly's life cycle?",
            options: ["Egg", "Caterpillar", "Chrysalis", "Adult butterfly"],
            correctAnswer: "Chrysalis",
            explanation: "The passage describes the chrysalis as the third stage, where the caterpillar forms a protective shell around itself."
          },
          {
            question: "How long does the entire metamorphosis process take?",
            options: ["One week", "One month", "Three months", "One year"],
            correctAnswer: "One month",
            explanation: "The passage states that this process takes about one month to complete."
          }
        ]
      }
    ],
    2: [
      {
        title: "The Impact of Technology on Communication",
        content: "Modern technology has dramatically transformed the way we communicate with one another. Smartphones, social media platforms, and instant messaging apps have made it possible to connect with people around the world instantly. While this has many benefits, such as maintaining long-distance relationships and conducting business globally, it has also created some challenges. Many people report feeling overwhelmed by the constant stream of notifications and messages. Additionally, face-to-face communication skills may be declining as people become more comfortable communicating through screens rather than in person.",
        questions: [
          {
            question: "What is one benefit of modern communication technology mentioned in the passage?",
            options: ["Reduced stress", "Better sleep", "Maintaining long-distance relationships", "Improved memory"],
            correctAnswer: "Maintaining long-distance relationships",
            explanation: "The passage mentions that technology has benefits such as maintaining long-distance relationships and conducting business globally."
          },
          {
            question: "According to the passage, what communication skills might be declining?",
            options: ["Writing skills", "Reading skills", "Face-to-face communication", "Listening skills"],
            correctAnswer: "Face-to-face communication",
            explanation: "The passage suggests that face-to-face communication skills may be declining as people become more comfortable communicating through screens."
          }
        ]
      }
    ],
    3: [
      {
        title: "The Economics of Renewable Energy",
        content: "The transition to renewable energy sources represents one of the most significant economic shifts of the 21st century. Solar and wind power, once considered expensive alternatives to fossil fuels, have experienced dramatic cost reductions due to technological advances and economies of scale. According to recent studies, renewable energy is now cost-competitive with traditional energy sources in many markets worldwide. This economic viability has accelerated adoption rates and attracted substantial investment from both private and public sectors. However, the transition also presents challenges, including the need for grid modernization, energy storage solutions, and retraining workers from traditional energy industries. The long-term economic benefits, including job creation in emerging sectors and reduced environmental costs, are expected to outweigh these transitional challenges.",
        questions: [
          {
            question: "What has caused the dramatic cost reductions in solar and wind power?",
            options: ["Government subsidies", "Technological advances and economies of scale", "Reduced demand", "Lower material costs"],
            correctAnswer: "Technological advances and economies of scale",
            explanation: "The passage states that solar and wind power have experienced dramatic cost reductions due to technological advances and economies of scale."
          },
          {
            question: "Which of the following is NOT mentioned as a challenge in the renewable energy transition?",
            options: ["Grid modernization", "Energy storage solutions", "Worker retraining", "International competition"],
            correctAnswer: "International competition",
            explanation: "The passage mentions grid modernization, energy storage solutions, and retraining workers as challenges, but does not mention international competition."
          }
        ]
      }
    ]
  };

  const getPassageForLevel = useCallback(async (level: number): Promise<ReadingPassage> => {
    const difficulty = Math.min(level, 3) as keyof typeof passageDatabase;
    const passages = passageDatabase[difficulty];
    const randomIndex = Math.floor(Math.random() * passages.length);
    const selected = passages[randomIndex];

    return {
      ...selected,
      difficulty: difficulty,
      wordCount: selected.content.split(' ').length
    };
  }, []);

  const startGame = useCallback(async () => {
    try {
      setLoadingAI(true);
      const passage = await getPassageForLevel(gameStats.level);
      if (!passage) {
        console.error('Failed to load passage');
        setLoadingAI(false);
        return;
      }
      setCurrentPassage(passage);
      setCurrentQuestionIndex(0);
      setReadingStartTime(Date.now());
      setGameStartTime(Date.now());

      setGameStats(prev => ({
        ...prev,
        currentPhase: 'reading',
        isGameActive: true,
        timeRemaining: 300 + (prev.level * 60), // More time for higher levels
        correctAnswers: 0,
        totalQuestions: 0,
        passagesRead: 0,
        readingSpeed: 0
      }));
    } catch (error) {
      console.error('Error starting game:', error);
    } finally {
      setLoadingAI(false);
    }
  }, [gameStats.level, getPassageForLevel]);

  const finishReading = () => {
    if (!currentPassage) return;

    const readingTime = (Date.now() - readingStartTime) / 1000 / 60; // minutes
    const wordsPerMinute = Math.round(currentPassage.wordCount / readingTime);

    setGameStats(prev => ({
      ...prev,
      currentPhase: 'questions',
      passagesRead: prev.passagesRead + 1,
      readingSpeed: wordsPerMinute
    }));
  };

  const endGame = useCallback(async () => {
    setGameStats(prev => ({ ...prev, isGameActive: false, currentPhase: 'results' }));

    const accuracy = gameStats.totalQuestions > 0
      ? Math.round((gameStats.correctAnswers / gameStats.totalQuestions) * 100)
      : 0;

    saveResult({
      gameType: 'reading-comprehension',
      score: gameStats.score,
      level: gameStats.level,
      accuracy: accuracy,
      duration: (Date.now() - gameStartTime) / 1000,
      details: {
        passagesRead: gameStats.passagesRead,
        readingSpeed: gameStats.readingSpeed,
        correctAnswers: gameStats.correctAnswers,
        totalQuestions: gameStats.totalQuestions
      }
    });
  }, [gameStats, gameStartTime, saveResult]);

  const handleAnswerSelect = (answer: string) => {
    if (!currentPassage || selectedAnswer !== '') return;

    setSelectedAnswer(answer);
    const currentQuestion = currentPassage.questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;

    // Calculate points
    let points = 0;
    if (isCorrect) {
      const basePoints = 20 * currentPassage.difficulty;
      const speedBonus = Math.max(0, gameStats.readingSpeed - 100) / 10; // Bonus for reading speed
      points = Math.round(basePoints + speedBonus);
    }

    setGameStats(prev => ({
      ...prev,
      score: prev.score + points,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      totalQuestions: prev.totalQuestions + 1
    }));

    setFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect ? `Correct! +${points} points` : 'Incorrect',
      explanation: currentQuestion.explanation
    });

    setTimeout(async () => {
      setFeedback({ show: false, correct: false, message: '', explanation: '' });
      setSelectedAnswer('');

      // Move to next question or end game
      if (currentQuestionIndex + 1 < currentPassage.questions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else if (gameStats.passagesRead + 1 >= 3) { // 3 passages per level
        endGame();
      } else {
        // Load next passage (with AI adaptation based on performance)
        try {
          setLoadingAI(true);
          const nextPassage = await getPassageForLevel(gameStats.level);
          if (nextPassage) {
            setCurrentPassage(nextPassage);
            setCurrentQuestionIndex(0);
            setReadingStartTime(Date.now());
            setGameStats(prev => ({ ...prev, currentPhase: 'reading' }));
          }
        } catch (error) {
          console.error('Error loading next passage:', error);
        } finally {
          setLoadingAI(false);
        }
      }
    }, 3000);
  };

  const nextLevel = () => {
    setGameStats(prev => ({
      ...prev,
      level: prev.level + 1,
      currentPhase: 'instructions'
    }));
  };

  const resetGame = () => {
    setGameStats({
      score: 0,
      level: 1,
      correctAnswers: 0,
      totalQuestions: 0,
      timeRemaining: 300,
      isGameActive: false,
      currentPhase: 'instructions',
      passagesRead: 0,
      readingSpeed: 0
    });
    setCurrentPassage(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setFeedback({ show: false, correct: false, message: '', explanation: '' });
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

  const immersive =
    gameStats.currentPhase === 'reading' || gameStats.currentPhase === 'questions';

  return (
    <BrainGameShell
      title="Reading Comprehension"
      immersive={immersive}
      onErrorReset={resetGame}
      topAccessory={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {(gameStats.currentPhase === 'reading' || gameStats.currentPhase === 'questions') && (
            <span className="bt-glass-hud max-w-[min(74vw,380px)] text-left text-[11px] leading-snug md:text-xs">
              {gameStats.score} pts · {formatTime(gameStats.timeRemaining)}
              {gameStats.readingSpeed > 0 ? ` · ${gameStats.readingSpeed} WPM` : ''}
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
      <div className="mx-auto max-w-4xl">
        {gameStats.currentPhase === 'instructions' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
            <div className="w-full max-w-lg rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <h2 className="font-light text-3xl tracking-wide text-neutral-900">Reading</h2>
              <p className="mt-4 text-sm text-neutral-600 md:text-base">
                Read each passage, then answer questions. Pace and accuracy both feed your score.
              </p>
              <div className="mt-6 rounded-xl border border-black/10 bg-[#fafaf7] p-5 text-left text-sm text-neutral-700">
                <p className="font-medium text-neutral-900">Level {gameStats.level}</p>
                <p className="mt-2">
                  {gameStats.level === 1 && 'Straightforward passages.'}
                  {gameStats.level === 2 && 'More nuance in the text.'}
                  {gameStats.level >= 3 && 'Deeper analysis questions.'}
                </p>
                <p className="mt-2 text-neutral-500">
                  3 passages · {formatTime(300 + gameStats.level * 60)} total
                </p>
              </div>
              <button
                type="button"
                onClick={startGame}
                disabled={loadingAI}
                className="mt-8 inline-flex min-h-12 min-w-[200px] items-center justify-center gap-2 rounded-xl border border-black/15 bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAI ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent" />
                    Loading…
                  </>
                ) : (
                  'Start'
                )}
              </button>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'reading' && currentPassage && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <p className="text-center text-sm text-neutral-500">
              Passage {gameStats.passagesRead + 1} of 3 · level {currentPassage.difficulty}
            </p>

            <div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-white p-8 shadow-[var(--bt-card-shadow)] md:p-10">
              <h3 className="mb-6 text-center text-xl font-bold text-neutral-900 md:text-2xl">
                {currentPassage.title}
              </h3>
              <div className="text-base leading-8 text-neutral-800 md:text-lg md:leading-9">
                {currentPassage.content}
              </div>
              <p className="mt-6 text-center text-xs text-neutral-500">{currentPassage.wordCount} words</p>
            </div>

            <div className="mt-10 text-center">
              <button type="button" onClick={finishReading} className="bt-btn-solid px-10">
                Ready for questions
              </button>
              <p className="mt-3 text-sm text-neutral-500">Read carefully before continuing.</p>
            </div>
          </div>
        )}

        {gameStats.currentPhase === 'questions' && currentPassage && (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8">
            <p className="text-center text-sm text-neutral-500">
              Question {currentQuestionIndex + 1} of {currentPassage.questions.length}
            </p>

            <div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <h3 className="text-lg font-medium text-neutral-900 md:text-xl">
                {currentPassage.questions[currentQuestionIndex].question}
              </h3>
            </div>

            <div className="mx-auto mt-8 grid max-w-2xl gap-3 md:grid-cols-2">
              {currentPassage.questions[currentQuestionIndex].options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAnswerSelect(option)}
                  disabled={selectedAnswer !== ''}
                  className={`bt-option-light min-h-14 text-left text-base disabled:cursor-not-allowed ${
                    selectedAnswer === option
                      ? selectedAnswer === currentPassage.questions[currentQuestionIndex].correctAnswer
                        ? 'bt-option-light--correct'
                        : 'bt-option-light--wrong'
                      : ''
                  } ${selectedAnswer !== '' ? 'opacity-95' : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>

            {feedback.show && (
              <div
                className={`mx-auto mt-8 max-w-2xl rounded-2xl border bg-white p-6 text-left shadow-sm ${
                  feedback.correct ? 'border-emerald-200' : 'border-red-200'
                }`}
              >
                <p
                  className={`text-center font-semibold ${
                    feedback.correct ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {feedback.message}
                </p>
                <p className="mt-3 text-sm text-neutral-600">
                  <span className="font-medium text-neutral-900">Note:</span> {feedback.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {gameStats.currentPhase === 'results' && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-8">
            <div className="w-full max-w-md rounded-2xl border border-black/8 bg-white p-8 text-center shadow-[var(--bt-card-shadow)]">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Session complete</p>
              <h2 className="mt-3 font-light text-2xl text-neutral-900 md:text-3xl">Reading</h2>
              <p className="mt-4 text-3xl font-semibold tabular-nums text-neutral-900">{gameStats.score}</p>
              <p className="mt-2 text-sm text-neutral-600">
                {gameStats.correctAnswers}/{gameStats.totalQuestions} · {accuracy}% · {gameStats.readingSpeed} WPM ·{' '}
                {gameStats.passagesRead} passages
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
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
          </div>
        )}
      </div>
    </BrainGameShell>
  );
};

export default ReadingComprehensionGame;
