import React, { useEffect, useState } from 'react';
import { CheckCircle2, X, AlertCircle, Info, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  duration = 4000,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300); // Match animation duration
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-black" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertCircle className="w-5 h-5 text-orange-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />
  };

  const bgColors = {
    success: 'bg-white border-gray-200',
    error: 'bg-white border-red-200',
    warning: 'bg-white border-orange-200',
    info: 'bg-white border-blue-200'
  };

  const textColors = {
    success: 'text-gray-800',
    error: 'text-red-700',
    warning: 'text-orange-700',
    info: 'text-blue-700'
  };

  if (!isVisible && isExiting) return null;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 
        ${bgColors[type]} 
        border rounded-xl shadow-lg
        px-4 py-3 pr-10
        max-w-md
        flex items-start gap-3
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
        }
      `}
      style={{ 
        animation: isVisible && !isExiting 
          ? 'slideInRight 0.3s ease-out' 
          : undefined 
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <p className={`flex-1 font-inter text-sm ${textColors[type]}`}>
        {message}
      </p>
      <button
        onClick={handleClose}
        className={`
          absolute top-2 right-2 
          p-1 rounded 
          ${textColors[type]} 
          hover:bg-black/5 
          transition-colors
        `}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;

