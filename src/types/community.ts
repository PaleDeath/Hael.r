export type ModerationStatus = 'approved' | 'pending' | 'flagged' | 'removed';

export interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  isAnonymous: boolean;
  authorAlias?: string;
  createdAt: Date;
  updatedAt: Date;
  upvoteCount: number;
  commentCount: number;
  moderationStatus: ModerationStatus;
  isLocked: boolean;
  // Soft delete fields
  deleted?: boolean;
  deletedBy?: string;
  deletedAt?: Date;
  // Moderation metadata
  moderationResult?: {
    blocked: boolean;
    flagged: boolean;
    score?: number;
    categories?: Record<string, number>;
    checkedAt: Date;
    reason?: string;
  };
}

export interface NewPostInput {
  title: string;
  content: string;
  tags: string[];
  isAnonymous: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  isAnonymous: boolean;
  authorAlias?: string;
  content: string;
  createdAt: Date;
  parentCommentId?: string;
  depth: 0 | 1;
}

export interface NewCommentInput {
  content: string;
  isAnonymous: boolean;
  parentCommentId?: string;
  depth?: 0 | 1;
}

export interface PostVote {
  id: string; // `${postId}_${userId}`
  postId: string;
  userId: string;
  value: 1 | -1;
  createdAt: Date;
}

export interface Report {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
  reporterId: string;
  createdAt: Date;
  status: 'open' | 'resolved' | 'dismissed';
}

export interface UserPublicProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface UserStats {
  userId: string;
  lastPostAt?: Date;
  postsToday?: number;
  lastCommentAt?: Date;
  commentsToday?: number;
}





