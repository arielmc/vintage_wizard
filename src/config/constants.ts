// App identifier for Firestore collections
export const APP_ID: string = "vintage-validator-v1";

// Image upload limits
export const MAX_IMAGES_SINGLE_UPLOAD: number = 6; // Single item upload limit
export const MAX_IMAGES_PER_STACK: number = 8; // Bulk upload: max per stack/item
export const MAX_IMAGES_BULK_SESSION: number = 30; // Bulk upload: total photos allowed in session
export const MAX_BASE64_SIZE_BYTES: number = 900000; // ~900KB to stay safely under Firestore 1MB limit

// Valid image MIME types
export const VALID_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
] as const;

// Gemini calls go through the `analyzeImages` / `askAboutItem` Cloud Functions.
// The key lives in Firebase Secret Manager (see functions/index.js) and is
// intentionally absent from the browser bundle.
