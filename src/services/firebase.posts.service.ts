/**
 * Post Management Service
 * 
 * Handles post deletion, restoration, and management operations
 */

import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
// import { Post } from '../types/community'; // Not used

/**
 * Soft delete a post (author only)
 */
export async function softDeletePost(postId: string, userId: string): Promise<void> {
  console.log('[POSTS] softDeletePost called:', { postId, userId });
  
  // Verify user is the author
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }
  
  const postData = postSnap.data() as any;
  
  // Check if already deleted
  if (postData.deleted) {
    throw new Error('Post is already deleted');
  }
  
  // Verify author
  if (postData.authorId !== userId) {
    throw new Error('Only the post author can delete this post');
  }
  
  // Soft delete
  await updateDoc(postRef, {
    deleted: true,
    deletedBy: userId,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  console.log('[POSTS] Post soft-deleted successfully');
}

/**
 * Restore a soft-deleted post (author only)
 */
export async function restorePost(postId: string, userId: string): Promise<void> {
  console.log('[POSTS] restorePost called:', { postId, userId });
  
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }
  
  const postData = postSnap.data() as any;
  
  // Check if not deleted
  if (!postData.deleted) {
    throw new Error('Post is not deleted');
  }
  
  // Verify author
  if (postData.authorId !== userId) {
    throw new Error('Only the post author can restore this post');
  }
  
  // Restore
  await updateDoc(postRef, {
    deleted: false,
    deletedBy: null,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
  
  console.log('[POSTS] Post restored successfully');
}

