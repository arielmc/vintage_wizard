import { GEMINI_URL, GEMINI_API_KEY } from '../config/constants';
import type { AIAnalysisResult, InventoryItem, GeminiResponse } from '../types';

/**
 * Convert URL to base64 using Image + Canvas (bypasses CORS)
 */
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      } catch (err) {
        console.error("Canvas conversion failed:", err);
        resolve(null);
      }
    };
    
    img.onerror = async () => {
      console.log("Image load failed, trying fetch approach...");
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Fetch fallback also failed:", err);
        resolve(null);
      }
    };
    
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  });
}

/**
 * Ensure image is in base64 format
 */
async function ensureBase64(img: string | Blob | null | undefined): Promise<string | null> {
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

interface GeminiImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

interface GeminiChatPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

/**
 * Analyze images with Gemini AI
 */
export async function analyzeImagesWithGemini(
  images: (string | Blob | null | undefined)[],
  userNotes: string,
  currentData: Partial<InventoryItem> = {}
): Promise<AIAnalysisResult> {
  const rawImages = images.slice(0, 4);
  const imagesToAnalyze = await Promise.all(rawImages.map(img => ensureBase64(img)));
  const validImages = imagesToAnalyze.filter((img): img is string => img !== null);

  const knownDetails: string[] = [];
  if (currentData.title) knownDetails.push(`Title/Type: ${currentData.title}`);
  if (currentData.maker) knownDetails.push(`Maker/Brand: ${currentData.maker}`);
  if (currentData.style) knownDetails.push(`Style: ${currentData.style}`);
  if (currentData.materials) knownDetails.push(`Materials: ${currentData.materials}`);
  if (currentData.era) knownDetails.push(`Era: ${currentData.era}`);

  const contextPrompt = knownDetails.length > 0
    ? `The user has already identified the following details (TRUST THESE over your visual estimate if they conflict): ${knownDetails.join(", ")}.`
    : "";
  
  const userAnswersContext = currentData.clarifications && Object.keys(currentData.clarifications).length > 0
    ? `\nThe user has answered your previous questions. Use these answers to refine your valuation: ${JSON.stringify(currentData.clarifications)}.`
    : "";

  const prompt = `
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
    Assess condition (mint, very good, fair) and estimate value based on the identified specifics.
    
    Provide a JSON response with:
    - category: Choose one strictly from: [Vinyl & Music, Furniture, Decor & Lighting, Art, Jewelry & Watches, Fashion, Ceramics & Glass, Collectibles, Books, Automotive, Electronics, Other].
    - title: Rich, SEO-friendly title including key identifiers.
    - maker: The primary creator (Artist, Author, Brand, Jeweler).
    - style: The artistic movement, genre, or design era.
    - materials: Detailed materials, binding, or medium.
    - markings: EXACT transcription of visible text, ISBNs, catalog numbers, signatures, or hallmarks.
    - era: Specific year or estimated decade.
    - condition: Professional condition assessment.
    - valuation_low: Conservative estimate (USD number).
    - valuation_high: Optimistic estimate (USD number).
    - confidence: One of "high", "medium", or "low".
    - search_terms: Specific keywords for eBay.
    - search_terms_broad: A simplified 2-4 word query.
    - search_terms_discogs: FOR MUSIC ONLY - Artist name + Album/Title ONLY.
    - search_terms_auction: For auction sites.
    - details_description: A general description (5-7 sentences).
    - sales_description: A separate sales description.
    
    WRITING STYLE: Write in a calm, confident, professional tone. Do NOT use exclamation points.
  `;

  if (validImages.length === 0) {
    throw new Error("No valid images to analyze. Please add photos first.");
  }

  const imageParts: GeminiImagePart[] = validImages.map((img) => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(",")[1],
    },
  }));

  const payload = {
    contents: [{ parts: [{ text: prompt }, ...imageParts] }],
    generationConfig: { responseMimeType: "application/json" },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ]
  };

  try {
    console.log("API Key loaded:", GEMINI_API_KEY ? "Yes (length: " + GEMINI_API_KEY.length + ")" : "NO - Missing!");
    
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error:", response.status, response.statusText, errorBody);
      throw new Error(`Gemini API Error: ${response.status} - ${errorBody}`);
    }
    const data: GeminiResponse = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("No analysis generated - possibly blocked by safety filters or empty response.");
    
    let cleanedText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    console.log("AI Raw Response:", cleanedText);

    const parsed: AIAnalysisResult = JSON.parse(cleanedText);
    if (parsed && typeof parsed === "object") {
      if (!parsed.sales_blurb && parsed.detailed_description) {
        parsed.sales_blurb = parsed.detailed_description;
      }
      if (!parsed.detailed_description && parsed.sales_blurb) {
        parsed.detailed_description = parsed.sales_blurb;
      }
    }
    return parsed;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}

/**
 * Chat with Gemini about an item analysis
 */
export async function askGeminiChat(
  images: string[] | undefined,
  itemContext: Partial<InventoryItem>,
  userQuestion: string
): Promise<string> {
  try {
    const systemPrompt = `You are an expert antique and vintage appraiser assistant helping someone understand their item analysis.

ITEM ANALYSIS DATA:
${JSON.stringify(itemContext, null, 2)}

USER'S QUESTION: "${userQuestion}"

INSTRUCTIONS:
- Answer the user's question helpfully and concisely (2-4 sentences usually).
- Reference the item analysis data provided above.
- If asked "how did you know X?", explain what visual markers, stamps, styles, or patterns indicate that conclusion.
- If you can see evidence in the images (maker marks, signatures, date codes, etc.), describe where to look.
- Be friendly, professional, and educational.
- If you're uncertain about something, say so honestly.
- Don't repeat the full analysis - just answer their specific question.
- Write in a calm, confident tone. Do NOT use exclamation points.`;

    const parts: GeminiChatPart[] = [{ text: systemPrompt }];
    
    if (images && images.length > 0) {
      images.slice(0, 4).forEach(img => {
        if (img.startsWith('data:image')) {
          parts.push({
            inline_data: {
              mime_type: "image/jpeg", 
              data: img.split(",")[1]
            }
          });
        }
      });
    }

    const payload = {
      contents: [{ role: "user", parts: parts }],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.7,
      },
    };

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
    const data: GeminiResponse = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that question. Please try again.";
  } catch (error) {
    console.error("AI Chat failed:", error);
    throw error;
  }
}
