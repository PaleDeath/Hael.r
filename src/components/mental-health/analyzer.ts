import { Question, AnalysisResult, MentalHealthCategory } from './types';
import { questions } from './questions';

const calculateCategoryScore = (
  answers: Record<string, number>,
  category: MentalHealthCategory
): number => {
  const categoryQuestions = questions.filter(q => q.category === category);
  const answeredQuestions = categoryQuestions.filter(q => answers[q.id] !== undefined);
  
  // If no questions in this category were answered, return 0
  if (answeredQuestions.length === 0) return 0;
  
  // Calculate based only on answered questions
  const maxPossibleScore = answeredQuestions.length * 3; // max value per question is 3
  
  const totalScore = answeredQuestions.reduce((sum, question) => {
    return sum + (answers[question.id] || 0) * question.weight;
  }, 0);

  return (totalScore / maxPossibleScore) * 100;
};

const getSeverityLevel = (score: number): 'low' | 'moderate' | 'high' => {
  if (score < 33) return 'low';
  if (score < 66) return 'moderate';
  return 'high';
};

const getCategorySummary = (
  category: MentalHealthCategory, 
  severity: 'low' | 'moderate' | 'high',
  score: number
): string => {
  // Basic summaries
  const baseSummaries = {
    anxiety: {
      low: "Your anxiety levels appear to be within a manageable range.",
      moderate: "You're experiencing moderate levels of anxiety that may benefit from attention.",
      high: "You're showing signs of significant anxiety that should be addressed."
    },
    depression: {
      low: "Your responses suggest minimal signs of depression.",
      moderate: "You're showing some signs of depression that may need attention.",
      high: "Your responses indicate significant depressive symptoms."
    },
    stress: {
      low: "Your stress levels appear to be well-managed.",
      moderate: "You're experiencing moderate stress that may impact your wellbeing.",
      high: "You're dealing with high levels of stress that need attention."
    },
    sleep: {
      low: "Your sleep patterns appear to be healthy.",
      moderate: "You're experiencing some sleep difficulties that may need attention.",
      high: "Your sleep patterns show significant disruption."
    },
    social: {
      low: "Your social connections appear to be healthy.",
      moderate: "You may benefit from strengthening your social connections.",
      high: "You're experiencing significant challenges with social connections."
    }
  };

  // Enhanced summaries with additional insights based on score precision
  let enhancedSummary = baseSummaries[category][severity];
  
  // Add score-specific insights
  if (category === 'anxiety' && severity === 'moderate' && score > 50) {
    enhancedSummary += " Your results suggest you might benefit from specific anxiety management techniques.";
  }
  
  if (category === 'depression' && severity === 'high' && score > 80) {
    enhancedSummary += " Your responses indicate a high priority for addressing depressive symptoms.";
  }
  
  if (category === 'stress' && severity === 'high') {
    enhancedSummary += " Consider exploring stress reduction practices as a priority.";
  }
  
  if (category === 'sleep' && severity !== 'low') {
    enhancedSummary += " Improved sleep habits could positively impact your overall mental health.";
  }

  return enhancedSummary;
};

const getRecommendations = (
  categories: Record<MentalHealthCategory, { severity: 'low' | 'moderate' | 'high', score: number }>,
  answers: Record<string, number>
): string[] => {
  const recommendations: string[] = [];
  let hasHighSeverity = false;

  // Add personalized recommendations based on category scores
  if (categories.anxiety.severity === 'high' || categories.stress.severity === 'high') {
    hasHighSeverity = true;
    recommendations.push(
      "Consider practicing mindfulness or meditation techniques for 10-15 minutes daily",
      "Regular physical activity can significantly reduce anxiety and stress levels"
    );
    
    // Additional specific recommendations based on score
    if (categories.anxiety.score > 80) {
      recommendations.push(
        "Consider speaking with a mental health professional about your anxiety symptoms",
        "Try breathing exercises when feeling anxious (4 counts in, hold for 4, 8 counts out)"
      );
    }
  }

  if (categories.depression.severity === 'moderate' || categories.depression.severity === 'high') {
    hasHighSeverity = true;
    recommendations.push(
      "Consider speaking with a mental health professional about your mood",
      "Try to maintain a regular daily routine with consistent sleep and meal times",
      "Set small, achievable goals each day and acknowledge your accomplishments"
    );
    
    // Check if specific depression questions had high scores
    const depQuestions = questions.filter(q => q.category === 'depression');
    const highScoreDepQuestions = depQuestions.filter(q => answers[q.id] >= 2);
    
    if (highScoreDepQuestions.length > 0) {
      recommendations.push(
        "Engage in activities you previously enjoyed, even if you don't feel motivated initially"
      );
    }
  }

  if (categories.sleep.severity === 'moderate' || categories.sleep.severity === 'high') {
    recommendations.push(
      "Establish a consistent sleep schedule, even on weekends",
      "Create a relaxing bedtime routine without screens for at least 30 minutes before bed",
      "Keep your bedroom cool, dark, and quiet for optimal sleep"
    );
  }

  if (categories.social.severity === 'moderate' || categories.social.severity === 'high') {
    recommendations.push(
      "Try to maintain regular contact with friends and family, even brief interactions",
      "Consider joining social groups or activities aligned with your interests",
      "Start small with social interactions and gradually increase them as comfort allows"
    );
  }

  // Add general well-being recommendations if no high severity issues
  if (!hasHighSeverity) {
    recommendations.push(
      "Continue maintaining your current healthy practices",
      "Regular check-ins with yourself can help maintain good mental health",
      "Practice gratitude by noting three positive things each day"
    );
  }

  // Add a tailored physical recommendation
  recommendations.push(
    "Consider incorporating " + (
      categories.anxiety.severity === 'high' ? "gentle yoga or walking" :
      categories.depression.severity === 'high' ? "moderate cardiovascular exercise" :
      categories.stress.severity === 'high' ? "nature walks or hiking" :
      "any enjoyable physical activity"
    ) + " into your weekly routine for mental health benefits"
  );

  return recommendations;
};

const getPersonalizedAnalysis = (
  categories: Record<MentalHealthCategory, { 
    score: number, 
    severity: 'low' | 'moderate' | 'high' 
  }>,
  answers: Record<string, number>
): string => {
  // Get highest concern areas
  const highSeverityCategories = Object.entries(categories)
    .filter(([_, data]) => data.severity === 'high')
    .map(([category]) => category);
  
  const moderateSeverityCategories = Object.entries(categories)
    .filter(([_, data]) => data.severity === 'moderate')
    .map(([category]) => category);

  // Get top score category
  let topCategory: MentalHealthCategory = 'anxiety';
  let topScore = 0;
  
  Object.entries(categories).forEach(([category, data]) => {
    if (data.score > topScore) {
      topScore = data.score;
      topCategory = category as MentalHealthCategory;
    }
  });

  // Generate personalized analysis
  let analysis = "";
  
  if (highSeverityCategories.length > 0) {
    analysis += `Based on your responses, you're experiencing significant challenges with ${highSeverityCategories.join(', ')}. `;
    
    // Add connection between top categories if multiple high severity
    if (highSeverityCategories.length > 1) {
      analysis += `There appears to be a connection between your ${highSeverityCategories[0]} and ${highSeverityCategories[1]}, which is common. `;
    }
  } else if (moderateSeverityCategories.length > 0) {
    analysis += `Your responses indicate moderate concerns with ${moderateSeverityCategories.join(', ')}. `;
  } else {
    analysis += "Based on your responses, you're generally managing well across all areas assessed. ";
  }
  
  // Add some specific insights based on category combinations
  if (categories.sleep.severity !== 'low' && (categories.anxiety.severity !== 'low' || categories.depression.severity !== 'low')) {
    analysis += "Your sleep challenges may be connected to your mental health concerns, as they often influence each other. ";
  }
  
  if (categories.stress.severity !== 'low' && categories.anxiety.severity !== 'low') {
    analysis += "The relationship between your stress and anxiety levels suggests that stress management techniques could be particularly beneficial. ";
  }

  // Add strengths
  const lowSeverityCategories = Object.entries(categories)
    .filter(([_, data]) => data.severity === 'low')
    .map(([category]) => category);
    
  if (lowSeverityCategories.length > 0) {
    analysis += `Your strengths appear to be in the areas of ${lowSeverityCategories.join(', ')}, which is positive. `;
  }

  // Add disclaimer
  analysis += "Remember that this is a screening tool and not a diagnostic assessment. ";
  analysis += "If you have concerns about your mental health, please consult with a qualified mental health professional.";

  return analysis;
};

export const analyzeResponses = (answers: Record<string, number>): AnalysisResult => {
  const categories = {
    anxiety: {
      score: 0,
      severity: 'low' as const,
      summary: ''
    },
    depression: {
      score: 0,
      severity: 'low' as const,
      summary: ''
    },
    stress: {
      score: 0,
      severity: 'low' as const,
      summary: ''
    },
    sleep: {
      score: 0,
      severity: 'low' as const,
      summary: ''
    },
    social: {
      score: 0,
      severity: 'low' as const,
      summary: ''
    }
  } as Record<MentalHealthCategory, {
    score: number;
    severity: 'low' | 'moderate' | 'high';
    summary: string;
  }>;

  // Calculate scores and determine severity for each category
  Object.keys(categories).forEach((category) => {
    const score = calculateCategoryScore(answers, category as MentalHealthCategory);
    const severity = getSeverityLevel(score);
    categories[category as MentalHealthCategory] = {
      score,
      severity,
      summary: getCategorySummary(category as MentalHealthCategory, severity, score)
    };
  });

  // Generate personalized analysis
  const overallAnalysis = getPersonalizedAnalysis(categories, answers);

  return {
    categories,
    overallAnalysis,
    recommendations: getRecommendations(categories, answers)
  };
}; 