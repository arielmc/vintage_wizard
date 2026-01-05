import { User } from 'firebase/auth';

// ============================================
// CORE TYPES
// ============================================

/** Item status for inventory management */
export type ItemStatus = 'keep' | 'sell' | 'TBD' | 'draft' | 'unprocessed' | 'maybe';

/** AI confidence level */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Emoji style for listing generator */
export type EmojiStyle = 'none' | 'minimal' | 'full';

// ============================================
// INVENTORY ITEM
// ============================================

/** Provenance information for an item */
export interface Provenance {
  user_story?: string;
  acquisition?: string;
  location?: string;
}

/** Valuation context from AI analysis */
export interface ValuationContext {
  reasoning?: string;
  comparables?: string[];
  market_factors?: string[];
}

/** Clarification questions/answers for an item */
export interface Clarifications {
  [key: string]: string;
}

/** Core inventory item type */
export interface InventoryItem {
  id: string;
  
  // Basic info
  title?: string;
  category?: string;
  maker?: string;
  style?: string;
  era?: string;
  materials?: string;
  condition?: string;
  markings?: string;
  
  // Valuation
  valuation_low?: number;
  valuation_high?: number;
  confidence?: ConfidenceLevel;
  valuation_context?: ValuationContext | null;
  
  // Status
  status?: ItemStatus;
  
  // Images
  images?: string[];
  image?: string; // Legacy single image field
  
  // AI-generated content
  sales_blurb?: string;
  detailed_description?: string;
  
  // Search terms for marketplace links
  search_terms?: string;
  search_terms_broad?: string;
  search_terms_auction?: string;
  search_terms_discogs?: string;
  
  // Listing generator fields
  listing_title?: string | null;
  listing_description?: string | null;
  listing_tags?: string | null;
  listing_price?: number | null;
  
  // Tone settings
  tone_sales?: number;
  tone_nerd?: number;
  tone_formality?: number;
  tone_funfact?: boolean;
  tone_dadjoke?: boolean;
  tone_emoji?: EmojiStyle;
  
  // Provenance and notes
  userNotes?: string;
  provenance?: Provenance;
  clarifications?: Clarifications;
  
  // Timestamps
  timestamp?: string;
  aiLastRun?: string;
  
  // SKU (derived from id)
  sku?: string;
}

// ============================================
// USER TYPES
// ============================================

/** Extended Firebase user with app-specific properties */
export interface AppUser extends User {
  // Firebase User already has: uid, email, displayName, photoURL, metadata
}

// ============================================
// SHARE TYPES
// ============================================

/** Collection share data stored in Firestore */
export interface ShareData {
  token: string;
  userId: string;
  isActive: boolean;
  ownerName?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Individual item share data */
export interface ItemShareData extends ShareData {
  itemId: string;
  viewType: 'listing' | 'details';
  itemTitle?: string;
  itemImage?: string | null;
}

// ============================================
// GEMINI API TYPES
// ============================================

/** Gemini API response structure */
export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/** Parsed AI analysis result */
export interface AIAnalysisResult {
  title?: string;
  category?: string;
  maker?: string;
  style?: string;
  era?: string;
  materials?: string;
  condition?: string;
  markings?: string;
  valuation_low?: number;
  valuation_high?: number;
  confidence?: ConfidenceLevel;
  confidence_reason?: string;
  reasoning?: string;
  // Description fields (various names used)
  sales_blurb?: string;
  details_description?: string;
  detailed_description?: string;
  sales_description?: string;
  listing_description?: string;
  // Search terms
  search_terms?: string;
  search_terms_broad?: string;
  search_terms_auction?: string;
  search_terms_discogs?: string;
  // Questions for user
  questions?: string[];
  valuation_context?: ValuationContext;
}

// ============================================
// MARKETPLACE TYPES
// ============================================

/** Marketplace link for comparison shopping */
export interface MarketplaceLink {
  name: string;
  url: string;
  icon?: string;
  color?: string;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

/** Common modal props */
export interface ModalProps {
  onClose: () => void;
}

/** Item action callbacks */
export interface ItemActions {
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ItemStatus) => void;
  onAnalyze?: (item: InventoryItem) => void;
  onShare?: (item: InventoryItem) => void;
}

// ============================================
// UPLOAD TYPES
// ============================================

/** File with preview URL for upload staging */
export interface StagedFile {
  file: File;
  previewUrl: string;
  id: string;
}

/** Stack of images for bulk upload */
export interface ImageStack {
  id: string;
  files: StagedFile[];
  isProcessing?: boolean;
}

// ============================================
// FORM DATA TYPE
// ============================================

/** Form data for editing an item (extends InventoryItem with UI state) */
export interface ItemFormData extends InventoryItem {
  // Additional UI-only fields can be added here
}
