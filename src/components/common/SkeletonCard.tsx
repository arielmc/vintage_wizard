import React from 'react';

interface SkeletonCardProps {
  showMessage?: boolean;
  messageIndex?: number;
}

const loadingHints = [
  "Loading treasures...",
  "Fetching your items...",
  "Almost there...",
  "Gathering inventory...",
  "Unpacking goodies...",
];

/**
 * Skeleton card with shimmer effect for loading states
 */
const SkeletonCard: React.FC<SkeletonCardProps> = ({ showMessage = false, messageIndex = 0 }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-stone-100 shadow-sm flex flex-col h-full">
      <div className="aspect-square bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] relative">
        {showMessage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-rose-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[10px] text-stone-400 font-medium">{loadingHints[messageIndex % loadingHints.length]}</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="h-4 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded w-3/4" />
        <div className="h-3 bg-gradient-to-r from-stone-50 via-stone-150 to-stone-50 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded w-1/2" />
        <div className="mt-auto pt-2 flex justify-between items-center border-t border-stone-50">
          <div className="h-3 bg-stone-100 rounded w-1/3" />
          <div className="h-3 bg-stone-100 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
