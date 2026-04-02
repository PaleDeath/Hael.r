import React, { useState, useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Award,
  Zap,
  Eye,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import BrainTrainingService, { UserProgress, Achievement, ACHIEVEMENTS } from '../../services/brain-training.service';
import { ProgressBar } from './ui/ProgressBar';
import './brain-training.css';
import {
  readLocalBrainSessions,
  localSessionsToUserProgress,
} from '../../services/brain-training-local.storage';

const BrainTrainingProgress: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements'>('overview');

  const brainTrainingService = BrainTrainingService.getInstance();

  useEffect(() => {
    loadProgressData();
  }, [currentUser]); // Reload when auth state changes

  const loadProgressData = async () => {
    try {
      setLoading(true);
      
      if (currentUser) {
        try {
          try {
            const migrated = await brainTrainingService.migrateGuestLocalSessionsToCloud();
            if (migrated > 0) console.info(`Brain training: uploaded ${migrated} guest session(s)`);
          } catch (e) {
            console.warn('Brain training guest migration:', e);
          }
          try {
            const flushed = await brainTrainingService.flushPendingGameResultsFromLocalStorage();
            if (flushed > 0) console.info(`Brain training: synced ${flushed} queued session(s)`);
          } catch (e) {
            console.warn('Brain training queue flush:', e);
          }

          const [progressData, analyticsData] = await Promise.all([
            brainTrainingService.getUserProgress(),
            brainTrainingService.getUserAnalytics(30)
          ]);

          setProgress(progressData);
          setAnalytics(analyticsData || {
            totalSessions: 0,
            gameTypes: [],
            dailyStats: [],
            performanceByGame: [],
            cognitiveProgress: []
          });
        } catch (error) {
          console.error('Error loading cloud progress:', error);
          try {
            const progressData = await brainTrainingService.getUserProgress();
            setProgress(progressData);
            setAnalytics({
              totalSessions: 0,
              gameTypes: [],
              dailyStats: [],
              performanceByGame: [],
              cognitiveProgress: []
            });
          } catch (progressError) {
            console.error('Cloud progress unavailable, showing device copy:', progressError);
            const sessions = readLocalBrainSessions().filter(
              (s) => s.userId === currentUser.uid || s.userId === 'local_user'
            );
            if (sessions.length === 0) {
              setProgress(null);
              setAnalytics(null);
            } else {
              const localProgress = localSessionsToUserProgress(currentUser.uid, sessions);
              setProgress(localProgress);
              setAnalytics({
                totalSessions: sessions.length,
                gameTypes: [...new Set(sessions.map((s) => s.gameType))],
                dailyStats: [],
                performanceByGame: Object.keys(localProgress.gamesPlayedByType).map((gameType) => ({
                  name: gameType,
                  sessions: localProgress.gamesPlayedByType[gameType],
                  bestScore: localProgress.bestScoresByType[gameType],
                  averageAccuracy: localProgress.averageAccuracy
                })),
                cognitiveProgress: []
              });
            }
          }
        }
      } else {
        // Load from localStorage for non-authenticated users
        const savedProgress = localStorage.getItem('brainTrainingProgress');
        const savedSessions = localStorage.getItem('brainTrainingSessions');
        
        if (savedSessions || savedProgress) {
          let sessions: any[] = [];
          let localProgress: any = {};
          
          // Try to get individual sessions first (more reliable)
          if (savedSessions) {
            sessions = JSON.parse(savedSessions);
          }
          
          // Get saved progress summary as fallback
          if (savedProgress) {
            localProgress = JSON.parse(savedProgress);
          }
          
          // Calculate stats from sessions if available, otherwise use saved progress
          const gamesPlayedByType: Record<string, number> = {};
          const bestScoresByType: Record<string, number> = {};
          let totalAccuracy = 0;
          let totalReactionTime = 0;
          let accuracyCount = 0;
          let reactionTimeCount = 0;
          
          sessions.forEach((session: any) => {
            const gameType = session.gameType;
            if (!gamesPlayedByType[gameType]) {
              gamesPlayedByType[gameType] = 0;
              bestScoresByType[gameType] = 0;
            }
            gamesPlayedByType[gameType]++;
            bestScoresByType[gameType] = Math.max(
              bestScoresByType[gameType],
              session.score || 0
            );
            
            if (session.accuracy !== undefined) {
              totalAccuracy += session.accuracy;
              accuracyCount++;
            }
            
            if (session.reactionTime !== undefined) {
              totalReactionTime += session.reactionTime;
              reactionTimeCount++;
            }
          });
          
          const progress = {
            userId: 'local_user',
            totalGamesPlayed: sessions.length || localProgress.totalSessions || 0,
            totalScore: sessions.reduce((sum: number, session: any) => sum + (session.score || 0), 0) || localProgress.totalPoints || 0,
            averageAccuracy: accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : localProgress.averageScore || 0,
            averageReactionTime: reactionTimeCount > 0 ? Math.round(totalReactionTime / reactionTimeCount) : 0,
            gamesPlayedByType,
            bestScoresByType,
            lastPlayedAt: sessions.length > 0 ? new Date(sessions[sessions.length - 1].timestamp) : new Date(),
            totalPlayTime: sessions.reduce((sum: number, session: any) => sum + (session.duration || 0), 0),
            achievements: [],
            level: Math.floor((sessions.length || localProgress.totalSessions || 0) / 10) + 1,
            xp: (sessions.length || localProgress.totalSessions || 0) * 50,
            currentStreaks: { daily: 0, weekly: 0, monthly: 0 },
            cognitiveScores: { memory: 0, attention: 0, processing: 0, executive: 0 }
          };
          
          setProgress(progress);
          
          // Create analytics for local storage
          setAnalytics({
            performanceByGame: Object.keys(gamesPlayedByType).map(gameType => ({
              name: gameType,
              sessions: gamesPlayedByType[gameType],
              bestScore: bestScoresByType[gameType],
              averageAccuracy: progress.averageAccuracy
            }))
          });
        } else {
          // No saved progress
          setProgress(null);
          setAnalytics(null);
        }
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUnlockedAchievements = () => {
    return ACHIEVEMENTS.filter(achievement => 
      progress?.achievements.includes(achievement.id)
    );
  };

  const getAchievementProgress = (achievement: Achievement) => {
    if (!progress) return 0;
    
    switch (achievement.type) {
      case 'games_played':
        if (achievement.requirement.gameType) {
          return (progress.gamesPlayedByType[achievement.requirement.gameType] || 0) / achievement.requirement.value * 100;
        }
        return progress.totalGamesPlayed / achievement.requirement.value * 100;
      case 'score':
        return Math.min(100, (Math.max(...Object.values(progress.bestScoresByType)) || 0) / achievement.requirement.value * 100);
      case 'accuracy':
        return Math.min(100, progress.averageAccuracy / achievement.requirement.value * 100);
      case 'speed':
        return Math.min(100, achievement.requirement.value / (progress.averageReactionTime || 1000) * 100);
      default:
        return 0;
    }
  };

  const getRarityStyle = (rarity: string): CSSProperties => {
    switch (rarity) {
      case 'legendary':
        return { boxShadow: '0 0 28px rgba(234, 179, 8, 0.45)' };
      case 'epic':
        return { boxShadow: '0 0 20px rgba(120, 113, 108, 0.35)' };
      case 'rare':
        return { boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)' };
      case 'uncommon':
        return { boxShadow: '0 0 16px rgba(52, 211, 153, 0.35)' };
      default:
        return {};
    }
  };

  const rarityBadgeClass = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-slate-700 bg-slate-100';
      case 'uncommon':
        return 'text-emerald-800 bg-emerald-100';
      case 'rare':
        return 'text-blue-800 bg-blue-100';
      case 'epic':
        return 'text-purple-800 bg-purple-100';
      case 'legendary':
        return 'text-amber-900 bg-amber-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  if (loading) {
    return (
      <div className="brain-training-root bt-hub flex min-h-[min(100dvh,100vh)] items-center justify-center bg-[#F5F5F0]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent"
            aria-hidden
          />
          <p className="text-neutral-600">Loading progress…</p>
        </div>
      </div>
    );
  }

  const xpIntoLevel = progress ? progress.xp % 1000 : 0;
  const xpFrac = progress ? xpIntoLevel / 1000 : 0;

  return (
    <div className="brain-training-root bt-hub min-h-[min(100dvh,100vh)] bg-[#F5F5F0]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/brain-training')}
            className="flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm backdrop-blur-sm"
            aria-label="Back to training games"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Training
          </button>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-amber-600" aria-hidden />
            <h1 className="text-2xl font-light tracking-wide text-neutral-900 md:text-3xl">Your arc</h1>
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-white">
              Lv {progress?.level || 1}
            </span>
          </div>
        </header>

        <div className="mb-8 flex gap-2 rounded-2xl border border-black/8 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
          {[
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'achievements' as const, label: 'Achievements', icon: Award },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              aria-pressed={activeTab === tab.id}
            >
              <tab.icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </button>
          ))}
        </div>

        {progress && (
          <motion.section
            className="mb-10 rounded-2xl p-6 bt-glass"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-3 flex justify-between text-sm font-medium" style={{ color: 'var(--bt-text-muted)' }}>
              <span>Experience</span>
              <span>
                {progress.xp} / {progress.level * 1000} XP
              </span>
            </div>
            <ProgressBar progress={xpFrac} aria-label="Experience toward next level" />
          </motion.section>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && progress && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {[
                { label: 'Games', value: progress.totalGamesPlayed, icon: Target },
                { label: 'Score', value: progress.totalScore.toLocaleString(), icon: Trophy },
                { label: 'Accuracy', value: `${progress.averageAccuracy}%`, icon: Eye },
                { label: 'Avg ms', value: `${progress.averageReactionTime} ms`, icon: Zap },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-5 bt-glass">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--bt-text-muted)' }}>
                    <s.icon className="h-4 w-4 text-neutral-700" aria-hidden />
                    {s.label}
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--bt-text)' }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {analytics && analytics.performanceByGame && (
              <div className="rounded-2xl p-6 bt-glass">
                <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--bt-text)' }}>
                  By game
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {analytics.performanceByGame.map((game: { name: string; sessions: number; bestScore: number; averageAccuracy: number }) => (
                    <div key={game.name} className="rounded-xl border p-4" style={{ borderColor: 'var(--bt-surface-border)' }}>
                      <div className="mb-2 font-semibold capitalize" style={{ color: 'var(--bt-text)' }}>
                        {game.name.replace('-', ' ')}
                      </div>
                      <div className="space-y-1 text-sm" style={{ color: 'var(--bt-text-muted)' }}>
                        <div className="flex justify-between">
                          <span>Sessions</span>
                          <span className="font-semibold" style={{ color: 'var(--bt-text)' }}>
                            {game.sessions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Best</span>
                          <span className="font-semibold text-emerald-600">{game.bestScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg acc</span>
                          <span className="font-semibold text-neutral-800">{game.averageAccuracy}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl p-6 bt-glass">
              <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--bt-text)' }}>
                Latest badges
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {getUnlockedAchievements()
                  .slice(-4)
                  .map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex gap-4 rounded-xl border p-4"
                      style={{
                        borderColor: 'var(--bt-surface-border)',
                        ...getRarityStyle(achievement.rarity),
                      }}
                    >
                      <div className="text-3xl" aria-hidden>
                        {achievement.icon}
                      </div>
                      <div>
                        <div className="font-bold" style={{ color: 'var(--bt-text)' }}>
                          {achievement.title}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--bt-text-muted)' }}>
                          {achievement.description}
                        </div>
                        <div
                          className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${rarityBadgeClass(achievement.rarity)}`}
                        >
                          {achievement.rarity.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                {getUnlockedAchievements().length === 0 && (
                  <div className="col-span-2 py-8 text-center" style={{ color: 'var(--bt-text-muted)' }}>
                    <Award className="mx-auto mb-2 h-12 w-12 opacity-50" aria-hidden />
                    <p>Play a round to unlock your first badge.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6 bt-glass">
              <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--bt-text)' }}>
                Badges {getUnlockedAchievements().length}/{ACHIEVEMENTS.length}
              </h3>
              <ProgressBar
                progress={getUnlockedAchievements().length / ACHIEVEMENTS.length}
                aria-label="Achievement collection progress"
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {ACHIEVEMENTS.map((achievement) => {
                  const isUnlocked = progress?.achievements.includes(achievement.id) || false;
                  const progressPercent = getAchievementProgress(achievement);

                  return (
                    <div
                      key={achievement.id}
                      className="rounded-xl border-2 p-4 transition-all"
                      style={{
                        borderColor: 'var(--bt-surface-border)',
                        background: isUnlocked ? 'var(--bt-surface)' : 'transparent',
                        ...(isUnlocked ? getRarityStyle(achievement.rarity) : {}),
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`} aria-hidden>
                          {achievement.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold" style={{ color: isUnlocked ? 'var(--bt-text)' : 'var(--bt-text-muted)' }}>
                            {achievement.title}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--bt-text-muted)' }}>
                            {achievement.description}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${rarityBadgeClass(achievement.rarity)}`}>
                              {achievement.rarity.toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-neutral-600">+{achievement.xpReward} XP</span>
                          </div>
                          {!isUnlocked && progressPercent > 0 && (
                            <div className="mt-3">
                              <ProgressBar
                                progress={Math.min(progressPercent, 100) / 100}
                                aria-label={`Progress toward ${achievement.title}`}
                              />
                              <div className="mt-1 text-xs" style={{ color: 'var(--bt-text-muted)' }}>
                                {Math.round(progressPercent)}% to unlock
                              </div>
                            </div>
                          )}
                        </div>
                        {isUnlocked && <Award className="h-6 w-6 shrink-0 text-emerald-500" aria-hidden />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrainTrainingProgress; 