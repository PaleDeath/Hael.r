export interface Question {
  id: string;
  text: string;
  category: MentalHealthCategory;
  type: QuestionType;
  options: Answer[];
  weight: number;
  source?: string;
  followUp?: boolean;
}

export interface Answer {
  text: string;
  value: number;
}

export type MentalHealthCategory = 
  | 'anxiety'
  | 'depression'
  | 'stress'
  | 'sleep'
  | 'social';

export type QuestionType = 
  | 'multiple-choice'
  | 'scale'
  | 'yes-no';

export interface QuizState {
  currentQuestionIndex: number;
  answers: Record<string, number>;
  completed: boolean;
  questionPath: string[];
}

export interface AnalysisResult {
  categories: Record<MentalHealthCategory, {
    score: number;
    severity: 'low' | 'moderate' | 'high';
    summary: string;
  }>;
  overallAnalysis: string;
  recommendations: string[];
}

// Daily Mood Tracking Types
export interface MoodEntry {
  id: string;
  date: string;
  mood: number; // 1-10 scale
  energy: number; // 1-10 scale
  sleep: number; // hours
  activities: string[];
  notes: string;
  tags: string[];
}

export interface MoodState {
  entries: MoodEntry[];
  streak: number;
  lastEntryDate: string | null;
}

export type MoodActivity = 
  | 'exercise'
  | 'meditation'
  | 'reading'
  | 'socializing'
  | 'work'
  | 'hobbies'
  | 'nature'
  | 'rest';

export type MoodTag = 
  | 'stressed'
  | 'motivated'
  | 'anxious'
  | 'calm'
  | 'sad'
  | 'happy'
  | 'tired'
  | 'energetic'
  | 'distracted'
  | 'focused'; 