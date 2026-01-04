import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import { MAX_BASE64_SIZE_BYTES, VALID_IMAGE_TYPES } from "../config/constants";

// URL Cache - Persists across component unmounts/remounts
const fileUrlCache = new WeakMap<File, string>();

/**
 * Get or create object URL for a File object
 */
export const getFileUrl = (file: File | null | undefined): string | null => {
  if (!file) return null;
  if (fileUrlCache.has(file)) {
    return fileUrlCache.get(file) || null;
  }
  const url = URL.createObjectURL(file);
  fileUrlCache.set(file, url);
  return url;
};

/**
 * Convert image to base64 - FULL RESOLUTION (no compression)
 * Details matter for accurate identification (marks, signatures, hallmarks)
 */
export const imageToBase64FullRes = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Moderate compression for storing base64 in Firestore subcollection
 * Progressively compresses until under MAX_BASE64_SIZE_BYTES
 */
export const compressImageForBase64Storage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/') && !VALID_IMAGE_TYPES.includes(file.type)) {
      reject(new Error(`Invalid file type: ${file.type || file.name}`));
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Progressive compression: try larger first, reduce if too big
        const attempts = [
          { maxDim: 1600, quality: 0.85 },
          { maxDim: 1200, quality: 0.75 },
          { maxDim: 1000, quality: 0.65 },
          { maxDim: 800, quality: 0.55 },
        ];
        
        for (const { maxDim, quality } of attempts) {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
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
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }
          
          const base64 = canvas.toDataURL("image/jpeg", quality);
          
          // Check if under size limit
          if (base64.length < MAX_BASE64_SIZE_BYTES) {
            resolve(base64);
            return;
          }
        }
        
        // Final fallback: smallest size
        const canvas = document.createElement("canvas");
        let width = img.width, height = img.height;
        const maxDim = 600;
        if (width > height) { height *= maxDim / width; width = maxDim; }
        else { width *= maxDim / height; height = maxDim; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL("image/jpeg", 0.5));
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
  });
};

/**
 * Compress image and return as base64 or Blob
 */
export function compressImage(file: File, returnBlob: true): Promise<Blob>;
export function compressImage(file: File, returnBlob?: false): Promise<string>;
export function compressImage(file: File, returnBlob: boolean = false): Promise<string | Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
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
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        if (returnBlob) {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to create blob"));
            },
            "image/jpeg",
            0.85
          );
        } else {
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Upload image to Firebase Storage and return download URL
 */
export const uploadImageToStorage = async (
  file: File, 
  userId: string, 
  itemId: string, 
  imageIndex: number
): Promise<string> => {
  try {
    const compressedBlob = await compressImage(file, true);
    const timestamp = Date.now();
    const path = `users/${userId}/items/${itemId}/${timestamp}_${imageIndex}.jpg`;
    const storageRef = ref(storage, path);
    
    await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
    });
    
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to storage:", error);
    throw error;
  }
};
