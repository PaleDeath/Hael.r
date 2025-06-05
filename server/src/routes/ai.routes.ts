import { Router } from 'express';
import {
  generateDynamicQuestion,
  analyzeAssessmentText,
  generatePersonalizedInsights
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate a dynamic question based on previous answers
router.post('/generate-question', generateDynamicQuestion);

// Analyze free text input from user
router.post('/analyze-text', analyzeAssessmentText);

// Generate personalized insights
router.post('/insights', generatePersonalizedInsights);

export default router; 