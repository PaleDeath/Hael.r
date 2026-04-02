import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../../services/firebase.community.service';
import { useAuth } from '../../contexts/AuthContext';
import usernameService from '../../services/firebase.username.service';
import UsernameSettings from './UsernameSettings';
import { ArrowLeft, Send, Loader2, AlertCircle, User, UserX, Settings, X } from 'lucide-react';

const PostComposer: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  useEffect(() => {
    if (currentUser && !isAnonymous) {
      loadUsername();
    }
  }, [currentUser, isAnonymous]);

  const loadUsername = async () => {
    if (!currentUser) return;
    try {
      const user = await usernameService.getUsername(currentUser.uid);
      setUsername(user);
    } catch (err) {
      console.error('Error loading username:', err);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { 
      setError('You must be logged in to create a post'); 
      return; 
    }
    if (!title.trim() || !content.trim()) { 
      setError('Title and content are required'); 
      return; 
    }
    
    // If posting non-anonymously, check if username is set
    if (!isAnonymous && !username) {
      setError('Please set a username before posting non-anonymously. Click "Set Username" below.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const id = await createPost(currentUser.uid, {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        isAnonymous,
      }, username || undefined);
      navigate(`/community/${id}`);
    } catch (err: any) {
      console.error('Post creation error:', err);
      const errorMessage = err.message || err.code || 'Failed to create post';
      setError(errorMessage);
      
      // Provide helpful guidance based on error type
      if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION')) {
        setError('Permission denied. Please check that you are logged in and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('unavailable')) {
        setError('Network error. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-light font-lexend text-black">Username Settings</h3>
              <button
                onClick={() => {
                  setShowUsernameModal(false);
                  loadUsername(); // Reload username after closing
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <UsernameSettings
              onClose={() => {
                setShowUsernameModal(false);
                loadUsername();
              }}
            />
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button 
          onClick={() => navigate('/community')} 
          className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 font-inter text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-light font-lexend text-black mb-2">Create a Post</h1>
          <p className="text-gray-600 font-inter">Share your thoughts with the community</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-inter text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium font-inter text-gray-700 mb-2">
                Title
              </label>
              <input 
                id="title"
                value={title} 
                onChange={(e)=>setTitle(e.target.value)} 
                placeholder="Give your post a title..." 
                className="w-full border border-gray-200 rounded-lg px-4 py-3 font-inter text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-400 font-inter">{title.length}/200</p>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium font-inter text-gray-700 mb-2">
                Content
              </label>
              <textarea 
                id="content"
                value={content} 
                onChange={(e)=>setContent(e.target.value)} 
                placeholder="Share your thoughts, ask questions, or offer support..." 
                className="w-full border border-gray-200 rounded-lg px-4 py-3 font-inter text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
                rows={8}
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium font-inter text-gray-700 mb-2">
                Tags (optional)
              </label>
              <input 
                id="tags"
                value={tags} 
                onChange={(e)=>setTags(e.target.value)} 
                placeholder="wellness, support, advice (comma separated)" 
                className="w-full border border-gray-200 rounded-lg px-4 py-3 font-inter text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-gray-400 font-inter">Add up to 5 tags to help others find your post</p>
            </div>

            {/* Anonymous Toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                {isAnonymous ? (
                  <UserX className="w-5 h-5 text-gray-600" />
                ) : (
                  <User className="w-5 h-5 text-gray-600" />
                )}
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input 
                    type="checkbox" 
                    checked={isAnonymous} 
                    onChange={(e)=>setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-sm font-inter text-gray-700">Post anonymously</span>
                </label>
              </div>
              
              {!isAnonymous && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-inter text-blue-900 mb-1">
                        {username ? `Posting as: ${username}` : 'No username set'}
                      </p>
                      <p className="text-xs font-inter text-blue-700">
                        {username 
                          ? 'Your posts will show this username'
                          : 'Set a username to post non-anonymously'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUsernameModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg font-inter text-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <Settings className="w-3 h-3" />
                      {username ? 'Change' : 'Set Username'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={loading || !title.trim() || !content.trim()} 
                className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-inter text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish Post
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={()=>navigate('/community')} 
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-inter text-sm hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </>
  );
};

export default PostComposer;





