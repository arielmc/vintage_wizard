export interface InventoryItem {
  id: string;
  title?: string;
  category?: string;
  maker?: string;
  style?: string;
  materials?: string;
  markings?: string;
  era?: string;
  condition?: string;
  valuation_low?: number;
  valuation_high?: number;
  confidence?: "high" | "medium" | "low";
  confidence_reason?: string;
  reasoning?: string;
  search_terms?: string;
  search_terms_broad?: string;
  search_terms_discogs?: string;
  search_terms_auction?: string;
  sales_blurb?: string;
  questions?: string[];
  images?: string[];
  images_base64?: string[];
  userNotes?: string;
  status?: "keep" | "sell" | "TBD";
  aiLastRun?: string;
  timestamp?: any;
  clarifications?: Record<string, string>;
  provenance?: {
    user_story?: string;
    date_claim?: string;
    is_locked?: boolean;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export type FilterType = "all" | "keep" | "sell" | "TBD";
export type SortType = "date-desc" | "date-asc" | "value-desc" | "value-asc" | "title-asc";

