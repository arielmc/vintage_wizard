import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { InventoryItem, ChatMessage } from "../types";
import { pickImages, takePhoto } from "../services/imageUtils";
import { askGeminiChat } from "../services/gemini";
import {
  db,
  appId,
  doc,
  setDoc,
  serverTimestamp,
  User,
} from "../config/firebase";

const { width } = Dimensions.get("window");

interface ItemDetailScreenProps {
  item: InventoryItem;
  user: User;
  onClose: () => void;
  onSave: (updates: Partial<InventoryItem>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAnalyze: () => Promise<void>;
}

// Get marketplace links
function getMarketplaceLinks(
  category: string | undefined,
  searchTerms: string | undefined
): { name: string; url: string; color: string; icon: string }[] {
  if (!searchTerms) return [];

  const query = encodeURIComponent(searchTerms);
  const links = [
    {
      name: "eBay Sold",
      url: `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=0&LH_Sold=1&LH_Complete=1`,
      color: "bg-blue-100",
      icon: "pricetag-outline",
    },
    {
      name: "Google Images",
      url: `https://www.google.com/search?q=${query}&tbm=isch`,
      color: "bg-stone-100",
      icon: "search-outline",
    },
  ];

  const cat = (category || "").toLowerCase();

  if (cat.includes("book")) {
    links.push({
      name: "AbeBooks",
      url: `https://www.abebooks.com/servlet/SearchResults?sts=t&kn=${query}`,
      color: "bg-red-100",
      icon: "book-outline",
    });
  }

  if (cat.includes("music") || cat.includes("vinyl")) {
    links.push({
      name: "Discogs",
      url: `https://www.discogs.com/search/?q=${query}&type=all`,
      color: "bg-yellow-100",
      icon: "disc-outline",
    });
  }

  if (cat.includes("fashion")) {
    links.push({
      name: "Poshmark",
      url: `https://poshmark.com/search?query=${query}`,
      color: "bg-pink-100",
      icon: "shirt-outline",
    });
  }

  return links;
}

export function ItemDetailScreen({
  item,
  user,
  onClose,
  onSave,
  onDelete,
  onAnalyze,
}: ItemDetailScreenProps) {
  const [formData, setFormData] = useState<InventoryItem>({
    ...item,
    images: item.images || [],
  });
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "chat">("details");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const images = formData.images || [];
  const marketLinks = getMarketplaceLinks(formData.category, formData.search_terms);

  // Update form field
  const updateField = (field: keyof InventoryItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setHasChanges(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle analyze
  const handleAnalyze = async () => {
    if (images.length === 0) {
      Alert.alert("No Photos", "Add photos before running AI analysis");
      return;
    }
    setIsAnalyzing(true);
    try {
      await onAnalyze();
    } catch (error: any) {
      Alert.alert("Analysis Failed", error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle delete
  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await onDelete();
            onClose();
          },
        },
      ]
    );
  };

  // Handle add photo
  const handleAddPhoto = async (fromCamera: boolean) => {
    try {
      let imageData: { uri: string; base64: string } | null = null;
      
      if (fromCamera) {
        imageData = await takePhoto();
      } else {
        const images = await pickImages(false, 1);
        imageData = images[0] || null;
      }

      if (imageData) {
        setIsAnalyzing(true);
        
        const imageIndex = images.length;

        // Store base64 for AI in subcollection
        await setDoc(
          doc(db, "artifacts", appId, "users", user.uid, "inventory", item.id, "images_ai", `img_${imageIndex}`),
          { base64: imageData.base64, index: imageIndex, createdAt: serverTimestamp() }
        );

        // Add base64 to images array
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []), imageData!.base64],
        }));
        setHasChanges(true);
        setIsAnalyzing(false);
      }
    } catch (error: any) {
      setIsAnalyzing(false);
      Alert.alert("Error", error.message);
    }
  };

  // Handle chat
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userQuestion = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: userQuestion }]);
    setIsChatting(true);

    try {
      const response = await askGeminiChat(
        formData.images || [],
        {
          title: formData.title,
          maker: formData.maker,
          category: formData.category,
          style: formData.style,
          era: formData.era,
          materials: formData.materials,
          condition: formData.condition,
          valuation_low: formData.valuation_low,
          valuation_high: formData.valuation_high,
          sales_blurb: formData.sales_blurb,
        },
        userQuestion
      );
      setChatHistory((prev) => [...prev, { role: "assistant", text: response }]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't process that question." },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  // Status options
  const statusOptions = [
    { value: "TBD", label: "TBD", color: "bg-amber-500" },
    { value: "keep", label: "Keep", color: "bg-blue-500" },
    { value: "sell", label: "Sell", color: "bg-emerald-500" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-stone-100">
          <TouchableOpacity onPress={onClose} className="flex-row items-center">
            <Ionicons name="chevron-back" size={24} color="#1c1917" />
            <Text className="text-stone-600 ml-1">Back</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            {hasChanges && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className="bg-rose-500 px-4 py-2 rounded-lg flex-row items-center gap-1"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="white" />
                    <Text className="text-white font-semibold">Save</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDelete} className="p-2">
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          {/* Image Carousel */}
          <View className="bg-stone-100" style={{ height: width }}>
            {images.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                    setActiveImageIdx(idx);
                  }}
                >
                  {images.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={{ width, height: width }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                {/* Pagination Dots */}
                {images.length > 1 && (
                  <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-2">
                    {images.map((_, idx) => (
                      <View
                        key={idx}
                        className={`w-2 h-2 rounded-full ${
                          idx === activeImageIdx ? "bg-white" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="image-outline" size={48} color="#a8a29e" />
                <Text className="text-stone-400 mt-2">No photos yet</Text>
              </View>
            )}

            {/* Add Photo Button */}
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Add Photo", "", [
                  { text: "Take Photo", onPress: () => handleAddPhoto(true) },
                  { text: "Choose from Library", onPress: () => handleAddPhoto(false) },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
              className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow"
            >
              <Ionicons name="add" size={24} color="#1c1917" />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View className="flex-row border-b border-stone-100">
            <TouchableOpacity
              onPress={() => setActiveTab("details")}
              className={`flex-1 py-3 items-center ${
                activeTab === "details" ? "border-b-2 border-rose-500" : ""
              }`}
            >
              <Text
                className={`font-medium ${
                  activeTab === "details" ? "text-stone-900" : "text-stone-400"
                }`}
              >
                Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("chat")}
              className={`flex-1 py-3 items-center ${
                activeTab === "chat" ? "border-b-2 border-rose-500" : ""
              }`}
            >
              <Text
                className={`font-medium ${
                  activeTab === "chat" ? "text-stone-900" : "text-stone-400"
                }`}
              >
                Ask AI
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "details" ? (
            <View className="p-4">
              {/* AI Analyze Button */}
              <TouchableOpacity
                onPress={handleAnalyze}
                disabled={isAnalyzing || images.length === 0}
                className={`flex-row items-center justify-center gap-2 py-3 rounded-xl mb-4 ${
                  isAnalyzing ? "bg-stone-200" : "bg-gradient-to-r from-rose-500 to-rose-600"
                }`}
                style={{ backgroundColor: isAnalyzing ? "#e7e5e4" : "#e11d48" }}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator size="small" color="#78716c" />
                    <Text className="text-stone-600 font-semibold">Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="white" />
                    <Text className="text-white font-semibold">Run AI Analysis</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Valuation Card */}
              {formData.valuation_low !== undefined && formData.valuation_high !== undefined && (
                <View className="bg-stone-900 rounded-xl p-4 mb-4">
                  <Text className="text-stone-400 text-xs uppercase tracking-wider mb-1">
                    Estimated Value
                  </Text>
                  <Text className="text-white text-2xl font-bold">
                    ${formData.valuation_low} - ${formData.valuation_high}
                  </Text>
                  {formData.confidence && (
                    <View className="flex-row items-center gap-1 mt-1">
                      <Ionicons
                        name="speedometer-outline"
                        size={14}
                        color={
                          formData.confidence === "high"
                            ? "#10b981"
                            : formData.confidence === "medium"
                            ? "#f59e0b"
                            : "#ef4444"
                        }
                      />
                      <Text
                        className={`text-xs uppercase ${
                          formData.confidence === "high"
                            ? "text-emerald-400"
                            : formData.confidence === "medium"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {formData.confidence} confidence
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Status Selector */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-2">
                Status
              </Text>
              <View className="flex-row gap-2 mb-4">
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => updateField("status", option.value as any)}
                    className={`flex-1 py-2.5 rounded-lg items-center ${
                      formData.status === option.value
                        ? option.color
                        : "bg-stone-100"
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        formData.status === option.value
                          ? "text-white"
                          : "text-stone-600"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Title
              </Text>
              <TextInput
                value={formData.title || ""}
                onChangeText={(text) => updateField("title", text)}
                placeholder="Item title"
                className="border border-stone-200 rounded-xl px-4 py-3 mb-3 text-base"
                placeholderTextColor="#a8a29e"
              />

              {/* Category & Era Row */}
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Category
                  </Text>
                  <TextInput
                    value={formData.category || ""}
                    onChangeText={(text) => updateField("category", text)}
                    placeholder="Category"
                    className="border border-stone-200 rounded-xl px-4 py-3 text-base"
                    placeholderTextColor="#a8a29e"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Era
                  </Text>
                  <TextInput
                    value={formData.era || ""}
                    onChangeText={(text) => updateField("era", text)}
                    placeholder="Era"
                    className="border border-stone-200 rounded-xl px-4 py-3 text-base"
                    placeholderTextColor="#a8a29e"
                  />
                </View>
              </View>

              {/* Maker */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Maker / Brand
              </Text>
              <TextInput
                value={formData.maker || ""}
                onChangeText={(text) => updateField("maker", text)}
                placeholder="Maker or brand"
                className="border border-stone-200 rounded-xl px-4 py-3 mb-3 text-base"
                placeholderTextColor="#a8a29e"
              />

              {/* Style */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Style
              </Text>
              <TextInput
                value={formData.style || ""}
                onChangeText={(text) => updateField("style", text)}
                placeholder="Style or genre"
                className="border border-stone-200 rounded-xl px-4 py-3 mb-3 text-base"
                placeholderTextColor="#a8a29e"
              />

              {/* Materials */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Materials
              </Text>
              <TextInput
                value={formData.materials || ""}
                onChangeText={(text) => updateField("materials", text)}
                placeholder="Materials"
                className="border border-stone-200 rounded-xl px-4 py-3 mb-3 text-base"
                placeholderTextColor="#a8a29e"
              />

              {/* Condition */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Condition
              </Text>
              <TextInput
                value={formData.condition || ""}
                onChangeText={(text) => updateField("condition", text)}
                placeholder="Condition"
                className="border border-stone-200 rounded-xl px-4 py-3 mb-3 text-base"
                placeholderTextColor="#a8a29e"
              />

              {/* Sales Blurb */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Description
              </Text>
              <TextInput
                value={formData.sales_blurb || ""}
                onChangeText={(text) => updateField("sales_blurb", text)}
                placeholder="Description"
                multiline
                numberOfLines={4}
                className="border border-stone-200 rounded-xl px-4 py-3 mb-3 text-base"
                textAlignVertical="top"
                placeholderTextColor="#a8a29e"
              />

              {/* User Notes */}
              <Text className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                Your Notes
              </Text>
              <TextInput
                value={formData.userNotes || ""}
                onChangeText={(text) => updateField("userNotes", text)}
                placeholder="Add any personal notes..."
                multiline
                numberOfLines={3}
                className="border border-stone-200 rounded-xl px-4 py-3 mb-4 text-base"
                textAlignVertical="top"
                placeholderTextColor="#a8a29e"
              />

              {/* Marketplace Links */}
              {marketLinks.length > 0 && (
                <>
                  <Text className="text-xs text-stone-500 uppercase tracking-wider mb-2">
                    Research Links
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {marketLinks.map((link) => (
                      <TouchableOpacity
                        key={link.name}
                        onPress={() => Linking.openURL(link.url)}
                        className={`${link.color} px-4 py-2 rounded-lg flex-row items-center gap-1`}
                      >
                        <Ionicons name={link.icon as any} size={14} color="#44403c" />
                        <Text className="text-stone-700 font-medium text-sm">
                          {link.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : (
            // Chat Tab
            <View className="flex-1 p-4" style={{ minHeight: 400 }}>
              {chatHistory.length === 0 ? (
                <View className="items-center justify-center py-8">
                  <View className="w-16 h-16 bg-stone-100 rounded-full items-center justify-center mb-3">
                    <Ionicons name="chatbubbles-outline" size={32} color="#a8a29e" />
                  </View>
                  <Text className="text-stone-600 text-center font-medium mb-1">
                    Ask about this item
                  </Text>
                  <Text className="text-stone-400 text-center text-sm px-8">
                    Ask questions like "How did you determine the era?" or "What makes this valuable?"
                  </Text>
                </View>
              ) : (
                <View className="mb-4">
                  {chatHistory.map((msg, idx) => (
                    <View
                      key={idx}
                      className={`mb-3 ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <View
                        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-rose-500 rounded-br-sm"
                            : "bg-stone-100 rounded-bl-sm"
                        }`}
                      >
                        <Text
                          className={msg.role === "user" ? "text-white" : "text-stone-800"}
                        >
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {isChatting && (
                    <View className="items-start mb-3">
                      <View className="bg-stone-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                        <ActivityIndicator size="small" color="#78716c" />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Chat Input */}
              <View className="flex-row items-end gap-2">
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Ask a question..."
                  multiline
                  className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-base max-h-24"
                  placeholderTextColor="#a8a29e"
                />
                <TouchableOpacity
                  onPress={handleChatSubmit}
                  disabled={!chatInput.trim() || isChatting}
                  className={`w-11 h-11 rounded-full items-center justify-center ${
                    chatInput.trim() && !isChatting ? "bg-rose-500" : "bg-stone-200"
                  }`}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={chatInput.trim() && !isChatting ? "white" : "#a8a29e"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

