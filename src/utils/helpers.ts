import type { InventoryItem } from '../types';

/**
 * Play success haptic feedback (vibration on mobile, no sound)
 */
export const playSuccessFeedback = (): void => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

/**
 * Format relative time from ISO string
 */
export const formatTimeAgo = (isoString: string | undefined | null): string | null => {
  if (!isoString) return null;
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Get smart display title (avoids showing "Unknown")
 */
export const getDisplayTitle = (item: Partial<InventoryItem>): string => {
  const title = item.title || "";
  const style = item.style && item.style.toLowerCase() !== "unknown" ? item.style : null;
  const category = item.category || "";
  
  // If title starts with "Unknown" or is empty, create a better one
  if (!title || title.toLowerCase().startsWith("unknown")) {
    const parts = [style, category].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Untitled Item";
  }
  
  // Remove "Unknown" prefix if present
  return title.replace(/^Unknown\s*/i, "").trim() || "Untitled Item";
};
