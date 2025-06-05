import { Router } from 'express';
import { registerUser, loginUser, getCurrentUser, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);

export default router; 