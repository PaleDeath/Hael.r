import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addComment, getPost, listComments, removeVote, reportContent, votePost, getUserVote } from '../../services/firebase.community.service';
import { Comment, Post } from '../../types/community';
import { useAuth } from '../../contexts/AuthContext';
import usernameService from '../../services/firebase.username.service';
import { ArrowLeft, ArrowUp, ArrowDown, MessageSquare, Send, User, UserX, Flag, Loader2, AlertCircle, MoreVertical, Trash2 } from 'lucide-react';
import Toast from '../ui/Toast';
import ConfirmModal from '../ui/ConfirmModal';
import { softDeletePost, restorePost } from '../../services/firebase.posts.service';

const PostDetail: React.FC = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vote, setVote] = useState<1 | -1 | 0>(0);
  const [newComment, setNewComment] = useState('');
  const [anon, setAnon] = useState(true);
  const [voting, setVoting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const canVote = useMemo(()=>!!currentUser, [currentUser]);
  const isAuthor = useMemo(() => post && currentUser && post.authorId === currentUser.uid, [post, currentUser]);

  useEffect(() => {
    if (currentUser && !anon) {
      loadUsername();
    }
  }, [currentUser, anon]);

  const loadUsername = async () => {
    if (!currentUser) return;
    try {
      const user = await usernameService.getUsername(currentUser.uid);
      setUsername(user);
    } catch (err) {
      console.error('Error loading username:', err);
    }
  };

  useEffect(() => {
    (async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const p = await getPost(postId);
        if (!p) {
          setError('Post not found or has been deleted');
          return;
        }
        setPost(p);
        const cs = await listComments(postId);
        setComments(cs);
        
        // Load user's vote for this post
        if (currentUser) {
          const userVote = await getUserVote(postId, currentUser.uid);
          setVote(userVote);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, currentUser]);
  
  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.relative') && !target.closest('.absolute')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const onVote = async (val: 1 | -1 | 0) => {
    console.log('[VOTE] onVote called:', { postId: post?.id, currentVote: vote, newVote: val, userId: currentUser?.uid });
    
    if (!post || !currentUser || voting) {
      if (!currentUser) {
        console.warn('[VOTE] No current user');
        setToast({
          message: 'Please log in to vote',
          type: 'error'
        });
      } else if (voting) {
        console.warn('[VOTE] Already voting');
      }
      return;
    }
    
    const prev = vote;
    const voteDelta = (val as number) - (prev as number);
    
    console.log('[VOTE] Vote delta:', voteDelta, 'Current count:', post.upvoteCount, 'New count:', Math.max(0, post.upvoteCount + voteDelta));
    
    // Save previous state for rollback
    const prevVote = vote;
    const prevUpvoteCount = post.upvoteCount;
    
    // Optimistic update
    setVoting(true);
    setVote(val);
    setPost({ ...post, upvoteCount: Math.max(0, post.upvoteCount + voteDelta) });
    
    try {
      console.log('[VOTE] Calling backend:', { postId: post.id, userId: currentUser.uid, vote: val });
      if (val === 0) {
        await removeVote(post.id, currentUser.uid);
        console.log('[VOTE] Vote removed successfully');
      } else {
        await votePost(post.id, currentUser.uid, val as 1 | -1);
        console.log('[VOTE] Vote saved successfully:', val);
      }
      // Refresh post after delay to sync with Cloud Function
      // getPost now calculates upvoteCount from votes if Cloud Function hasn't updated yet
      setTimeout(async () => {
        try {
          const refreshedPost = await getPost(post.id);
          if (refreshedPost) {
            console.log('[VOTE] Refreshed post count from server:', refreshedPost.upvoteCount);
            console.log('[VOTE] Previous optimistic count:', post.upvoteCount);
            
            // Always update with server count (which now includes calculated count from votes)
            setPost(refreshedPost);
            
            // Reload vote state
            const userVote = await getUserVote(post.id, currentUser.uid);
            setVote(userVote);
          }
        } catch (e) {
          console.warn('[VOTE] Failed to refresh post:', e);
        }
      }, 1000); // Reduced delay since we're calculating from votes directly
    } catch (err: any) {
      console.error('[VOTE] Error:', err);
      console.error('[VOTE] Stack:', err.stack);
      // Revert on error
      setVote(prevVote);
      setPost({ ...post, upvoteCount: prevUpvoteCount });
      setToast({
        message: err.message || 'Failed to update vote. Please try again.',
        type: 'error'
      });
    } finally {
      setVoting(false);
    }
  };

  const submitComment = async () => {
    if (!post || !currentUser || !newComment.trim() || commenting) return;
    
    // If posting non-anonymously, check if username is set
    if (!anon && !username) {
      setError('Please set a username in your profile before commenting non-anonymously.');
      return;
    }
    
    const commentText = newComment.trim();
    const optimistic: Comment = {
      id: `local_${Date.now()}`,
      postId: post.id,
      authorId: currentUser.uid,
      isAnonymous: anon,
      authorAlias: anon ? 'Anonymous' : (username || undefined),
      content: commentText,
      createdAt: new Date(),
      depth: 0,
    };
    
    // Optimistic update
    setCommenting(true);
    const tempComments = [...comments, optimistic];
    setComments(tempComments);
    setNewComment('');
    setError('');
    setPost({ ...post, commentCount: (post.commentCount || 0) + 1 });
    
    try {
      await addComment(post.id, currentUser.uid, { 
        content: commentText, 
        isAnonymous: anon, 
        depth: 0 
      }, username || undefined);
      
      // Refresh comments to get real data
      const cs = await listComments(post.id);
      setComments(cs);
      
      setToast({
        message: 'Comment posted successfully!',
        type: 'success'
      });
    } catch (e: any) {
      setError(e.message || 'Failed to comment');
      // Revert optimistic update on error
      setComments(comments);
      setPost({ ...post, commentCount: Math.max(0, (post.commentCount || 0) - 1) });
      setToast({
        message: e.message || 'Failed to post comment. Please try again.',
        type: 'error'
      });
    } finally {
      setCommenting(false);
    }
  };

  const onReport = async (targetType: 'post' | 'comment', targetId: string) => {
    if (!currentUser) return;
    try {
      await reportContent({ targetType, targetId, reason: 'inappropriate', reporterId: currentUser.uid });
      alert('Reported');
    } catch (err) {
      console.error('Failed to report content:', err);
      setToast({
        message: 'Failed to report content. Please try again.',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-inter text-sm">Loading post...</p>
        </div>
      </div>
    );
  }
  if (error && !post) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 font-inter">
            {error}
          </div>
          <button onClick={() => navigate('/community')} className="flex items-center gap-2 text-gray-600 hover:text-black font-inter text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Community
          </button>
        </div>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <p className="text-gray-600 font-inter mb-4">Post not found</p>
            <button onClick={() => navigate('/community')} className="flex items-center gap-2 text-gray-600 hover:text-black font-inter text-sm transition-colors mx-auto">
              <ArrowLeft className="w-4 h-4" />
              Back to Community
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button 
          onClick={()=>navigate('/community')} 
          className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 font-inter text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </button>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-inter text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Post */}
        <article className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 mb-8">
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.slice(0, 5).map((tag, idx) => (
                <span key={idx} className="text-xs font-inter text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl font-light font-lexend text-black mb-6">{post.title}</h1>

          {/* Content */}
          <div className="whitespace-pre-wrap text-gray-700 font-inter leading-relaxed mb-6">
            {post.content}
          </div>

          {/* Meta and Actions */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-600 font-inter">
                <div className="flex items-center gap-2">
                  {post.isAnonymous ? (
                    <UserX className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span>{post.isAnonymous ? (post.authorAlias || 'Anonymous') : (post.authorAlias || 'User')}</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentCount || 0} comments</span>
                </div>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400">
                  {post.createdAt instanceof Date 
                    ? new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Recently'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isAuthor && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 font-inter transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px] z-10">
                        {post.deleted ? (
                          <button
                            onClick={async () => {
                              if (!currentUser || !post) return;
                              setDeleting(true);
                              try {
                                await restorePost(post.id, currentUser.uid);
                                setToast({ message: 'Post restored successfully', type: 'success' });
                                // Reload post
                                const refreshedPost = await getPost(post.id);
                                if (refreshedPost) setPost(refreshedPost);
                                setShowMenu(false);
                              } catch (err: any) {
                                setToast({ message: err.message || 'Failed to restore post', type: 'error' });
                              } finally {
                                setDeleting(false);
                              }
                            }}
                            disabled={deleting}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-inter disabled:opacity-50"
                          >
                            Restore Post
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              setShowDeleteModal(true);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-inter flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button 
                  onClick={()=>onReport('post', post.id)} 
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 font-inter transition-colors"
                >
                  <Flag className="w-3 h-3" />
                  Report
                </button>
              </div>
            </div>

            {/* Voting */}
            <div className="mt-4 flex items-center gap-2">
              <button 
                disabled={!canVote || voting} 
                onClick={()=>onVote(vote===1?0:1)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-inter text-sm transition-all ${
                  vote===1 
                    ? 'bg-black text-white' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowUp className={`w-4 h-4 ${voting ? 'animate-pulse' : ''}`} />
                {post.upvoteCount || 0}
              </button>
              <button 
                disabled={!canVote || voting} 
                onClick={()=>onVote(vote===-1?0:-1)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-inter text-sm transition-all ${
                  vote===-1 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowDown className={`w-4 h-4 ${voting ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-light font-lexend text-black mb-6">Comments</h2>
          
          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-inter text-sm">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {comments.map((c)=> (
                <div key={c.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600 font-inter">
                      {c.isAnonymous ? (
                        <UserX className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      <span>{c.isAnonymous ? (c.authorAlias || 'Anonymous') : (c.authorAlias || 'User')}</span>
                    </div>
                    <button 
                      onClick={()=>onReport('comment', c.id)} 
                      className="text-xs text-gray-400 hover:text-red-600 font-inter transition-colors"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-700 font-inter text-sm leading-relaxed">
                    {c.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <div className="pt-6 border-t border-gray-100">
            <div className="space-y-4">
              <textarea 
                value={newComment} 
                onChange={(e)=>setNewComment(e.target.value)} 
                placeholder="Write a comment..." 
                className="w-full border border-gray-200 rounded-lg px-4 py-3 font-inter text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
                rows={4}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={anon} 
                    onChange={(e)=>setAnon(e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-sm font-inter text-gray-600 flex items-center gap-1">
                    {anon ? <UserX className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    Comment anonymously
                  </span>
                </label>
                <button 
                  onClick={submitComment}
                  disabled={!newComment.trim() || !currentUser || commenting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg font-inter text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {commenting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post Comment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          if (!currentUser || !post) return;
          setDeleting(true);
          try {
            await softDeletePost(post.id, currentUser.uid);
            setToast({ 
              message: 'Post deleted. You can\'t undo this from the UI.', 
              type: 'success' 
            });
            setShowDeleteModal(false);
            // Navigate back to community list after a short delay
            setTimeout(() => {
              navigate('/community');
            }, 1500);
          } catch (err: any) {
            console.error('[POST] Delete error:', err);
            setToast({ 
              message: err.message || 'Failed to delete post. Please try again.', 
              type: 'error' 
            });
          } finally {
            setDeleting(false);
          }
        }}
        title="Delete Post"
        message="Are you sure? This will remove the post from public view. This action cannot be undone from the UI."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </>
  );
};

export default PostDetail;



