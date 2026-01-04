// App identifier for Firestore collections
export const APP_ID = "vintage-validator-v1";

// Image upload limits
export const MAX_IMAGES_SINGLE_UPLOAD = 6; // Single item upload limit
export const MAX_IMAGES_PER_STACK = 8; // Bulk upload: max per stack/item
export const MAX_IMAGES_BULK_SESSION = 30; // Bulk upload: total photos allowed in session
export const MAX_BASE64_SIZE_BYTES = 900000; // ~900KB to stay safely under Firestore 1MB limit

// Valid image MIME types
export const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
];

// Gemini API configuration
export const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
