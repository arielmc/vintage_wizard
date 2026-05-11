/**
 * Firebase Cloud Functions for Vintage Wizard
 * 
 * Email sending via 'mail' collection:
 * 1. App writes to 'mail' collection with to, replyTo, message fields
 * 2. This function triggers and sends email via Gmail SMTP
 * 3. Updates document with delivery status
 */

const functions = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ============================================
// CONFIGURATION
// ============================================
// Set your Gmail credentials using Firebase config:
// firebase functions:config:set gmail.email="your@gmail.com" gmail.password="your-app-password"

const getTransporter = () => {
  const config = functions.config().gmail || {};
  
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email,
      pass: config.password,
    },
  });
};

// ============================================
// CLOUD FUNCTION: Process Mail Collection
// ============================================

exports.processMailQueue = functions.firestore
  .document("mail/{mailId}")
  .onCreate(async (snap, context) => {
    const mailData = snap.data();
    const mailId = context.params.mailId;
    
    console.log(`Processing mail: ${mailId}`);
    console.log(`To: ${mailData.to}`);
    
    try {
      const transporter = getTransporter();
      
      // Send the email
      await transporter.sendMail({
        from: `"Vintage Wizard" <${functions.config().gmail?.email || 'noreply@vintagewizard.app'}>`,
        to: mailData.to,
        replyTo: mailData.replyTo || undefined,
        subject: mailData.message?.subject || "Message from Vintage Wizard",
        text: mailData.message?.text || "",
        html: mailData.message?.html || "",
      });
      
      console.log(`✅ Email sent successfully to ${mailData.to}`);
      
      // Update document with success status
      await snap.ref.update({
        delivery: {
          state: "SUCCESS",
          attempts: 1,
          endTime: admin.firestore.FieldValue.serverTimestamp(),
          info: {
            messageId: mailId,
            accepted: [mailData.to],
          },
        },
      });
      
      return { success: true };
      
    } catch (error) {
      console.error("❌ Email send failed:", error.message);
      
      // Update document with error status
      await snap.ref.update({
        delivery: {
          state: "ERROR",
          attempts: 1,
          endTime: admin.firestore.FieldValue.serverTimestamp(),
          error: error.message,
        },
      });
      
      // Don't throw - we've logged the error
      return { success: false, error: error.message };
    }
  });

// ============================================
// OPTIONAL: Test email config (callable)
// ============================================

exports.testEmailConfig = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: "Gmail configuration is valid!" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// ============================================
// GEMINI PROXY (v2 callable, key never reaches browser)
// ============================================

function buildAnalysisPrompt(userNotes, currentData) {
  const knownDetails = [];
  if (currentData.title) knownDetails.push(`Title/Type: ${currentData.title}`);
  if (currentData.maker) knownDetails.push(`Maker/Brand: ${currentData.maker}`);
  if (currentData.style) knownDetails.push(`Style: ${currentData.style}`);
  if (currentData.materials) knownDetails.push(`Materials: ${currentData.materials}`);
  if (currentData.era) knownDetails.push(`Era: ${currentData.era}`);

  const contextPrompt = knownDetails.length
    ? `The user has already identified the following details (TRUST THESE over your visual estimate if they conflict): ${knownDetails.join(", ")}.`
    : "";

  const userAnswersContext =
    currentData.clarifications && Object.keys(currentData.clarifications).length
      ? `\nThe user has answered your previous questions. Use these answers to refine your valuation: ${JSON.stringify(currentData.clarifications)}.`
      : "";

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
    - confidence_reason: Brief explanation.
    - reasoning: Explanation of value.
    - search_terms: Specific keywords for eBay.
    - search_terms_broad: A simplified 2-4 word query.
    - search_terms_discogs: FOR MUSIC ONLY - Artist name + Album/Title ONLY.
    - search_terms_auction: For auction sites.
    - details_description: A general description (5-7 sentences).
    - sales_description: A separate sales description.
    - questions: Array of strings (max 3) for critical missing info.

    WRITING STYLE: Write in a calm, confident, professional tone. Do NOT use exclamation points.
  `;
}

function stripDataUriPrefix(dataUri) {
  if (typeof dataUri !== "string") return null;
  const comma = dataUri.indexOf(",");
  if (dataUri.startsWith("data:") && comma !== -1) {
    return dataUri.substring(comma + 1);
  }
  return dataUri;
}

// AI models sometimes return array-shaped values for fields the client expects
// as strings (e.g. search_terms came back as ["margaret", "mead", "book"]
// instead of "margaret mead book", crashing downstream .replace calls).
// Coerce known string fields once on the server so every client call site
// can rely on the type.
const STRING_FIELDS = [
  "title", "maker", "style", "materials", "markings", "era", "condition",
  "category", "confidence", "confidence_reason", "reasoning",
  "details_description", "sales_description", "sales_blurb", "listing_description",
  "search_terms", "search_terms_broad", "search_terms_discogs", "search_terms_auction",
];

function coerceToString(value) {
  if (value == null) return value; // preserve null/undefined
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string" || typeof v === "number").join(" ");
  return String(value);
}

function normalizeAIResponse(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;
  for (const field of STRING_FIELDS) {
    if (field in parsed) parsed[field] = coerceToString(parsed[field]);
  }
  return parsed;
}

async function callGemini(payload, apiKey) {
  if (!apiKey) {
    logger.error("GEMINI_API_KEY secret is empty or unbound at call time.");
    throw new HttpsError("internal", "GEMINI_API_KEY secret is not configured.");
  }
  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("Gemini upstream error", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody.slice(0, 1000),
    });
    throw new HttpsError(
      "internal",
      `Gemini API error (${response.status}): ${errorBody.slice(0, 200)}`,
      { upstreamStatus: response.status }
    );
  }
  return response.json();
}

// Production error wrapper: turns unhandled exceptions into proper HttpsErrors
// with intelligible messages, and logs everything to Cloud Logging at the right
// severity. Without this, an unhandled throw becomes a generic "internal" with
// no message — opaque to both the client and the operator.
function wrapHandler(name, fn) {
  return async (request) => {
    try {
      return await fn(request);
    } catch (err) {
      if (err instanceof HttpsError) {
        logger.warn(`${name} threw HttpsError`, { code: err.code, message: err.message });
        throw err;
      }
      const msg = (err && err.message) || String(err);
      logger.error(`${name} unhandled exception`, {
        message: msg,
        stack: err && err.stack,
        name: err && err.name,
      });
      throw new HttpsError("internal", msg || "Unhandled exception in function.");
    }
  };
}

exports.analyzeImages = onCall(
  {
    secrets: [GEMINI_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: [
      /vintage\.yescraft\.ai$/,
      /vintage-validator\.web\.app$/,
      /vintage-validator\.firebaseapp\.com$/,
      /localhost(:\d+)?$/,
    ],
  },
  wrapHandler("analyzeImages", async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in to analyze images.");
    }

    const { images, userNotes = "", currentData = {} } = request.data || {};
    if (!Array.isArray(images) || images.length === 0) {
      throw new HttpsError("invalid-argument", "images must be a non-empty array of base64 data URIs.");
    }

    const imageParts = images
      .slice(0, 4)
      .map(stripDataUriPrefix)
      .filter((data) => typeof data === "string" && data.length > 0)
      .map((data) => ({ inlineData: { mimeType: "image/jpeg", data } }));

    if (imageParts.length === 0) {
      throw new HttpsError("invalid-argument", "No valid images after decoding.");
    }

    const prompt = buildAnalysisPrompt(userNotes, currentData);

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

    const data = await callGemini(payload, GEMINI_API_KEY.value());
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new HttpsError("internal", "No analysis generated (possibly blocked by safety filters).");
    }

    let cleaned = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1) cleaned = cleaned.substring(first, last + 1);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new HttpsError("internal", "Failed to parse Gemini JSON response.");
    }

    normalizeAIResponse(parsed);

    if (parsed && typeof parsed === "object") {
      if (!parsed.sales_blurb && parsed.details_description) {
        parsed.sales_blurb = parsed.details_description;
      }
      if (!parsed.details_description && parsed.sales_blurb) {
        parsed.details_description = parsed.sales_blurb;
      }
      if (!parsed.listing_description && parsed.sales_description) {
        parsed.listing_description = parsed.sales_description;
      }
    }

    return parsed;
  })
);

exports.generateText = onCall(
  {
    secrets: [GEMINI_API_KEY],
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: [
      /vintage\.yescraft\.ai$/,
      /vintage-validator\.web\.app$/,
      /vintage-validator\.firebaseapp\.com$/,
      /localhost(:\d+)?$/,
    ],
  },
  wrapHandler("generateText", async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }
    const { prompt, temperature = 0.7, jsonResponse = false } = request.data || {};
    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError("invalid-argument", "prompt is required.");
    }
    const generationConfig = { temperature };
    if (jsonResponse) generationConfig.responseMimeType = "application/json";

    const data = await callGemini(
      { contents: [{ parts: [{ text: prompt }] }], generationConfig },
      GEMINI_API_KEY.value()
    );
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  })
);

exports.askAboutItem = onCall(
  {
    secrets: [GEMINI_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 30,
    cors: [
      /vintage\.yescraft\.ai$/,
      /vintage-validator\.web\.app$/,
      /vintage-validator\.firebaseapp\.com$/,
      /localhost(:\d+)?$/,
    ],
  },
  wrapHandler("askAboutItem", async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { images = [], itemContext = {}, question = "" } = request.data || {};
    if (!question || typeof question !== "string") {
      throw new HttpsError("invalid-argument", "question is required.");
    }

    const systemPrompt = `You are an expert antique and vintage appraiser assistant helping someone understand their item analysis.

ITEM ANALYSIS DATA:
${JSON.stringify(itemContext, null, 2)}

USER'S QUESTION: "${question}"

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
    (Array.isArray(images) ? images : []).slice(0, 4).forEach((img) => {
      const data = stripDataUriPrefix(img);
      if (data) parts.push({ inline_data: { mime_type: "image/jpeg", data } });
    });

    const payload = {
      contents: [{ role: "user", parts }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    };

    const data = await callGemini(payload, GEMINI_API_KEY.value());
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't process that question. Please try again."
    );
  })
);
