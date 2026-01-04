import React from 'react';
import { X } from 'lucide-react';

/**
 * Draggable thumbnail item for image reordering
 */
const ThumbnailItem = ({ 
  id, 
  src, 
  index, 
  active, 
  onClick, 
  onDragStart, 
  onDrop, 
  onDragOver, 
  onDragEnd, 
  onRemove 
}) => {
  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`relative group flex-shrink-0 pt-2 pr-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        active ? "opacity-100 scale-105" : "opacity-70 hover:opacity-100"
      }`}
    >
      <div
        className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition-all bg-stone-100 relative ${
          active
            ? "border-rose-500 shadow-md ring-2 ring-rose-500/20"
            : "border-transparent"
        }`}
      >
        <img
          src={src}
          className="w-full h-full object-cover pointer-events-none select-none"
          alt="thumbnail"
        />
      </div>
      
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10 hover:bg-red-600"
          title="Un-group image"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default ThumbnailItem;
