import React from 'react';
import type { ItemStatus } from '../../types';

interface StatusBadgeProps {
  status: ItemStatus | undefined;
}

const statusColors: Record<string, string> = {
  keep: "bg-blue-100 text-blue-800 border-blue-200",
  sell: "bg-green-100 text-green-800 border-green-200",
  TBD: "bg-amber-100 text-amber-800 border-amber-200",
  draft: "bg-amber-100 text-amber-800 border-amber-200",
  unprocessed: "bg-amber-100 text-amber-800 border-amber-200",
};

/**
 * Status badge component for item status display
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Normalize status for display
  const displayStatus = (status === "unprocessed" || status === "draft" || status === "maybe") ? "TBD" : (status || "TBD");
  
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
        statusColors[displayStatus] || statusColors.TBD
      } uppercase tracking-wide`}
    >
      {displayStatus}
    </span>
  );
};

export default StatusBadge;
