import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  likes: number;
  comments: ForumComment[];
  tags: string[];
}

interface ForumComment {
  id: string;
  content: string;
  author: string;
  date: string;
  likes: number;
}

// Sample data - in a real application, this would come from a database
const SAMPLE_POSTS: ForumPost[] = [
  {
    id: 'post-1',
    title: 'How I overcame anxiety using mindfulness',
    content: "For years, I struggled with anxiety that would sometimes lead to panic attacks. I tried various methods to manage it, but nothing seemed to work consistently until I discovered mindfulness meditation. I'd like to share my journey and the specific techniques that helped me the most...",
    author: 'mindful_user',
    date: '2023-04-15T14:30:00',
    likes: 42,
    comments: [
      {
        id: 'comment-1',
        content: "Thank you for sharing this. I've been struggling with similar issues and will definitely try your approach.",
        author: 'healing_journey',
        date: '2023-04-15T15:45:00',
        likes: 8
      },
      {
        id: 'comment-2',
        content: 'Mindfulness changed my life too. Have you tried the body scan technique?',
        author: 'zen_master',
        date: '2023-04-16T10:20:00',
        likes: 5
      }
    ],
    tags: ['anxiety', 'mindfulness', 'personal story']
  },
  {
    id: 'post-2',
    title: 'Dealing with workplace stress - seeking advice',
    content: "I've recently started a new job that I was excited about, but the stress levels are much higher than I anticipated. I'm finding it difficult to disconnect after work hours, and it's starting to affect my sleep and overall wellbeing. Has anyone faced similar situations? What strategies helped you cope with workplace stress without compromising your performance?",
    author: 'stressed_professional',
    date: '2023-04-18T09:15:00',
    likes: 28,
    comments: [
      {
        id: 'comment-3',
        content: 'Setting clear boundaries helped me. I turn off notifications after 6pm and use the Pomodoro technique during work hours.',
        author: 'work_life_balance',
        date: '2023-04-18T10:30:00',
        likes: 12
      }
    ],
    tags: ['stress', 'work', 'advice']
  },
  {
    id: 'post-3',
    title: 'Depression recovery - small wins to celebrate',
    content: "One thing that's helping me through my depression is acknowledging small victories. Today I managed to go for a walk, cook a proper meal, and even reach out to a friend. What are your small wins this week?",
    author: 'recovery_path',
    date: '2023-04-20T16:45:00',
    likes: 56,
    comments: [
      {
        id: 'comment-4',
        content: "That's amazing! My win was taking a shower and changing my bedsheets after two weeks. Sometimes the basics are the biggest victories.",
        author: 'small_steps',
        date: '2023-04-20T17:30:00',
        likes: 24
      },
      {
        id: 'comment-5',
        content: "I finally called to schedule that therapy appointment I've been putting off. Took me three months to make the call but I did it!",
        author: 'finally_healing',
        date: '2023-04-20T18:15:00',
        likes: 30
      }
    ],
    tags: ['depression', 'recovery', 'self-care']
  }
];

const CommunityForum: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>(SAMPLE_POSTS);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [commentText, setCommentText] = useState('');
  const [filter, setFilter] = useState('all');

  // Filter posts based on selected category
  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(post => post.tags.includes(filter));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLikePost = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId ? {...post, likes: post.likes + 1} : post
    ));
    
    if (selectedPost?.id === postId) {
      setSelectedPost({...selectedPost, likes: selectedPost.likes + 1});
    }
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      
      const updatedComments = post.comments.map(comment => 
        comment.id === commentId ? {...comment, likes: comment.likes + 1} : comment
      );
      
      return {...post, comments: updatedComments};
    }));
    
    if (selectedPost?.id === postId) {
      const updatedComments = selectedPost.comments.map(comment => 
        comment.id === commentId ? {...comment, likes: comment.likes + 1} : comment
      );
      
      setSelectedPost({...selectedPost, comments: updatedComments});
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPost || !commentText.trim()) return;
    
    const newComment: ForumComment = {
      id: `comment-${Date.now()}`,
      content: commentText,
      author: 'current_user', // In a real app, this would be the logged-in user
      date: new Date().toISOString(),
      likes: 0
    };
    
    const updatedPost = {
      ...selectedPost,
      comments: [...selectedPost.comments, newComment]
    };
    
    setPosts(posts.map(post => 
      post.id === selectedPost.id ? updatedPost : post
    ));
    
    setSelectedPost(updatedPost);
    setCommentText('');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Community Support</h1>
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-medium mb-2 md:mb-0">Discussion Forum</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Topics
              </button>
              <button
                onClick={() => setFilter('anxiety')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === 'anxiety' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Anxiety
              </button>
              <button
                onClick={() => setFilter('depression')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === 'depression' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Depression
              </button>
              <button
                onClick={() => setFilter('stress')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === 'stress' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Stress
              </button>
              <button
                onClick={() => setFilter('success story')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === 'success story' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Success Stories
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-1">
              A safe space to share experiences and support each other.
            </div>
            <div className="text-xs text-gray-500">
              <strong>Note:</strong> This is a demo. In a real app, this would be connected to a database with privacy controls.
            </div>
          </div>
          
          {/* Show either post list or selected post detail */}
          {!selectedPost ? (
            <div className="space-y-6">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <div key={post.id} className="border-b border-gray-100 pb-6 last:border-0">
                    <h3 
                      className="text-lg font-medium mb-2 cursor-pointer hover:text-blue-600"
                      onClick={() => setSelectedPost(post)}
                    >
                      {post.title}
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 mb-2">
                      <span className="mr-2">Posted by {post.author}</span>
                      <span className="mr-2">•</span>
                      <span>{formatDate(post.date)}</span>
                    </div>
                    <p className="text-gray-700 mb-3 line-clamp-3">
                      {post.content}
                    </p>
                    <div className="flex flex-wrap items-center">
                      <div className="flex items-center mr-4">
                        <button 
                          className="text-gray-500 hover:text-blue-500"
                          onClick={() => handleLikePost(post.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </button>
                        <span className="ml-1 text-sm">{post.likes}</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="ml-1 text-sm">{post.comments.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2 md:mt-0">
                        {post.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full cursor-pointer"
                            onClick={() => setFilter(tag)}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No posts found in this category.
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setSelectedPost(null)}
                className="flex items-center text-gray-700 hover:text-blue-600 mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to all posts
              </button>
              
              <h3 className="text-xl font-medium mb-2">{selectedPost.title}</h3>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <span className="mr-2">Posted by {selectedPost.author}</span>
                <span className="mr-2">•</span>
                <span>{formatDate(selectedPost.date)}</span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700 whitespace-pre-line">{selectedPost.content}</p>
              </div>
              
              <div className="flex flex-wrap items-center mb-6">
                <div className="flex items-center mr-4">
                  <button 
                    className="text-gray-500 hover:text-blue-500"
                    onClick={() => handleLikePost(selectedPost.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                  <span className="ml-1 text-sm">{selectedPost.likes}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 md:mt-0">
                  {selectedPost.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">
                  {selectedPost.comments.length 
                    ? `Comments (${selectedPost.comments.length})` 
                    : 'No comments yet'}
                </h4>
                
                {selectedPost.comments.map(comment => (
                  <div key={comment.id} className="border-b border-gray-100 pb-4 mb-4 last:border-0">
                    <div className="bg-gray-50 p-3 rounded-lg mb-2">
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="mr-2">{comment.author}</span>
                        <span className="mr-2">•</span>
                        <span>{formatDate(comment.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <button 
                          className="text-gray-500 hover:text-blue-500"
                          onClick={() => handleLikeComment(selectedPost.id, comment.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </button>
                        <span className="ml-1 text-xs">{comment.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium mb-2">Add a Comment</h4>
                <form onSubmit={handleAddComment}>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
                    rows={3}
                    placeholder="Share your thoughts or support..."
                    required
                  ></textarea>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Post Comment
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center text-blue-800 text-sm">
          <p>
            <strong>Community Guidelines:</strong> Be respectful, supportive, and mindful of others' journeys.
            This is a safe space for sharing and healing together.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunityForum; 