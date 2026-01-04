import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Sparkles,
  Gauge
} from 'lucide-react';
import { formatTimeAgo, getDisplayTitle } from '../../utils';

/**
 * Item card component for grid display
 */
const ItemCard = ({ 
  item, 
  onClick, 
  isSelected, 
  isSelectionMode, 
  onToggleSelect, 
  onAnalyze, 
  onQuickAction 
}) => {
  // Ensure images array exists, fallback to single image or empty
  const images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Long-press handling for mobile
  const longPressTimer = useRef(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Reset index if images change
  useEffect(() => { setActiveImgIdx(0); }, [item.id]);

  const displayImage = images.length > 0 ? images[activeImgIdx] : null;

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (activeImgIdx < images.length - 1) {
      setActiveImgIdx(prev => prev + 1);
    } else {
      setActiveImgIdx(0);
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (activeImgIdx > 0) {
      setActiveImgIdx(prev => prev - 1);
    } else {
      setActiveImgIdx(images.length - 1);
    }
  };

  const handleClick = (e) => {
    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }
    if (isSelectionMode) {
      e.stopPropagation();
      onToggleSelect(item.id);
    } else {
      onClick(item);
    }
  };

  const handleQuickAnalyze = async (e) => {
    e.stopPropagation();
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    await onAnalyze(item);
    setIsAnalyzing(false);
  };

  // Right-click context menu (desktop)
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSelectionMode && onQuickAction) {
      onQuickAction(item, { x: e.clientX, y: e.clientY });
    }
  };

  // Long-press handlers (mobile)
  const handleTouchStart = (e) => {
    if (isSelectionMode) return;
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      if (navigator.vibrate) navigator.vibrate(50);
      const touch = e.touches[0];
      if (onQuickAction) {
        onQuickAction(item, { x: touch.clientX, y: touch.clientY });
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`card-hover group bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer flex flex-col h-full relative select-none ${
        isSelected ? "border-[3px] border-rose-500" : "border-stone-100 border"
      }`}
    >
      {/* Selection Overlay */}
      {isSelectionMode && (
        <div className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? "bg-rose-500 border-rose-500"
            : "bg-white/50 border-white backdrop-blur-sm"
        }`}>
          {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </div>
      )}

      <div className="relative aspect-square bg-stone-100 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.title || "Item"}
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <Camera size={48} />
          </div>
        )}

        {/* Image Carousel Controls */}
        {!isSelectionMode && images.length > 1 && (
          <>
            <button 
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <button 
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
            
            {/* Dots Indicator */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
              {images.slice(0, 5).map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full shadow-sm ${
                    idx === activeImgIdx ? "bg-white" : "bg-white/40"
                  } ${idx === 4 && images.length > 5 ? "opacity-50" : ""}`} 
                />
              ))}
            </div>
          </>
        )}

        {item.valuation_high > 0 && (
          <div className="absolute bottom-1 md:bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-6 pointer-events-none">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white font-bold text-sm drop-shadow-md">
                  ${item.valuation_low} - ${item.valuation_high}
                </p>
                {item.confidence && (
                  <div className={`hidden md:flex items-center gap-1 mt-0.5 ${
                    item.confidence === 'high' ? 'text-emerald-300' :
                    item.confidence === 'medium' ? 'text-amber-300' :
                    'text-red-300'
                  }`}>
                    <Gauge className="w-2.5 h-2.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {item.confidence}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Status color line at bottom of image */}
        <div className={`absolute bottom-0 left-0 right-0 h-[3px] ${
          item.status === 'keep' ? 'bg-blue-500' :
          item.status === 'sell' ? 'bg-emerald-500' :
          'bg-amber-500'
        }`} />
      </div>

      <div className="p-2 md:p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-stone-800 line-clamp-2 text-sm md:text-base mb-1">
          {getDisplayTitle(item)}
        </h3>
        <p className="hidden md:block text-xs text-stone-500 line-clamp-2 mb-2 flex-1">
          {[
            item.maker && item.maker.toLowerCase() !== "unknown" ? item.maker : null,
            item.style && item.style.toLowerCase() !== "unknown" ? item.style : null,
            item.materials
          ].filter(Boolean).join(" • ") || item.userNotes || "No details yet"}
        </p>
        <div className="flex items-center justify-between text-[10px] md:text-xs text-stone-400 mt-auto pt-1.5 md:pt-2 border-t border-stone-50">
          <span className="truncate">{item.category || "Unsorted"}</span>
          {item.aiLastRun ? (
            <span className="flex items-center gap-1 text-emerald-600" title={`AI analyzed ${new Date(item.aiLastRun).toLocaleString()}`}>
              <Sparkles className="w-2.5 h-2.5" />
              <span className="hidden md:inline">{formatTimeAgo(item.aiLastRun)}</span>
            </span>
          ) : (
            item.era && item.era.toLowerCase() !== "unknown" && <span className="hidden md:inline">{item.era}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
