import "./global.css";
import React, { useState, useCallback } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "./src/hooks/useAuth";
import { useInventory } from "./src/hooks/useInventory";
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ItemDetailScreen } from "./src/screens/ItemDetailScreen";
import { InventoryItem } from "./src/types";

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const {
    items,
    loading: dataLoading,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    addItem,
    updateItem,
    deleteItem,
    analyzeItem,
  } = useInventory(user);

  // Handle item selection
  const handleSelectItem = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
  }, []);

  // Handle item close
  const handleCloseItem = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Handle item save
  const handleSaveItem = useCallback(
    async (updates: Partial<InventoryItem>) => {
      if (selectedItem) {
        await updateItem(selectedItem.id, updates);
        // Update local state with saved changes
        setSelectedItem((prev) => (prev ? { ...prev, ...updates } : null));
      }
    },
    [selectedItem, updateItem]
  );

  // Handle item delete
  const handleDeleteItem = useCallback(async () => {
    if (selectedItem) {
      await deleteItem(selectedItem.id);
      setSelectedItem(null);
    }
  }, [selectedItem, deleteItem]);

  // Handle item analysis
  const handleAnalyzeItem = useCallback(async () => {
    if (selectedItem) {
      const analysis = await analyzeItem(selectedItem);
      // Update local state with analysis results
      setSelectedItem((prev) =>
        prev
          ? { ...prev, ...analysis, aiLastRun: new Date().toISOString() }
          : null
      );
    }
  }, [selectedItem, analyzeItem]);

  // Handle add item
  const handleAddItem = useCallback(
    async (images: { uri: string; base64: string }[], userNotes?: string) => {
      return await addItem(images, userNotes);
    },
    [addItem]
  );

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-white">
          <View className="w-16 h-16 bg-rose-500 rounded-2xl items-center justify-center mb-4">
            <ActivityIndicator size="large" color="white" />
          </View>
          <Text className="text-stone-600 text-base">Loading...</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <SafeAreaProvider>
        <LoginScreen />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Show item detail if an item is selected
  if (selectedItem) {
    return (
      <SafeAreaProvider>
        <ItemDetailScreen
          item={selectedItem}
          user={user}
          onClose={handleCloseItem}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
          onAnalyze={handleAnalyzeItem}
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Show main dashboard
  return (
    <SafeAreaProvider>
      <DashboardScreen
        user={user}
        items={items}
        loading={dataLoading}
        filter={filter}
        setFilter={setFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddItem={handleAddItem}
        onSelectItem={handleSelectItem}
        onSignOut={signOut}
        onAnalyzeItem={analyzeItem}
        onDeleteItem={deleteItem}
      />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
