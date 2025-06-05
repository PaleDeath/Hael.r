import { Router } from 'express';
import { 
  createAssessment, 
  getAssessmentById,
  getUserAssessments,
  getAssessmentStats
} from '../controllers/assessment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create new assessment
router.post('/', createAssessment);

// Get assessment by ID
router.get('/:id', getAssessmentById);

// Get all user assessments
router.get('/', getUserAssessments);

// Get user assessment statistics
router.get('/stats/overview', getAssessmentStats);

export default router; 