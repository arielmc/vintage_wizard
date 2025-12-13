import { useState, useEffect, useCallback } from "react";
import {
  db,
  appId,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  User,
} from "../config/firebase";
import { InventoryItem, FilterType, SortType } from "../types";
import { analyzeImagesWithGemini } from "../services/gemini";

export function useInventory(user: User | null) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("date-desc");
  const [searchQuery, setSearchQuery] = useState("");

  // Subscribe to inventory changes
  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "inventory"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InventoryItem))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Inventory subscription error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Add new item with images (images are { uri, base64 } objects)
  const addItem = useCallback(
    async (images: { uri: string; base64: string }[], userNotes: string = "") => {
      if (!user) throw new Error("Not authenticated");

      // Extract base64 strings for storage and display
      const base64Images = images.map((img) => img.base64);

      // Create the item with base64 images stored directly
      // (For a production app, you'd upload to Firebase Storage instead)
      const itemRef = await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "inventory"),
        {
          timestamp: serverTimestamp(),
          status: "TBD",
          userNotes,
          images: base64Images, // Store base64 for display
        }
      );

      // Also store in subcollection for AI analysis
      for (let i = 0; i < base64Images.length; i++) {
        try {
          await setDoc(
            doc(
              db,
              "artifacts",
              appId,
              "users",
              user.uid,
              "inventory",
              itemRef.id,
              "images_ai",
              `img_${i}`
            ),
            { base64: base64Images[i], index: i, createdAt: serverTimestamp() }
          );
        } catch (err) {
          console.error("Failed to store base64 in subcollection:", err);
        }
      }

      return itemRef.id;
    },
    [user]
  );

  // Update existing item
  const updateItem = useCallback(
    async (itemId: string, updates: Partial<InventoryItem>) => {
      if (!user) throw new Error("Not authenticated");

      await updateDoc(
        doc(db, "artifacts", appId, "users", user.uid, "inventory", itemId),
        updates
      );
    },
    [user]
  );

  // Delete item
  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!user) throw new Error("Not authenticated");

      await deleteDoc(
        doc(db, "artifacts", appId, "users", user.uid, "inventory", itemId)
      );
    },
    [user]
  );

  // Analyze item with AI
  const analyzeItem = useCallback(
    async (item: InventoryItem) => {
      if (!user) throw new Error("Not authenticated");

      let imagesToAnalyze: string[] = [];

      // Priority 1: Fetch from subcollection
      try {
        const aiImagesSnapshot = await getDocs(
          collection(
            db,
            "artifacts",
            appId,
            "users",
            user.uid,
            "inventory",
            item.id,
            "images_ai"
          )
        );
        if (!aiImagesSnapshot.empty) {
          const aiImages = aiImagesSnapshot.docs
            .map((doc) => ({ ...doc.data(), docId: doc.id }))
            .sort((a: any, b: any) => (a.index || 0) - (b.index || 0))
            .map((d: any) => d.base64)
            .filter((b64: string) => b64 && b64.startsWith("data:"));
          if (aiImages.length > 0) {
            imagesToAnalyze = aiImages;
          }
        }
      } catch (err) {
        console.warn("Could not fetch from subcollection:", err);
      }

      // Priority 2: Use images array (now storing base64 directly)
      if (imagesToAnalyze.length === 0 && item.images?.length) {
        imagesToAnalyze = item.images.filter(
          (img) => typeof img === "string" && img.startsWith("data:")
        );
      }

      if (imagesToAnalyze.length === 0) {
        throw new Error("No images available for analysis. Please add photos first.");
      }

      const analysis = await analyzeImagesWithGemini(
        imagesToAnalyze,
        item.userNotes || "",
        item
      );

      await updateItem(item.id, {
        ...analysis,
        aiLastRun: new Date().toISOString(),
      });

      return analysis;
    },
    [user, updateItem]
  );

  // Filter and sort items
  const filteredItems = items
    .filter((item) => {
      // Status filter
      if (filter !== "all" && item.status !== filter) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.maker?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.style?.toLowerCase().includes(q) ||
          item.userNotes?.toLowerCase().includes(q)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0);
        case "value-desc":
          return (b.valuation_high || 0) - (a.valuation_high || 0);
        case "value-asc":
          return (a.valuation_low || 0) - (b.valuation_low || 0);
        case "title-asc":
          return (a.title || "").localeCompare(b.title || "");
        default: // date-desc
          return (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0);
      }
    });

  return {
    items: filteredItems,
    allItems: items,
    loading,
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
  };
}
