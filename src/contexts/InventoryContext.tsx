import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useFirebase } from './FirebaseContext';
import { useAuth } from './AuthContext';
import type { InventoryItem, ItemStatus } from '../types';

// Context type
interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  // CRUD operations
  addItem: (item: Partial<InventoryItem>, images?: File[]) => Promise<string>;
  updateItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  deleteItems: (itemIds: string[]) => Promise<void>;
  updateItemStatus: (itemId: string, status: ItemStatus) => Promise<void>;
  updateItemsStatus: (itemIds: string[], status: ItemStatus) => Promise<void>;
  // Image operations
  uploadImages: (itemId: string, files: File[]) => Promise<string[]>;
  deleteImage: (itemId: string, imageUrl: string) => Promise<void>;
  reorderImages: (itemId: string, newOrder: string[]) => Promise<void>;
  // Utilities
  getItem: (itemId: string) => InventoryItem | undefined;
  clearError: () => void;
}

// Create context
const InventoryContext = createContext<InventoryContextType | null>(null);

// Image compression utility
const compressImage = (file: File, returnBlob = false): Promise<string | Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        if (returnBlob) {
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        }
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// Provider component
export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { db, storage, appId, logAnalyticsEvent } = useFirebase();
  const { user } = useAuth();

  // Subscribe to user's inventory
  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const itemsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory');
    const q = query(itemsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryItem[];
        setItems(loadedItems);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading inventory:', err);
        setError('Failed to load inventory');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db, appId]);

  const clearError = useCallback(() => setError(null), []);

  const getItem = useCallback(
    (itemId: string) => items.find((item) => item.id === itemId),
    [items]
  );

  // Upload images to Firebase Storage
  const uploadImages = useCallback(
    async (itemId: string, files: File[]): Promise<string[]> => {
      if (!user) throw new Error('Not authenticated');

      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBlob = (await compressImage(file, true)) as Blob;
        const timestamp = Date.now();
        const path = `users/${user.uid}/items/${itemId}/${timestamp}_${i}.jpg`;
        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
        const downloadURL = await getDownloadURL(storageRef);
        urls.push(downloadURL);
      }
      return urls;
    },
    [user, storage]
  );

  // Add a new item
  const addItem = useCallback(
    async (item: Partial<InventoryItem>, images?: File[]): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      const itemsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory');

      // Create the item first
      const newItem = {
        ...item,
        status: item.status || 'TBD',
        timestamp: serverTimestamp(),
        images: [],
      };

      const docRef = await addDoc(itemsRef, newItem);

      // Upload images if provided
      if (images && images.length > 0) {
        const urls = await uploadImages(docRef.id, images);
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', docRef.id), {
          images: urls,
          image: urls[0], // Legacy field
        });
      }

      logAnalyticsEvent('item_added');
      return docRef.id;
    },
    [user, db, appId, uploadImages, logAnalyticsEvent]
  );

  // Update an item
  const updateItem = useCallback(
    async (itemId: string, updates: Partial<InventoryItem>): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      const itemRef = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', itemId);
      await updateDoc(itemRef, updates);
      logAnalyticsEvent('item_updated');
    },
    [user, db, appId, logAnalyticsEvent]
  );

  // Delete an item
  const deleteItem = useCallback(
    async (itemId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      const itemRef = doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', itemId);
      await deleteDoc(itemRef);
      logAnalyticsEvent('item_deleted');
    },
    [user, db, appId, logAnalyticsEvent]
  );

  // Delete multiple items
  const deleteItems = useCallback(
    async (itemIds: string[]): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      await Promise.all(itemIds.map((id) => deleteItem(id)));
      logAnalyticsEvent('items_bulk_deleted', { count: itemIds.length });
    },
    [user, deleteItem, logAnalyticsEvent]
  );

  // Update item status
  const updateItemStatus = useCallback(
    async (itemId: string, status: ItemStatus): Promise<void> => {
      await updateItem(itemId, { status });
    },
    [updateItem]
  );

  // Update multiple items' status
  const updateItemsStatus = useCallback(
    async (itemIds: string[], status: ItemStatus): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      await Promise.all(itemIds.map((id) => updateItemStatus(id, status)));
      logAnalyticsEvent('items_bulk_status_updated', { count: itemIds.length, status });
    },
    [user, updateItemStatus, logAnalyticsEvent]
  );

  // Delete an image from an item
  const deleteImage = useCallback(
    async (itemId: string, imageUrl: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      // Remove from Storage
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (err) {
        console.warn('Could not delete image from storage:', err);
      }

      // Update item
      const item = getItem(itemId);
      if (item) {
        const newImages = (item.images || []).filter((url) => url !== imageUrl);
        await updateItem(itemId, {
          images: newImages,
          image: newImages[0] || null,
        });
      }
    },
    [user, storage, getItem, updateItem]
  );

  // Reorder images
  const reorderImages = useCallback(
    async (itemId: string, newOrder: string[]): Promise<void> => {
      await updateItem(itemId, {
        images: newOrder,
        image: newOrder[0] || null,
      });
    },
    [updateItem]
  );

  const value: InventoryContextType = {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
    updateItemStatus,
    updateItemsStatus,
    uploadImages,
    deleteImage,
    reorderImages,
    getItem,
    clearError,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

// Hook to use inventory
export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
