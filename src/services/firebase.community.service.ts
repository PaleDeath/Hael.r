import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import DOMPurify from 'dompurify';
import { db } from '../config/firebase';
import {
  Comment,
  NewCommentInput,
  NewPostInput,
  Post,
  PostVote,
  Report,
  UserPublicProfile,
} from '../types/community';

function sanitize(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export async function createPost(authorId: string, data: NewPostInput, username?: string): Promise<string> {
  console.log('[API] createPost called:', { authorId, title: data.title, tags: data.tags });
  
  // Pre-moderation check (client-side fast check)
  const { moderatePost } = await import('./moderation.service');
  const moderationResult = moderatePost(data.title, data.content);
  
  if (moderationResult.blocked) {
    console.warn('[API] Post blocked by moderation:', moderationResult.reason);
    throw new Error(moderationResult.reason || 'Content violates community guidelines');
  }
  
  // Only include fields allowed by Firestore security rules
  const payload = {
    title: sanitize(data.title).slice(0, 200),
    content: sanitize(data.content),
    tags: (data.tags || []).slice(0, 5).map((t) => sanitize(t.toLowerCase()).slice(0, 24)),
    authorId,
    isAnonymous: !!data.isAnonymous,
    authorAlias: data.isAnonymous ? null : (username || null),
    isLocked: false,
    deleted: false, // Initialize deleted flag
    moderationResult: moderationResult.flagged ? {
      blocked: false,
      flagged: true,
      score: moderationResult.score,
      categories: moderationResult.categories,
      checkedAt: moderationResult.checkedAt,
      reason: moderationResult.reason
    } : undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any;
  
  try {
    const ref = await addDoc(collection(db, 'posts'), payload);
    console.log('[API] Post created with ID:', ref.id);
    
    return ref.id;
  } catch (error: any) {
    console.error('[API] Error creating post:', error);
    // Provide more helpful error messages
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please make sure you are logged in and Firestore rules allow post creation.');
    }
    if (error.code === 'unavailable') {
      throw new Error('Firestore is unavailable. Please check your internet connection and try again.');
    }
    throw error;
  }
}

export async function updatePost(postId: string, authorId: string, updates: Partial<Pick<Post, 'title' | 'content' | 'tags' | 'isLocked'>>): Promise<void> {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Post not found');
  const data = snap.data() as any;
  if (data.authorId !== authorId) throw new Error('Not allowed');
  const cleanUpdates: any = {};
  if (updates.title !== undefined) cleanUpdates.title = sanitize(updates.title).slice(0, 200);
  if (updates.content !== undefined) cleanUpdates.content = sanitize(updates.content);
  if (updates.tags !== undefined) cleanUpdates.tags = updates.tags.slice(0, 5).map((t) => sanitize(t.toLowerCase()).slice(0, 24));
  if (updates.isLocked !== undefined) cleanUpdates.isLocked = !!updates.isLocked;
  cleanUpdates.updatedAt = serverTimestamp();
  await updateDoc(ref, cleanUpdates);
}

export async function getPost(postId: string): Promise<Post | null> {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  
  // Always calculate upvoteCount from votes to ensure accuracy (Cloud Function may be delayed or not deployed)
  let upvoteCount = d.upvoteCount || 0;
  try {
    const calculatedCount = await calculateUpvoteCountFromVotes(snap.id);
    // Use calculated count (it's always accurate from source of truth)
    console.log('[API] Calculated upvoteCount from votes:', { 
      postId: snap.id, 
      calculatedCount, 
      storedCount: upvoteCount,
      using: calculatedCount
    });
    upvoteCount = calculatedCount;
  } catch (calcError) {
    console.warn('[API] Failed to calculate upvoteCount from votes, using stored:', calcError);
    // Fall back to stored value
  }
  
  // Always calculate commentCount from comments
  let commentCount = d.commentCount || 0;
  try {
    const calculatedComments = await calculateCommentCountFromComments(snap.id);
    console.log('[API] Calculated commentCount from comments:', { 
      postId: snap.id, 
      calculatedComments, 
      storedCount: commentCount,
      using: calculatedComments
    });
    commentCount = calculatedComments;
  } catch (calcError) {
    console.warn('[API] Failed to calculate commentCount from comments, using stored:', calcError);
    // Fall back to stored value
  }
  
  // Ensure default values for fields that might not exist
  return { 
    id: snap.id, 
    ...d,
    upvoteCount,
    commentCount,
    moderationStatus: d.moderationStatus || 'approved',
    tags: d.tags || [],
    isLocked: d.isLocked || false
  } as Post;
}

export async function listPostsNewest(last?: any, pageSize = 20, includeDeleted = false): Promise<{ posts: Post[]; last: any | null }> {
  console.log('[API] listPostsNewest called:', { hasLast: !!last, pageSize, includeDeleted });
  
  try {
    // Build query - handle pagination cursor
    let q;
    if (last) {
      // If last is a document snapshot, use it directly
      if (last.id && last.ref) {
        // It's a document snapshot
        q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(last), limit(pageSize * 2));
      } else if (last.id && typeof last.id === 'string') {
        // last is just { id: ... }, we need to get the document first
        try {
          const lastDocRef = doc(db, 'posts', last.id);
          const lastDocSnap = await getDoc(lastDocRef);
          if (lastDocSnap.exists()) {
            q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDocSnap), limit(pageSize * 2));
          } else {
            // Document doesn't exist, start from beginning
            q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize * 2));
          }
        } catch (e) {
          console.warn('[API] Failed to get last document, starting from beginning:', e);
          q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize * 2));
        }
      } else {
        // Unknown format, start from beginning
        q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize * 2));
      }
    } else {
      q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize * 2));
    }
    
    console.log('[API] Executing Firestore query for newest posts');
    const snap = await getDocs(q);
    console.log('[API] Query returned', snap.docs.length, 'documents');
    
    // Filter out deleted posts in memory
    let filteredDocs = includeDeleted 
      ? snap.docs 
      : snap.docs.filter(d => !d.data().deleted);
    
    // If we have a last cursor, skip documents until we find it (handle case where last doc was deleted)
    if (last && filteredDocs.length > 0) {
      let lastId: string | null = null;
      if (last.id && typeof last.id === 'string') {
        lastId = last.id;
      } else if (last.ref) {
        // It's a document snapshot, get the ID
        lastId = last.id;
      }
      
      if (lastId) {
        const lastIndex = filteredDocs.findIndex(d => d.id === lastId);
        if (lastIndex >= 0) {
          // Skip documents up to and including the last one we've seen
          filteredDocs = filteredDocs.slice(lastIndex + 1);
          console.log('[API] Skipped', lastIndex + 1, 'documents, remaining:', filteredDocs.length);
        } else {
          // Last document not found (might have been deleted), but we already filtered
          // So this is fine - we're getting new documents
          console.log('[API] Last document not found in results, continuing with new documents');
        }
      }
    }
    
    // Calculate counts from source collections for each post
    const postsPromises = filteredDocs.map(async (d) => {
      const data = d.data() as any;
      
      // Calculate upvoteCount from votes
      let upvoteCount = data.upvoteCount || 0;
      try {
        const calculatedUpvotes = await calculateUpvoteCountFromVotes(d.id);
        upvoteCount = calculatedUpvotes;
      } catch (e) {
        console.warn('[API] Failed to calculate upvotes for post:', d.id, e);
      }
      
      // Calculate commentCount from comments
      let commentCount = data.commentCount || 0;
      try {
        const calculatedComments = await calculateCommentCountFromComments(d.id);
        commentCount = calculatedComments;
      } catch (e) {
        console.warn('[API] Failed to calculate comments for post:', d.id, e);
      }
      
      return {
        id: d.id,
        ...data,
        upvoteCount,
        commentCount,
        moderationStatus: data.moderationStatus || 'approved',
        tags: data.tags || [],
        isLocked: data.isLocked || false,
        deleted: data.deleted || false,
        deletedBy: data.deletedBy || undefined,
        deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt || undefined,
        moderationResult: data.moderationResult || undefined
      } as Post;
    });
    
    let posts = await Promise.all(postsPromises);
    
    // Take only requested pageSize if we fetched more for filtering
    if (!includeDeleted && posts.length > pageSize) {
      posts = posts.slice(0, pageSize);
    }
    
    console.log('[API] Posts with calculated counts:', posts.map(p => ({ id: p.id, upvotes: p.upvoteCount, comments: p.commentCount })));
    
    // Return the last document snapshot for pagination (use the last document from the filtered results)
    // Find the corresponding document snapshot from the original query
    const lastPostId = posts.length > 0 ? posts[posts.length - 1].id : null;
    const lastDoc = lastPostId ? filteredDocs.find(d => d.id === lastPostId) || (filteredDocs.length > 0 ? filteredDocs[filteredDocs.length - 1] : null) : null;
    
    return { 
      posts, 
      last: lastDoc || null
    };
  } catch (error: any) {
    // Fallback: if query fails due to missing index, try without deleted filter
    if (error.code === 'failed-precondition' && error.message?.includes('index') && !includeDeleted) {
      console.warn('[API] Index error, falling back to fetch-all-and-filter');
      try {
        const fallbackQ = last
          ? query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(last), limit(pageSize * 2))
          : query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize * 2));
        
        const fallbackSnap = await getDocs(fallbackQ);
        const filteredDocs = fallbackSnap.docs.filter(d => !d.data().deleted);
        
        const postsPromises = filteredDocs.map(async (d) => {
          const data = d.data() as any;
          
          let upvoteCount = data.upvoteCount || 0;
          try {
            upvoteCount = await calculateUpvoteCountFromVotes(d.id);
          } catch (e) {
            // Use stored value on error
          }
          
          let commentCount = data.commentCount || 0;
          try {
            commentCount = await calculateCommentCountFromComments(d.id);
          } catch (e) {
            // Use stored value on error
          }
          
          return {
            id: d.id,
            ...data,
            upvoteCount,
            commentCount,
            moderationStatus: data.moderationStatus || 'approved',
            tags: data.tags || [],
            isLocked: data.isLocked || false,
            deleted: data.deleted || false,
            deletedBy: data.deletedBy || undefined,
            deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt || undefined,
            moderationResult: data.moderationResult || undefined
          } as Post;
        });
        
        let posts = await Promise.all(postsPromises);
        
        // Take only requested pageSize
        posts = posts.slice(0, pageSize);
        
        console.log('[API] Fallback query returned', posts.length, 'posts');
        
        // Return the last document snapshot for pagination
        const lastPostId = posts.length > 0 ? posts[posts.length - 1].id : null;
        const lastDoc = lastPostId ? filteredDocs.find(d => d.id === lastPostId) || (filteredDocs.length > 0 ? filteredDocs[filteredDocs.length - 1] : null) : null;
        
        return { 
          posts, 
          last: lastDoc || null
        };
      } catch (fallbackError) {
        console.error('[API] Fallback also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
    throw error;
  }
}

export async function listPostsTop(last?: any, pageSize = 20, includeDeleted = false): Promise<{ posts: Post[]; last: any | null }> {
  console.log('[API] listPostsTop called:', { hasLast: !!last, pageSize, includeDeleted });
  
  try {
    // Try query with orderBy first - exclude deleted posts
    let q;
    if (includeDeleted) {
      q = last
        ? query(collection(db, 'posts'), orderBy('upvoteCount', 'desc'), startAfter(last), limit(pageSize))
        : query(collection(db, 'posts'), orderBy('upvoteCount', 'desc'), limit(pageSize));
    } else {
      // Note: Firestore doesn't support multiple where clauses with orderBy on different fields easily
      // We'll filter in memory after fetching
      q = last
        ? query(collection(db, 'posts'), orderBy('upvoteCount', 'desc'), startAfter(last), limit(pageSize * 2)) // Fetch more to account for deleted
        : query(collection(db, 'posts'), orderBy('upvoteCount', 'desc'), limit(pageSize * 2));
    }
    
    console.log('[API] Executing Firestore query for top posts');
    const snap = await getDocs(q);
    console.log('[API] Query returned', snap.docs.length, 'documents');
    
    // Filter deleted posts
    const filteredDocs = includeDeleted 
      ? snap.docs 
      : snap.docs.filter(d => !d.data().deleted);
    
    // Calculate counts from source collections for each post
    const postsPromises = filteredDocs.map(async (d) => {
      const data = d.data() as any;
      
      // Calculate upvoteCount from votes
      let upvoteCount = data.upvoteCount || 0;
      try {
        upvoteCount = await calculateUpvoteCountFromVotes(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      // Calculate commentCount from comments
      let commentCount = data.commentCount || 0;
      try {
        commentCount = await calculateCommentCountFromComments(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      return {
        id: d.id,
        ...data,
        upvoteCount,
        commentCount,
        moderationStatus: data.moderationStatus || 'approved',
        tags: data.tags || [],
        isLocked: data.isLocked || false,
        deleted: data.deleted || false,
        deletedBy: data.deletedBy || undefined,
        deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt || undefined,
        moderationResult: data.moderationResult || undefined
      } as Post;
    });
    
    let posts = await Promise.all(postsPromises);
    
    // Filter out deleted posts if not including them (extra safety check)
    if (!includeDeleted) {
      posts = posts.filter(p => !p.deleted);
      // Take only the requested pageSize
      posts = posts.slice(0, pageSize);
    }
    
    console.log('[API] Posts with calculated counts:', posts.map(p => ({ id: p.id, upvotes: p.upvoteCount, comments: p.commentCount })));
    
    // Sort in memory as fallback if query didn't work correctly
    posts.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    console.log('[API] Sorted posts by upvoteCount:', posts.map(p => ({ id: p.id, upvotes: p.upvoteCount })));
    
    // If query returned 0 results (likely because upvoteCount field doesn't exist on documents),
    // fall back to fetching all and sorting
    if (posts.length === 0 && !last) {
      console.warn('[API] Query returned 0 results, using fallback fetch-all-and-sort');
      return await listPostsTopFallback(pageSize, undefined, includeDeleted);
    }
    
    return { 
      posts, 
      last: posts.length > 0 ? { id: posts[posts.length - 1].id } : null 
    };
  } catch (error: any) {
    console.error('[API] listPostsTop error:', error);
    console.error('[API] Error code:', error.code);
    console.error('[API] Error message:', error.message);
    
    // If index doesn't exist or query fails, fetch all and sort in memory
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.code === 'invalid-argument') {
      console.warn('[API] Upvote index not available, using in-memory sort');
      return await listPostsTopFallback(pageSize, last);
    }
    throw error;
  }
}

async function listPostsTopFallback(pageSize = 20, last?: any, includeDeleted = false): Promise<{ posts: Post[]; last: any | null }> {
  try {
    // Fetch without orderBy
    const q = query(collection(db, 'posts'), limit(100)); // Limit to avoid performance issues
    const snap = await getDocs(q);
    console.log('[API] Fallback query returned', snap.docs.length, 'documents');
    
    // Filter deleted posts
    const filteredDocs = includeDeleted 
      ? snap.docs 
      : snap.docs.filter(d => !d.data().deleted);
    
    // Calculate counts from source collections for all posts
    const allPostsPromises = filteredDocs.map(async (d) => {
      const data = d.data() as any;
      
      // Calculate upvoteCount from votes
      let upvoteCount = data.upvoteCount || 0;
      try {
        upvoteCount = await calculateUpvoteCountFromVotes(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      // Calculate commentCount from comments
      let commentCount = data.commentCount || 0;
      try {
        commentCount = await calculateCommentCountFromComments(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      return {
        id: d.id,
        ...data,
        upvoteCount,
        commentCount,
        moderationStatus: data.moderationStatus || 'approved',
        tags: data.tags || [],
        isLocked: data.isLocked || false,
        deleted: data.deleted || false,
        deletedBy: data.deletedBy || undefined,
        deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt || undefined,
        moderationResult: data.moderationResult || undefined
      } as Post;
    });
    
    const allPosts = await Promise.all(allPostsPromises);
    
    // Sort by upvoteCount descending
    allPosts.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    console.log('[API] Fallback sorted posts:', allPosts.slice(0, 5).map(p => ({ id: p.id, upvotes: p.upvoteCount })));
    
    // Apply pagination
    const startIdx = last ? allPosts.findIndex(p => p.id === last.id) + 1 : 0;
    const paginatedPosts = allPosts.slice(startIdx, startIdx + pageSize);
    
    return {
      posts: paginatedPosts,
      last: paginatedPosts.length > 0 ? { id: paginatedPosts[paginatedPosts.length - 1].id } : null
    };
  } catch (fallbackError: any) {
    console.error('[API] Fallback sort also failed:', fallbackError);
    console.error('[API] Fallback error stack:', fallbackError.stack);
    throw new Error('Failed to load top posts. Please create the required Firestore index for upvoteCount.');
  }
}

async function calculateUpvoteCountFromVotes(postId: string): Promise<number> {
  try {
    const votesQuery = query(
      collection(db, 'postVotes'),
      where('postId', '==', postId)
    );
    const votesSnap = await getDocs(votesQuery);
    const count = votesSnap.docs.reduce((sum, voteDoc) => {
      const voteData = voteDoc.data();
      return sum + (voteData.value === 1 ? 1 : voteData.value === -1 ? -1 : 0);
    }, 0);
    return Math.max(0, count);
  } catch (error) {
    console.warn('[API] Failed to calculate upvoteCount for post:', postId, error);
    return 0;
  }
}

async function calculateCommentCountFromComments(postId: string): Promise<number> {
  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );
    const commentsSnap = await getDocs(commentsQuery);
    // Filter out deleted comments
    const nonDeleted = commentsSnap.docs.filter(doc => !doc.data().deleted);
    return nonDeleted.length;
  } catch (error) {
    console.warn('[API] Failed to calculate commentCount for post:', postId, error);
    return 0;
  }
}

export async function listPostsByTag(tag: string, last?: any, pageSize = 20): Promise<{ posts: Post[]; last: any | null }> {
  console.log('[API] listPostsByTag called:', { tag, hasLast: !!last, pageSize });
  
  const cleanTag = sanitize(tag.toLowerCase()).slice(0, 24);
  const q = last
    ? query(collection(db, 'posts'), where('tags', 'array-contains', cleanTag), orderBy('createdAt', 'desc'), startAfter(last), limit(pageSize))
    : query(collection(db, 'posts'), where('tags', 'array-contains', cleanTag), orderBy('createdAt', 'desc'), limit(pageSize));
  
  const snap = await getDocs(q);
  console.log('[API] Query returned', snap.docs.length, 'documents');
  
  // Calculate counts from source collections for each post
  const postsPromises = snap.docs.map(async (d) => {
    const data = d.data() as any;
    
    // Calculate upvoteCount from votes
    let upvoteCount = data.upvoteCount || 0;
    try {
      upvoteCount = await calculateUpvoteCountFromVotes(d.id);
    } catch (e) {
      // Use stored value on error
    }
    
    // Calculate commentCount from comments
    let commentCount = data.commentCount || 0;
    try {
      commentCount = await calculateCommentCountFromComments(d.id);
    } catch (e) {
      // Use stored value on error
    }
    
    return {
      id: d.id,
      ...data,
      upvoteCount,
      commentCount,
      moderationStatus: data.moderationStatus || 'approved',
      tags: data.tags || [],
      isLocked: data.isLocked || false
    } as Post;
  });
  
  const posts = await Promise.all(postsPromises);
  
  return { 
    posts, 
    last: snap.docs.at(-1) ?? null 
  };
}

export async function addComment(postId: string, authorId: string, input: NewCommentInput, username?: string): Promise<string> {
  // Pre-moderation check
  const { moderateComment } = await import('./moderation.service');
  const moderationResult = moderateComment(input.content);
  
  if (moderationResult.blocked) {
    console.warn('[API] Comment blocked by moderation:', moderationResult.reason);
    throw new Error(moderationResult.reason || 'Content violates community guidelines');
  }
  
  const payload = {
    postId,
    authorId,
    isAnonymous: !!input.isAnonymous,
    authorAlias: input.isAnonymous ? null : (username || null),
    content: sanitize(input.content),
    deleted: false, // Initialize deleted flag
    moderationResult: moderationResult.flagged ? {
      blocked: false,
      flagged: true,
      score: moderationResult.score,
      categories: moderationResult.categories,
      checkedAt: moderationResult.checkedAt,
      reason: moderationResult.reason
    } : undefined,
    createdAt: serverTimestamp(),
    parentCommentId: input.parentCommentId || null,
    depth: input.depth ?? 0,
  } as any;
  const ref = await addDoc(collection(db, 'comments'), payload);
  return ref.id;
}

export async function listComments(postId: string, includeDeleted = false): Promise<Comment[]> {
  try {
    // This query requires a composite index: postId (ascending) + createdAt (ascending)
    // Create it at: https://console.firebase.google.com/v1/r/project/haelr-462818/firestore/indexes
    let q;
    try {
      if (includeDeleted) {
        q = query(
          collection(db, 'comments'),
          where('postId', '==', postId),
          orderBy('createdAt', 'asc'),
          limit(200)
        );
      } else {
        // Exclude deleted comments - try with deleted filter first
        q = query(
          collection(db, 'comments'),
          where('postId', '==', postId),
          where('deleted', '==', false),
          orderBy('createdAt', 'asc'),
          limit(200)
        );
      }
      const snap = await getDocs(q);
      let comments = snap.docs.map((d) => {
        const data = d.data() as any;
        return { 
          id: d.id, 
          ...data,
          depth: data.depth || 0,
          parentCommentId: data.parentCommentId || undefined,
          deleted: data.deleted || false,
          deletedBy: data.deletedBy || undefined,
          deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt || undefined,
          moderationResult: data.moderationResult || undefined
        } as Comment & { deleted?: boolean };
      });
      
      // Filter out deleted comments if not including them (fallback)
      if (!includeDeleted) {
        comments = comments.filter(c => !c.deleted);
      }
      
      // Sort by createdAt in memory (if needed)
      comments.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds * 1000 || 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds * 1000 || 0;
        return aTime - bTime;
      });
      
      return comments as Comment[];
    } catch (indexError: any) {
      // If index doesn't exist, fall back to query without orderBy and sort in memory
      if (indexError.code === 'failed-precondition' && indexError.message?.includes('index')) {
        console.warn('Firestore index missing, using fallback query:', indexError);
        const fallbackQ = query(
          collection(db, 'comments'), 
          where('postId', '==', postId),
          limit(200)
        );
        const snap = await getDocs(fallbackQ);
        let comments = snap.docs.map((d) => {
          const data = d.data() as any;
          return { 
            id: d.id, 
            ...data,
            depth: data.depth || 0,
            parentCommentId: data.parentCommentId || undefined,
            deleted: data.deleted || false,
            deletedBy: data.deletedBy || undefined,
            deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt || undefined,
            moderationResult: data.moderationResult || undefined
          } as Comment & { deleted?: boolean };
        });
        
        // Filter out deleted comments if not including them
        if (!includeDeleted) {
          comments = comments.filter(c => !c.deleted);
        }
        
        // Sort by createdAt in memory
        comments.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds * 1000 || 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds * 1000 || 0;
          return aTime - bTime;
        });
        
        return comments as Comment[];
      }
      throw indexError;
    }
  } catch (error: any) {
    // If index doesn't exist, fall back to query without orderBy and sort in memory
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.warn('Firestore index missing, using fallback query:', error);
      try {
        const q = query(
          collection(db, 'comments'), 
          where('postId', '==', postId),
          limit(200)
        );
        const snap = await getDocs(q);
        const comments = snap.docs.map((d) => {
          const data = d.data() as any;
          return { 
            id: d.id, 
            ...data,
            depth: data.depth || 0,
            parentCommentId: data.parentCommentId || undefined
          } as Comment;
        });
        // Sort by createdAt in memory
        return comments.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds * 1000 || 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds * 1000 || 0;
          return aTime - bTime;
        });
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw new Error('Failed to load comments. Please create the required Firestore index.');
      }
    }
    throw error;
  }
}

export async function votePost(postId: string, userId: string, value: 1 | -1): Promise<void> {
  console.log('[API] votePost called:', { postId, userId, value });
  
  if (!postId || !userId) {
    const err = new Error('Post ID and User ID are required');
    console.error('[API] votePost validation failed:', err);
    throw err;
  }
  
  const id = `${postId}_${userId}`;
  console.log('[API] Vote document ID:', id);
  
  try {
    const voteData = {
      postId,
      userId,
      value,
      createdAt: serverTimestamp(),
    };
    console.log('[API] Writing vote document:', voteData);
    
    await setDoc(doc(db, 'postVotes', id), voteData as unknown as Partial<PostVote>, { merge: true });
    
    console.log('[API] Vote document written successfully');
  } catch (error: any) {
    console.error('[API] Error voting on post:', error);
    console.error('[API] Error code:', error.code);
    console.error('[API] Error message:', error.message);
    console.error('[API] Error stack:', error.stack);
    
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please make sure you are logged in.');
    }
    throw error;
  }
}

export async function removeVote(postId: string, userId: string): Promise<void> {
  console.log('[API] removeVote called:', { postId, userId });
  
  if (!postId || !userId) {
    const err = new Error('Post ID and User ID are required');
    console.error('[API] removeVote validation failed:', err);
    throw err;
  }
  
  const id = `${postId}_${userId}`;
  console.log('[API] Deleting vote document:', id);
  
  try {
    await deleteDoc(doc(db, 'postVotes', id));
    console.log('[API] Vote document deleted successfully');
  } catch (error: any) {
    console.error('[API] Error removing vote:', error);
    console.error('[API] Error code:', error.code);
    console.error('[API] Error message:', error.message);
    console.error('[API] Error stack:', error.stack);
    
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please make sure you are logged in.');
    }
    throw error;
  }
}

export async function reportContent(data: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const ref = await addDoc(collection(db, 'reports'), {
    ...data,
    status: 'open',
    createdAt: serverTimestamp(),
  } as any);
  return ref.id;
}

export async function getUserPublicProfile(userId: string): Promise<UserPublicProfile | null> {
  const ref = doc(db, 'userPublicProfiles', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserPublicProfile;
}

export async function setUserPublicProfile(userId: string, profile: Partial<UserPublicProfile>): Promise<void> {
  const ref = doc(db, 'userPublicProfiles', userId);
  await setDoc(ref, {
    userId,
    ...profile,
  } as UserPublicProfile, { merge: true });
}

export async function getUserVote(postId: string, userId: string): Promise<1 | -1 | 0> {
  console.log('[API] getUserVote called:', { postId, userId });
  
  try {
    const voteId = `${postId}_${userId}`;
    const ref = doc(db, 'postVotes', voteId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      console.log('[API] No vote found for user');
      return 0;
    }
    
    const data = snap.data();
    const vote = (data?.value === 1 || data?.value === -1) ? data.value : 0;
    console.log('[API] User vote:', vote);
    return vote;
  } catch (error: any) {
    console.error('[API] Error getting user vote:', error);
    return 0;
  }
}

export async function getUserVotesForPosts(postIds: string[], userId: string): Promise<Record<string, 1 | -1 | 0>> {
  console.log('[API] getUserVotesForPosts called:', { postCount: postIds.length, userId });
  
  try {
    const votes: Record<string, 1 | -1 | 0> = {};
    // Fetch all votes for these posts in batches
    const voteIds = postIds.map(postId => `${postId}_${userId}`);
    
    // Firestore allows up to 10 items in 'in' queries, so we batch
    const batchSize = 10;
    for (let i = 0; i < voteIds.length; i += batchSize) {
      const batch = voteIds.slice(i, i + batchSize);
      console.log('[API] Fetching vote batch', i / batchSize + 1, 'of', Math.ceil(voteIds.length / batchSize));
      
      const voteDocs = await Promise.all(
        batch.map(voteId => getDoc(doc(db, 'postVotes', voteId)))
      );
      
      voteDocs.forEach((snap, idx) => {
        const postId = postIds[i + idx];
        if (snap.exists()) {
          const data = snap.data();
          votes[postId] = (data?.value === 1 || data?.value === -1) ? data.value : 0;
        } else {
          votes[postId] = 0;
        }
      });
    }
    
    console.log('[API] User votes loaded:', votes);
    return votes;
  } catch (error: any) {
    console.error('[API] Error getting user votes:', error);
    console.error('[API] Error stack:', error.stack);
    // Return empty votes on error
    return postIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
  }
}

export async function listPostsMostCommented(last?: any, pageSize = 20, includeDeleted = false): Promise<{ posts: Post[]; last: any | null }> {
  console.log('[API] listPostsMostCommented called:', { hasLast: !!last, pageSize, includeDeleted });
  
  try {
    // Try query with orderBy first - exclude deleted posts
    let q;
    if (includeDeleted) {
      q = last
        ? query(collection(db, 'posts'), orderBy('commentCount', 'desc'), startAfter(last), limit(pageSize))
        : query(collection(db, 'posts'), orderBy('commentCount', 'desc'), limit(pageSize));
    } else {
      // Fetch more to account for deleted posts, filter in memory
      q = last
        ? query(collection(db, 'posts'), orderBy('commentCount', 'desc'), startAfter(last), limit(pageSize * 2))
        : query(collection(db, 'posts'), orderBy('commentCount', 'desc'), limit(pageSize * 2));
    }
    
    console.log('[API] Executing Firestore query for most commented posts');
    const snap = await getDocs(q);
    console.log('[API] Query returned', snap.docs.length, 'documents');
    
    // Calculate counts from source collections for each post
    const postsPromises = snap.docs.map(async (d) => {
      const data = d.data() as any;
      
      // Calculate upvoteCount from votes
      let upvoteCount = data.upvoteCount || 0;
      try {
        upvoteCount = await calculateUpvoteCountFromVotes(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      // Calculate commentCount from comments
      let commentCount = data.commentCount || 0;
      try {
        commentCount = await calculateCommentCountFromComments(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      return {
        id: d.id,
        ...data,
        upvoteCount,
        commentCount,
        moderationStatus: data.moderationStatus || 'approved',
        tags: data.tags || [],
        isLocked: data.isLocked || false
      } as Post;
    });
    
    let posts = await Promise.all(postsPromises);
    
    // Filter out deleted posts if not including them
    if (!includeDeleted) {
      posts = posts.filter(p => !p.deleted);
      // Take only the requested pageSize
      posts = posts.slice(0, pageSize);
    }
    
    console.log('[API] Posts with calculated counts:', posts.map(p => ({ id: p.id, upvotes: p.upvoteCount, comments: p.commentCount })));
    
    // Sort in memory as fallback if query didn't work correctly
    posts.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    console.log('[API] Sorted posts by commentCount:', posts.map(p => ({ id: p.id, comments: p.commentCount })));
    
    // If query returned 0 results, fall back to fetching all and sorting
    if (posts.length === 0 && !last) {
      console.warn('[API] Query returned 0 results, using fallback fetch-all-and-sort');
      return await listPostsMostCommentedFallback(pageSize, undefined, includeDeleted);
    }
    
    return { 
      posts, 
      last: posts.length > 0 ? { id: posts[posts.length - 1].id } : null 
    };
  } catch (error: any) {
    console.error('[API] listPostsMostCommented error:', error);
    console.error('[API] Error code:', error.code);
    console.error('[API] Error message:', error.message);
    
    // If index doesn't exist or query fails, fetch all and sort in memory
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.code === 'invalid-argument') {
      console.warn('[API] Comment count index not available, using in-memory sort');
      return await listPostsMostCommentedFallback(pageSize, last);
    }
    throw error;
  }
}

async function listPostsMostCommentedFallback(pageSize = 20, last?: any, includeDeleted = false): Promise<{ posts: Post[]; last: any | null }> {
  try {
    // Fetch without orderBy
    const q = query(collection(db, 'posts'), limit(100)); // Limit to avoid performance issues
    const snap = await getDocs(q);
    console.log('[API] Fallback query returned', snap.docs.length, 'documents');
    
    // Filter deleted posts
    const filteredDocs = includeDeleted 
      ? snap.docs 
      : snap.docs.filter(d => !d.data().deleted);
    
    // Calculate counts from source collections for all posts
    const allPostsPromises = filteredDocs.map(async (d) => {
      const data = d.data() as any;
      
      // Calculate upvoteCount from votes
      let upvoteCount = data.upvoteCount || 0;
      try {
        upvoteCount = await calculateUpvoteCountFromVotes(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      // Calculate commentCount from comments
      let commentCount = data.commentCount || 0;
      try {
        commentCount = await calculateCommentCountFromComments(d.id);
      } catch (e) {
        // Use stored value on error
      }
      
      return {
        id: d.id,
        ...data,
        upvoteCount,
        commentCount,
        moderationStatus: data.moderationStatus || 'approved',
        tags: data.tags || [],
        isLocked: data.isLocked || false,
        deleted: data.deleted || false,
        deletedBy: data.deletedBy || undefined,
        deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt || undefined,
        moderationResult: data.moderationResult || undefined
      } as Post;
    });
    
    const allPosts = await Promise.all(allPostsPromises);
    
    // Sort by commentCount descending
    allPosts.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    console.log('[API] Fallback sorted posts:', allPosts.slice(0, 5).map(p => ({ id: p.id, comments: p.commentCount })));
    
    // Apply pagination
    const startIdx = last ? allPosts.findIndex(p => p.id === last.id) + 1 : 0;
    const paginatedPosts = allPosts.slice(startIdx, startIdx + pageSize);
    
    return {
      posts: paginatedPosts,
      last: paginatedPosts.length > 0 ? { id: paginatedPosts[paginatedPosts.length - 1].id } : null
    };
  } catch (fallbackError: any) {
    console.error('[API] Fallback sort also failed:', fallbackError);
    console.error('[API] Fallback error stack:', fallbackError.stack);
    throw new Error('Failed to load most commented posts. Please create the required Firestore index for commentCount.');
  }
}



