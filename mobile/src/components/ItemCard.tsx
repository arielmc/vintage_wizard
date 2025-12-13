import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InventoryItem } from "../types";

const { width } = Dimensions.get("window");
const cardWidth = (width - 48) / 2; // 2 columns with padding

interface ItemCardProps {
  item: InventoryItem;
  onPress: () => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: () => void;
}

// Get display title
function getDisplayTitle(item: InventoryItem): string {
  if (item.title && item.title.toLowerCase() !== "unknown") {
    return item.title;
  }
  if (item.userNotes) {
    return item.userNotes.slice(0, 50) + (item.userNotes.length > 50 ? "..." : "");
  }
  return "Untitled Item";
}

// Format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ItemCard({
  item,
  onPress,
  isSelected = false,
  isSelectionMode = false,
  onToggleSelect,
}: ItemCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const images = item.images && item.images.length > 0 
    ? item.images 
    : [];
  const hasImages = images.length > 0;
  const firstImage = hasImages ? images[0] : null;

  // Status color
  const statusColor =
    item.status === "keep"
      ? "bg-blue-500"
      : item.status === "sell"
      ? "bg-emerald-500"
      : "bg-amber-500";

  // Confidence color
  const confidenceColor =
    item.confidence === "high"
      ? "text-emerald-500"
      : item.confidence === "medium"
      ? "text-amber-500"
      : "text-red-400";

  return (
    <TouchableOpacity
      onPress={isSelectionMode ? onToggleSelect : onPress}
      onLongPress={onToggleSelect}
      activeOpacity={0.7}
      style={{ width: cardWidth }}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 mb-3"
    >
      {/* Image Container */}
      <View className="relative" style={{ height: cardWidth }}>
        {hasImages && firstImage ? (
          <>
            <Image
              source={{ uri: firstImage }}
              className="w-full h-full"
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {imageLoading && (
              <View className="absolute inset-0 bg-stone-100 items-center justify-center">
                <ActivityIndicator color="#78716c" />
              </View>
            )}
          </>
        ) : (
          <View className="w-full h-full bg-stone-100 items-center justify-center">
            <Ionicons name="image-outline" size={32} color="#a8a29e" />
            <Text className="text-xs text-stone-400 mt-1">No photo</Text>
          </View>
        )}

        {/* Multi-image indicator */}
        {images.length > 1 && (
          <View className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded-full flex-row items-center">
            <Ionicons name="images" size={10} color="white" />
            <Text className="text-white text-[10px] ml-1">{images.length}</Text>
          </View>
        )}

        {/* Selection Checkbox */}
        {isSelectionMode && (
          <View className="absolute top-2 right-2">
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                isSelected
                  ? "bg-rose-500 border-rose-500"
                  : "bg-white/90 border-stone-300"
              }`}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
          </View>
        )}

        {/* Valuation Overlay */}
        {item.valuation_low !== undefined && item.valuation_high !== undefined && (
          <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <Text className="text-white font-bold text-sm">
              ${item.valuation_low} - ${item.valuation_high}
            </Text>
            {item.confidence && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Ionicons name="speedometer-outline" size={10} color={
                  item.confidence === "high" ? "#10b981" :
                  item.confidence === "medium" ? "#f59e0b" : "#ef4444"
                } />
                <Text className={`text-[10px] font-medium uppercase ${confidenceColor}`}>
                  {item.confidence}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Status line */}
        <View className={`absolute bottom-0 left-0 right-0 h-[3px] ${statusColor}`} />
      </View>

      {/* Content */}
      <View className="p-2 flex-1">
        <Text
          className="font-semibold text-stone-800 text-sm mb-1"
          numberOfLines={2}
        >
          {getDisplayTitle(item)}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] text-stone-400" numberOfLines={1}>
            {item.category || "Unsorted"}
          </Text>
          {item.aiLastRun && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="sparkles" size={10} color="#10b981" />
              <Text className="text-[10px] text-emerald-600">
                {formatTimeAgo(item.aiLastRun)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

