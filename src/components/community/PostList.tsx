import React, { useEffect, useState } from 'react';
import { Post } from '../../types/community';
import { listPostsNewest, listPostsTop, listPostsByTag, listPostsMostCommented, getUserVotesForPosts, votePost, removeVote } from '../../services/firebase.community.service';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, TrendingUp, Clock, ArrowUp, ArrowDown, Plus, Search, Loader2, MessageCircle } from 'lucide-react';
import Toast from '../ui/Toast';

type Filter = 'newest' | 'top' | 'most-commented' | 'tag';

const PostList: React.FC = () => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('newest');
  const [tag, setTag] = useState('');
  const [last, setLast] = useState<any>(null);
  const [votes, setVotes] = useState<Record<string, 1 | -1 | 0>>({});
  const [votingPosts, setVotingPosts] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = async (reset = false) => {
    console.log('[LOAD] Loading posts:', { filter, reset, hasLast: !!last, tag });
    setLoading(true);
    setError(null);
    try {
      let res;
      const startTime = Date.now();
      
      if (filter === 'newest') {
        console.log('[LOAD] Fetching newest posts');
        res = await listPostsNewest(reset ? undefined : last);
      } else if (filter === 'top') {
        console.log('[LOAD] Fetching top posts');
        res = await listPostsTop(reset ? undefined : last);
      } else if (filter === 'most-commented') {
        console.log('[LOAD] Fetching most commented posts');
        res = await listPostsMostCommented(reset ? undefined : last);
      } else if (filter === 'tag') {
        if (!tag.trim()) {
          setError('Please enter a tag to search');
          setLoading(false);
          return;
        }
        console.log('[LOAD] Fetching posts by tag:', tag.trim());
        res = await listPostsByTag(tag.trim(), reset ? undefined : last);
      } else {
        console.log('[LOAD] Default: fetching newest posts');
        res = await listPostsNewest(reset ? undefined : last);
      }

      const loadTime = Date.now() - startTime;
      console.log('[LOAD] Posts fetched:', { count: res.posts.length, loadTime: `${loadTime}ms`, filter });
      console.log('[LOAD] Post upvote counts:', res.posts.map(p => ({ id: p.id, upvotes: p.upvoteCount, comments: p.commentCount })));

      const newPosts = reset ? res.posts : [...posts, ...res.posts];
      setPosts(newPosts);
      setLast(res.last);
      
      // Load votes for all posts if user is logged in
      if (currentUser && newPosts.length > 0) {
        try {
          const postIds = newPosts.map(p => p.id);
          console.log('[LOAD] Loading votes for posts:', postIds);
          const userVotes = await getUserVotesForPosts(postIds, currentUser.uid);
          console.log('[LOAD] User votes loaded:', userVotes);
          setVotes(prev => reset ? userVotes : { ...prev, ...userVotes });
        } catch (voteErr: any) {
          console.warn('[LOAD] Failed to load votes:', voteErr);
          console.warn('[LOAD] Vote error stack:', voteErr.stack);
          // Don't fail the whole load if votes fail
        }
      } else if (reset) {
        setVotes({});
      }
    } catch (err: any) {
      console.error('[LOAD] Error loading posts:', err);
      console.error('[LOAD] Error stack:', err.stack);
      console.error('[LOAD] Error code:', err.code);
      const errorMsg = err.message || 'Failed to load posts';
      setError(errorMsg);
      
      // Provide helpful error messages
      if (err.code === 'failed-precondition' && err.message?.includes('index')) {
        setError('Database index required. Some posts may not be sorted correctly. Please contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId: string, currentVote: 1 | -1 | 0, newVote: 1 | -1 | 0) => {
    console.log('[VOTE] handleVote called:', { postId, currentVote, newVote, userId: currentUser?.uid });
    
    if (!currentUser || votingPosts.has(postId)) {
      if (!currentUser) {
        console.warn('[VOTE] No current user');
        setToast({
          message: 'Please log in to vote',
          type: 'error'
        });
      } else {
        console.warn('[VOTE] Already voting on this post');
      }
      return;
    }
    
    const voteDelta = (newVote as number) - (currentVote as number);
    const post = posts.find(p => p.id === postId);
    if (!post) {
      console.error('[VOTE] Post not found:', postId);
      return;
    }
    
    console.log('[VOTE] Vote delta:', voteDelta, 'Current count:', post.upvoteCount, 'New count:', (post.upvoteCount || 0) + voteDelta);
    
    // Optimistic update
    const prevVotes = { ...votes };
    const prevPosts = [...posts];
    
    setVotingPosts(prev => new Set(prev).add(postId));
    setVotes(prev => ({ ...prev, [postId]: newVote }));
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, upvoteCount: Math.max(0, (p.upvoteCount || 0) + voteDelta) }
        : p
    ));
    
    try {
      console.log('[VOTE] Calling backend:', { postId, userId: currentUser.uid, newVote });
      if (newVote === 0) {
        await removeVote(postId, currentUser.uid);
        console.log('[VOTE] Vote removed successfully');
      } else {
        await votePost(postId, currentUser.uid, newVote);
        console.log('[VOTE] Vote saved successfully:', newVote);
      }
      // Refresh post data after a short delay
      // getPost now calculates upvoteCount from votes if Cloud Function hasn't updated yet
      setTimeout(async () => {
        try {
          const { getPost } = await import('../../services/firebase.community.service');
          const refreshedPost = await getPost(postId);
          if (refreshedPost) {
            console.log('[VOTE] Refreshed post count from server:', refreshedPost.upvoteCount);
            setPosts(prev => prev.map(p => 
              p.id === postId 
                ? { ...p, upvoteCount: refreshedPost.upvoteCount }
                : p
            ));
          }
        } catch (e) {
          console.warn('[VOTE] Failed to refresh post:', e);
        }
      }, 1000); // Reduced delay since we're calculating from votes directly
    } catch (err: any) {
      console.error('[VOTE] Error:', err);
      console.error('[VOTE] Stack:', err.stack);
      // Revert on error
      setVotes(prevVotes);
      setPosts(prevPosts);
      setToast({
        message: err.message || 'Failed to update vote. Please try again.',
        type: 'error'
      });
    } finally {
      setVotingPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  useEffect(() => {
    setLast(null);
    setPosts([]);
    setVotes({});
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light font-lexend text-black mb-2">Community</h1>
          <p className="text-gray-600 font-inter">Share thoughts, seek support, and connect with others</p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-inter text-sm transition-all duration-200 ${
                filter === 'newest' 
                  ? 'bg-black text-white shadow-sm' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`} 
              onClick={() => {
                if (filter !== 'newest') {
                  setFilter('newest');
                }
              }}
            >
              <Clock className="w-4 h-4" />
              Newest
            </button>
            <button 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-inter text-sm transition-all duration-200 ${
                filter === 'top' 
                  ? 'bg-black text-white shadow-sm' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`} 
              onClick={() => {
                if (filter !== 'top') {
                  setFilter('top');
                }
              }}
            >
              <TrendingUp className="w-4 h-4" />
              Top
            </button>
            <button 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-inter text-sm transition-all duration-200 ${
                filter === 'most-commented' 
                  ? 'bg-black text-white shadow-sm' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`} 
              onClick={() => {
                if (filter !== 'most-commented') {
                  setFilter('most-commented');
                }
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Most Commented
            </button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  value={tag} 
                  onChange={(e)=>setTag(e.target.value)} 
                  placeholder="Search tags..." 
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-inter text-sm transition-all duration-200 ${
                  filter === 'tag' 
                    ? 'bg-black text-white shadow-sm' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`} 
                onClick={() => { 
                  if (tag.trim()) {
                    setFilter('tag'); 
                    setLast(null); 
                    load(true); 
                  } else {
                    setToast({
                      message: 'Please enter a tag first',
                      type: 'error'
                    });
                  }
                }}
              >
                Filter
              </button>
            </div>
          </div>
          <Link 
            to="/community/new" 
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg font-inter text-sm hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-inter text-sm">
            {error}
          </div>
        )}

        {/* Empty State */}
        {posts.length === 0 && !loading && !error && (
          <div className="text-center py-16">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-inter text-lg mb-2">No posts yet</p>
            <p className="text-gray-400 font-inter text-sm mb-6">Be the first to share your thoughts with the community</p>
            <Link 
              to="/community/new" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg font-inter text-sm hover:bg-gray-800 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Create First Post
            </Link>
          </div>
        )}

        {/* Loading State */}
        {loading && posts.length === 0 && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
            <p className="text-gray-500 font-inter text-sm mt-4">Loading posts...</p>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {posts.map((p) => {
            const userVote = votes[p.id] || 0;
            const isVoting = votingPosts.has(p.id);
            
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl p-6 hover:shadow-lg transition-all duration-200 border border-gray-100 group"
              >
                <Link to={`/community/${p.id}`} className="block">
                  {/* Tags */}
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {p.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs font-inter text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Title */}
                  <h3 className="text-xl font-medium font-lexend text-black mb-2 group-hover:text-gray-700 transition-colors">
                    {p.title}
                  </h3>
                  
                  {/* Content Preview */}
                  <div className="text-gray-600 font-inter text-sm line-clamp-2 mb-4 leading-relaxed">
                    {p.content}
                  </div>
                </Link>
                
                {/* Meta Information and Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-inter">
                    <span>{p.isAnonymous ? (p.authorAlias || 'Anonymous') : (p.authorAlias || 'User')}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (currentUser) {
                            // If already upvoted, remove vote. Otherwise, upvote (replacing downvote if exists)
                            const newVote = userVote === 1 ? 0 : 1;
                            handleVote(p.id, userVote, newVote);
                          }
                        }}
                        disabled={!currentUser || isVoting}
                        className={`flex items-center gap-1 transition-all ${
                          userVote === 1 
                            ? 'text-black font-semibold' 
                            : 'hover:text-black'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={currentUser ? (userVote === 1 ? 'Remove upvote' : 'Upvote') : 'Log in to vote'}
                      >
                        <ArrowUp className={`w-3 h-3 ${isVoting ? 'animate-pulse' : ''}`} />
                      </button>
                      <span className="font-medium min-w-[2ch] text-center">{p.upvoteCount || 0}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (currentUser) {
                            // If already downvoted, remove vote. Otherwise, downvote (replacing upvote if exists)
                            const newVote = userVote === -1 ? 0 : -1;
                            handleVote(p.id, userVote, newVote);
                          }
                        }}
                        disabled={!currentUser || isVoting}
                        className={`flex items-center gap-1 transition-all ${
                          userVote === -1 
                            ? 'text-gray-800 font-semibold' 
                            : 'hover:text-gray-800'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={currentUser ? (userVote === -1 ? 'Remove downvote' : 'Downvote') : 'Log in to vote'}
                      >
                        <ArrowDown className={`w-3 h-3 ${isVoting ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {p.commentCount || 0}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-inter">
                    {p.createdAt instanceof Date 
                      ? new Date(p.createdAt).toLocaleDateString() 
                      : 'Recently'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {last && (
          <div className="mt-8 text-center">
            <button 
              disabled={loading} 
              onClick={() => load()} 
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-inter text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default PostList;





