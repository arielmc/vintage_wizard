import Constants from "expo-constants";

// Gemini API configuration
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface AnalysisResult {
  category: string;
  title: string;
  maker: string;
  style: string;
  materials: string;
  markings: string;
  era: string;
  condition: string;
  valuation_low: number;
  valuation_high: number;
  confidence: "high" | "medium" | "low";
  confidence_reason: string;
  reasoning: string;
  search_terms: string;
  search_terms_broad: string;
  search_terms_discogs?: string;
  search_terms_auction: string;
  sales_blurb: string;
  questions: string[];
}

// Analyze images with Gemini AI
export async function analyzeImagesWithGemini(
  images: string[],
  userNotes: string,
  currentData: Record<string, any> = {}
): Promise<AnalysisResult> {
  // Limit to 4 images max
  const validImages = images.slice(0, 4).filter(img => img && img.startsWith('data:image'));

  const knownDetails: string[] = [];
  if (currentData.title) knownDetails.push(`Title/Type: ${currentData.title}`);
  if (currentData.maker) knownDetails.push(`Maker/Brand: ${currentData.maker}`);
  if (currentData.style) knownDetails.push(`Style: ${currentData.style}`);
  if (currentData.materials) knownDetails.push(`Materials: ${currentData.materials}`);
  if (currentData.era) knownDetails.push(`Era: ${currentData.era}`);

  const contextPrompt =
    knownDetails.length > 0
      ? `The user has already identified the following details (TRUST THESE over your visual estimate if they conflict): ${knownDetails.join(", ")}.`
      : "";

  const userAnswersContext =
    currentData.clarifications && Object.keys(currentData.clarifications).length > 0
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
    - confidence_reason: Brief explanation of confidence level.
    - reasoning: Explanation of value (rarity, demand, comparables).
    - search_terms: Specific keywords for eBay.
    - search_terms_broad: Simplified 2-4 word query.
    - search_terms_discogs: FOR MUSIC ONLY - Artist + Album only.
    - search_terms_auction: For auction sites - Maker/Artist + Object type + era.
    - sales_blurb: Detailed description (4-6 sentences).
    - questions: Array of strings (max 3) for critical missing info.
    
    WRITING STYLE: Write all text in a calm, confident, professional tone. Do NOT use exclamation points.
  `;

  if (validImages.length === 0) {
    throw new Error("No valid images to analyze. Please add photos first.");
  }

  const imageParts = validImages.map((img) => ({
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
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  try {
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
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("No analysis generated.");

    // Cleanup markdown if present
    let cleanedText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    // Extract JSON object
    const firstBrace = cleanedText.indexOf("{");
    const lastBrace = cleanedText.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}

// Chat with AI about an item
export async function askGeminiChat(
  images: string[],
  itemContext: Record<string, any>,
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
- Be friendly, professional, and educational.
- If you're uncertain about something, say so honestly.
- Write in a calm, confident tone. Do NOT use exclamation points.`;

    const parts: any[] = [{ text: systemPrompt }];

    // Add images if available (limit to 4)
    if (images && images.length > 0) {
      images.slice(0, 4).forEach((img) => {
        if (img.startsWith("data:image")) {
          parts.push({
            inline_data: {
              mime_type: "image/jpeg",
              data: img.split(",")[1],
            },
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
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that question.";
  } catch (error) {
    console.error("AI Chat failed:", error);
    throw error;
  }
}

