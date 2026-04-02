# Brain Training System - Integration Guide

## Overview
The Hael.r brain training system includes comprehensive progress tracking, analytics, and achievement systems. This guide shows how to integrate games with the tracking system.

## Features Implemented

### ✅ Core Games
- **Memory Matrix** - Spatial memory training
- **Word Pairs** - Associative memory training
- **Sequence Recall** - Working memory training
- **Attention Trainer** - Selective attention training
- **Color Match** - Visual attention training
- **Dual Task** - Divided attention/multitasking training
- **Speed Match** - Processing speed training
- **Rapid Visual Processing** - Visual processing speed
- **Reaction Time** - Motor response speed
- **Mental Math** - Arithmetic fluency
- **Number Sequences** - Pattern recognition/executive function
- **Fraction Frenzy** - Mathematical reasoning

### ✅ Progress Tracking System
- User session persistence with Firebase
- Comprehensive analytics and statistics
- Performance trends and insights
- Cross-device synchronization for authenticated users

### ✅ Achievement System
- 5+ predefined achievements with different rarities
- Automatic detection and awarding
- XP system with level progression
- Visual achievement progress tracking

### ✅ Analytics Dashboard
- Overview of user performance
- Game-specific statistics
- Achievement progress visualization
- Level and XP tracking

## Integration Guide

### Using the useBrainTraining Hook

```typescript
import { useBrainTraining } from '../../hooks/useBrainTraining';

const MyBrainGame: React.FC = () => {
  const { saveGameResult, saving, error } = useBrainTraining();
  
  const handleGameComplete = async () => {
    const result = await saveGameResult({
      gameType: 'my-game', // Unique identifier for your game
      score: finalScore,
      level: currentLevel,
      accuracy: calculateAccuracy(), // Percentage (0-100)
      reactionTime: averageReactionTime, // Optional, in milliseconds
      duration: sessionDuration, // In seconds
      details: { // Optional game-specific data
        itemsCompleted: itemsCompleted,
        difficulty: difficultyLevel
      }
    });
    
    if (result) {
      // Game saved successfully, achievements may have been unlocked
      console.log('Session saved:', result);
    }
  };
  
  return (
    <div>
      {/* Your game UI */}
      {saving && <p>Saving progress...</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
};
```

### Manual Service Usage

```typescript
import BrainTrainingService from '../../services/brainTraining.service';

const service = BrainTrainingService.getInstance();

// Save a game session
const session = await service.saveGameSession({
  gameType: 'memory-matrix',
  score: 850,
  level: 5,
  accuracy: 87,
  reactionTime: 650,
  duration: 180,
  details: { gridSize: 4, patterns: 12 }
});

// Get user progress
const progress = await service.getUserProgress();

// Get analytics
const analytics = await service.getUserAnalytics(30); // Last 30 days
```

## Game Type Mapping

The system maps games to cognitive domains for tracking:

- **Memory Games**: `memory-matrix`, `word-pairs`, `sequence-recall`
- **Attention Games**: `attention-trainer`, `color-match`, `dual-task`
- **Processing Games**: `speed-match`, `rapid-visual`, `reaction-time`
- **Executive Games**: `mental-math`, `number-sequences`, `fraction-frenzy`

## Achievement System

### Current Achievements:
1. **First Steps** (Common) - Complete your first brain training game
2. **Score Master** (Uncommon) - Achieve a score of 1000 in any game
3. **Perfectionist** (Uncommon) - Achieve 100% accuracy in any game
4. **Speed Demon** (Rare) - Average reaction time under 300ms
5. **Cognitive Scholar** (Legendary) - Complete 100 brain training games

### Adding New Achievements:
Edit `src/services/brainTraining.service.ts` and add to the `ACHIEVEMENTS` array:

```typescript
{
  id: 'new_achievement',
  title: 'Achievement Title',
  description: 'Achievement description',
  icon: '🏆',
  type: 'score' | 'games_played' | 'accuracy' | 'speed',
  requirement: { value: 100, gameType?: 'specific-game' },
  xpReward: 250,
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}
```

## Mental Health Integration

The system is designed to integrate with the existing mental health assessment system:

- Cognitive performance correlates with mental health metrics
- Game recommendations based on assessment results
- Holistic view of user's cognitive and mental wellness

## Navigation Structure

- `/brain-training` - Main games selection page
- `/brain-training/game/:gameId` - Individual game pages
- `/brain-training/progress` - Progress tracking and analytics dashboard

## Data Storage

### Firebase Collections:
- `brain_training_sessions` - Individual game sessions
- `brain_training_progress` - User progress summaries
- `cognitive_assessments` - Mental health correlations

### Local Storage Fallback:
For non-authenticated users, basic stats are stored locally in `brainTrainingStats`.

## Best Practices

1. **Game Duration**: Track actual playing time, not idle time
2. **Accuracy Calculation**: Use consistent percentage (0-100) format
3. **Reaction Time**: Measure in milliseconds, exclude outliers
4. **Score Normalization**: Use consistent scoring across difficulty levels
5. **Error Handling**: Always handle Firebase connection issues gracefully

## Future Enhancements

### Planned Features:
- Advanced cognitive assessment integration
- Personalized training recommendations
- Social features and leaderboards
- Adaptive difficulty based on performance
- Detailed cognitive domain analysis
- Export progress reports

### Extension Points:
- Custom achievement conditions
- Game-specific analytics
- AI-powered recommendations
- Multiplayer competitions
- Progress sharing capabilities

## Example Implementation

See `DualTaskGame.tsx`, `NumberSequencesGame.tsx`, or `FractionFrenzyGame.tsx` for complete examples of games integrated with the progress tracking system.

The system is designed to be:
- **Easy to integrate** - Simple hook-based API
- **Comprehensive** - Tracks all relevant metrics
- **Extensible** - Easy to add new achievements and analytics
- **Reliable** - Handles offline scenarios and errors gracefully 