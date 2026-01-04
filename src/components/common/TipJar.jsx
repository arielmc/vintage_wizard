import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Floating tip jar button with expand/collapse
 */
const TipJar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const venmoUrl = 'https://venmo.com/Arielmcnichol';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/40 z-30 animate-in fade-in duration-200"
        />
      )}

      {!isExpanded && (
        <div
          className="fixed z-30"
          style={{ bottom: isMobile ? '90px' : '24px', left: '16px' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            onClick={() => setIsExpanded(true)}
            className="relative flex items-center justify-center w-12 h-12 bg-white border border-stone-200 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all"
          >
            <span className="text-2xl">🫙</span>
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-stone-500 uppercase tracking-wide">tip</span>
          </button>

          {isHovered && (
            <div className="absolute bottom-full left-0 mb-2 p-3 bg-stone-800 text-white rounded-xl text-xs leading-relaxed whitespace-nowrap shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
              Built by Ariel, a middle-aged lady.
              <div className="absolute -bottom-1.5 left-5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-stone-800" />
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div
          className="fixed z-30 bg-white rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ 
            bottom: isMobile ? '90px' : '24px', 
            left: '16px',
            right: isMobile ? '16px' : 'auto',
            width: isMobile ? 'auto' : '320px',
            maxWidth: '320px'
          }}
        >
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-4xl mb-3">🫙</div>

          <p className="text-sm leading-relaxed text-stone-700 mb-4">
            Built by Ariel, a middle-aged lady. If this app saved you time or made you smile, consider leaving a tip.
          </p>

          <a
            href={venmoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#008CFF] hover:bg-[#0074D4] text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Tip via Venmo →
          </a>
        </div>
      )}
    </>
  );
};

export default TipJar;
