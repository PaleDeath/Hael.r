import authService from './auth.service';
const api = authService.api;

// Save assessment result
export const saveAssessment = async (assessmentData: {
  answers: Record<string, number>;
  questionPath: string[];
  categories: Record<string, {
    score: number;
    severity: 'low' | 'moderate' | 'high';
    summary: string;
  }>;
  overallAnalysis: string;
  recommendations: string[];
}) => {
  try {
    const response = await api.post('/assessments', assessmentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get assessment by ID
export const getAssessmentById = async (assessmentId: string) => {
  try {
    const response = await api.get(`/assessments/${assessmentId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get user's assessment history
export const getUserAssessments = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(`/assessments?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get assessment statistics
export const getAssessmentStats = async () => {
  try {
    const response = await api.get('/assessments/stats/overview');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generate dynamic question using AI
export const generateAiQuestion = async (data: {
  previousQuestions: any[];
  answers: Record<string, number>;
  category: string;
  preferredType?: string;
}) => {
  try {
    const response = await api.post('/ai/generate-question', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Analyze free text input using AI
export const analyzeUserText = async (data: {
  text: string;
  context?: Record<string, any>;
}) => {
  try {
    const response = await api.post('/ai/analyze-text', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get personalized insights
export const getPersonalizedInsights = async (data: {
  assessmentResults: Record<string, any>;
  assessmentHistory?: Record<string, any>[];
}) => {
  try {
    const response = await api.post('/ai/insights', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generate PDF report
export const generatePdfReport = async (assessmentId: string) => {
  try {
    // Using window.open to trigger download in a new tab
    window.open(`${api.defaults.baseURL}/export/pdf/${assessmentId}`, '_blank');
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Create shareable link
export const createShareableLink = async (assessmentId: string, expiration = 7) => {
  try {
    const response = await api.post(`/export/share/${assessmentId}`, { expiration });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  saveAssessment,
  getAssessmentById,
  getUserAssessments,
  getAssessmentStats,
  generateAiQuestion,
  analyzeUserText,
  getPersonalizedInsights,
  generatePdfReport,
  createShareableLink
}; 