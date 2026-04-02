import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import usernameService from '../../services/firebase.username.service';
import { User, Check, Loader2, AlertCircle } from 'lucide-react';
import Toast from '../ui/Toast';

interface UsernameSettingsProps {
  onClose?: () => void;
}

const UsernameSettings: React.FC<UsernameSettingsProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadUsername();
    }
  }, [currentUser]);

  const loadUsername = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const user = await usernameService.getUsername(currentUser.uid);
      setUsername(user || '');
    } catch (err: any) {
      console.error('Error loading username:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Username cannot be empty');
      return;
    }
    
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError('Username must be between 2 and 30 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      await usernameService.setUsername(currentUser.uid, trimmed);
      setToast({ message: 'Username saved successfully!', type: 'success' });
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save username';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-6">
        <p className="text-gray-600 font-inter text-sm">Please log in to set a username.</p>
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
      
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-light font-lexend text-black mb-2">Set Your Username</h2>
          <p className="text-gray-600 font-inter text-sm">
            Choose a username to display when posting non-anonymously. This will be visible to other community members.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium font-inter text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g., TaseenIQ, MindfulCoder"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  maxLength={30}
                  pattern="[a-zA-Z0-9_-]+"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400 font-inter">
                {username.length}/30 characters • Letters, numbers, underscores, and hyphens only
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-inter text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving || !username.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-inter text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Username
                  </>
                )}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-inter text-sm hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default UsernameSettings;

