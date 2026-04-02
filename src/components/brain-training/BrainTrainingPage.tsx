import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  ChevronRight,
  Home,
  type LucideIcon,
  Target,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { readLocalBrainSessions, summarizeLocalSessions } from '../../services/brain-training-local.storage';
import './brain-training.css';

interface BrainTrainingStats {
  totalSessions: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  gamesPlayed: number;
  favoriteGame: string;
  cognitiveAreas: {
    memory: number;
    focus: number;
    processing: number;
    math: number;
    language: number;
  };
}

interface GameCategory {
  id: string;
  name: string;
  description: string;
  games: BrainGame[];
}

const CATEGORY_ICON: Record<
  string,
  { Icon: LucideIcon; ring: string; iconColor: string }
> = {
  memory: { Icon: Brain, ring: 'bg-violet-50', iconColor: 'text-violet-600' },
  focus: { Icon: Target, ring: 'bg-rose-50', iconColor: 'text-rose-600' },
  processing: { Icon: Zap, ring: 'bg-amber-50', iconColor: 'text-amber-600' },
  math: { Icon: Calculator, ring: 'bg-blue-50', iconColor: 'text-blue-600' },
  language: { Icon: BookOpen, ring: 'bg-emerald-50', iconColor: 'text-emerald-600' },
};

function CategoryGlyph({ categoryId, size = 'lg' }: { categoryId: string; size?: 'sm' | 'lg' }) {
  const meta = CATEGORY_ICON[categoryId] ?? CATEGORY_ICON.memory;
  const { Icon } = meta;
  const ring = size === 'lg' ? 'h-14 w-14' : 'h-9 w-9';
  const iconSz = size === 'lg' ? 'h-7 w-7' : 'h-4 w-4';
  return (
    <span
      className={`inline-flex ${ring} shrink-0 items-center justify-center rounded-full ${meta.ring}`}
      aria-hidden
    >
      <Icon className={`${iconSz} ${meta.iconColor}`} strokeWidth={1.75} />
    </span>
  );
}

function difficultyPillClass(difficulty: BrainGame['difficulty']): string {
  if (difficulty === 'Easy') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-900/10';
  if (difficulty === 'Medium') return 'bg-amber-50 text-amber-900 ring-1 ring-amber-900/10';
  return 'bg-rose-50 text-rose-800 ring-1 ring-rose-900/10';
}

interface BrainGame {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: number; // in minutes
  cognitiveArea: keyof BrainTrainingStats['cognitiveAreas'];
}

const BrainTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<BrainTrainingStats>({
    totalSessions: 0,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageScore: 0,
    gamesPlayed: 0,
    favoriteGame: 'None',
    cognitiveAreas: {
      memory: 0,
      focus: 0,
      processing: 0,
      math: 0,
      language: 0
    }
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Game categories and games data
  const gameCategories: GameCategory[] = [
    {
      id: 'memory',
      name: 'Memory',
      description: 'Strengthen your ability to remember and recall information',
      games: [
        {
          id: 'memory-matrix',
          name: 'Memory Matrix',
          description: 'Remember the positions of highlighted squares',
          category: 'memory',
          difficulty: 'Medium',
          duration: 3,
          cognitiveArea: 'memory'
        },
        {
          id: 'word-pairs',
          name: 'Word Pairs',
          description: 'Match pairs of related words from memory',
          category: 'memory',
          difficulty: 'Easy',
          duration: 5,
          cognitiveArea: 'memory'
        },
        {
          id: 'sequence-recall',
          name: 'Sequence Recall',
          description: 'Remember and repeat number sequences',
          category: 'memory',
          difficulty: 'Hard',
          duration: 4,
          cognitiveArea: 'memory'
        }
      ]
    },
    {
      id: 'focus',
      name: 'Focus & Attention',
      description: 'Improve your concentration and sustained attention',
      games: [
        {
          id: 'color-match',
          name: 'Color Match',
          description: 'Identify matching colors while ignoring distractions',
          category: 'focus',
          difficulty: 'Easy',
          duration: 3,
          cognitiveArea: 'focus'
        },
        {
          id: 'attention-trainer',
          name: 'Attention Trainer',
          description: 'Focus on specific targets while filtering out noise',
          category: 'focus',
          difficulty: 'Medium',
          duration: 4,
          cognitiveArea: 'focus'
        },
        {
          id: 'dual-task',
          name: 'Dual Task',
          description: 'Manage two tasks simultaneously',
          category: 'focus',
          difficulty: 'Hard',
          duration: 6,
          cognitiveArea: 'focus'
        }
      ]
    },
    {
      id: 'processing',
      name: 'Processing Speed',
      description: 'Enhance your mental processing speed and reaction time',
      games: [
        {
          id: 'speed-match',
          name: 'Speed Match',
          description: 'Quickly identify matching symbols',
          category: 'processing',
          difficulty: 'Easy',
          duration: 2,
          cognitiveArea: 'processing'
        },
        {
          id: 'rapid-visual',
          name: 'Rapid Visual Processing',
          description: 'Process visual information at high speed',
          category: 'processing',
          difficulty: 'Medium',
          duration: 3,
          cognitiveArea: 'processing'
        },
        {
          id: 'reaction-time',
          name: 'Reaction Time',
          description: 'Test and improve your reaction speed',
          category: 'processing',
          difficulty: 'Hard',
          duration: 2,
          cognitiveArea: 'processing'
        }
      ]
    },
    {
      id: 'math',
      name: 'Math Skills',
      description: 'Sharpen your numerical and mathematical abilities',
      games: [
        {
          id: 'mental-math',
          name: 'Mental Math',
          description: 'Solve arithmetic problems quickly',
          category: 'math',
          difficulty: 'Easy',
          duration: 4,
          cognitiveArea: 'math'
        },
        {
          id: 'number-sequences',
          name: 'Number Sequences',
          description: 'Complete numerical patterns and sequences',
          category: 'math',
          difficulty: 'Medium',
          duration: 5,
          cognitiveArea: 'math'
        },
        {
          id: 'fraction-frenzy',
          name: 'Fraction Frenzy',
          description: 'Work with fractions and percentages',
          category: 'math',
          difficulty: 'Hard',
          duration: 6,
          cognitiveArea: 'math'
        }
      ]
    },
    {
      id: 'language',
      name: 'Language & Vocabulary',
      description: 'Expand your vocabulary and language processing skills',
      games: [
        {
          id: 'word-builder',
          name: 'Word Builder',
          description: 'Create words from letter combinations',
          category: 'language',
          difficulty: 'Easy',
          duration: 4,
          cognitiveArea: 'language'
        },
        {
          id: 'synonym-challenge',
          name: 'Synonym Challenge',
          description: 'Find words with similar meanings',
          category: 'language',
          difficulty: 'Medium',
          duration: 5,
          cognitiveArea: 'language'
        },
        {
          id: 'reading-comprehension',
          name: 'Reading Comprehension',
          description: 'Understand and analyze written passages',
          category: 'language',
          difficulty: 'Hard',
          duration: 8,
          cognitiveArea: 'language'
        }
      ]
    }
  ];

  // Load stats function that can be called to refresh stats
  const loadStats = useCallback(async () => {
      try {
        setLoading(true);
        
        if (currentUser) {
          const brainTrainingService = (await import('../../services/brain-training.service')).default.getInstance();

          try {
            const migrated = await brainTrainingService.migrateGuestLocalSessionsToCloud();
            if (migrated > 0) {
              console.info(`Brain training: uploaded ${migrated} guest session(s) to your account`);
            }
          } catch (migrationErr) {
            console.warn('Brain training guest upload skipped:', migrationErr);
          }

          try {
            const flushed = await brainTrainingService.flushPendingGameResultsFromLocalStorage();
            if (flushed > 0) {
              console.info(`Brain training: synced ${flushed} queued session(s) to the cloud`);
            }
          } catch (flushErr) {
            console.warn('Brain training pending sync incomplete:', flushErr);
          }

          const emptyStats: BrainTrainingStats = {
            totalSessions: 0,
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageScore: 0,
            gamesPlayed: 0,
            favoriteGame: 'None',
            cognitiveAreas: { memory: 0, focus: 0, processing: 0, math: 0, language: 0 },
          };

          const applyLocalFallback = () => {
            const sessions = readLocalBrainSessions().filter(
              (s) => s.userId === currentUser.uid || s.userId === 'local_user'
            );
            if (sessions.length === 0) {
              setStats(emptyStats);
              return;
            }
            const summary = summarizeLocalSessions(sessions);
            setStats({
              totalSessions: summary.totalSessions,
              totalPoints: summary.totalPoints,
              currentStreak: summary.currentStreak,
              longestStreak: summary.currentStreak,
              averageScore: summary.averageScore,
              gamesPlayed: summary.totalSessions,
              favoriteGame: summary.favoriteGame,
              cognitiveAreas: {
                memory: sessions.filter((s) => s.cognitiveArea === 'memory').length * 10,
                focus: sessions.filter((s) => s.cognitiveArea === 'attention' || s.cognitiveArea === 'focus').length * 10,
                processing: sessions.filter((s) => s.cognitiveArea === 'processing').length * 10,
                math: sessions.filter((s) => s.cognitiveArea === 'executive' || s.cognitiveArea === 'math').length * 10,
                language: sessions.filter((s) => s.cognitiveArea === 'language').length * 10,
              },
            });
          };

          try {
            const userProgress = await brainTrainingService.getUserProgress();

            if (userProgress) {
              try {
                await brainTrainingService.getUserAnalytics(365);
              } catch (error) {
                console.warn('Error loading analytics, using progress data only:', error);
              }
              const totalSessions = userProgress.totalGamesPlayed;

              const newStats: BrainTrainingStats = {
                totalSessions,
                totalPoints: userProgress.totalScore,
                currentStreak: userProgress.currentStreaks?.daily || 0,
                longestStreak: Math.max(...Object.values(userProgress.currentStreaks || {})) || 0,
                averageScore: userProgress.averageAccuracy,
                gamesPlayed: totalSessions,
                favoriteGame:
                  Object.entries(userProgress.gamesPlayedByType).sort(([, a], [, b]) => b - a)[0]?.[0] ||
                  'None',
                cognitiveAreas: {
                  memory: userProgress.cognitiveScores.memory,
                  focus: userProgress.cognitiveScores.attention,
                  processing: userProgress.cognitiveScores.processing,
                  math: userProgress.cognitiveScores.executive,
                  language: userProgress.cognitiveScores.executive,
                },
              };

              setStats(newStats);
            } else {
              setStats(emptyStats);
            }
          } catch (firebaseErr) {
            console.error('Brain training: cloud stats unavailable, using device copy', firebaseErr);
            applyLocalFallback();
          }
        } else {
          console.log('BrainTrainingPage: Loading stats for guest user');
          // Load from localStorage for guest users
          const savedProgress = localStorage.getItem('brainTrainingProgress');
          const savedSessions = localStorage.getItem('brainTrainingSessions');
          
          if (savedProgress || savedSessions) {
            let progress: any = {};
            let sessions: any[] = [];
            
            if (savedProgress) {
              progress = JSON.parse(savedProgress);
            }
            
            if (savedSessions) {
              sessions = JSON.parse(savedSessions);
            }
            
            // Convert new format to old format for compatibility
            const newStats: BrainTrainingStats = {
              totalSessions: sessions.length || progress.totalSessions || 0,
              totalPoints: sessions.reduce((sum: number, session: any) => sum + (session.score || 0), 0) || progress.totalPoints || 0,
              currentStreak: progress.currentStreak || 0,
              longestStreak: progress.longestStreak || 0,
              averageScore: sessions.length > 0 
                ? Math.round(sessions.reduce((sum: number, session: any) => sum + (session.accuracy || 0), 0) / sessions.length)
                : progress.averageScore || 0,
              gamesPlayed: sessions.length || progress.totalSessions || 0,
              favoriteGame: progress.favoriteGame || 'None',
              cognitiveAreas: {
                memory: sessions.filter((s: any) => s.cognitiveArea === 'memory').length * 10,
                focus: sessions.filter((s: any) => s.cognitiveArea === 'attention' || s.cognitiveArea === 'focus').length * 10,
                processing: sessions.filter((s: any) => s.cognitiveArea === 'processing').length * 10,
                math: sessions.filter((s: any) => s.cognitiveArea === 'executive' || s.cognitiveArea === 'math').length * 10,
                language: sessions.filter((s: any) => s.cognitiveArea === 'language').length * 10,
              }
            };
            
            setStats(newStats);
          } else {
            // Fallback to old format
            const oldStats = localStorage.getItem('brainTrainingStats');
            if (oldStats) {
              setStats(JSON.parse(oldStats));
            }
          }
        }
      } catch (error) {
        console.error('Error loading brain training stats:', error);
      } finally {
        setLoading(false);
      }
    }, [currentUser]);

  // Load stats on component mount and when user changes
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Listen for stats update events from games
  useEffect(() => {
    const handleStatsUpdate = () => {
      console.log('BrainTrainingPage: Received stats update event, reloading stats');
      loadStats();
    };

    window.addEventListener('brainTrainingStatsUpdate', handleStatsUpdate);

    return () => {
      window.removeEventListener('brainTrainingStatsUpdate', handleStatsUpdate);
    };
  }, [loadStats]);

  // Get all games or filtered by category
  const getFilteredGames = (): BrainGame[] => {
    if (selectedCategory === 'all') {
      return gameCategories.flatMap(category => category.games);
    }
    const category = gameCategories.find(cat => cat.id === selectedCategory);
    return category ? category.games : [];
  };

  // Handle game selection
  const handleGameSelect = (game: BrainGame) => {
    navigate(`/brain-training/game/${game.id}`, { state: { game } });
  };

  // Handle daily challenge start (removed feature)
  // const handleDailyChallengeStart = () => {
  //   // This will be called when challenge starts, can be used for analytics
  //   console.log('Daily challenge started');
  // };

  const listVariants = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reduceMotion ? 0 : 0.05, delayChildren: reduceMotion ? 0 : 0.04 },
    },
  };

  const cardVariants = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 20, scale: reduceMotion ? 1 : 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
    },
    exit: {
      opacity: reduceMotion ? 1 : 0,
      scale: reduceMotion ? 1 : 0.95,
      transition: { duration: reduceMotion ? 0 : 0.2 },
    },
  };

  return (
    <div className="brain-training-root bt-hub min-h-[min(100dvh,100vh)]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:px-8 md:pt-16">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <motion.h1
              className="font-light tracking-wide text-neutral-900 text-4xl md:text-5xl"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              Daily Training
            </motion.h1>
            <p className="mt-3 max-w-md text-sm text-neutral-500 md:text-base">
              Pick a game. Short sessions, sharp focus.
            </p>
            <p className="mt-3 text-xs text-neutral-500 md:text-sm">
              {stats.totalPoints.toLocaleString()} pts · streak {stats.currentStreak}d · {stats.totalSessions} runs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => navigate('/brain-training/progress')}
              className="flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm backdrop-blur-sm"
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              aria-label="Open progress and achievements"
            >
              <BarChart3 className="h-5 w-5" aria-hidden />
              Progress
            </motion.button>
            <motion.button
              type="button"
              onClick={() => navigate('/')}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-black/10 bg-white/90 text-neutral-900 shadow-sm backdrop-blur-sm"
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              aria-label="Back to home"
            >
              <Home className="h-5 w-5" aria-hidden />
            </motion.button>
          </div>
        </header>

        {!currentUser && (
          <p className="mb-8 rounded-2xl border border-black/8 bg-white/80 px-4 py-3 text-xs text-neutral-600 shadow-sm md:text-sm">
            Playing as guest — progress stays on this device. Sign in to sync.
          </p>
        )}

        <nav className="bt-category-scroller mb-10 gap-2" aria-label="Game categories">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`bt-category-chip rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-black/15 bg-transparent text-neutral-900 hover:border-black/25'
            }`}
            aria-pressed={selectedCategory === 'all'}
            aria-label="Show all games"
          >
            All
          </button>
          {gameCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`bt-category-chip flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-black/15 bg-transparent text-neutral-900 hover:border-black/25'
              }`}
              aria-pressed={selectedCategory === category.id}
              aria-label={`Category ${category.name}`}
            >
              <CategoryGlyph categoryId={category.id} size="sm" />
              {category.name}
            </button>
          ))}
        </nav>

        <motion.div
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
          variants={listVariants}
          initial="hidden"
          animate="show"
          layout
        >
          <AnimatePresence mode="popLayout">
            {getFilteredGames().map((game) => {
              const category = gameCategories.find((cat) => cat.id === game.category);
              return (
                <motion.div
                  key={game.id}
                  layout
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="h-full"
                >
                  <motion.button
                    type="button"
                    onClick={() => handleGameSelect(game)}
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="group flex h-full w-full flex-col rounded-2xl border border-[var(--bt-card-border)] bg-[var(--bt-card-bg)] p-6 text-left shadow-[var(--bt-card-shadow)] transition-[box-shadow] duration-200 hover:shadow-[var(--bt-card-shadow-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F5F0]"
                    aria-label={`Play ${game.name}. ${game.description}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {category && <CategoryGlyph categoryId={category.id} size="lg" />}
                      <ChevronRight
                        className="mt-1 h-5 w-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold tracking-tight text-neutral-900 md:text-xl">
                      {game.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${difficultyPillClass(game.difficulty)}`}
                      >
                        {game.difficulty}
                      </span>
                      <button
                        type="button"
                        className="md:hidden text-xs font-medium text-neutral-500 underline decoration-neutral-300 underline-offset-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId((id) => (id === game.id ? null : game.id));
                        }}
                        aria-expanded={expandedId === game.id}
                      >
                        {expandedId === game.id ? 'Hide details' : 'Details'}
                      </button>
                    </div>
                    <p
                      className={`mt-3 text-sm leading-relaxed text-neutral-600 ${
                        expandedId === game.id
                          ? 'block opacity-100 md:max-h-48 md:opacity-100'
                          : 'hidden md:block md:max-h-0 md:overflow-hidden md:opacity-0 md:transition-[max-height,opacity] md:duration-200 md:group-hover:max-h-32 md:group-hover:opacity-100'
                      }`}
                    >
                      {game.description}
                    </p>
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default BrainTrainingPage; 