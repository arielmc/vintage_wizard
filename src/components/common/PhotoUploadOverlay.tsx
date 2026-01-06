import React, { useState, useEffect, useCallback } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { PHOTO_LOADING_MESSAGES, getRandomMessage } from '../../constants/loadingMessages';

interface PhotoUploadOverlayProps {
  /** Number of photos being loaded (optional, for display) */
  photoCount?: number;
}

/**
 * Full-screen overlay shown when photos are being loaded/processed
 * Especially important for mobile where iOS image processing can be slow
 */
const PhotoUploadOverlay: React.FC<PhotoUploadOverlayProps> = ({ photoCount }) => {
  const [currentMsg, setCurrentMsg] = useState("");
  const [dots, setDots] = useState("");
  
  const pickMessage = useCallback(() => {
    return getRandomMessage(PHOTO_LOADING_MESSAGES);
  }, []);
  
  useEffect(() => {
    setCurrentMsg(pickMessage());
    const messageInterval = setInterval(() => {
      setCurrentMsg(pickMessage());
    }, 2500);
    return () => clearInterval(messageInterval);
  }, [pickMessage]);
  
  // Animated dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);
    return () => clearInterval(dotsInterval);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        {/* Animated photo icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 border-4 border-amber-200 rounded-full animate-ping opacity-30" />
          {/* Static ring */}
          <div className="absolute inset-0 border-4 border-amber-100 rounded-full" />
          {/* Inner spinning gradient ring */}
          <div className="absolute inset-2 border-4 border-amber-400 rounded-full border-t-transparent animate-spin" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <Camera className="w-10 h-10 text-amber-500" />
              <ImagePlus className="absolute -bottom-1 -right-1 w-5 h-5 text-amber-600 animate-bounce" />
            </div>
          </div>
        </div>
        
        {/* Main message */}
        <h3 className="text-xl font-bold text-stone-800 mb-1">
          {currentMsg.replace('...', '')}{dots}
        </h3>
        
        {/* Photo count if available */}
        {photoCount && photoCount > 0 && (
          <p className="text-amber-600 text-sm font-semibold mb-3">
            📷 {photoCount} photo{photoCount !== 1 ? 's' : ''} selected
          </p>
        )}
        
        {/* Sub message */}
        <p className="text-stone-400 text-sm mt-3">
          This may take a moment on mobile
        </p>
        
        {/* iOS hint */}
        <p className="text-stone-300 text-xs mt-2">
          Converting and optimizing your images
        </p>
      </div>
    </div>
  );
};

export default PhotoUploadOverlay;
