import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
}

/**
 * Loading overlay with rotating witty messages
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = "Processing...", 
  subMessage = "" 
}) => {
  const [currentMsg, setCurrentMsg] = useState("");
  
  const funMessages = useMemo(() => [
    "Consulting the AI oracle...",
    "Teaching robots about antiques...",
    "Summoning appraisal spirits...",
    "Channeling grandma's attic wisdom...",
    "Asking the estate sale gods...",
    "Dusting off the price guides...",
    "Decoding maker's marks...",
    "Cross-referencing with eBay sold...",
    "Checking if it's MCM or just old...",
    "Determining: treasure or trash?",
    "Consulting the ghost of Antiques Roadshow...",
    "Running it through the time machine...",
    "Checking if this sparks joy AND profit...",
    "Googling with extra AI sauce...",
    "Asking 1000 vintage dealers at once...",
    "Scanning for hidden signatures...",
  ], []);
  
  const getRandomMessage = useCallback(() => {
    return funMessages[Math.floor(Math.random() * funMessages.length)];
  }, [funMessages]);
  
  useEffect(() => {
    setCurrentMsg(getRandomMessage());
    const interval = setInterval(() => {
      setCurrentMsg(getRandomMessage());
    }, 2200);
    return () => clearInterval(interval);
  }, [getRandomMessage]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-rose-500 animate-pulse" />
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
