import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

function aliasFromUid(uid: string) {
  const animals = ['Otter', 'Falcon', 'Panda', 'Koala', 'Wolf', 'Hawk', 'Tiger', 'Eagle'];
  const adj = ['Calm', 'Brave', 'Kind', 'Bright', 'Quiet', 'Swift', 'Merry', 'Bold'];
  const a = adj[Math.abs(hash(uid)) % adj.length];
  const b = animals[Math.abs(hash(uid.slice(1))) % animals.length];
  const n = Math.abs(hash(uid + 'x')) % 1000;
  return `${a}-${b}-${n}`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h | 0;
}

export const onVoteWrite = functions.firestore
  .document('postVotes/{voteId}')
  .onWrite(async (change) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    if (!after && !before) return;
    const postId = (after?.postId || before?.postId) as string;
    const delta = (after?.value || 0) - (before?.value || 0);
    await db.runTransaction(async (tx) => {
      const ref = db.collection('posts').doc(postId);
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const current = (snap.get('upvoteCount') as number) || 0;
      tx.update(ref, { upvoteCount: current + delta });
    });
  });

export const onCommentWrite = functions.firestore
  .document('comments/{commentId}')
  .onWrite(async (change) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    const postId = (after?.postId || before?.postId) as string;
    const delta = (after && !before) ? 1 : (!after && before) ? -1 : 0;
    if (!postId || delta === 0) return;
    await db.runTransaction(async (tx) => {
      const ref = db.collection('posts').doc(postId);
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const current = (snap.get('commentCount') as number) || 0;
      tx.update(ref, { commentCount: current + delta });
    });
  });

export const onCreateSanitize = functions.firestore
  .document('{colId}/{docId}')
  .onCreate(async (snap, context) => {
    const col = context.params.colId as string;
    if (col !== 'posts' && col !== 'comments') return;
    const data = snap.data();
    const isAnonymous = !!data.isAnonymous;
    const authorId = data.authorId as string;
    const sanitizedContent = String(data.content || '').replace(/<[^>]*>?/gm, '').slice(0, 10000);
    const updates: any = { content: sanitizedContent };
    if (col === 'posts') {
      updates.moderationStatus = 'approved';
      updates.title = String(data.title || '').replace(/<[^>]*>?/gm, '').slice(0, 200);
      // Initialize upvoteCount and commentCount if they don't exist
      if (data.upvoteCount === undefined) updates.upvoteCount = 0;
      if (data.commentCount === undefined) updates.commentCount = 0;
    }
    if (isAnonymous && authorId) updates.authorAlias = aliasFromUid(authorId);
    await snap.ref.update(updates);
  });

export const rateLimit = functions.firestore
  .document('{colId}/{docId}')
  .onCreate(async (snap, context) => {
    const col = context.params.colId as string;
    if (col !== 'posts' && col !== 'comments') return;
    const authorId = snap.get('authorId') as string;
    if (!authorId) return;
    const statsRef = db.collection('userStats').doc(authorId);
    await db.runTransaction(async (tx) => {
      const now = admin.firestore.Timestamp.now();
      const s = await tx.get(statsRef);
      const data = s.exists ? s.data()! : {};
      const today = new Date(); today.setHours(0,0,0,0);
      const lastKey = col === 'posts' ? 'lastPostAt' : 'lastCommentAt';
      const countKey = col === 'posts' ? 'postsToday' : 'commentsToday';
      const lastAt = (data[lastKey] as admin.firestore.Timestamp | undefined)?.toDate() || new Date(0);
      const sameDay = lastAt.toDateString() === today.toDateString();
      const count = sameDay ? (data[countKey] as number || 0) + 1 : 1;
      if ((col === 'posts' && count > 20) || (col === 'comments' && count > 100)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded');
      }
      tx.set(statsRef, { [lastKey]: now, [countKey]: count, userId: authorId }, { merge: true });
    });
  });

/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
