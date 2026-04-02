/**
 * Moderation API Routes
 * 
 * Provides content moderation endpoints
 */

import { Router } from 'express';
import { moderateContent } from '../controllers/posts.controller';

const router = Router();

// Check content moderation (no auth required for pre-check)
router.post('/check', moderateContent);

export default router;

