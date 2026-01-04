import React, { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Rotating AI loading messages component
 */
const AILoadingMessages: React.FC = () => {
  const [currentMsg, setCurrentMsg] = useState("");
  
  const messages = useMemo(() => [
    "Consulting the AI oracle...",
    "Analyzing vintage vibes...",
    "Decoding maker's marks...",
    "Estimating market value...",
    "Finding comparable sales...",
    "Channeling the Antiques Roadshow...",
    "Asking 1000 dealers at once...",
    "Checking: heirloom or yard sale?",
    "Running through the time machine...",
    "Dusting off price guides...",
    "Scanning for hidden signatures...",
    "Cross-referencing auction archives...",
    "Determining the vibe: MCM or just old?",
    "Consulting grandma's attic wisdom...",
    "Checking if this sparks profit...",
    "Summoning estate sale spirits...",
    "Crunching auction data...",
    "Looking up what the cool kids collect...",
    "Googling with extra AI magic...",
  ], []);
  
  const getRandomMessage = useCallback(() => {
    return messages[Math.floor(Math.random() * messages.length)];
  }, [messages]);
  
  useEffect(() => {
    setCurrentMsg(getRandomMessage());
    const interval = setInterval(() => {
      setCurrentMsg(getRandomMessage());
    }, 2000);
    return () => clearInterval(interval);
  }, [getRandomMessage]);
  
  return (
    <p className="text-stone-500 text-sm min-h-[20px] transition-all duration-300">
      {currentMsg}
    </p>
  );
};

export default AILoadingMessages;
