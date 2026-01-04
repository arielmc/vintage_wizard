import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Processing overlay for upload/processing states
 */
const ProcessingOverlay = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const wittyMessages = [
    { main: "Uploading your treasures...", sub: "Finding them good homes in the cloud" },
    { main: "Teaching AI about vintage...", sub: "It's taking notes furiously" },
    { main: "Cataloging your collection...", sub: "Like a museum, but cooler" },
    { main: "Processing pixels...", sub: "Every photo tells a story" },
    { main: "Organizing the vault...", sub: "Marie Kondo would be proud" },
    { main: "Summoning the archive spirits...", sub: "They're very helpful" },
    { main: "Building your inventory...", sub: "Rome wasn't built in a day, but this is faster" },
    { main: "Crunching the vintage data...", sub: "Abacus sold separately" },
    { main: "Polishing your collection...", sub: "Digital white gloves engaged" },
    { main: "Working some magic...", sub: "Vintage wizardry in progress" },
    { main: "Almost there...", sub: "Good things come to those who wait" },
    { main: "Handling with care...", sub: "Like a fine antique" },
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % wittyMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [wittyMessages.length]);
  
  const currentMessage = wittyMessages[messageIndex];
  
  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
        <Sparkles className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-center animate-in fade-in duration-300" key={messageIndex}>
        <p className="text-lg font-bold text-stone-800">{currentMessage.main}</p>
        <p className="text-sm text-stone-500">{currentMessage.sub}</p>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
