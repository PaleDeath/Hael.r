# Firestore Rules Deployment

## Issue
The Brain Training section was getting "Missing or insufficient permissions" errors because Firestore security rules didn't include permissions for the brain training collections.

## Solution
Added security rules for:
- `brain_training_sessions` - Game session records
- `brain_training_progress` - User progress summaries  
- `daily_challenges` - Daily challenge records
- `cognitive_assessments` - Cognitive assessment data

## Deployment Steps

### Option 1: Using Firebase CLI (Recommended)
```bash
firebase deploy --only firestore:rules
```

### Option 2: Using Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`haelr-462818`)
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules`
5. Paste into the rules editor
6. Click **Publish**

## Rules Summary

### brain_training_sessions
- **Read**: Users can read their own sessions
- **Create**: Users can create sessions with their userId
- **Update/Delete**: Disabled (sessions are immutable)

### brain_training_progress
- **Read**: Users can read their own progress (document ID = userId)
- **Create**: Users can create their own progress document
- **Update**: Users can update their own progress (prevents userId changes)

### daily_challenges
- **Read**: Users can read their own challenges
- **Create**: Users can create challenges with their userId
- **Update**: Users can update their own challenges
- **Delete**: Disabled

### cognitive_assessments
- **Read**: Users can read their own assessments
- **Create**: Users can create assessments with their userId
- **Update/Delete**: Disabled (assessments are immutable)

## Security Features
- All operations require authentication (`isAuthed()`)
- Users can only access their own data
- Prevents userId tampering
- Immutable records (sessions and assessments cannot be modified after creation)

## Testing After Deployment
1. Sign in to your app
2. Navigate to Brain Training page
3. Check browser console - permission errors should be gone
4. Try playing a game - it should save successfully
5. Check View Progress page - should load without errors
6. Try Daily Challenge - should load and save correctly

