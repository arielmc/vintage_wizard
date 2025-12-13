import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { User } from "../config/firebase";
import { InventoryItem, FilterType, SortType } from "../types";
import { ItemCard } from "../components/ItemCard";
import { pickImages, takePhoto } from "../services/imageUtils";

interface DashboardScreenProps {
  user: User;
  items: InventoryItem[];
  loading: boolean;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  sortBy: SortType;
  setSortBy: (sort: SortType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddItem: (images: { uri: string; base64: string }[], userNotes?: string) => Promise<string>;
  onSelectItem: (item: InventoryItem) => void;
  onSignOut: () => void;
  onAnalyzeItem: (item: InventoryItem) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
}

export function DashboardScreen({
  user,
  items,
  loading,
  filter,
  setFilter,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  onAddItem,
  onSelectItem,
  onSignOut,
  onAnalyzeItem,
  onDeleteItem,
}: DashboardScreenProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate collection value
  const collectionValue = useMemo(() => {
    let low = 0;
    let high = 0;
    items.forEach((item) => {
      low += item.valuation_low || 0;
      high += item.valuation_high || 0;
    });
    return { low, high };
  }, [items]);

  // Handle photo selection from library
  const handlePickFromLibrary = async () => {
    console.log("handlePickFromLibrary called");
    setIsAddMenuOpen(false);
    
    // Wait for modal to close before launching picker
    setTimeout(async () => {
      try {
        console.log("Calling pickImages...");
        const images = await pickImages(true, 6);
        console.log("pickImages returned:", images.length, "images");
        if (images.length > 0) {
          setIsUploading(true);
          console.log("Adding item with images...");
          await onAddItem(images);
          console.log("Item added successfully");
          setIsUploading(false);
        } else {
          console.log("No images selected");
        }
      } catch (error: any) {
        console.error("handlePickFromLibrary error:", error);
        setIsUploading(false);
        Alert.alert("Error", error.message || "Failed to add photos");
      }
    }, 500);
  };

  // Handle taking a photo
  const handleTakePhoto = async () => {
    console.log("handleTakePhoto called");
    setIsAddMenuOpen(false);
    
    // Wait for modal to close before launching camera
    setTimeout(async () => {
      try {
        console.log("Calling takePhoto...");
        const image = await takePhoto();
        console.log("takePhoto returned:", image ? "image" : "null");
        if (image) {
          setIsUploading(true);
          await onAddItem([image]);
          setIsUploading(false);
        }
      } catch (error: any) {
        console.error("handleTakePhoto error:", error);
        setIsUploading(false);
        Alert.alert("Error", error.message || "Failed to take photo");
      }
    }, 500);
  };

  // Toggle item selection
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      if (newSet.size === 0) {
        setSelectionMode(false);
      }
      return newSet;
    });
  }, []);

  // Start selection mode on long press
  const handleLongPress = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  // Batch delete
  const handleBatchDelete = async () => {
    Alert.alert(
      "Delete Items",
      `Delete ${selectedIds.size} items? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const ids = Array.from(selectedIds);
            for (const id of ids) {
              await onDeleteItem(id);
            }
            setSelectedIds(new Set());
            setSelectionMode(false);
          },
        },
      ]
    );
  };

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Filter options
  const filterOptions: { value: FilterType; label: string; color: string }[] = [
    { value: "all", label: "All Items", color: "bg-stone-500" },
    { value: "keep", label: "Keep", color: "bg-blue-500" },
    { value: "sell", label: "Sell", color: "bg-emerald-500" },
    { value: "TBD", label: "TBD", color: "bg-amber-500" },
  ];

  // Sort options
  const sortOptions: { value: SortType; label: string }[] = [
    { value: "date-desc", label: "Newest First" },
    { value: "date-asc", label: "Oldest First" },
    { value: "value-desc", label: "Highest Value" },
    { value: "value-asc", label: "Lowest Value" },
    { value: "title-asc", label: "A to Z" },
  ];

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) => (
      <ItemCard
        item={item}
        onPress={() => onSelectItem(item)}
        isSelected={selectedIds.has(item.id)}
        isSelectionMode={selectionMode}
        onToggleSelect={() => {
          if (!selectionMode) {
            handleLongPress(item.id);
          } else {
            handleToggleSelect(item.id);
          }
        }}
      />
    ),
    [selectionMode, selectedIds, onSelectItem, handleToggleSelect, handleLongPress]
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top"]}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-stone-100">
        {/* Top Row */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <View className="w-9 h-9 bg-rose-500 rounded-xl items-center justify-center">
              <Ionicons name="sparkles" size={18} color="white" />
            </View>
            <View>
              <Text className="text-lg font-bold text-stone-900">
                {user.displayName || "My Collection"}
              </Text>
              <Text className="text-xs text-stone-500">
                {items.length} items • ${collectionValue.low.toLocaleString()} - ${collectionValue.high.toLocaleString()}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onSignOut} className="p-2">
            <Ionicons name="log-out-outline" size={22} color="#78716c" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {isSearchOpen ? (
          <View className="flex-row items-center gap-2 mb-2">
            <View className="flex-1 flex-row items-center bg-stone-100 rounded-xl px-3 py-2">
              <Ionicons name="search" size={18} color="#78716c" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items..."
                className="flex-1 ml-2 text-base"
                autoFocus
                placeholderTextColor="#a8a29e"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#78716c" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
              className="p-2"
            >
              <Text className="text-rose-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setIsSearchOpen(true)}
              className="flex-row items-center bg-stone-100 rounded-xl px-3 py-2 flex-1"
            >
              <Ionicons name="search" size={18} color="#78716c" />
              <Text className="ml-2 text-stone-400">Search items...</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsFilterMenuOpen(true)}
              className={`p-2.5 rounded-xl ${filter !== "all" ? "bg-rose-100" : "bg-stone-100"}`}
            >
              <Ionicons
                name="filter"
                size={18}
                color={filter !== "all" ? "#e11d48" : "#78716c"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSortMenuOpen(true)}
              className="p-2.5 rounded-xl bg-stone-100"
            >
              <Ionicons name="swap-vertical" size={18} color="#78716c" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Selection Mode Bar */}
      {selectionMode && (
        <View className="flex-row items-center justify-between px-4 py-3 bg-stone-800">
          <TouchableOpacity
            onPress={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
          >
            <Text className="text-white font-medium">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-white font-bold">{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={handleBatchDelete}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Items Grid */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#78716c" />
          <Text className="text-stone-500 mt-3">Loading your collection...</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-stone-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="images-outline" size={40} color="#a8a29e" />
          </View>
          <Text className="text-xl font-bold text-stone-800 mb-2">No items yet</Text>
          <Text className="text-stone-500 text-center mb-6">
            Start building your collection by adding photos of your vintage items.
          </Text>
          <TouchableOpacity
            onPress={() => setIsAddMenuOpen(true)}
            className="bg-rose-500 px-6 py-3 rounded-xl flex-row items-center gap-2"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold">Add First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Upload Loading Overlay */}
      {isUploading && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" color="#e11d48" />
            <Text className="text-stone-900 font-semibold mt-3">Uploading...</Text>
            <Text className="text-stone-500 text-sm mt-1">Please wait</Text>
          </View>
        </View>
      )}

      {/* Floating Add Button */}
      {!selectionMode && (
        <TouchableOpacity
          onPress={() => setIsAddMenuOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-rose-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#e11d48",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* Add Menu Modal */}
      <Modal
        visible={isAddMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddMenuOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setIsAddMenuOpen(false)}
        >
          <View className="mt-auto bg-white rounded-t-3xl">
            <View className="w-12 h-1 bg-stone-300 rounded-full self-center mt-3" />
            <View className="p-6">
              <Text className="text-lg font-bold text-stone-900 mb-4">Add Item</Text>
              <TouchableOpacity
                onPress={handleTakePhoto}
                className="flex-row items-center gap-4 py-4 border-b border-stone-100"
              >
                <View className="w-12 h-12 bg-rose-100 rounded-full items-center justify-center">
                  <Ionicons name="camera" size={24} color="#e11d48" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-stone-900">Take Photo</Text>
                  <Text className="text-sm text-stone-500">Use camera to capture item</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickFromLibrary}
                className="flex-row items-center gap-4 py-4"
              >
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
                  <Ionicons name="images" size={24} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-stone-900">Choose from Library</Text>
                  <Text className="text-sm text-stone-500">Select up to 6 photos</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setIsAddMenuOpen(false)}
              className="bg-stone-100 p-4 items-center"
            >
              <Text className="text-stone-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Menu Modal */}
      <Modal
        visible={isFilterMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterMenuOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setIsFilterMenuOpen(false)}
        >
          <View className="mt-auto bg-white rounded-t-3xl">
            <View className="w-12 h-1 bg-stone-300 rounded-full self-center mt-3" />
            <View className="p-6">
              <Text className="text-lg font-bold text-stone-900 mb-4">Filter by Status</Text>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setFilter(option.value);
                    setIsFilterMenuOpen(false);
                  }}
                  className="flex-row items-center gap-3 py-3"
                >
                  <View className={`w-4 h-4 rounded-full ${option.color}`} />
                  <Text className={`text-base ${filter === option.value ? "font-bold text-stone-900" : "text-stone-600"}`}>
                    {option.label}
                  </Text>
                  {filter === option.value && (
                    <Ionicons name="checkmark" size={20} color="#e11d48" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort Menu Modal */}
      <Modal
        visible={isSortMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSortMenuOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setIsSortMenuOpen(false)}
        >
          <View className="mt-auto bg-white rounded-t-3xl">
            <View className="w-12 h-1 bg-stone-300 rounded-full self-center mt-3" />
            <View className="p-6">
              <Text className="text-lg font-bold text-stone-900 mb-4">Sort By</Text>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setSortBy(option.value);
                    setIsSortMenuOpen(false);
                  }}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className={`text-base ${sortBy === option.value ? "font-bold text-stone-900" : "text-stone-600"}`}>
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color="#e11d48" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

