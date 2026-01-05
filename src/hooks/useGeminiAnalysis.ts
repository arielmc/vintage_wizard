import { useState, useCallback } from 'react';
import type { InventoryItem, AIAnalysisResult } from '../types';

// Gemini API configuration
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Convert URL to base64
async function urlToBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxSize = 1024;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch {
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  });
}

// Ensure image is base64
async function ensureBase64(img: string | Blob | File): Promise<string | null> {
  if (!img) return null;
  
  if (typeof img === 'string' && img.startsWith('data:image')) {
    return img;
  }
  
  if (img instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(img);
    });
  }
  
  if (typeof img === 'string' && img.startsWith('blob:')) {
    try {
      const response = await fetch(img);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  
  if (typeof img === 'string' && img.startsWith('http')) {
    return await urlToBase64(img);
  }
  
  return null;
}

// Build the analysis prompt
function buildAnalysisPrompt(userNotes: string, currentData: Partial<InventoryItem>): string {
  const knownDetails: string[] = [];
  if (currentData.title) knownDetails.push(`Title/Type: ${currentData.title}`);
  if (currentData.maker) knownDetails.push(`Maker/Brand: ${currentData.maker}`);
  if (currentData.style) knownDetails.push(`Style: ${currentData.style}`);
  if (currentData.materials) knownDetails.push(`Materials: ${currentData.materials}`);
  if (currentData.era) knownDetails.push(`Era: ${currentData.era}`);

  const contextPrompt = knownDetails.length > 0
    ? `The user has already identified the following details (TRUST THESE over your visual estimate if they conflict): ${knownDetails.join(', ')}.`
    : '';
  
  const clarifications = (currentData as any).clarifications;
  const userAnswersContext = clarifications && Object.keys(clarifications).length > 0
    ? `\nThe user has answered your previous questions. Use these answers to refine your valuation: ${JSON.stringify(clarifications)}.`
    : '';

  return `
    You are an expert archivist and appraiser with distinct specializations in:
    - Rare Books & Ephemera
    - Vintage Vinyl & Music
    - Fine Art & Prints
    - Antique Jewelry & Watches
    - Vintage Fashion & Textiles
    - Mid-Century Modern & Antique Furniture/Decor
    - Vintage Electronics & Cameras
    - Retro Toys & Trading Cards
    - Kitchenware & Glass
    
    ${contextPrompt}
    ${userAnswersContext}
    
    Analyze the attached images.
    
    CONTEXT FROM USER NOTES/CONTEXT: "${userNotes}"
    (Use this information to inform your identification and valuation if relevant).
    
    STEP 1: CLASSIFY
    Determine the specific category of the item.

    STEP 2: ANALYZE (Based on Category)
    Apply the specific lens for that category to extract details.

    STEP 3: EVALUATE
    Assess condition and estimate value based on the identified specifics.

    Provide a JSON response with:
    - category: Choose from [Vinyl & Music, Furniture, Decor & Lighting, Art, Jewelry & Watches, Fashion, Ceramics & Glass, Collectibles, Books, Automotive, Electronics, Other]
    - title: Rich, SEO-friendly title
    - maker: The primary creator
    - style: The artistic movement, genre, or design era
    - materials: Detailed materials
    - markings: EXACT transcription of visible text
    - era: Specific year or estimated decade
    - condition: Professional condition assessment
    - valuation_low: Conservative estimate (USD number)
    - valuation_high: Optimistic estimate (USD number)
    - confidence: "high", "medium", or "low"
    - confidence_reason: Brief explanation
    - reasoning: Explanation of value
    - search_terms: Specific keywords for eBay
    - search_terms_broad: Simplified 2-4 word query
    - search_terms_discogs: FOR MUSIC ONLY - Artist + Album only
    - search_terms_auction: For auction sites
    - details_description: General description (5-7 sentences)
    - sales_description: Sales description for listings
    - questions: Array of strings (max 3) for critical missing info
    
    WRITING STYLE: Write in a calm, confident, professional tone. Do NOT use exclamation points.
  `;
}

// Hook return type
interface UseGeminiAnalysisReturn {
  analyzing: boolean;
  error: string | null;
  analyzeImages: (
    images: (string | Blob | File)[],
    userNotes?: string,
    currentData?: Partial<InventoryItem>
  ) => Promise<AIAnalysisResult>;
  askQuestion: (
    images: string[],
    itemContext: Partial<InventoryItem>,
    question: string
  ) => Promise<string>;
  clearError: () => void;
}

/**
 * Hook for Gemini AI analysis
 */
export const useGeminiAnalysis = (): UseGeminiAnalysisReturn => {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const analyzeImages = useCallback(
    async (
      images: (string | Blob | File)[],
      userNotes = '',
      currentData: Partial<InventoryItem> = {}
    ): Promise<AIAnalysisResult> => {
      setAnalyzing(true);
      setError(null);

      try {
        // Limit to 4 images
        const rawImages = images.slice(0, 4);
        
        // Convert all to base64
        const base64Images = await Promise.all(rawImages.map((img) => ensureBase64(img)));
        const validImages = base64Images.filter((img): img is string => img !== null);

        if (validImages.length === 0) {
          throw new Error('No valid images to analyze. Please add photos first.');
        }

        const prompt = buildAnalysisPrompt(userNotes, currentData);
        
        const imageParts = validImages.map((img) => ({
          inlineData: {
            mimeType: 'image/jpeg',
            data: img.split(',')[1],
          },
        }));

        const payload = {
          contents: [{ parts: [{ text: prompt }, ...imageParts] }],
          generationConfig: { responseMimeType: 'application/json' },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        };

        const response = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini API Error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!resultText) {
          throw new Error('No analysis generated - possibly blocked by safety filters.');
        }

        // Clean up response
        let cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(cleanedText) as AIAnalysisResult;
        
        // Backwards compatibility
        if (parsed && typeof parsed === 'object') {
          if (!parsed.sales_blurb && parsed.details_description) {
            parsed.sales_blurb = parsed.details_description;
          }
          if (!parsed.listing_description && parsed.sales_description) {
            parsed.listing_description = parsed.sales_description;
          }
        }

        return parsed;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        setError(message);
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  const askQuestion = useCallback(
    async (
      images: string[],
      itemContext: Partial<InventoryItem>,
      question: string
    ): Promise<string> => {
      setError(null);

      try {
        const systemPrompt = `You are an expert antique and vintage appraiser assistant helping someone understand their item analysis.

ITEM ANALYSIS DATA:
${JSON.stringify(itemContext, null, 2)}

USER'S QUESTION: "${question}"

INSTRUCTIONS:
- Answer the user's question helpfully and concisely (2-4 sentences usually).
- Reference the item analysis data provided above.
- Be friendly, professional, and educational.
- Write in a calm, confident tone. Do NOT use exclamation points.`;

        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
          { text: systemPrompt },
        ];

        // Add images (limit to 4)
        images.slice(0, 4).forEach((img) => {
          if (img.startsWith('data:image')) {
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: img.split(',')[1],
              },
            });
          }
        });

        const payload = {
          contents: [{ parts }],
          generationConfig: { temperature: 0.7 },
        };

        const response = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat failed';
        setError(message);
        throw err;
      }
    },
    []
  );

  return {
    analyzing,
    error,
    analyzeImages,
    askQuestion,
    clearError,
  };
};

export default useGeminiAnalysis;
