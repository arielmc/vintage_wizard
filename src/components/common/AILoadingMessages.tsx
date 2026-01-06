import React, { useState, useEffect, useCallback } from 'react';
import { AI_LOADING_MESSAGES, getRandomMessage } from '../../constants/loadingMessages';

/**
 * Rotating AI loading messages component
 * Uses shared messages for consistency across all loading states
 */
const AILoadingMessages: React.FC = () => {
  const [currentMsg, setCurrentMsg] = useState("");
  
  const pickMessage = useCallback(() => {
    return getRandomMessage(AI_LOADING_MESSAGES);
  }, []);
  
  useEffect(() => {
    setCurrentMsg(pickMessage());
    const interval = setInterval(() => {
      setCurrentMsg(pickMessage());
    }, 2000);
    return () => clearInterval(interval);
  }, [pickMessage]);
  
  return (
    <p className="text-stone-500 text-sm min-h-[20px] transition-all duration-300">
      {currentMsg}
    </p>
  );
};

export default AILoadingMessages;
