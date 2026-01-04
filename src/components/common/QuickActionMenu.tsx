import React, { useEffect, useRef } from 'react';
import { Heart, DollarSign, HelpCircle, Check, Trash2, LucideIcon } from 'lucide-react';
import type { InventoryItem, ItemStatus } from '../../types';

interface Position {
  x: number;
  y: number;
}

interface QuickActionMenuProps {
  position: Position;
  item: InventoryItem;
  onClose: () => void;
  onStatusChange: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
}

interface StatusOption {
  value: ItemStatus;
  label: string;
  icon: LucideIcon;
  color: string;
}

const statusOptions: StatusOption[] = [
  { value: 'keep', label: 'Mark as Keep', icon: Heart, color: 'text-emerald-600' },
  { value: 'sell', label: 'Mark as Sell', icon: DollarSign, color: 'text-amber-600' },
  { value: 'TBD', label: 'Mark as TBD', icon: HelpCircle, color: 'text-blue-600' },
];

/**
 * Context menu for quick item actions
 */
const QuickActionMenu: React.FC<QuickActionMenuProps> = ({ 
  position, 
  item, 
  onClose, 
  onStatusChange, 
  onDelete 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const adjustedStyle: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 220),
    left: Math.min(position.x, window.innerWidth - 160),
    zIndex: 100,
  };

  return (
    <div 
      ref={menuRef}
      style={adjustedStyle}
      className="bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 fade-in duration-150 min-w-[160px]"
    >
      <div className="p-1.5">
        <div className="px-2 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          Quick Actions
        </div>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onStatusChange(item.id, opt.value); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              item.status === opt.value 
                ? 'bg-stone-100 text-stone-900' 
                : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <opt.icon className={`w-4 h-4 ${opt.color}`} />
            {opt.label}
            {item.status === opt.value && <Check className="w-3.5 h-3.5 ml-auto text-stone-500" />}
          </button>
        ))}
        <div className="h-px bg-stone-100 my-1.5" />
        <button
          onClick={() => { onDelete(item.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Item
        </button>
      </div>
    </div>
  );
};

export default QuickActionMenu;
