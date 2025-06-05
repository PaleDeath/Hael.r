import { Question, MentalHealthCategory } from './types';
import { allQuestions as questions } from './questions';

const determinePriorityCategory = (
  answers: Record<string, number>
): MentalHealthCategory => {
  // Count high scores by category
  const categoryScores: Record<MentalHealthCategory, number> = {
    anxiety: 0,
    depression: 0,
    stress: 0,
    sleep: 0,
    social: 0
  }
  Object.entries(answers).forEach(([questionId, value]) => {
    const question = questions.find((q: Question) => q.id === questionId);
    if (question) {
      categoryScores[question.category] += value;
    }
  });


  const categoryCounts: Record<MentalHealthCategory, number> = {
    anxiety: 0,
    depression: 0,
    stress: 0,
    sleep: 0,
    social: 0
  };

  Object.keys(answers).forEach(questionId => {
    const question = questions.find((q: Question) => q.id === questionId);
    if (question) {
      categoryCounts[question.category]++;
    }
  });

  // Calculate priority scores (high value answers + low question count = high priority)
  const priorityScores: Record<MentalHealthCategory, number> = {} as Record<MentalHealthCategory, number>;
  
  Object.keys(categoryScores).forEach(category => {
    const categoryKey = category as MentalHealthCategory;
    const averageScore = categoryCounts[categoryKey] > 0 
      ? categoryScores[categoryKey] / categoryCounts[categoryKey] 
      : 0;
    // Higher scores and lower counts create higher priority
    priorityScores[categoryKey] = averageScore * (3 - Math.min(categoryCounts[categoryKey], 2));
  });

  // Find the highest priority category
  let maxScore = -1;
  let priorityCategory: MentalHealthCategory = 'anxiety'; // Default

  Object.entries(priorityScores).forEach(([category, score]) => {
    if (score > maxScore) {
      maxScore = score;
      priorityCategory = category as MentalHealthCategory;
    }
  });

  return priorityCategory;
};

// Determine the next question based on previous answers
export const determineNextQuestion = (
  currentQuestion: Question,
  answers: Record<string, number>,
  questionHistory: Question[]
): Question => {
  // If we've answered fewer than 2 questions, follow a fixed path to gather baseline data
  if (Object.keys(answers).length < 2) {
    // Return the next question in the sequence
    const currentIndex = questions.findIndex((q: Question) => q.id === currentQuestion.id);
    return questions[currentIndex + 1];
  }

  // Get a count of questions asked per category
  const categoryQuestionCounts: Record<MentalHealthCategory, number> = {
    anxiety: 0,
    depression: 0,
    stress: 0,
    sleep: 0,
    social: 0
  };
  
  // Count questions asked per category
  questionHistory.forEach(question => {
    categoryQuestionCounts[question.category]++;
  });
  
  // Check if any categories have zero questions asked
  const uncoveredCategories = Object.entries(categoryQuestionCounts)
    .filter(([_, count]) => count === 0)
    .map(([category]) => category as MentalHealthCategory);
  
  // If there are uncovered categories, prioritize asking a question from one of them
  if (uncoveredCategories.length > 0) {
    const targetCategory = uncoveredCategories[0];
    const askedQuestionIds = questionHistory.map(q => q.id);
    const candidateQuestions = questions.filter((q: Question) => 
      q.category === targetCategory && !askedQuestionIds.includes(q.id)
    );
    
    if (candidateQuestions.length > 0) {
      return candidateQuestions[0];
    }
  }

  // After ensuring all categories are covered or if no questions available in uncovered categories,
  // proceed with adaptive logic
  const priorityCategory = determinePriorityCategory(answers);
  
  // Get all questions in the priority category that haven't been asked yet
  const askedQuestionIds = questionHistory.map(q => q.id);
  const candidateQuestions = questions.filter((q: Question) => 
    q.category === priorityCategory && !askedQuestionIds.includes(q.id)
  );

  // If there are no more questions in the priority category, get questions from any category
  if (candidateQuestions.length === 0) {
    const remainingQuestions = questions.filter((q: Question) => !askedQuestionIds.includes(q.id));
    
    if (remainingQuestions.length === 0) {
      // We've asked all questions - return the first one as a fallback
      // In practice, the quiz should end before this happens
      return questions[0];
    }
    
    // Return a random remaining question
    return remainingQuestions[Math.floor(Math.random() * remainingQuestions.length)];
  }

  // Return a question from the priority category
  return candidateQuestions[0];
};

// More complex logic could be added here, such as:
// 1. Response pattern analysis (detecting inconsistent answers)
// 2. Follow-up questions for high-risk responses
// 3. Integration with an API for more sophisticated question selection 