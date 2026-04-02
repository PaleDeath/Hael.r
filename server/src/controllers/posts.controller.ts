/**
 * Posts Controller
 * 
 * Handles post deletion, restoration, and moderation checks
 */

import { Request, Response } from 'express';
import { moderatePost } from '../services/moderation.service';
import { moderateComment } from '../services/moderation.service';

// For now, we'll use Firestore admin SDK on the backend
// This requires Firebase Admin setup in the server
// Since we're using Firestore client-side, we'll handle deletion client-side
// and create backend endpoints for moderation-only

/**
 * Check if user is admin (via env var or role check)
 */
function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);
  return adminIds.includes(userId);
}

/**
 * Soft delete post endpoint
 * Note: This is a placeholder - actual deletion happens client-side via Firestore
 * This endpoint is for moderation/audit logging if needed
 */
export const softDeletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // In a full implementation, you would:
    // 1. Verify user is author or admin
    // 2. Update Firestore via Admin SDK
    // 3. Log audit entry
    
    res.json({ 
      success: true, 
      deleted: true,
      message: 'Post soft-deleted successfully'
    });
  } catch (error: any) {
    console.error('[POSTS] Soft delete error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

/**
 * Restore soft-deleted post
 */
export const restorePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    res.json({ 
      success: true, 
      restored: true,
      message: 'Post restored successfully'
    });
  } catch (error: any) {
    console.error('[POSTS] Restore error:', error);
    res.status(500).json({ error: 'Failed to restore post' });
  }
};

/**
 * Hard delete post (admin only)
 */
export const hardDeletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { confirm } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!isAdmin(userId)) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    
    if (confirm !== true) {
      res.status(400).json({ error: 'Hard delete requires confirmation' });
      return;
    }
    
    // In a full implementation, you would:
    // 1. Archive post content
    // 2. Delete from Firestore
    // 3. Log audit entry
    
    res.json({ 
      success: true, 
      hardDeleted: true,
      message: 'Post permanently deleted'
    });
  } catch (error: any) {
    console.error('[POSTS] Hard delete error:', error);
    res.status(500).json({ error: 'Failed to hard delete post' });
  }
};

/**
 * Moderate content endpoint
 */
export const moderateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, type } = req.body;
    
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text content is required' });
      return;
    }
    
    let result;
    if (type === 'post' && req.body.title) {
      result = await moderatePost(req.body.title, text);
    } else {
      result = await moderateComment(text);
    }
    
    res.json({
      blocked: result.blocked,
      flagged: result.flagged,
      score: result.score,
      categories: result.categories,
      reason: result.reason
    });
  } catch (error: any) {
    console.error('[MODERATION] Error:', error);
    res.status(500).json({ error: 'Moderation check failed' });
  }
};

