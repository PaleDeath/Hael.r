import React, { Suspense, lazy } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { GameResultProvider } from './GameResultProvider';
import './brain-training.css';

const MemoryMatrixGame = lazy(() => import('./games/MemoryMatrixGame'));
const ColorMatchGame = lazy(() => import('./games/ColorMatchGame'));
const ReactionTimeGame = lazy(() => import('./games/ReactionTimeGame'));
const MentalMathGame = lazy(() => import('./games/MentalMathGame'));
const SpeedMatchGame = lazy(() => import('./games/SpeedMatchGame'));
const WordPairsGame = lazy(() => import('./games/WordPairsGame'));
const SequenceRecallGame = lazy(() => import('./games/SequenceRecallGame'));
const AttentionTrainerGame = lazy(() => import('./games/AttentionTrainerGame'));
const DualTaskGame = lazy(() => import('./games/DualTaskGame'));
const RapidVisualGame = lazy(() => import('./games/RapidVisualGame'));
const NumberSequencesGame = lazy(() => import('./games/NumberSequencesGame'));
const FractionFrenzyGame = lazy(() => import('./games/FractionFrenzyGame'));
const WordBuilderGame = lazy(() => import('./games/WordBuilderGame'));
const SynonymChallengeGame = lazy(() => import('./games/SynonymChallengeGame'));
const ReadingComprehensionGame = lazy(() => import('./games/ReadingComprehensionGame'));

const GameSuspenseFallback: React.FC = () => (
  <div
    className="brain-training-root bt-hub flex min-h-[50vh] items-center justify-center bg-[#F5F5F0]"
    role="status"
    aria-label="Loading game"
  >
    <div
      className="h-12 w-12 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent"
      aria-hidden
    />
  </div>
);

const BrainTrainingGameRouter: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();

  const wrapGame = (GameComponent: React.LazyExoticComponent<React.ComponentType>) => (
    <GameResultProvider>
      <Suspense fallback={<GameSuspenseFallback />}>
        <GameComponent />
      </Suspense>
    </GameResultProvider>
  );

  switch (gameId) {
    case 'memory-matrix':
      return wrapGame(MemoryMatrixGame);
    case 'word-pairs':
      return wrapGame(WordPairsGame);
    case 'sequence-recall':
      return wrapGame(SequenceRecallGame);
    case 'color-match':
      return wrapGame(ColorMatchGame);
    case 'attention-trainer':
      return wrapGame(AttentionTrainerGame);
    case 'dual-task':
      return wrapGame(DualTaskGame);
    case 'speed-match':
      return wrapGame(SpeedMatchGame);
    case 'rapid-visual':
      return wrapGame(RapidVisualGame);
    case 'reaction-time':
      return wrapGame(ReactionTimeGame);
    case 'mental-math':
      return wrapGame(MentalMathGame);
    case 'number-sequences':
      return wrapGame(NumberSequencesGame);
    case 'fraction-frenzy':
      return wrapGame(FractionFrenzyGame);
    case 'word-builder':
      return wrapGame(WordBuilderGame);
    case 'synonym-challenge':
      return wrapGame(SynonymChallengeGame);
    case 'reading-comprehension':
      return wrapGame(ReadingComprehensionGame);
    default:
      return <Navigate to="/brain-training" replace />;
  }
};

export default BrainTrainingGameRouter;
