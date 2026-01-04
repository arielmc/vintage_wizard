import { GEMINI_URL, GEMINI_API_KEY } from '../config/constants';

/**
 * Convert URL to base64 using Image + Canvas (bypasses CORS)
 */
async function urlToBase64(url) {
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
        ctx.drawImage(img, 0, 0, width, height);
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
        reader.onloadend = () => resolve(reader.result);
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
async function ensureBase64(img) {
  if (!img) return null;
  
  if (typeof img === 'string' && img.startsWith('data:image')) {
    return img;
  }
  
  if (img instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
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
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return null;
    }
  }
  
  if (typeof img === 'string' && img.startsWith('http')) {
    return await urlToBase64(img);
  }
  
  return null;
}

/**
 * Analyze images with Gemini AI
 */
export async function analyzeImagesWithGemini(images, userNotes, currentData = {}) {
  const rawImages = images.slice(0, 4);
  const imagesToAnalyze = await Promise.all(rawImages.map(img => ensureBase64(img)));
  const validImages = imagesToAnalyze.filter(img => img !== null);

  const knownDetails = [];
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
    Apply the specific lens for that category to extract details:

    [IF JEWELRY/WATCHES]
    - Identify: Object type (e.g. "Cocktail Ring") AND specific style (e.g. "Brutalist", "Art Deco").
    - Details: Material purity (karat), Gemstones (cut/carat), Setting style.
    - Markings: Hallmarks, Maker's marks, Assay marks, Serial numbers.
    - Map "Maker" to Brand/Silversmith/Artist.

    [IF BOOKS]
    - Identify: Title, Author, Publisher, Copyright Year.
    - Details: Edition (1st?), Printing (1st?), Binding (Cloth/Leather/Boards), Dust Jacket presence/condition.
    - ISBN HANDLING (CRITICAL):
      * Read ISBN digit-by-digit carefully. ISBN-10 has 10 digits, ISBN-13 has 13 digits starting with 978 or 979.
      * If ANY digit is unclear, blurry, or uncertain, note it as "ISBN: partially visible [digits you can read]".
      * NEVER guess or assume digits you cannot clearly see.
      * Include BOTH ISBN-10 and ISBN-13 if both are visible on the book.
      * The barcode number below the barcode IS the ISBN-13.
    - Other Markings: Library stamps/codes, Author signatures, Bookplates, Price clippings.
    - Map "Maker" to Author (and Publisher if notable, e.g., "Stephen King / Viking Press").
    - Map "Style" to Genre/Subject.
    - For first editions: Look for number line (1 2 3 4 5...) - "1" present = first printing.

    [IF VINYL RECORDS]
    - Identify: Artist, Album Title, Label, Year.
    - Details: Country of Pressing, Vinyl weight/color, Sleeve type (Gatefold?).
    - Markings: Catalog Number (CRITICAL), Matrix/Runout codes (if visible).
    - Map "Maker" to Artist.
    - Map "Style" to Genre.

    [IF ART/PRINTS]
    - Identify: Artist, Title (if known), Medium (Lithograph, Oil, Etching, Giclee).
    - Details: Frame style, Surface texture.
    - Markings: Signatures (Hand signed vs Plate), Edition Number (e.g. 15/100), Dates.
    - Map "Maker" to Artist.
    - Map "Style" to Movement (Expressionism, Pop Art, etc.).

    [IF FURNITURE/DECOR]
    - Identify: Object, Designer, Manufacturer, Style (MCM, Danish Modern).
    - Details: Joinery, Veneer vs Solid, Upholstery type.
    - Map "Maker" to Designer/Manufacturer.

    [IF ELECTRONICS/CAMERAS]
    - Identify: Brand, Model Name, Model Number (CRITICAL).
    - Details: Tested status (visual cues), Accessories (remote, lens cap), Physical condition (corrosion?).
    - Markings: Serial numbers, Manufacture Date, Voltage/Specs.
    - Map "Maker" to Brand (Sony, Nikon, Nintendo).
    - Map "Style" to Format (e.g. "VHS", "35mm SLR", "8-bit Console").

    [IF KITCHENWARE/GLASS/POTTERY]
    - Identify: Brand/Maker (Pyrex, Le Creuset), Pattern Name (CRITICAL), Object Type.
    - Details: Material (Cast Iron, Uranium Glass), Color, Capacity/Size.
    - Markings: Bottom stamps, mold numbers, lid numbers.
    - Map "Maker" to Manufacturer.
    - Map "Style" to Pattern or Era (e.g. "Starburst", "Depression Glass").

    [IF TOYS/TRADING CARDS]
    - Identify: Character/Figure Name, Franchise (Star Wars, Pokemon), Year.
    - Details: Action feature, Holographic/Foil?, Set Number (e.g. 102/150).
    - Markings: Copyright dates, "Made in" stamps, Card IDs.
    - Map "Maker" to Company (Hasbro, Wizards of the Coast).
    - Map "Style" to Series/Set.

    [IF FASHION/SHOES]
    - Identify: Brand (High-end like Gucci OR Mid-tier like Madewell, Zara, Lululemon), Item Name.
    - Details: Size (US/EU), Gender, Material (CRITICAL: Silk vs Polyester, Wool vs Acrylic).
    - Specifics: Look for RN numbers, Style Numbers on inner tags (e.g. J.Crew style #, Zara Art #), Date codes.
    - Condition Checks: Pilling, stains, loose threads, sole wear, heel drag.
    - Map "Maker" to Brand.
    - Map "Style" to Specific Cut/Model (e.g. "Wunder Under", "Ludlow Suit", "Fit & Flare").

    [IF AUTOMOTIVE/PARTS]
    - Identify: Part Name, Compatible Make/Model/Year (e.g. "1967 Ford Mustang Bumper").
    - Details: OEM vs Aftermarket, Part Number (CRITICAL), Material (Chrome, Steel).
    - Markings: Manufacturer stamps, Part numbers, Date codes.
    - Map "Maker" to Manufacturer (e.g. Ford, Bosch, Hella).
    - Map "Style" to Vehicle Generation (e.g. "C2 Corvette", "E30 BMW").

    [IF OTHER/MISC]
    - Identify: Specific Object Name and Primary Function.
    - Details: Material, Dimensions (visual estimate), Country of Origin.
    - Markings: Any text, patents, or logos.

    STEP 3: EVALUATE
    Assess condition (mint, very good, fair) and estimate value based on the identified specifics.
    
    PRICING CALIBRATION (CRITICAL - avoid overpricing):
    
    [BOOKS] Most books have VERY LOW resale value. Be realistic:
    - Common paperbacks, book club editions, ex-library copies: $1-5 (often unsellable)
    - Standard hardcovers without dust jacket: $3-10
    - Hardcovers WITH dust jacket in good condition: $5-20
    - Later printings of popular titles: $5-15
    - VALUABLE exceptions (price higher ONLY if these criteria are met):
      * TRUE first editions with first printing indicators AND dust jacket: $20-500+
      * Signed by author with authentication: $50-500+
      * Antiquarian books (pre-1900) in good condition: $20-200+
      * Limited editions with documentation: $30-200+
      * Rare titles with documented scarcity: research needed
    - Check: Is this book readily available on Amazon/eBay for $5? If so, price LOW.
    - Red flags for LOW value: book club edition marks, "BCE", missing DJ, ex-library stamps, common bestsellers, modern reprints

    Provide a JSON response with:
    - category: Choose one strictly from: [Vinyl & Music, Furniture, Decor & Lighting, Art, Jewelry & Watches, Fashion, Ceramics & Glass, Collectibles, Books, Automotive, Electronics, Other].
    - title: Rich, SEO-friendly title including key identifiers (Author/Artist/Style + Object).
    - maker: The primary creator (Artist, Author, Brand, Jeweler).
    - style: The artistic movement, genre, or design era (specific!).
    - materials: Detailed materials, binding, or medium.
    - markings: EXACT transcription of visible text, ISBNs (digit-by-digit), catalog numbers, signatures, or hallmarks. If partially visible, note what IS readable and what is unclear.
    - era: Specific year or estimated decade.
    - condition: Professional condition assessment.
    - valuation_low: Conservative estimate (USD number).
    - valuation_high: Optimistic estimate (USD number).
    - confidence: One of "high", "medium", or "low" indicating confidence in valuation.
    - confidence_reason: Brief explanation (10-20 words) of why confidence level was assigned.
    - reasoning: Explanation of value (rarity, demand, comparables).
    - search_terms: Specific keywords for eBay (brand + item + era + details).
    - search_terms_broad: A simplified 2-4 word query for most sites.
    - search_terms_discogs: FOR MUSIC ONLY - Artist name + Album/Title ONLY.
    - search_terms_auction: For auction sites - Maker/Artist + Object type + era.
    - details_description: A general description for the item details page (5-7 sentences).
    - sales_description: A separate sales description for listings.
    - questions: Array of strings (max 3) for critical missing info.
    
    WRITING STYLE: Write all text in a calm, confident, professional tone. Do NOT use exclamation points anywhere in your response.
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
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("No analysis generated - possibly blocked by safety filters or empty response.");
    
    let cleanedText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    console.log("AI Raw Response:", cleanedText);

    const parsed = JSON.parse(cleanedText);
    if (parsed && typeof parsed === "object") {
      if (!parsed.sales_blurb && parsed.details_description) parsed.sales_blurb = parsed.details_description;
      if (!parsed.details_description && parsed.sales_blurb) parsed.details_description = parsed.sales_blurb;
      if (!parsed.listing_description && parsed.sales_description) parsed.listing_description = parsed.sales_description;
      if (!parsed.sales_description && parsed.listing_description) parsed.sales_description = parsed.listing_description;
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
export async function askGeminiChat(images, itemContext, userQuestion) {
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

    const parts = [{ text: systemPrompt }];
    
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
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that question. Please try again.";
  } catch (error) {
    console.error("AI Chat failed:", error);
    throw error;
  }
}
