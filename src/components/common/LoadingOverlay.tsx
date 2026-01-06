import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { AI_LOADING_MESSAGES, getRandomMessage } from '../../constants/loadingMessages';

interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
  /** Override the default AI messages with custom ones */
  customMessages?: string[];
  /** Accent color for the spinner (default: rose) */
  accentColor?: 'rose' | 'violet' | 'emerald' | 'amber' | 'blue';
}

/**
 * Loading overlay with rotating witty messages
 * Used for AI analysis, uploads, and other loading states
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = "Processing...", 
  subMessage = "",
  customMessages,
  accentColor = 'rose'
}) => {
  const [currentMsg, setCurrentMsg] = useState("");
  
  const messages = customMessages || AI_LOADING_MESSAGES;
  
  const pickMessage = useCallback(() => {
    return getRandomMessage(messages);
  }, [messages]);
  
  useEffect(() => {
    setCurrentMsg(pickMessage());
    const interval = setInterval(() => {
      setCurrentMsg(pickMessage());
    }, 2200);
    return () => clearInterval(interval);
  }, [pickMessage]);

  const colorClasses = {
    rose: 'border-rose-500 text-rose-500',
    violet: 'border-violet-500 text-violet-500',
    emerald: 'border-emerald-500 text-emerald-500',
    amber: 'border-amber-500 text-amber-500',
    blue: 'border-blue-500 text-blue-500',
  };

  const spinnerColor = colorClasses[accentColor].split(' ')[0];
  const iconColor = colorClasses[accentColor].split(' ')[1];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
          <div className={`absolute inset-0 border-4 ${spinnerColor} rounded-full border-t-transparent animate-spin`} />
          <Sparkles className={`absolute inset-0 m-auto w-8 h-8 ${iconColor} animate-pulse`} />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-stone-800 mb-2">{message}</h3>
        
        {/* Rotating fun messages */}
        <p className="text-stone-500 text-sm min-h-[20px] transition-all duration-300">
          {currentMsg}
        </p>
        
        {subMessage && (
          <p className="text-stone-400 text-xs mt-2">{subMessage}</p>
        )}
        
        {/* Progress hint */}
        <p className="text-stone-400 text-xs mt-4">
          This usually takes 5-10 seconds
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
