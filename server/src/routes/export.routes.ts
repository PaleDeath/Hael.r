import { Router } from 'express';
import {
  generatePdf,
  createShareableLink
} from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate PDF from assessment
router.get('/pdf/:assessmentId', generatePdf);

// Create shareable link
router.post('/share/:assessmentId', createShareableLink);

export default router; 