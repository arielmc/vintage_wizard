import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { jsPDF } from "jspdf";
import {
  Camera,
  Upload,
  Search,
  Trash2,
  X,
  Check,
  Loader,
  ExternalLink,
  Archive,
  Image as ImageIcon,
  Plus,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Bot,
  Cloud,
  Download,
  LogOut,
  UserCircle,
  Wand2,
  HelpCircle,
  MessageCircle,
  Send,
  Menu,
  MoreVertical,
  Filter,
  Layers,
  Grid,
  ArrowUpDown,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Save,
  Aperture,
  ArrowRight,
  XCircle,
  Lock,
  Unlock,
  BookOpen,
  Heart,
  Tag,
  ShieldCheck,
  AlertTriangle,
  ImagePlus,
  Images,
  Copy,
  Undo2,
  Share2,
  Link,
  Globe,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  FileText,
  Database,
  Package,
  DollarSign,
  Gauge,
  ListChecks,
} from "lucide-react";

// --- SCANNER COMPONENT (Native Camera) ---
const ScannerInterface = ({ onFinishSession, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [activePhotos, setActivePhotos] = useState([]); // Files for CURRENT item
  const [completedItems, setCompletedItems] = useState([]); // Array of arrays of Files
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Flash animation
    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob/file
    canvas.toBlob((blob) => {
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
      setActivePhotos(prev => [...prev, file]);
    }, 'image/jpeg', 0.8);
  };

  const handleNextItem = () => {
    if (activePhotos.length === 0) return;
    setCompletedItems(prev => [...prev, activePhotos]);
    setActivePhotos([]); // Clear for next item
  };

  const handleFinish = () => {
    // If there are pending photos, add them as the last item
    let finalItems = [...completedItems];
    if (activePhotos.length > 0) {
      finalItems.push(activePhotos);
    }
    onFinishSession(finalItems);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Flash Overlay */}
      <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-100 z-20 ${flash ? 'opacity-100' : 'opacity-0'}`} />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent text-white">
        <div className="flex items-center gap-2">
           <span className="font-bold text-lg">Item #{completedItems.length + 1}</span>
           <span className="text-xs opacity-70">({activePhotos.length} photos)</span>
        </div>
        <button 
          onClick={handleFinish}
          className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg"
        >
          Finish ({completedItems.length + (activePhotos.length > 0 ? 1 : 0)})
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Close Button */}
        <button onClick={onCancel} className="absolute top-20 right-4 text-white/50 hover:text-white z-10">
           <XCircle size={32} />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black pb-8 pt-4 px-4 flex flex-col gap-4">
        {/* Thumbnail Strip */}
        <div className="h-16 flex gap-2 overflow-x-auto no-scrollbar">
           {activePhotos.map((f, i) => (
              <div key={i} className="h-full aspect-square rounded-lg overflow-hidden border border-white/20">
                 <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="recent" />
              </div>
           ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4">
           {/* Spacer */}
           <div className="w-12" />
           
           {/* Shutter */}
           <button 
             onClick={takePhoto}
             className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
           >
              <div className="w-16 h-16 bg-white rounded-full" />
           </button>

           {/* Next Item */}
           <button 
             onClick={handleNextItem}
             disabled={activePhotos.length === 0}
             className={`flex flex-col items-center gap-1 text-white transition-opacity ${activePhotos.length === 0 ? 'opacity-30' : 'opacity-100'}`}
           >
              <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center border border-stone-600">
                 <ArrowRight size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase">Next Item</span>
           </button>
        </div>
      </div>
    </div>
  );
};

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = "vintage-validator-v1";

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn("Analytics initialization failed:", error);
    // Continue without analytics - don't break the app
  }
}

// Helper function to log analytics events
const logAnalyticsEvent = (eventName, eventParams = {}) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    }
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.warn("Analytics event failed:", error);
  }
};

// --- GEMINI API CONFIGURATION ---
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- AI Logic ---
async function analyzeImagesWithGemini(images, userNotes, currentData = {}) {
  // Limit to 4 images max to avoid payload limits
  const imagesToAnalyze = images.slice(0, 4);

  const knownDetails = [];
  if (currentData.title) knownDetails.push(`Title/Type: ${currentData.title}`);
    if (currentData.maker) knownDetails.push(`Maker/Brand: ${currentData.maker}`);
    if (currentData.style) knownDetails.push(`Style: ${currentData.style}`);
    if (currentData.materials) knownDetails.push(`Materials: ${currentData.materials}`);
  if (currentData.era) knownDetails.push(`Era: ${currentData.era}`);

  const contextPrompt =
    knownDetails.length > 0
      ? `The user has already identified the following details (TRUST THESE over your visual estimate if they conflict): ${knownDetails.join(
          ", "
        )}.`
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
    - confidence: One of "high", "medium", or "low" indicating confidence in valuation. Use "high" if clear maker's marks, known brand, or exact comparables found. Use "medium" if general style/era identified but specifics unclear. Use "low" if guessing based on visual style alone without identifying marks.
    - confidence_reason: Brief explanation (10-20 words) of why confidence level was assigned (e.g., "Clear sterling hallmark and maker's mark visible" or "No visible markings, estimate based on style only").
    - reasoning: Explanation of value (rarity, demand, comparables).
    - search_terms: Specific keywords to find EXACT comparables.
    - search_terms_broad: A simplified query (2-4 words MAX).
    - sales_blurb: A comprehensive sales description (3-4 sentences) tailored to the item type (e.g. mentioning binding for books, cut for gems). Write in a confident but understated tone - avoid exclamation points entirely.
    - questions: Array of strings (max 3) for critical missing info.
    
    WRITING STYLE: Write all text in a calm, confident, professional tone. Do NOT use exclamation points anywhere in your response.
  `;

  const imageParts = imagesToAnalyze.map((img) => ({
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
    
    // Cleanup markdown if present
    let cleanedText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Extract JSON object if there's extra text
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
       cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    console.log("AI Raw Response:", cleanedText); // Debug log

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}

// --- AI Chat Function (Ask about analysis) ---
async function askGeminiChat(images, itemContext, userQuestion) {
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
    
    // Add images if available (limit to 4 to avoid payload issues)
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

// --- Image Helper ---
// Compress image and return as base64 (for AI analysis) or Blob (for Storage)
const compressImage = (file, returnBlob = false) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1200; // Increased for better quality
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
        ctx.drawImage(img, 0, 0, width, height);
        
        if (returnBlob) {
          // Return Blob for Firebase Storage upload
          canvas.toBlob(
            (blob) => resolve(blob),
            "image/jpeg",
            0.85 // Higher quality for storage
          );
        } else {
          // Return base64 for AI analysis (slightly lower quality to reduce API payload)
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Upload image to Firebase Storage and return download URL
const uploadImageToStorage = async (file, userId, itemId, imageIndex) => {
  try {
    // Compress the image first
    const compressedBlob = await compressImage(file, true);
    
    // Create a unique path for the image
    const timestamp = Date.now();
    const path = `users/${userId}/items/${itemId}/${timestamp}_${imageIndex}.jpg`;
    const storageRef = ref(storage, path);
    
    // Upload the blob
    await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to storage:", error);
    throw error;
  }
};

// --- Link Helper ---
const getMarketplaceLinks = (category, searchTerms, broadTerms) => {
  if (!searchTerms) return [];
  const query = encodeURIComponent(searchTerms);
  const derivedBroadTerms = searchTerms.split(" ").slice(0, 3).join(" ");
  const broadQuery = encodeURIComponent(broadTerms || derivedBroadTerms);
  const cat = (category || "").toLowerCase();

  const links = [
    {
      name: "eBay Sold",
      domain: "ebay.com",
      url: `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=0&LH_Sold=1&LH_Complete=1`,
      color: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      name: "Google Images",
      domain: "google.com",
      url: `https://www.google.com/search?q=${query}&tbm=isch`,
      color: "text-stone-700 bg-stone-50 border-stone-200",
    },
  ];

  const isJewelry =
    cat.includes("jewelry") ||
    cat.includes("brooch") ||
    cat.includes("ring") ||
    cat.includes("necklace") ||
    cat.includes("bracelet") ||
    cat.includes("watch");
  const isDecor =
    cat.includes("furniture") ||
    cat.includes("lighting") ||
    cat.includes("decor") ||
    cat.includes("rug") ||
    cat.includes("ceramic") ||
    cat.includes("glass") ||
    cat.includes("pottery");
  const isArt =
    cat.includes("art") ||
    cat.includes("painting") ||
    cat.includes("print") ||
    cat.includes("sculpture");
  const isFashion = 
    cat.includes("clothing") ||
    cat.includes("fashion") ||
    cat.includes("bag") ||
    cat.includes("shoe") ||
    cat.includes("accessory");
  const isMusic = 
    cat.includes("record") ||
    cat.includes("vinyl") ||
    cat.includes("lp") ||
    cat.includes("music") ||
    cat.includes("instrument");
  const isAuto = 
    cat.includes("car") ||
    cat.includes("auto") ||
    cat.includes("vehicle") ||
    cat.includes("motor");
  const isBooks = 
    cat.includes("book") ||
    cat.includes("ephemera");
  const isCollectibles = 
    cat.includes("collectible") ||
    cat.includes("toy") ||
    cat.includes("card") ||
    cat.includes("comic");

  if (isJewelry) {
    links.push({
      name: "Ruby Lane",
      url: `https://www.rubylane.com/search?q=${broadQuery}`,
      color: "text-rose-700 bg-rose-50 border-rose-200",
    });
    links.push({
      name: "The RealReal",
      url: `https://www.therealreal.com/products?keywords=${broadQuery}`,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    });
    links.push({
      name: "1stDibs",
      url: `https://www.1stdibs.com/search/?q=${broadQuery}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
  } else if (isDecor) {
    links.push({
      name: "Chairish",
      url: `https://www.chairish.com/search?q=${broadQuery}`,
      color: "text-pink-700 bg-pink-50 border-pink-200",
    });
    links.push({
      name: "1stDibs",
      url: `https://www.1stdibs.com/search/?q=${broadQuery}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
    links.push({
      name: "Pamono",
      url: `https://www.pamono.com/catalogsearch/result/?q=${broadQuery}`,
      color: "text-stone-800 bg-stone-100 border-stone-300",
    });
  } else if (isArt) {
    links.push({
      name: "1stDibs",
      url: `https://www.1stdibs.com/search/?q=${broadQuery}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
      links.push({
        name: "LiveAuctioneers",
        url: `https://www.liveauctioneers.com/search/?keyword=${broadQuery}&sort=relevance&status=archive`,
        color: "text-stone-800 bg-stone-100 border-stone-300",
      });
    links.push({
      name: "Artsy",
      url: `https://www.artsy.net/search?term=${broadQuery}`,
      color: "text-purple-700 bg-purple-50 border-purple-200",
    });
  } else if (isFashion) {
    links.push({
      name: "Poshmark",
      url: `https://poshmark.com/search?query=${query}`,
      color: "text-red-700 bg-red-50 border-red-200",
    });
    links.push({
      name: "Depop",
      url: `https://www.depop.com/search/?q=${broadQuery}`,
      color: "text-red-600 bg-white border-red-600",
    });
    links.push({
      name: "The RealReal",
      url: `https://www.therealreal.com/products?keywords=${broadQuery}`,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    });
    links.push({
      name: "Grailed",
      url: `https://www.grailed.com/shop?keyword=${broadQuery}`,
      color: "text-stone-800 bg-stone-100 border-stone-300",
    });
    links.push({
      name: "Vestiaire",
      url: `https://us.vestiairecollective.com/search/?q=${broadQuery}`,
      color: "text-orange-700 bg-orange-50 border-orange-200",
    });
  } else if (isMusic) {
    links.push({
      name: "Discogs",
      url: `https://www.discogs.com/search/?q=${query}&type=all`,
      color: "text-stone-800 bg-yellow-50 border-yellow-200",
    });
     links.push({
      name: "Reverb",
      url: `https://reverb.com/marketplace?query=${broadQuery}`,
      color: "text-orange-600 bg-orange-50 border-orange-200",
    });
  } else if (isAuto) {
    links.push({
      name: "Bring a Trailer",
      url: `https://bringatrailer.com/search/?s=${broadQuery}`,
      color: "text-stone-800 bg-stone-200 border-stone-400",
    });
    links.push({
      name: "Hemmings",
      url: `https://www.hemmings.com/classifieds?q=${broadQuery}`,
      color: "text-blue-800 bg-blue-100 border-blue-300",
    });
    links.push({
      name: "ClassicCars",
      url: `https://classiccars.com/listings/find?q=${broadQuery}`,
      color: "text-red-800 bg-red-100 border-red-300",
    });
  } else if (isBooks) {
    links.push({
      name: "AbeBooks",
      url: `https://www.abebooks.com/servlet/SearchResults?sts=t&kn=${broadQuery}`,
      color: "text-red-700 bg-red-50 border-red-200",
    });
  } else if (isCollectibles) {
    links.push({
      name: "Mercari",
      url: `https://www.mercari.com/search/?keyword=${broadQuery}`,
      color: "text-purple-700 bg-purple-50 border-purple-200",
      });
  } else {
    links.push({
      name: "Etsy",
      url: `https://www.etsy.com/search?q=${query}`,
      color: "text-orange-700 bg-orange-50 border-orange-200",
    });
    links.push({
      name: "Mercari",
      url: `https://www.mercari.com/search/?keyword=${broadQuery}`,
      color: "text-purple-700 bg-purple-50 border-purple-200",
    });
  }
  return links;
};

// --- Thumbnail Item Component (Draggable with Remove) ---
const ThumbnailItem = ({ id, src, index, active, onClick, onDragStart, onDrop, onDragOver, onDragEnd, onRemove }) => {
  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`relative group flex-shrink-0 pt-2 pr-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        active ? "opacity-100 scale-105" : "opacity-70 hover:opacity-100"
      }`}
    >
      <div
        className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition-all bg-stone-100 relative ${
          active
            ? "border-rose-500 shadow-md ring-2 ring-rose-500/20"
            : "border-transparent"
        }`}
      >
        <img
          src={src}
          className="w-full h-full object-cover pointer-events-none select-none"
          alt="thumbnail"
        />
      </div>
      
      {/* Remove Button - Now Functional if onRemove provided */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10 hover:bg-red-600"
          title="Un-group image"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

// --- STAGING AREA COMPONENT (Smart Stacker) ---
const StagingArea = ({ files, onConfirm, onCancel, onAddMoreFiles, isProcessingBatch = false }) => {
  // Each stack is { id: string, files: File[] }
  const [stacks, setStacks] = useState([]);
  const [draggedStackIdx, setDraggedStackIdx] = useState(null);
  const [expandedStackIdx, setExpandedStackIdx] = useState(null); // For refining stacks
  
  // NEW: Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedStackIds, setSelectedStackIds] = useState(new Set());
  
  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading your photos...");
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [groupingFeedback, setGroupingFeedback] = useState(null);
  
  // Ref for adding more photos
  const addMoreInputRef = useRef(null);
  
  // Track total photos across all stacks
  const totalPhotos = stacks.reduce((sum, s) => sum + s.files.length, 0);

  // Fun loading messages
  const loadingMessages = [
    "Loading your photos...",
    "So many pixels... 📸",
    "Teaching AI to see vintage things...",
    "Unpacking your treasures...",
    "Arranging the gallery...",
    "Almost there... just admiring your collection!",
  ];

  useEffect(() => {
    // Initialize: Every file is a stack of 1
    setIsLoading(true);
    setLoadingMessage(loadingMessages[0]);
    
    // Rotate through fun messages for larger uploads
    let messageIdx = 0;
    const messageInterval = files.length > 5 ? setInterval(() => {
      messageIdx = (messageIdx + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIdx]);
    }, 1500) : null;
    
    const initStacks = files.map((f) => ({
      id: Math.random().toString(36).substr(2, 9),
      files: [f],
    }));
    
    // Longer delay for more photos to show fun messages
    const delay = Math.min(300 + files.length * 50, 2000);
    setTimeout(() => {
      setStacks(initStacks);
      setIsLoading(false);
      if (messageInterval) clearInterval(messageInterval);
    }, delay);
    
    return () => {
      if (messageInterval) clearInterval(messageInterval);
    };
  }, [files]);
  
  // Handle adding more photos
  const handleAddMore = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;
    
    // Create new stacks for the added files
    const newStacks = newFiles.map((f) => ({
      id: Math.random().toString(36).substr(2, 9),
      files: [f],
    }));
    
    setStacks(prev => [...prev, ...newStacks]);
    setGroupingFeedback(`📷 Added ${newFiles.length} more photos!`);
    setTimeout(() => setGroupingFeedback(null), 3000);
    
    // Reset file input
    if (addMoreInputRef.current) addMoreInputRef.current.value = "";
  };

  const handleAutoGroup = () => {
    setIsAutoGrouping(true);
    setGroupingFeedback(null);
    
    // Small delay to show the animation
    setTimeout(() => {
      // FIX: Use current stacks (reflects deletions & additions), NOT original files prop
      const currentFiles = stacks.flatMap(stack => stack.files);
      
      if (currentFiles.length === 0) {
        setIsAutoGrouping(false);
        setGroupingFeedback(`⚠️ No photos to group`);
        setTimeout(() => setGroupingFeedback(null), 3000);
        return;
      }
      
      // IMPROVED Heuristic: 30 second threshold + max 4 photos per group
      const sorted = [...currentFiles].sort((a, b) => a.lastModified - b.lastModified);
      const newStacks = [];
      let currentStack = [];
      const MAX_GROUP_SIZE = 4; // Don't group more than 4 photos together

      for (let i = 0; i < sorted.length; i++) {
        const file = sorted[i];
        if (currentStack.length === 0) {
          currentStack.push(file);
        } else {
          const prevFile = currentStack[currentStack.length - 1];
          const timeDiff = (file.lastModified - prevFile.lastModified) / 1000; // seconds
          // Reduced to 30 seconds AND max 4 photos per group
          if (timeDiff < 30 && currentStack.length < MAX_GROUP_SIZE) {
            currentStack.push(file);
          } else {
            newStacks.push({ id: Math.random().toString(36).substr(2, 9), files: currentStack });
            currentStack = [file];
          }
        }
      }
      if (currentStack.length > 0) {
        newStacks.push({ id: Math.random().toString(36).substr(2, 9), files: currentStack });
      }
      
      const groupsCreated = newStacks.filter(s => s.files.length > 1).length;
      setStacks(newStacks);
      setIsAutoGrouping(false);
      
      // Show feedback
      if (groupsCreated > 0) {
        setGroupingFeedback(`✨ Grouped into ${newStacks.length} items! (${groupsCreated} stacks)`);
      } else {
        setGroupingFeedback(`📷 No time-based groups found. Drag to group manually.`);
      }
      
      // Clear feedback after 3s
      setTimeout(() => setGroupingFeedback(null), 3000);
      
      // Clear selections after auto-group
      setIsSelectionMode(false);
      setSelectedStackIds(new Set());
    }, 500);
  };

  // Selection Mode Controls
  const handleSelectionModeToggle = () => {
     setIsSelectionMode(!isSelectionMode);
     setSelectedStackIds(new Set());
  };

  const handleDragStart = (e, index) => {
    if (isSelectionMode) {
        e.preventDefault(); // Disable drag in selection mode
        return;
    }
    setDraggedStackIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedStackIdx === null || draggedStackIdx === dropIndex) return;

    const newStacks = [...stacks];
    const sourceStack = newStacks[draggedStackIdx];
    const targetStack = newStacks[dropIndex];

    // Merge source into target
    targetStack.files = [...targetStack.files, ...sourceStack.files];
    
    // Remove source
    newStacks.splice(draggedStackIdx, 1);
    
    setStacks(newStacks);
    setDraggedStackIdx(null);
  };

  // Toggle Selection
  const toggleSelect = (id) => {
      const newSet = new Set(selectedStackIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedStackIds(newSet);
  };

  // Stack Selected Items
  const handleStackSelected = () => {
      if (selectedStackIds.size < 2) return;

      const newStacks = [];
      const filesToStack = [];
      const remainingStacks = [];

      // Separate stacks to merge vs keep
      stacks.forEach(stack => {
          if (selectedStackIds.has(stack.id)) {
              filesToStack.push(...stack.files);
          } else {
              remainingStacks.push(stack);
          }
      });

      // Create new merged stack
      const mergedStack = {
          id: Math.random().toString(36).substr(2, 9),
          files: filesToStack
      };

      // Prepend merged stack
      setStacks([mergedStack, ...remainingStacks]);
      
      // Reset mode
      setIsSelectionMode(false);
      setSelectedStackIds(new Set());
  };

  // Handle moving a photo OUT of a stack (Un-group)
  const handleUnstackPhoto = (stackIndex, photoIndex) => {
    const newStacks = [...stacks];
    const stack = newStacks[stackIndex];
    
    // Remove from stack
    const [removedPhoto] = stack.files.splice(photoIndex, 1);
    
    // If stack becomes empty, remove it. 
    // If stack has 1 item left, it stays as a stack of 1 (which is fine, essentially a loose item).
    if (stack.files.length === 0) {
       newStacks.splice(stackIndex, 1);
       setExpandedStackIdx(null); // Close modal if stack is gone
    }
    
    // Add removed photo as a NEW loose stack
    newStacks.push({
       id: Math.random().toString(36).substr(2, 9),
       files: [removedPhoto]
    });
    
    setStacks(newStacks);
  };
  
  // NEW: Explode/Ungroup ALL photos in a stack back to individual items
  const handleExplodeStack = (stackIndex) => {
    const newStacks = [...stacks];
    const stack = newStacks[stackIndex];
    
    if (!stack || stack.files.length <= 1) return;
    
    // Remove the original stack
    newStacks.splice(stackIndex, 1);
    
    // Create individual stacks for each photo
    const individualStacks = stack.files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      files: [file]
    }));
    
    // Add them back to the list
    setStacks([...newStacks, ...individualStacks]);
    setExpandedStackIdx(null); // Close the modal
    setGroupingFeedback(`💥 Ungrouped ${stack.files.length} photos!`);
    setTimeout(() => setGroupingFeedback(null), 3000);
  };

  // Handle reordering photos INSIDE a stack (Hero selection)
  const handleReorderStack = (stackIndex, fromIdx, toIdx) => {
     if (fromIdx === toIdx) return;
     const newStacks = [...stacks];
     const stack = newStacks[stackIndex];
     const [moved] = stack.files.splice(fromIdx, 1);
     stack.files.splice(toIdx, 0, moved);
     setStacks(newStacks);
  };

  // Expanded Stack Modal (Refine & Reorder)
  const ExpandedStackModal = ({ stackIndex }) => {
     const stack = stacks[stackIndex];
     const [localDragIdx, setLocalDragIdx] = useState(null);
     
     // Cache object URLs to prevent re-creation on every render
     const [cachedUrls, setCachedUrls] = useState([]);
     
     useEffect(() => {
       if (!stack) return;
       // Create URLs once when stack changes
       const urls = stack.files.map(file => URL.createObjectURL(file));
       setCachedUrls(urls);
       
       // Cleanup URLs when modal closes or stack changes
       return () => {
         urls.forEach(url => URL.revokeObjectURL(url));
       };
     }, [stack?.files?.length, stackIndex]); // Only recreate when files change
     
     if (!stack) return null;

     return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                 <div>
                    <h3 className="font-bold text-stone-800">Refine Stack ({stack.files.length} photos)</h3>
                    <p className="text-xs text-stone-500">
                      <span className="text-amber-600">⭐ First = Hero Image.</span> Drag to reorder.
                    </p>
                 </div>
                 <button onClick={() => setExpandedStackIdx(null)} className="p-2 hover:bg-stone-200 rounded-full text-stone-500">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto bg-stone-100 min-h-[200px]">
                 {cachedUrls.length === 0 ? (
                   <div className="flex items-center justify-center h-32">
                     <Loader className="w-6 h-6 text-stone-400 animate-spin" />
                   </div>
                 ) : (
                 <div className="flex flex-wrap gap-4 justify-center">
                    {stack.files.map((file, i) => (
                       <div key={i} className="relative group">
                          <div
                            draggable
                            onDragStart={(e) => {
                               setLocalDragIdx(i);
                               e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                               e.preventDefault();
                               e.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(e) => {
                               e.preventDefault();
                               if (localDragIdx !== null) {
                                  handleReorderStack(stackIndex, localDragIdx, i);
                                  setLocalDragIdx(null);
                               }
                            }}
                            className={`w-24 h-24 rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                              i === 0 ? "border-amber-500 ring-2 ring-amber-200" : "border-stone-200 hover:border-stone-400"
                            }`}
                          >
                            <img 
                              src={cachedUrls[i] || ''} 
                              className="w-full h-full object-cover pointer-events-none" 
                              alt={`Photo ${i + 1}`} 
                              loading="eager"
                            />
                          </div>
                          {/* Ungroup Button - moves back to main grid */}
                          {stack.files.length > 1 && (
                            <button
                              onClick={() => handleUnstackPhoto(stackIndex, i)}
                              className="absolute -top-2 -right-2 bg-stone-700 hover:bg-stone-900 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                              title="Remove from stack (keeps photo)"
                            >
                              <Undo2 size={12} />
                            </button>
                          )}
                          {i === 0 && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              HERO
                            </div>
                          )}
                       </div>
                    ))}
                 </div>
                 )}
                 <p className="text-center text-xs text-stone-400 mt-4">
                   Click <Undo2 size={10} className="inline mx-1" /> to remove a photo from this stack (returns to grid)
                 </p>
              </div>
              
              <div className="p-4 border-t border-stone-100 flex justify-between items-center">
                 {/* Ungroup All Button */}
                 {stack.files.length > 1 && (
                   <button 
                      onClick={() => handleExplodeStack(stackIndex)}
                      className="text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center gap-1.5 px-3 py-2 hover:bg-rose-50 rounded-lg transition-colors"
                   >
                      <Undo2 size={14} />
                      Ungroup All ({stack.files.length})
                   </button>
                 )}
                 {stack.files.length <= 1 && <div />}
                 <button 
                    onClick={() => setExpandedStackIdx(null)}
                    className="bg-stone-900 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-stone-800"
                 >
                    Done
                 </button>
              </div>
           </div>
        </div>
     );
  };

  // Stack Card Component with Improved Drag/Drop
  const [isDragOverTarget, setIsDragOverTarget] = useState(null);
  
  // IMPROVED: Drag & Drop Best Practices
  // - Uses native HTML5 Drag & Drop with proper event handling
  // - Stores index in dataTransfer for cross-component communication
  // - Adds explicit drop zone highlighting
  // - Debounces drag over events for better performance
  
  const StackCard = ({ stack, index, isSelected, onSelect, onRemove, draggedIdx }) => {
    const isMulti = stack.files.length > 1;
    const [coverUrl, setCoverUrl] = useState(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const isBeingDragged = draggedIdx === index;
    const isDropTarget = draggedIdx !== null && draggedIdx !== index;
    const isActiveDropTarget = isDragOverTarget === index;
    const cardRef = useRef(null);

    // Create stable object URL
    useEffect(() => {
      const url = URL.createObjectURL(stack.files[0]);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [stack.files]);

    const handleClick = () => {
        if (isSelectionMode) {
            onSelect(stack.id);
        } else if (isMulti) {
            setExpandedStackIdx(index);
        }
    };

    // Proper drag start handler
    const onDragStartHandler = (e) => {
        if (isSelectionMode) {
            e.preventDefault();
            return;
        }
        
        // Store index in multiple formats for broader compatibility
        e.dataTransfer.setData("text/plain", index.toString());
        e.dataTransfer.setData("application/json", JSON.stringify({ index, stackId: stack.id }));
        e.dataTransfer.effectAllowed = "move";
        
        // Use the actual element as drag image (more reliable than custom Image)
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            e.dataTransfer.setDragImage(cardRef.current, rect.width / 2, rect.height / 2);
        }
        
        // Update state after a micro-task to ensure dataTransfer is set
        setTimeout(() => setDraggedStackIdx(index), 0);
    };

    // Proper drag over handler with debouncing
    const onDragOverHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        
        // Only update if we're actually over a different card
        if (draggedIdx !== null && draggedIdx !== index && isDragOverTarget !== index) {
            setIsDragOverTarget(index);
        }
    };

    // Drag leave with target check
    const onDragLeaveHandler = (e) => {
        e.preventDefault();
        // Only clear if we're actually leaving this element (not entering a child)
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) {
            const { clientX, clientY } = e;
            if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
                if (isDragOverTarget === index) {
                    setIsDragOverTarget(null);
                }
            }
        }
    };

    // Drop handler
    const onDropHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const sourceIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (!isNaN(sourceIdx) && sourceIdx !== index) {
            handleDrop(e, index);
        }
        setIsDragOverTarget(null);
    };

    // Drag end cleanup
    const onDragEndHandler = () => {
        setDraggedStackIdx(null);
        setIsDragOverTarget(null);
    };

    return (
      <div
        ref={cardRef}
        draggable={!isSelectionMode}
        onDragStart={onDragStartHandler}
        onDragOver={onDragOverHandler}
        onDragLeave={onDragLeaveHandler}
        onDrop={onDropHandler}
        onDragEnd={onDragEndHandler}
        onClick={handleClick}
        className={`relative aspect-square group transition-all duration-200 select-none ${
            isSelectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        } ${isSelected ? "scale-90" : ""} ${
            isBeingDragged ? "opacity-40 scale-95 grayscale" : "opacity-100 hover:scale-[1.02]"
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Active Drop Target Highlight - More prominent */}
        {isActiveDropTarget && (
          <div className="absolute -inset-4 rounded-2xl border-4 border-emerald-400 bg-emerald-50/80 z-0 transition-all duration-150" />
        )}
        
        {/* Potential Drop Target Indicator */}
        {isDropTarget && !isActiveDropTarget && (
          <div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-stone-300/60 z-0" />
        )}

        {/* Stack Effect (Underneath layers) */}
        {isMulti && (
           <div className="absolute inset-0 bg-stone-200 rounded-xl rotate-6 scale-95 border border-stone-300 shadow-sm z-[5] pointer-events-none" />
        )}
        {stack.files.length > 2 && (
           <div className="absolute inset-0 bg-stone-300 rounded-xl -rotate-3 scale-95 border border-stone-400 shadow-sm pointer-events-none" />
        )}

        {/* Main Card */}
        <div className={`absolute inset-0 bg-white rounded-xl shadow-md border overflow-hidden z-10 transition-all duration-150 ${
            isSelected ? "border-rose-500 ring-4 ring-rose-500/30" : 
            isActiveDropTarget ? "border-emerald-400 ring-4 ring-emerald-400/40 scale-105" : 
            "border-stone-200"
        }`}>
           {/* Loading skeleton */}
           {!imageLoaded && (
             <div className="absolute inset-0 bg-stone-100 animate-pulse flex items-center justify-center">
               <Loader className="w-5 h-5 text-stone-300 animate-spin" />
             </div>
           )}
           
           {coverUrl && (
             <img 
               src={coverUrl} 
               className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
               alt="stack cover"
               onLoad={() => setImageLoaded(true)}
               draggable={false}
             />
           )}
           
           {/* Drop Indicator Overlay - More visible */}
           {isActiveDropTarget && (
             <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center backdrop-blur-[2px]">
               <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xl flex items-center gap-2">
                 <Plus size={16} /> Merge Photos
               </div>
             </div>
           )}
           
           {/* Selection Checkmark Overlay */}
           {isSelectionMode && (
               <div className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center border-2 transition-colors shadow-sm ${
                   isSelected ? "bg-rose-500 border-rose-500" : "bg-white/90 border-stone-300"
               }`}>
                   {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
               </div>
           )}

           {/* Delete Button (Only visible in normal mode, not dragging) */}
           {!isSelectionMode && !isBeingDragged && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 if (confirm("Delete this photo/stack permanently?")) {
                   onRemove(index);
                 }
               }}
               className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-md hover:bg-red-600 z-20"
               title="Delete permanently"
             >
               <Trash2 size={12} strokeWidth={3} />
             </button>
           )}

           {/* Badge */}
           <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-full pointer-events-none">
              {stack.files.length} {stack.files.length === 1 ? 'photo' : 'photos'}
           </div>
           
           {/* Stack indicator for multi-photo stacks */}
           {isMulti && (
             <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 pointer-events-none shadow-sm">
               <Layers size={10} /> {stack.files.length}
             </div>
           )}
        </div>
      </div>
    );
  };

  // Handle Deleting a Stack/Photo from Staging Area
  const handleRemoveStack = (index) => {
    const newStacks = [...stacks];
    newStacks.splice(index, 1);
    setStacks(newStacks);
    // If no stacks left, maybe cancel? or just stay empty
    if (newStacks.length === 0) {
        onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FDFBF7] flex flex-col">
      {/* Header - Simplified */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
         <div className="flex items-center gap-3">
            <button 
               onClick={onCancel}
               disabled={isProcessingBatch}
               className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
               title="Cancel"
            >
               <X className="w-5 h-5" />
            </button>
            <div>
               <h2 className="text-lg font-serif font-bold text-stone-900">Organize Photos</h2>
               <p className="text-xs text-stone-500">
                 {isLoading ? "Loading photos..." : "Drag photos together to group them as single items."}
               </p>
            </div>
         </div>
         <button 
            onClick={handleAutoGroup}
            disabled={isAutoGrouping || isLoading}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              isAutoGrouping 
                ? "bg-amber-100 text-amber-700 animate-pulse" 
                : "text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200"
            }`}
         >
            {isAutoGrouping ? (
              <>
                <Loader className="w-3 h-3 animate-spin" /> Grouping...
              </>
            ) : (
              <>
                <Wand2 className="w-3 h-3" /> Auto-Group
              </>
            )}
         </button>
      </div>
      
      {/* Auto-Group Feedback Toast */}
      {groupingFeedback && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-top duration-300">
          <div className="bg-stone-900 text-white px-4 py-2 rounded-xl shadow-xl text-sm font-medium">
            {groupingFeedback}
          </div>
        </div>
      )}

      {/* Grid or Loading */}
      <div className="flex-1 overflow-y-auto p-4">
         {isLoading ? (
           <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
             <div className="relative">
               <div className="w-16 h-16 border-4 border-stone-200 border-t-rose-500 rounded-full animate-spin" />
               <Camera className="w-6 h-6 text-stone-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
             </div>
             <div className="text-center">
               <p className="text-stone-700 font-medium mb-1">{loadingMessage}</p>
               <p className="text-stone-400 text-sm">{files.length} photos to organize</p>
             </div>
           </div>
         ) : (
           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 p-4">
              {stacks.map((stack, i) => (
                 <StackCard
                    key={stack.id}
                    index={i}
                    stack={stack}
                    isSelected={selectedStackIds.has(stack.id)}
                    onSelect={toggleSelect}
                    onRemove={handleRemoveStack}
                    draggedIdx={draggedStackIdx}
                 />
              ))}
           </div>
         )}
      </div>

      {expandedStackIdx !== null && <ExpandedStackModal stackIndex={expandedStackIdx} />}

      {/* Processing Overlay */}
      {isProcessingBatch && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
            <Sparkles className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-stone-800">Adding {stacks.length} items...</p>
            <p className="text-sm text-stone-500">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Premium Footer Action Bar */}
      <div className="bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* Stats Bar */}
        <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-500">
          <span className="font-medium">{totalPhotos} photos</span>
          <span className="text-stone-300">→</span>
          <span className="font-bold text-stone-700">{stacks.length} {stacks.length === 1 ? "item" : "items"}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          {/* Add More Photos */}
          <button 
            onClick={() => addMoreInputRef.current?.click()}
            disabled={isProcessingBatch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add More</span>
            <span className="sm:hidden">+</span>
          </button>
          
          {/* Hidden File Input */}
          <input 
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={addMoreInputRef}
            onChange={handleAddMore}
          />
          
          {/* Primary CTA - Add Items */}
          <button 
            onClick={() => onConfirm(stacks)}
            disabled={isLoading || stacks.length === 0 || isProcessingBatch}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {isProcessingBatch ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Adding...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Add {stacks.length} {stacks.length === 1 ? "Item" : "Items"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Components ---
const StatusBadge = ({ status }) => {
  const colors = {
    keep: "bg-blue-100 text-blue-800 border-blue-200", // Now Blue
    sell: "bg-green-100 text-green-800 border-green-200", // Now Green
    TBD: "bg-amber-100 text-amber-800 border-amber-200", // Now Yellow/Amber
    draft: "bg-amber-100 text-amber-800 border-amber-200", // Legacy support
    unprocessed: "bg-amber-100 text-amber-800 border-amber-200", // Legacy support
  };
  // Normalize status for display
  const displayStatus = (status === "unprocessed" || status === "draft" || status === "maybe") ? "TBD" : status;
  
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
        colors[displayStatus] || colors.TBD
      } uppercase tracking-wide`}
    >
      {displayStatus}
    </span>
  );
};

// Enhanced Skeleton with shimmer effect
const SkeletonCard = () => (
  <div className="bg-white rounded-xl overflow-hidden border border-stone-100 shadow-sm flex flex-col h-full">
    <div className="aspect-square bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
    <div className="p-3 flex-1 flex flex-col gap-2">
      <div className="h-4 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded w-3/4" />
      <div className="h-3 bg-gradient-to-r from-stone-50 via-stone-150 to-stone-50 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded w-1/2" />
      <div className="mt-auto pt-2 flex justify-between items-center border-t border-stone-50">
        <div className="h-3 bg-stone-100 rounded w-1/3" />
        <div className="h-3 bg-stone-100 rounded w-1/4" />
      </div>
    </div>
  </div>
);

// Global Loading Overlay Component with fun rotating messages
const LoadingOverlay = ({ message = "Processing...", subMessage = "" }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const funMessages = [
    "Consulting the AI oracle...",
    "Teaching robots about antiques...",
    "Summoning appraisal spirits...",
    "Crunching vintage data...",
    "Scanning for treasure...",
    "Decoding maker's marks...",
    "Channeling auction wisdom...",
    "Almost there...",
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % funMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="relative mb-6">
        {/* Spinning ring */}
        <div className="w-20 h-20 border-4 border-stone-200 border-t-rose-500 rounded-full animate-spin" />
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-rose-400 animate-pulse" />
        </div>
      </div>
      <p className="text-lg font-bold text-stone-800">{message}</p>
      <p className="text-sm text-stone-500 mt-2 transition-all duration-300">{funMessages[msgIndex]}</p>
      {subMessage && <p className="text-xs text-stone-400 mt-1">{subMessage}</p>}
    </div>
  );
};

const UploadStagingModal = ({ files, onConfirm, onCancel }) => {
  const [mode, setMode] = useState("single"); // Default to single
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    // Generate previews for display (limit to first 4 to match UI)
    const urls = files.slice(0, 4).map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    // Cleanup: revoke URLs to prevent memory leaks
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h3 className="text-lg font-serif font-bold text-stone-800">Upload {files.length} Photos</h3>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Preview Grid (First 4) */}
          <div className="grid grid-cols-4 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shadow-sm">
                <img src={url} className="w-full h-full object-cover" alt="preview" />
              </div>
            ))}
            {files.length > 4 && (
              <div className="aspect-square rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500 border border-stone-200 shadow-sm">
                +{files.length - 4}
              </div>
            )}
          </div>

          {/* Options Removed - Mode is pre-determined by entry button */}
          {/* 
          <div className="space-y-3">
             ... radio buttons ...
          </div>
          */}
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col gap-3">
          <button 
            onClick={() => onConfirm(mode, "analyze_now")}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-stone-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-rose-300" /> Upload & Analyze
          </button>
          
          <button 
            onClick={() => onConfirm(mode, "edit_first")}
            className="w-full bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
          >
            Add Details First
          </button>
          
          <button onClick={onCancel} className="w-full text-stone-400 font-bold text-xs hover:text-stone-600 py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Quick Action Menu (Context Menu for Items) ---
const QuickActionMenu = ({ position, item, onClose, onStatusChange, onDelete }) => {
  const menuRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedStyle = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 220),
    left: Math.min(position.x, window.innerWidth - 160),
    zIndex: 100,
  };

  const statusOptions = [
    { value: 'keep', label: 'Mark as Keep', icon: Heart, color: 'text-emerald-600' },
    { value: 'sell', label: 'Mark as Sell', icon: DollarSign, color: 'text-amber-600' },
    { value: 'TBD', label: 'Mark as TBD', icon: HelpCircle, color: 'text-blue-600' },
  ];

  return (
    <div 
      ref={menuRef}
      style={adjustedStyle}
      className="bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 fade-in duration-150 min-w-[160px]"
    >
      <div className="p-1.5">
        <div className="px-2 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          Quick Actions
        </div>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onStatusChange(item.id, opt.value); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              item.status === opt.value 
                ? 'bg-stone-100 text-stone-900' 
                : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            <opt.icon className={`w-4 h-4 ${opt.color}`} />
            {opt.label}
            {item.status === opt.value && <Check className="w-3.5 h-3.5 ml-auto text-stone-500" />}
          </button>
        ))}
        <div className="h-px bg-stone-100 my-1.5" />
        <button
          onClick={() => { onDelete(item.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Item
        </button>
      </div>
    </div>
  );
};

const ItemCard = ({ item, onClick, isSelected, isSelectionMode, onToggleSelect, onAnalyze, onQuickAction }) => {
  // Ensure images array exists, fallback to single image or empty
  const images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Long-press handling for mobile
  const longPressTimer = useRef(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Reset index if images change (rare but good practice)
  useEffect(() => { setActiveImgIdx(0); }, [item.id]);

  const displayImage = images.length > 0 ? images[activeImgIdx] : null;

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (activeImgIdx < images.length - 1) {
      setActiveImgIdx(prev => prev + 1);
    } else {
      setActiveImgIdx(0); // Loop back to start
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (activeImgIdx > 0) {
      setActiveImgIdx(prev => prev - 1);
    } else {
      setActiveImgIdx(images.length - 1); // Loop to end
    }
  };

  const handleClick = (e) => {
    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }
    if (isSelectionMode) {
      e.stopPropagation();
      onToggleSelect(item.id);
    } else {
      onClick(item);
    }
  };

  const handleQuickAnalyze = async (e) => {
     e.stopPropagation();
     if (isAnalyzing) return;
     setIsAnalyzing(true);
     await onAnalyze(item);
     setIsAnalyzing(false);
  };

  // Right-click context menu (desktop)
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSelectionMode && onQuickAction) {
      onQuickAction(item, { x: e.clientX, y: e.clientY });
    }
  };

  // Long-press handlers (mobile)
  const handleTouchStart = (e) => {
    if (isSelectionMode) return;
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
      const touch = e.touches[0];
      if (onQuickAction) {
        onQuickAction(item, { x: touch.clientX, y: touch.clientY });
      }
    }, 500); // 500ms long-press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    // Cancel long-press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`group bg-white rounded-xl shadow-sm transition-all duration-200 border overflow-hidden cursor-pointer flex flex-col h-full relative select-none ${
        isSelected ? "border-[3px] border-rose-500" : "border-stone-100 hover:shadow-md border"
      }`}
    >
      {/* Selection Overlay */}
      {isSelectionMode && (
        <div className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-rose-500 border-rose-500"
                : "bg-white/50 border-white backdrop-blur-sm"
            }`}>
            {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </div>
      )}

      <div className="relative aspect-square bg-stone-100 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.title || "Item"}
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <Camera size={48} />
          </div>
        )}

        {/* Image Carousel Controls (Visible on Hover) */}
        {!isSelectionMode && images.length > 1 && (
          <>
            <button 
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <button 
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
            
            {/* Dots Indicator */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
              {images.slice(0, 5).map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full shadow-sm ${
                    idx === activeImgIdx ? "bg-white" : "bg-white/40"
                  } ${idx === 4 && images.length > 5 ? "opacity-50" : ""}`} 
                />
              ))}
            </div>
          </>
        )}


        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <StatusBadge status={item.status} />
        </div>

        {item.valuation_high > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 pointer-events-none">
            <p className="text-white font-extrabold text-lg drop-shadow-md">
              ${item.valuation_low} - ${item.valuation_high}
            </p>
            {/* Confidence Indicator */}
            {item.confidence && (
              <div className={`flex items-center gap-1 mt-0.5 ${
                item.confidence === 'high' ? 'text-emerald-300' :
                item.confidence === 'medium' ? 'text-amber-300' :
                'text-red-300'
              }`}>
                <Gauge className="w-2.5 h-2.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {item.confidence}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-stone-800 line-clamp-1 mb-1">
          {getDisplayTitle(item)}
        </h3>
        <p className="text-xs text-stone-500 line-clamp-2 mb-2 flex-1">
          {[
            item.maker && item.maker.toLowerCase() !== "unknown" ? item.maker : null,
            item.style && item.style.toLowerCase() !== "unknown" ? item.style : null,
            item.materials
          ].filter(Boolean).join(" • ") || item.userNotes || "No details yet"}
        </p>
        <div className="flex items-center justify-between text-xs text-stone-400 mt-auto pt-2 border-t border-stone-50">
          <span>{item.category || "Unsorted"}</span>
          {/* AI Timestamp */}
          {item.aiLastRun ? (
            <span className="flex items-center gap-1 text-emerald-600" title={`AI analyzed ${new Date(item.aiLastRun).toLocaleString()}`}>
              <Sparkles className="w-2.5 h-2.5" />
              {formatTimeAgo(item.aiLastRun)}
            </span>
          ) : (
            item.era && item.era.toLowerCase() !== "unknown" && <span>{item.era}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const LoginScreen = () => {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect result failed", error);
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      logAnalyticsEvent('user_login', { method: 'google' });
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("Redirect login failed", redirectError);
          setError("Login failed. Please try again.");
        }
      } else {
        setError(error.message || "Login failed");
      }
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name or collection name");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: name.trim()
      });
      // Reload the user to ensure displayName is updated in the auth state
      await userCredential.user.reload();
      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);
      logAnalyticsEvent('user_registered', { method: 'email' });
    } catch (error) {
      let errorMessage = "Sign up failed";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Try signing in instead.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      logAnalyticsEvent('user_login', { method: 'email' });
    } catch (error) {
      let errorMessage = "Sign in failed";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled";
      } else {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      // Simplest call - relies on Firebase Console template settings
      await sendPasswordResetEmail(auth, email);
      
      // Show success message
      setError(""); 
      alert(`Password reset email sent to ${email}!\n\nPlease check your inbox and spam folder.`);
      setMode("login");
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send reset email";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please try again later.";
      } else {
        errorMessage = `Failed to send email: ${error.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,black_1px,transparent_0)] bg-[length:24px_24px]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-rose-50/40 to-amber-50/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-stone-50/50 to-blue-50/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      {/* Main Content - Single Column */}
      <div className="relative z-10 w-full flex-1 flex flex-col">
        {/* Auth Form Section */}
        <div className="flex flex-col justify-center p-8 lg:p-16 xl:p-20 flex-1">
          <div className="max-w-md mx-auto w-full">
            {/* Logo/Icon */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" strokeWidth={2} fill="currentColor" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
                  Vintage Wizard
                </h1>
              </div>
              <p className="text-stone-600 text-sm ml-14">Your stuff — researched, organized & ready</p>
            </div>

        {/* Auth Card - Premium Design */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-stone-900/5 border border-stone-200/60 overflow-hidden">
          {/* Tab Switcher - Refined */}
          <div className="flex border-b border-stone-100 bg-stone-50/50">
            <button
              onClick={() => {
                setMode("login");
                setError("");
                setVerificationSent(false);
              }}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                mode === "login"
                  ? "text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Sign In
              {mode === "login" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
              )}
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError("");
                setVerificationSent(false);
                setName(""); // Reset name when switching tabs
              }}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                mode === "signup"
                  ? "text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Create Account
              {mode === "signup" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
              )}
            </button>
          </div>

          <div className="p-8">
            {/* Verification Success Message */}
            {verificationSent && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Verification email sent!</strong> Please check your inbox and click the link to verify your account.
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Gmail Sign In - Hero CTA */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-stone-50 text-stone-900 font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 border-2 border-stone-200 hover:border-stone-300 shadow-sm hover:shadow-md mb-6 group"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                alt="G"
              />
              <span>{mode === "signup" ? "Register with Gmail" : "Sign-In with Gmail"}</span>
            </button>

            {/* Divider - Subtle */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
              <span className="text-xs text-stone-400 font-medium">or continue with email</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
            </div>

            {/* Forms */}
            {mode === "forgot" ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="w-full text-sm text-stone-500 hover:text-stone-700 py-2"
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={mode === "signup" ? handleSignUp : handleSignIn} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      First Name or Collection Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="NiceHuman"
                      className="w-full px-4 py-3.5 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3.5 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1.5 rounded-lg hover:bg-stone-100"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full px-4 py-3.5 bg-white border-2 border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                      required
                    />
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-stone-500">
                      <input type="checkbox" className="rounded border-stone-300" />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                      }}
                      className="text-rose-600 hover:text-rose-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 hover:shadow-xl hover:shadow-stone-900/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>{mode === "signup" ? "Creating account..." : "Signing in..."}</span>
                    </>
                  ) : (
                    <span>{mode === "signup" ? "Create Account" : "Sign In"}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

          </div>
        </div>

        {/* Features Strip - Horizontal Scrolling */}
        <div className="w-full bg-stone-50/50 border-t border-stone-200/60 py-8 overflow-hidden">
          <style>{`
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(calc(-256px * 5 - 24px * 5)); }
            }
            .animate-scroll {
              animation: scroll 30s linear infinite;
            }
            .animate-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="flex gap-6 animate-scroll">
            {/* Feature 1 */}
            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">📷</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Add pic(s) + details</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Upload photos and optional details on any item(s) & AI will get to work</p>
            </div>

            {/* Feature 2 */}
            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">See what it's worth</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Price ranges + links to sold comparables</p>
            </div>

            {/* Feature 3 */}
            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">🗂️</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Build a visual vault</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Catalog everything, with AI categorization, searchable & synced</p>
            </div>

            {/* Feature 4 */}
            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">✍️</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Sell smarter</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Auto-generated listings ready for eBay, Poshmark, etc.</p>
            </div>

            {/* Feature 5 */}
            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Share with anyone</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Buyers, appraisers, insurance, friends & family</p>
            </div>

            {/* Duplicate for seamless loop */}
            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">📷</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Add pic(s) + details</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Upload photos and optional details on any item(s) & AI will get to work</p>
            </div>

            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">See what it's worth</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Price ranges + links to sold comparables</p>
            </div>

            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">🗂️</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Build a visual vault</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Catalog everything, with AI categorization, searchable & synced</p>
            </div>

            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">✍️</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Sell smarter</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Auto-generated listings ready for eBay, Poshmark, etc.</p>
            </div>

            <div className="flex-shrink-0 w-64 bg-white rounded-xl p-5 border border-stone-200/60 shadow-sm">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="font-semibold text-stone-900 mb-1.5 text-sm">Share with anyone</h3>
              <p className="text-xs text-stone-600 leading-relaxed">Buyers, appraisers, insurance, friends & family</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- LISTING GENERATOR COMPONENT WITH TONE TUNER ---
const ListingGenerator = ({ formData, setFormData }) => {
  // Listing Tuner state - initialize from formData or defaults
  const [toneSettings, setToneSettings] = useState({
    salesIntensity: formData.tone_sales ?? 3,
    nerdFactor: formData.tone_nerd ?? 3,
    formality: formData.tone_formality ?? 3,
    includeFunFact: formData.tone_funfact ?? false,
    includeDadJoke: formData.tone_dadjoke ?? false,
    emojiStyle: formData.tone_emoji ?? 'minimal', // 'none' | 'minimal' | 'full'
  });
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Category presets
  const categoryPresets = {
    'Books': { salesIntensity: 2, nerdFactor: 5, formality: 4, includeFunFact: true, includeDadJoke: false, emojiStyle: 'none' },
    'Jewelry & Watches': { salesIntensity: 4, nerdFactor: 2, formality: 3, includeFunFact: false, includeDadJoke: false, emojiStyle: 'minimal' },
    'Fashion': { salesIntensity: 5, nerdFactor: 1, formality: 2, includeFunFact: false, includeDadJoke: false, emojiStyle: 'full' },
    'Electronics': { salesIntensity: 2, nerdFactor: 4, formality: 3, includeFunFact: true, includeDadJoke: false, emojiStyle: 'none' },
    'Collectibles': { salesIntensity: 3, nerdFactor: 5, formality: 3, includeFunFact: true, includeDadJoke: true, emojiStyle: 'minimal' },
    'Art': { salesIntensity: 3, nerdFactor: 4, formality: 5, includeFunFact: true, includeDadJoke: false, emojiStyle: 'none' },
    'Vinyl & Music': { salesIntensity: 3, nerdFactor: 5, formality: 2, includeFunFact: true, includeDadJoke: true, emojiStyle: 'minimal' },
    'Furniture': { salesIntensity: 3, nerdFactor: 3, formality: 4, includeFunFact: false, includeDadJoke: false, emojiStyle: 'minimal' },
    'Ceramics & Glass': { salesIntensity: 3, nerdFactor: 4, formality: 3, includeFunFact: true, includeDadJoke: false, emojiStyle: 'minimal' },
  };

  // Get preset for current category
  const currentPreset = categoryPresets[formData.category] || { salesIntensity: 3, nerdFactor: 3, formality: 3, includeFunFact: false, emojiStyle: 'minimal' };

  // Apply a preset
  const applyPreset = (presetName) => {
    const preset = categoryPresets[presetName] || currentPreset;
    setToneSettings(preset);
    playSuccessFeedback();
  };

  // Helper to copy text with feedback
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    playSuccessFeedback();
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-4 py-2 rounded-xl shadow-xl text-sm font-medium z-[100] animate-in fade-in slide-in-from-bottom-4';
    toast.textContent = '✓ Copied to clipboard';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  // AI Regeneration with tone settings
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    
    const salesLabels = ['just the facts', 'mostly factual', 'balanced', 'persuasive', 'full sales charm'];
    const nerdLabels = ['general audience', 'some context', 'moderate depth', 'collector-focused', 'deep expertise with trivia'];
    const formalityLabels = ['very casual', 'casual', 'balanced', 'professional', 'formal/academic'];
    const emojiInstructions = {
      'none': 'Do NOT use any emojis in the title or description.',
      'minimal': 'Use emojis sparingly in description only (like 🏷️ DETAILS:). No emojis in title.',
      'full': 'Use emojis throughout description to add personality. Optionally 1 emoji at start of title if appropriate.'
    };

    const prompt = `You are an expert marketplace listing copywriter. Generate BOTH a compelling title AND description for this vintage item.

CRITICAL STYLE RULE: Do NOT use exclamation points anywhere. Write in a confident but calm, understated tone.

TONE SETTINGS (follow these precisely):
- Sales Intensity: ${toneSettings.salesIntensity}/5 (${salesLabels[toneSettings.salesIntensity - 1]})
- Expertise/Nerd Level: ${toneSettings.nerdFactor}/5 (${nerdLabels[toneSettings.nerdFactor - 1]})
- Formality: ${toneSettings.formality}/5 (${formalityLabels[toneSettings.formality - 1]})
- ${emojiInstructions[toneSettings.emojiStyle]}
${toneSettings.includeFunFact ? '- IMPORTANT: Include a "Did you know?" or collector trivia fact about this specific item, maker, era, or category. Make it genuinely interesting and obscure.' : '- Do NOT include trivia or fun facts.'}
${toneSettings.includeDadJoke ? `- IMPORTANT: Include a short, groan-worthy dad joke related to this item at the end. Style the joke based on the tone: ${toneSettings.nerdFactor >= 4 ? 'make it nerdy/geeky with insider collector humor' : toneSettings.salesIntensity >= 4 ? 'make it cheesy and sales-pun focused' : 'keep it classic dad-joke style'}. Format as "😏 Dad joke: [joke]"` : ''}

ITEM DETAILS:
- Current Title: ${formData.title || 'Vintage Item'}
- Category: ${formData.category || 'Other'}
- Maker/Brand: ${formData.maker || 'Unknown'}
- Style: ${formData.style || 'Unknown'}
- Era: ${formData.era || 'Unknown'}
- Materials: ${formData.materials || 'Unknown'}
- Condition: ${formData.condition || 'Good'}
- Markings: ${formData.markings || 'None visible'}
- Original AI Description: ${formData.sales_blurb || ''}

TITLE GUIDELINES (based on tone settings):
- For high sales intensity: Add compelling words like "Rare", "Stunning", "Collector's"
- For high nerd factor: Include specific details collectors care about (maker marks, period names, variations)
- For formal: Use proper terminology; for casual: use everyday language
- Keep title under 80 characters for marketplace compatibility
- Include: [Condition word if notable] [Era/Age] [Maker if known] [Style] [Item type] [Notable feature]

Generate a JSON response with this exact format:
{
  "title": "Your optimized marketplace title here",
  "description": "Your marketplace description here (150-250 words, with hook, bullets, condition, ${toneSettings.includeFunFact ? 'fun fact, ' : ''}and call to action)"
}

Return ONLY valid JSON, no markdown or extra text.`;

    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      });

      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        // Parse JSON response
        const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
          const parsed = JSON.parse(cleanedResponse);
          setFormData(prev => ({ 
            ...prev,
            title: parsed.title || prev.title,
            listing_description: parsed.description?.trim() || prev.listing_description,
            tone_sales: toneSettings.salesIntensity,
            tone_nerd: toneSettings.nerdFactor,
            tone_formality: toneSettings.formality,
            tone_funfact: toneSettings.includeFunFact,
            tone_dadjoke: toneSettings.includeDadJoke,
            tone_emoji: toneSettings.emojiStyle,
          }));
          playSuccessFeedback();
        } catch (parseError) {
          // Fallback: treat response as just description
          setFormData(prev => ({ 
            ...prev, 
            listing_description: responseText.trim(),
            tone_sales: toneSettings.salesIntensity,
            tone_nerd: toneSettings.nerdFactor,
            tone_formality: toneSettings.formality,
            tone_funfact: toneSettings.includeFunFact,
            tone_dadjoke: toneSettings.includeDadJoke,
            tone_emoji: toneSettings.emojiStyle,
          }));
          playSuccessFeedback();
        }
      }
    } catch (error) {
      console.error('Regeneration failed:', error);
      alert('Failed to regenerate. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Generate Optimized Title (avoid Unknown)
  const generateTitle = () => {
    const parts = [];
    if (formData.maker && formData.maker.toLowerCase() !== "unknown") parts.push(formData.maker);
    if (formData.style && formData.style.toLowerCase() !== "unknown") parts.push(formData.style);
    if (formData.title) {
      const cleanTitle = formData.title.replace(/^Unknown\s*/i, "").trim();
      if (cleanTitle) parts.push(cleanTitle);
    }
    if (formData.era && formData.era.toLowerCase() !== "unknown") parts.push(formData.era);
    if (formData.materials) parts.push(formData.materials);
    const uniqueParts = [...new Set(parts.join(" ").split(" "))];
    return uniqueParts.join(" ").substring(0, 80) || "Vintage Item";
  };

  // Generate Description - Use sales_blurb as primary hook
  const generateDescription = () => {
    const hook = formData.sales_blurb || "";
    const isReal = (val) => {
      if (!val) return false;
      const lower = val.toLowerCase().trim();
      return lower !== "unknown" && lower !== "vintage" && lower !== "see photos" && 
             lower !== "contemporary" && lower !== "modern" && lower !== "n/a" && lower.length > 0;
    };
    const details = [];
    if (isReal(formData.maker)) details.push(`• Maker/Brand: ${formData.maker}`);
    if (isReal(formData.style)) details.push(`• Style/Period: ${formData.style}`);
    if (isReal(formData.era)) details.push(`• Era: ${formData.era}`);
    if (isReal(formData.materials)) details.push(`• Material: ${formData.materials}`);
    if (formData.markings) details.push(`• Markings: ${formData.markings}`);
    const conditionText = isReal(formData.condition) ? formData.condition : "";
    let desc = hook;
    if (details.length > 0) desc += `\n\n🏷️ DETAILS:\n${details.join("\n")}`;
    if (conditionText) desc += `\n\n💎 CONDITION:\n${conditionText}`;
    if (formData.userNotes) desc += `\n\n📏 NOTES:\n${formData.userNotes}`;
    desc += "\n\n💬 Message me for measurements, shipping quotes, or more photos!";
    return desc.trim();
  };

  // Generate Hashtags (filter out "unknown")
  const generateTags = () => {
    const baseTags = [
      formData.category, formData.style, formData.era, "vintage", "retro", "preloved", formData.maker
    ].filter(t => t && t.toLowerCase() !== "unknown");
    if (formData.search_terms_broad) {
      baseTags.push(...formData.search_terms_broad.split(" ").filter(t => t.toLowerCase() !== "unknown"));
    }
    return [...new Set(baseTags)].map(t => `#${t.replace(/\s+/g, '')}`).join(" ");
  };

  // Use saved listing overrides if they exist, otherwise generate fresh
  const currentTitle = formData.listing_title ?? generateTitle();
  const currentDesc = formData.listing_description ?? generateDescription();
  const currentTags = formData.listing_tags ?? generateTags();
  const itemSku = formData.id ? formData.id.substring(0, 8).toUpperCase() : "N/A";

  // Update handlers that persist to formData
  const handleTitleChange = (value) => {
    setFormData(prev => ({ ...prev, listing_title: value }));
  };
  const handleDescChange = (value) => {
    setFormData(prev => ({ ...prev, listing_description: value }));
  };
  const handleTagsChange = (value) => {
    setFormData(prev => ({ ...prev, listing_tags: value }));
  };

  // Reset to AI-generated version
  const handleReset = (field) => {
    if (field === 'title') setFormData(prev => ({ ...prev, listing_title: null }));
    if (field === 'description') setFormData(prev => ({ ...prev, listing_description: null }));
    if (field === 'tags') setFormData(prev => ({ ...prev, listing_tags: null }));
  };

  // Slider component
  const ToneSlider = ({ label, value, onChange, leftLabel, rightLabel, description }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-stone-700">{label}</span>
        <span className="text-xs font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-600">{value}/5</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-stone-400 w-16 text-right">{leftLabel}</span>
        <input
          type="range"
          min="1"
          max="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-stone-200 rounded-full appearance-none cursor-pointer accent-rose-500
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
            [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:hover:bg-rose-600 [&::-webkit-slider-thumb]:transition-colors"
        />
        <span className="text-[10px] text-stone-400 w-16">{rightLabel}</span>
      </div>
      {description && <p className="text-[10px] text-stone-400 italic">{description}</p>}
    </div>
  );

  return (
    <div className="space-y-4 p-1 pb-6">
      {/* === TONE TUNER PANEL === */}
      <div className="bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 border border-violet-200/60 rounded-2xl overflow-hidden shadow-sm">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsTunerOpen(!isTunerOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold text-stone-800 block">Listing Tuner</span>
              <span className="text-[10px] text-stone-500">Customize title & description style</span>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform duration-200 ${isTunerOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Expandable Content */}
        {isTunerOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-violet-100 animate-in slide-in-from-top-2 duration-200">
            {/* Quick Presets */}
            <div className="pt-3">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Quick Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(categoryPresets).slice(0, 6).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-all ${
                      formData.category === preset
                        ? 'bg-violet-100 border-violet-300 text-violet-700'
                        : 'bg-white/60 border-stone-200 text-stone-600 hover:bg-white hover:border-stone-300'
                    }`}
                  >
                    {preset === 'Jewelry & Watches' ? '💎 Jewelry' : 
                     preset === 'Books' ? '📚 Books' :
                     preset === 'Fashion' ? '👗 Fashion' :
                     preset === 'Electronics' ? '📻 Electronics' :
                     preset === 'Collectibles' ? '🎯 Collectibles' :
                     preset === 'Art' ? '🎨 Art' : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2">
              <ToneSlider
                label="Sales Intensity"
                value={toneSettings.salesIntensity}
                onChange={(v) => setToneSettings(prev => ({ ...prev, salesIntensity: v }))}
                leftLabel="Just facts"
                rightLabel="Full charm"
                description="How persuasive and salesy should the copy be?"
              />
              
              <ToneSlider
                label="Nerd Factor"
                value={toneSettings.nerdFactor}
                onChange={(v) => setToneSettings(prev => ({ ...prev, nerdFactor: v }))}
                leftLabel="General"
                rightLabel="Deep cuts"
                description="Include collector knowledge and obscure details"
              />
              
              <ToneSlider
                label="Formality"
                value={toneSettings.formality}
                onChange={(v) => setToneSettings(prev => ({ ...prev, formality: v }))}
                leftLabel="Casual"
                rightLabel="Formal"
              />
            </div>

            {/* Toggles Row */}
            <div className="flex flex-wrap gap-3 pt-2">
              {/* Fun Fact Toggle */}
              <button
                onClick={() => setToneSettings(prev => ({ ...prev, includeFunFact: !prev.includeFunFact }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  toneSettings.includeFunFact
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white/60 border-stone-200 text-stone-500 hover:bg-white'
                }`}
              >
                <span className="text-base">💡</span>
                <span>Fun Fact</span>
                {toneSettings.includeFunFact && <Check className="w-3.5 h-3.5" />}
              </button>

              {/* Dad Joke Toggle */}
              <button
                onClick={() => setToneSettings(prev => ({ ...prev, includeDadJoke: !prev.includeDadJoke }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  toneSettings.includeDadJoke
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-white/60 border-stone-200 text-stone-500 hover:bg-white'
                }`}
              >
                <span className="text-base">🤓</span>
                <span>Dad Joke</span>
                {toneSettings.includeDadJoke && <Check className="w-3.5 h-3.5" />}
              </button>

              {/* Emoji Style */}
              <div className="flex items-center gap-1 bg-white/60 rounded-lg border border-stone-200 p-1">
                {['none', 'minimal', 'full'].map((style) => (
                  <button
                    key={style}
                    onClick={() => setToneSettings(prev => ({ ...prev, emojiStyle: style }))}
                    className={`px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                      toneSettings.emojiStyle === style
                        ? 'bg-rose-100 text-rose-700 shadow-sm'
                        : 'text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    {style === 'none' ? '🚫 No Emoji' : style === 'minimal' ? '✨ Minimal' : '🎉 Full'}
                  </button>
                ))}
              </div>
            </div>

            {/* Regenerate Button */}
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isRegenerating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Regenerate with AI
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Editable Title */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Optimized Title ({currentTitle.length}/80)
          </label>
          <div className="flex items-center gap-2">
            {formData.listing_title && (
              <button onClick={() => handleReset('title')} className="text-stone-400 text-xs hover:text-stone-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
            <button onClick={() => handleCopy(currentTitle)} className="text-rose-600 text-xs font-bold hover:underline flex items-center gap-1">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>
        <input
          type="text"
          value={currentTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          maxLength={80}
          className="w-full p-3 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          placeholder="Enter listing title..."
        />
      </div>

      {/* Editable Description */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Professional Description
          </label>
          <div className="flex items-center gap-2">
            {formData.listing_description && (
              <button onClick={() => handleReset('description')} className="text-stone-400 text-xs hover:text-stone-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
            <button onClick={() => handleCopy(currentDesc)} className="text-rose-600 text-xs font-bold hover:underline flex items-center gap-1">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>
        <textarea 
          value={currentDesc}
          onChange={(e) => handleDescChange(e.target.value)}
          className="w-full p-3 bg-white border border-stone-200 rounded-xl text-sm font-mono text-stone-600 h-40 md:h-48 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-y shadow-sm"
          placeholder="Enter listing description..."
        />
      </div>

      {/* Editable SEO Tags */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className="text-blue-500">#</span> SEO Tags
          </label>
          <div className="flex items-center gap-2">
            {formData.listing_tags && (
              <button onClick={() => handleReset('tags')} className="text-stone-400 text-xs hover:text-stone-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
            <button onClick={() => handleCopy(currentTags)} className="text-rose-600 text-xs font-bold hover:underline flex items-center gap-1">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>
        <textarea
          value={currentTags}
          onChange={(e) => handleTagsChange(e.target.value)}
          rows={2}
          className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-medium text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y shadow-sm"
          placeholder="#vintage #retro #collectible..."
        />
      </div>
      
      {/* SKU (read-only) */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">SKU:</span>
          <span className="px-2 py-1 bg-stone-100 border border-stone-200 rounded text-xs font-mono text-stone-700">
            {itemSku}
          </span>
        </div>
        <button onClick={() => handleCopy(itemSku)} className="text-rose-600 text-xs font-bold hover:underline flex items-center gap-1">
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      
      {/* Copy All Button */}
      <button 
        onClick={() => handleCopy(`${currentTitle}\n\n${currentDesc}\n\n${currentTags}\n\nSKU: ${itemSku}`)}
        className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Copy className="w-4 h-4" /> Copy Everything
      </button>
    </div>
  );
};

const EditModal = ({ item, onClose, onSave, onDelete, onNext, onPrev, hasNext, hasPrev }) => {
  const [formData, setFormData] = useState({
    ...item,
    images: item.images || (item.image ? [item.image] : []),
    clarifications: item.clarifications || {},
    provenance: item.provenance || {
       user_story: item.userNotes || "",
       date_claim: "",
       is_locked: true,
    },
    valuation_context: item.valuation_context || null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showQuestions, setShowQuestions] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(null);
  const addPhotoInputRef = useRef(null);
  const modalContentRef = useRef(null);
  
  // Chat about item state
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatInputRef = useRef(null);

  // Handle item navigation with dip-to-black transition
  const handleItemTransition = (direction) => {
    if (isTransitioning) return;
    
    // Check for unsaved changes before navigating
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Continue without saving?")) {
        return;
      }
    }
    
    setTransitionDirection(direction);
    setIsTransitioning(true);
    
    setTimeout(() => {
      if (direction === 'next') {
        onNext?.();
      } else {
        onPrev?.();
      }
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 150);
    }, 200);
  };

  // Reset form when item changes
  useEffect(() => {
    setFormData({
      ...item,
      images: item.images || (item.image ? [item.image] : []),
      clarifications: item.clarifications || {},
      provenance: item.provenance || {
        user_story: item.userNotes || "",
        date_claim: "",
        is_locked: true,
      },
      valuation_context: item.valuation_context || null,
    });
    setActiveImageIdx(0);
    setHasUnsavedChanges(false);
    setShowQuestions(true);
    // Reset chat when switching items
    setChatHistory([]);
    setChatInput("");
    setShowChat(false);
  }, [item.id]);
  
  const marketLinks = useMemo(
    () =>
      getMarketplaceLinks(
        formData.category,
        formData.search_terms,
        formData.search_terms_broad
      ),
    [formData.category, formData.search_terms, formData.search_terms_broad]
  );

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState("details"); // "details" | "listing"

  // Track changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify({
      ...item,
      images: item.images || (item.image ? [item.image] : []),
      clarifications: item.clarifications || {},
      provenance: item.provenance || { user_story: item.userNotes || "", date_claim: "", is_locked: true },
      valuation_context: item.valuation_context || null,
    });
    setHasUnsavedChanges(hasChanges);
  }, [formData, item]);

  // Keyboard navigation between items
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't navigate if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (isTransitioning) return;
      
      if (e.key === 'ArrowRight' && hasNext) {
        handleItemTransition('next');
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        handleItemTransition('prev');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, isTransitioning, hasUnsavedChanges]);

  // Handle backdrop click with save prompt
  const handleBackdropClick = (e) => {
    if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
      if (hasUnsavedChanges) {
        setShowSavePrompt(true);
      } else {
        onClose();
      }
    }
  };

  // Save and close helper
  const handleSaveAndClose = () => {
    onSave({
      ...formData,
      image: formData.images.length > 0 ? formData.images[0] : null,
    });
    playSuccessFeedback(); // Sound/haptic confirmation
    onClose();
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
    e.target.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedIdx(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    
    if (isNaN(dragIdx) || dragIdx === dropIndex) return;

    const newImages = [...formData.images];
    const [movedItem] = newImages.splice(dragIdx, 1);
    newImages.splice(dropIndex, 0, movedItem);
    
    setFormData(prev => ({ ...prev, images: newImages }));
    
    if (activeImageIdx === dragIdx) setActiveImageIdx(dropIndex);
    else if (dropIndex <= activeImageIdx && dragIdx > activeImageIdx) setActiveImageIdx(activeImageIdx + 1);
    else if (dropIndex >= activeImageIdx && dragIdx < activeImageIdx) setActiveImageIdx(activeImageIdx - 1);
    
    setDraggedIdx(null);
  };

  const handleAnalyze = async () => {
    if (formData.images.length === 0) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeImagesWithGemini(
        formData.images,
        formData.userNotes || "",
        formData
      );
      setFormData((prev) => ({
        ...prev,
        ...analysis,
        aiLastRun: new Date().toISOString(),
      }));
    } catch (err) {
      alert("Analysis failed. Please check your Gemini API Key in the code.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddPhoto = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newImages = [];
    for (const file of files) {
      newImages.push(await compressImage(file));
    }
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
  };

  // Chat about item handler
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatting) return;
    
    const userQuestion = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", text: userQuestion }]);
    setIsChatting(true);
    
    try {
      // Build context from current item data
      const itemContext = {
        title: formData.title,
        maker: formData.maker,
        category: formData.category,
        style: formData.style,
        era: formData.era,
        materials: formData.materials,
        condition: formData.condition,
        markings: formData.markings,
        valuation_low: formData.valuation_low,
        valuation_high: formData.valuation_high,
        sales_blurb: formData.sales_blurb,
        identification_notes: formData.identification_notes,
      };
      
      const response = await askGeminiChat(formData.images, itemContext, userQuestion);
      setChatHistory(prev => [...prev, { role: "assistant", text: response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: "assistant", 
        text: "Sorry, I couldn't process that question. Please try again." 
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      {/* Dip-to-black transition overlay */}
      <div 
        className={`fixed inset-0 bg-black z-[100] pointer-events-none transition-opacity duration-200 flex items-center justify-center ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      >
        {transitionDirection && (
          <div className="text-white/50 text-sm font-medium flex items-center gap-2 animate-pulse">
            {transitionDirection === 'next' ? (
              <>Next item <ChevronRight size={16} /></>
            ) : (
              <><ChevronLeft size={16} /> Previous item</>
            )}
          </div>
        )}
      </div>

      {/* Navigation arrows (outside the modal) */}
      {hasPrev && !isTransitioning && (
        <button 
          onClick={(e) => { e.stopPropagation(); handleItemTransition('prev'); }}
          className="hidden sm:flex fixed left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-sm z-[60] transition-all"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {hasNext && !isTransitioning && (
        <button 
          onClick={(e) => { e.stopPropagation(); handleItemTransition('next'); }}
          className="hidden sm:flex fixed right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-sm z-[60] transition-all"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Save Prompt Dialog */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-stone-900 mb-2">Save Changes?</h3>
            <p className="text-sm text-stone-600 mb-6">You have unsaved changes. Would you like to save before closing?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => { setShowSavePrompt(false); onClose(); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={() => { setShowSavePrompt(false); handleSaveAndClose(); }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for full image view */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[70] bg-black flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
        >
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50"
          >
            <X size={32} />
          </button>
              <img
                src={formData.images[activeImageIdx]}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
            alt="Full view"
              />
              </div>
            )}
      
      {/* Main Modal - REDESIGNED Layout */}
      <div 
        ref={modalContentRef}
        className="bg-white sm:rounded-2xl w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* NEW HEADER: Status Buttons + Run AI + Close */}
        <div className="px-3 py-2.5 border-b border-stone-200 bg-white flex items-center gap-2 shrink-0">
          {/* Status Buttons - 3 visible options with icons */}
          <div className="flex-1 flex gap-1">
              <button
              onClick={() => setFormData((p) => ({ ...p, status: "keep" }))}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                formData.status === "keep" 
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-400 shadow-sm" 
                  : "bg-stone-50 text-stone-500 border-2 border-transparent hover:bg-stone-100"
              }`}
            >
              <Lock size={14} />
              <span className="hidden sm:inline">Keep</span>
              </button>
            <button
              onClick={() => setFormData((p) => ({ ...p, status: "sell" }))}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                formData.status === "sell" 
                  ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-400 shadow-sm" 
                  : "bg-stone-50 text-stone-500 border-2 border-transparent hover:bg-stone-100"
              }`}
            >
              <Tag size={14} />
              <span className="hidden sm:inline">Sell</span>
            </button>
            <button
              onClick={() => setFormData((p) => ({ ...p, status: "TBD" }))}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                formData.status === "TBD" || !formData.status
                  ? "bg-amber-100 text-amber-700 border-2 border-amber-400 shadow-sm" 
                  : "bg-stone-50 text-stone-500 border-2 border-transparent hover:bg-stone-100"
              }`}
            >
              <HelpCircle size={14} />
              <span className="hidden sm:inline">TBD</span>
            </button>
          </div>
          
          {/* Run AI Button (prominent, in header) */}
              <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || formData.images.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              isAnalyzing 
                ? "bg-stone-100 text-stone-400 cursor-wait" 
                : "bg-rose-500 text-white hover:bg-rose-600 shadow-sm hover:shadow active:scale-95"
            }`}
          >
            {isAnalyzing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAnalyzing ? "Analyzing..." : (formData.aiLastRun ? "Re-Run" : "Analyze")}</span>
              </button>
          
          {/* Close Button (top right) */}
          <button
            onClick={() => hasUnsavedChanges ? setShowSavePrompt(true) : onClose()}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Larger Thumbnail Strip (tap to expand, drag to reorder) */}
        <div className="px-3 py-3 bg-stone-100 border-b border-stone-200 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
          {formData.images.length > 0 ? (
            <>
              {formData.images.map((img, idx) => (
                <div
                  key={img}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => { setActiveImageIdx(idx); setIsLightboxOpen(true); }}
                  className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden cursor-pointer border-2 transition-all shadow-sm hover:shadow-md ${
                    activeImageIdx === idx ? "border-rose-500 ring-2 ring-rose-200" : "border-white hover:border-stone-300"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" draggable={false} />
                  {idx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                      HERO
                    </div>
                  )}
                  {formData.images.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newImages = formData.images.filter((_, i) => i !== idx);
                        setFormData((prev) => ({ ...prev, images: newImages }));
                        if (activeImageIdx >= newImages.length) setActiveImageIdx(0);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-2 text-stone-400 text-xs py-2">
              <Camera size={16} /> No photos yet
            </div>
          )}
          
          {/* Add Photo Button */}
            <button
              onClick={() => addPhotoInputRef.current?.click()}
            className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-stone-300 bg-white hover:bg-stone-50 flex flex-col items-center justify-center text-stone-400 hover:text-stone-600 transition-colors shadow-sm"
            >
              <Plus size={20} />
            <span className="text-[10px] font-bold mt-1">ADD</span>
            </button>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              ref={addPhotoInputRef}
              onChange={handleAddPhoto}
            />
          {/* AI Info Note */}
          {formData.images.length > 0 && (
            <div className="flex-shrink-0 flex items-center text-[10px] text-stone-400 pl-2 border-l border-stone-200 ml-1">
              <span>📷 AI uses first 4</span>
          </div>
          )}
        </div>

        {/* VALUE INPUT - Below photos, prominent */}
        <div className="px-3 py-2.5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b border-emerald-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Estimated Value</span>
              {/* Confidence Badge */}
              {formData.confidence && (
                <div 
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-help ${
                    formData.confidence === 'high' 
                      ? 'bg-emerald-200 text-emerald-800' 
                      : formData.confidence === 'medium' 
                        ? 'bg-amber-200 text-amber-800' 
                        : 'bg-red-200 text-red-800'
                  }`}
                  title={formData.confidence_reason || 'AI confidence level'}
                >
                  <Gauge className="w-3 h-3" />
                  {formData.confidence}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
              <span className="text-emerald-600 text-sm font-bold">$</span>
              <input
                type="number"
                placeholder="Min"
                value={formData.valuation_low || ""}
                onChange={(e) => setFormData((p) => ({ ...p, valuation_low: e.target.value }))}
                className="w-16 bg-transparent text-center font-bold text-emerald-800 focus:outline-none text-sm"
              />
              <span className="text-emerald-300 font-bold">—</span>
              <input
                type="number"
                placeholder="Max"
                value={formData.valuation_high || ""}
                onChange={(e) => setFormData((p) => ({ ...p, valuation_high: e.target.value }))}
                className="w-16 bg-transparent text-center font-bold text-emerald-800 focus:outline-none text-sm"
              />
            </div>
          </div>
          {/* Confidence Reason */}
          {formData.confidence_reason && (
            <p className="text-[11px] text-emerald-600/80 mt-1.5 italic leading-relaxed">
              {formData.confidence_reason}
            </p>
          )}
        </div>
        
        {/* Tab Switcher */}
        <div className="px-3 py-2 bg-white border-b border-stone-100 shrink-0">
          <div className="flex p-1 bg-stone-100 rounded-xl">
              <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "details" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              Analysis & Details
              </button>
              <button
              onClick={() => setActiveTab("listing")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === "listing" ? "bg-white text-rose-600 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
              >
              <Sparkles className="w-3 h-3" /> Listing Helper
              </button>
            </div>
          </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-stone-50">
          {activeTab === "listing" ? (
            <ListingGenerator formData={formData} setFormData={setFormData} />
          ) : (
            <div className="flex flex-col gap-3">
              {/* TITLE - First and most prominent */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Title
                  </label>
                  <div className="group relative flex items-center">
                    <Bot className="w-3.5 h-3.5 text-stone-400 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-max max-w-[200px] px-2 py-1 bg-stone-800 text-white text-[10px] rounded shadow-lg z-50 pointer-events-none">
                      AI makes mistakes, please check
                    </div>
                  </div>
                </div>
                <textarea
                  name="title"
                  rows={2}
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium resize-none text-sm shadow-sm"
                />
              </div>

              {/* Improve Valuation - collapsible questions */}
              {formData.questions && formData.questions.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl overflow-hidden shadow-sm">
                  <div 
                    className="bg-rose-100/50 px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors"
                    onClick={() => setShowQuestions(!showQuestions)}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-rose-600" />
                      <span className="text-sm font-bold text-rose-900">
                        Improve Valuation
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-rose-600 bg-white/50 px-2 py-0.5 rounded-full">
                      {formData.questions.length} Questions
                    </span>
                      <ChevronRight className={`w-4 h-4 text-rose-400 transition-transform ${showQuestions ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  
                  {showQuestions && (
                    <div className="p-3 space-y-3">
                      <p className="text-[11px] text-rose-800/70 italic">
                        Help the AI give you a more accurate price.
                      </p>
                      {formData.questions.map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="block text-xs font-semibold text-rose-800">
                            {q}
                          </label>
                            <input
                              type="text"
                              inputMode="text"
                              enterKeyHint="next"
                              placeholder="Your answer..."
                              value={formData.clarifications?.[q] || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  clarifications: {
                                    ...prev.clarifications,
                                    [q]: e.target.value,
                                  },
                                }))
                              }
                            className="w-full p-2.5 text-sm bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                        </div>
                      ))}
                      <button
                        onClick={handleAnalyze}
                        className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Re-Appraise with Answers
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Market Comps - more compact */}
            {marketLinks.length > 0 && (
                <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" /> Market Comps
                  </h4>
                    <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                    {formData.search_terms}
                  </span>
                </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {marketLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all hover:shadow-sm text-xs ${link.color}`}
                    >
                        <span className="font-semibold">{link.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            )}

              {/* Other form fields */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Maker / Brand
                  </label>
                  <input
                    type="text"
                    value={formData.maker || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, maker: e.target.value }))
                    }
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-sm"
                  />
                    </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Style / Period
                  </label>
                  <input
                    type="text"
                    value={formData.style || ""}
                  onChange={(e) =>
                      setFormData((p) => ({ ...p, style: e.target.value }))
                  }
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-sm"
                />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="category-options"
                    value={formData.category || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, category: e.target.value }))
                    }
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  />
                  <datalist id="category-options">
                    <option value="Vinyl & Music" />
                    <option value="Furniture" />
                    <option value="Decor & Lighting" />
                    <option value="Art" />
                    <option value="Jewelry & Watches" />
                    <option value="Fashion" />
                    <option value="Ceramics & Glass" />
                    <option value="Collectibles" />
                    <option value="Books" />
                    <option value="Automotive" />
                    <option value="Electronics" />
                    <option value="Other" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Era
                  </label>
                  <input
                    type="text"
                    value={formData.era || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, era: e.target.value }))
                    }
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Markings / Signatures
                  </label>
                  <input
                    type="text"
                    value={formData.markings || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, markings: e.target.value }))
                    }
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Condition
                  </label>
                  <input
                    type="text"
                    value={formData.condition || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, condition: e.target.value }))
                    }
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Materials
                </label>
                <textarea
                  rows={3}
                  value={formData.materials || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, materials: e.target.value }))
                  }
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Sales Blurb
                </label>
                <textarea
                  rows={4}
                  value={formData.sales_blurb || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, sales_blurb: e.target.value }))
                  }
                  placeholder="AI generated sales text will appear here..."
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm resize-y"
                />
              </div>
              {formData.reasoning && (
                <div className="p-4 bg-stone-100 rounded-xl border border-stone-200 text-sm text-stone-600">
                  <span className="font-bold text-stone-700 block mb-1">
                    AI Reasoning:
                  </span>
                  {formData.reasoning}
                </div>
              )}

              {/* --- Notes / Context (Simplified) --- */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                 <div className="p-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-stone-500" />
                    <span className="text-sm font-bold text-stone-700 uppercase tracking-wider">Notes / Context</span>
                 </div>
                 
                 <div className="p-4">
                <textarea
                       value={formData.provenance?.user_story || formData.userNotes || ""}
                       onChange={(e) => setFormData(prev => ({
                          ...prev,
                          userNotes: e.target.value, // Keep legacy sync
                          provenance: { ...prev.provenance, user_story: e.target.value }
                       }))}
                  rows={4}
                       placeholder="Add any details you know about this item (e.g. bought in 1980, signed by artist, minor damage)..."
                       className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 text-sm leading-relaxed placeholder:text-stone-400 resize-y"
                />
              </div>
            </div>

              {/* --- Ask About This Item (AI Chat) --- */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className="w-full p-3 bg-gradient-to-r from-rose-50 to-amber-50 border-b border-stone-100 flex items-center justify-between hover:from-rose-100 hover:to-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-bold text-stone-700 uppercase tracking-wider">Ask About This Item</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">Chat with AI</span>
                    {showChat ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                  </div>
                </button>
                
                {showChat && (
                  <div className="p-4 space-y-4">
                    {/* Chat history */}
                    {chatHistory.length > 0 && (
                      <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                              msg.role === 'user' 
                                ? 'bg-stone-900 text-white rounded-br-sm' 
                                : 'bg-stone-100 text-stone-800 rounded-bl-sm'
                            }`}>
                              {msg.role === 'assistant' && (
                                <Bot className="w-3 h-3 text-rose-500 inline mr-1 -mt-0.5" />
                              )}
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isChatting && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] p-3 rounded-xl bg-stone-100 text-stone-800 rounded-bl-sm flex items-center gap-2 text-sm">
                              <Loader className="w-3 h-3 animate-spin text-rose-500" />
                              <span className="text-stone-500">Thinking...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Empty state / hints */}
                    {chatHistory.length === 0 && (
                      <div className="text-center py-3">
                        <p className="text-sm text-stone-500 mb-3">Ask anything about this item's analysis:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {["How did you identify the maker?", "What makes this valuable?", "How can I tell the age?"].map((hint, i) => (
                            <button
                              key={i}
                              onClick={() => { setChatInput(hint); chatInputRef.current?.focus(); }}
                              className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full transition-colors"
                            >
                              {hint}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Input */}
                    <div className="flex gap-2">
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && chatInput.trim() && !isChatting) handleChatSubmit(); }}
                        placeholder="e.g., How did you know this was made by...?"
                        className="flex-1 p-3 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-stone-400"
                        disabled={isChatting}
                      />
                      <button
                        onClick={handleChatSubmit}
                        disabled={!chatInput.trim() || isChatting}
                        className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>
            </div>
            )}
          </div>
          
        {/* REDESIGNED Footer: Delete (left) | Save (right) */}
        <div className="p-3 bg-white border-t border-stone-200 shrink-0 flex items-center justify-between gap-3">
          {/* Delete Button (bottom left) */}
            <button
              onClick={() => {
              if (confirm("Delete this item permanently? This cannot be undone.")) {
                onDelete(item.id);
                onClose();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Save Button (right side, prominent) */}
          <button
            onClick={handleSaveAndClose}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
    </div>
  );
};

// Helper: Play success haptic feedback (no sound - just vibration on mobile)
const playSuccessFeedback = () => {
  // Haptic feedback only (works on mobile)
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

// Helper: Format relative time
const formatTimeAgo = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Helper: Get smart display title (avoids "Unknown")
const getDisplayTitle = (item) => {
  // Don't show "Unknown" maker in title
  const title = item.title || "";
  const maker = item.maker && item.maker.toLowerCase() !== "unknown" ? item.maker : null;
  const style = item.style && item.style.toLowerCase() !== "unknown" ? item.style : null;
  const category = item.category || "";
  
  // If title starts with "Unknown" or is empty, create a better one
  if (!title || title.toLowerCase().startsWith("unknown")) {
    const parts = [style, category].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Untitled Item";
  }
  
  // Remove "Unknown" prefix if present
  return title.replace(/^Unknown\s*/i, "").trim() || "Untitled Item";
};

// --- SHARED COLLECTION VIEW (Public) ---
const SharedCollectionView = ({ shareId, shareToken, filterParam }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [filter, setFilter] = useState(filterParam || "all");
  const [expandedItemIndex, setExpandedItemIndex] = useState(null); // Index in filteredItems
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, value_high, value_low, alpha

  useEffect(() => {
    const loadSharedCollection = async () => {
      try {
        // Verify share token
        const shareDocRef = doc(db, "artifacts", appId, "shares", shareId);
        const shareDoc = await getDoc(shareDocRef);
        
        if (!shareDoc.exists()) {
          setError("This share link is invalid or has expired.");
          setLoading(false);
          return;
        }
        
        const shareData = shareDoc.data();
        if (shareData.token !== shareToken) {
          setError("Invalid share token.");
          setLoading(false);
          return;
        }
        
        if (!shareData.isActive) {
          setError("This share link has been deactivated.");
          setLoading(false);
          return;
        }
        
        setOwnerName(shareData.ownerName || "A collector");
        
        // Load items from user's inventory
        const itemsRef = collection(db, "artifacts", appId, "users", shareData.userId, "inventory");
        const q = query(itemsRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        
        const loadedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(loadedItems);
        setLoading(false);
      } catch (err) {
        console.error("Error loading shared collection:", err);
        setError("Failed to load collection. Please try again.");
        setLoading(false);
      }
    };
    
    loadSharedCollection();
  }, [shareId, shareToken]);

  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply filter
    if (filter !== "all") {
      if (filter === "TBD") {
        result = result.filter(i => i.status === "draft" || i.status === "TBD" || i.status === "unprocessed" || i.status === "maybe");
      } else {
        result = result.filter(i => i.status === filter);
      }
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(i => 
        (i.title && i.title.toLowerCase().includes(query)) ||
        (i.maker && i.maker.toLowerCase().includes(query)) ||
        (i.category && i.category.toLowerCase().includes(query)) ||
        (i.style && i.style.toLowerCase().includes(query))
      );
    }
    
    // Apply sort
    switch (sortBy) {
      case "oldest":
        result = [...result].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        break;
      case "value_high":
        result = [...result].sort((a, b) => (Number(b.valuation_high) || 0) - (Number(a.valuation_high) || 0));
        break;
      case "value_low":
        result = [...result].sort((a, b) => (Number(a.valuation_low) || 0) - (Number(b.valuation_low) || 0));
        break;
      case "alpha":
        result = [...result].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "newest":
      default:
        result = [...result].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
    }
    
    return result;
  }, [items, filter, searchQuery, sortBy]);

  const filterStats = useMemo(() => {
    return ["all", "keep", "sell", "TBD"].reduce((acc, f) => {
      const filtered = f === "all" ? items : 
        f === "TBD" ? items.filter(i => i.status === "draft" || i.status === "TBD" || i.status === "unprocessed" || i.status === "maybe") :
        items.filter(i => i.status === f);
      acc[f] = {
        count: filtered.length,
        low: filtered.reduce((sum, i) => sum + (Number(i.valuation_low) || 0), 0),
        high: filtered.reduce((sum, i) => sum + (Number(i.valuation_high) || 0), 0),
      };
      return acc;
    }, {});
  }, [items]);

  // Fun rotating loading messages
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const funLoadingMessages = [
    "Loading collection...",
    "Summoning treasures...",
    "Dusting off the goods...",
    "Polishing the vintage...",
    "Unpacking the goodies...",
    "Consulting the oracle...",
    "Waking the artifacts...",
    "Loading wizard fodder...",
    "Cataloging curiosities...",
    "Brewing the inventory...",
  ];
  
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex(prev => (prev + 1) % funLoadingMessages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-stone-600 font-medium transition-all duration-300">{funLoadingMessages[loadingMsgIndex]}</p>
          <p className="text-stone-400 text-xs mt-2">This might take a moment for large collections</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <EyeOff className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-stone-800 mb-2">Link Not Available</h1>
          <p className="text-stone-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-rose-400" fill="currentColor" />
              </div>
              <div>
                <h1 className="text-lg font-serif font-bold text-stone-900">{ownerName?.split(' ')[0] || ownerName}'s Vintage Items</h1>
                <p className="text-xs text-stone-500 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Shared collection • {items.length} items
                </p>
              </div>
            </div>
            {/* Search & Sort */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 sm:w-40 pl-8 pr-2 py-1.5 text-xs bg-stone-100 border border-transparent focus:border-stone-300 focus:bg-white rounded-lg focus:outline-none transition-all placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-stone-100 border border-transparent focus:border-stone-300 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer hover:bg-stone-200 transition-colors"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="value_high">Value: High→Low</option>
                <option value="value_low">Value: Low→High</option>
                <option value="alpha">A-Z</option>
              </select>
              
              {/* Create Your Own Link */}
              <a 
                href="/"
                className="hidden sm:flex text-xs font-semibold text-rose-600 hover:text-rose-700 items-center gap-1"
              >
                Create yours <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="px-4 py-2 border-t border-stone-50 bg-stone-50/50 overflow-x-auto">
          <div className="max-w-6xl mx-auto flex gap-2">
            {[
              { value: "all", label: "All", icon: Grid },
              { value: "keep", label: "Keep", icon: Lock },
              { value: "sell", label: "Sell", icon: Tag },
              { value: "TBD", label: "TBD", icon: HelpCircle },
            ].map(({ value: f, label: displayName, icon: Icon }) => {
              const stats = filterStats[f];
              const isActive = filter === f;
              
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-shrink-0 transition-all duration-200 ${
                    isActive
                      ? "bg-white rounded-xl shadow-md border border-stone-200 px-3 py-2"
                      : "px-3 py-1.5 rounded-full text-xs font-bold bg-white/80 text-stone-500 border border-stone-200 hover:border-stone-400 hover:bg-white"
                  }`}
                >
                  {isActive ? (
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3 h-3 text-stone-600" />
                        <span className="text-xs font-bold text-stone-800">{displayName}</span>
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{stats.count}</span>
                      </div>
                      {stats.high > 0 && (
                        <span className="text-sm font-bold text-emerald-600 mt-0.5">
                          ${stats.low.toLocaleString()} - ${stats.high.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold whitespace-nowrap flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {displayName} <span className="opacity-60">{stats.count}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-500">No items to display</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item, idx) => (
              <SharedItemCard 
                key={item.id} 
                item={item}
                onExpand={() => setExpandedItemIndex(idx)}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* Expanded Item View */}
      {expandedItemIndex !== null && filteredItems[expandedItemIndex] && (
        <SharedItemCard
          item={filteredItems[expandedItemIndex]}
          isExpandedView={true}
          onClose={() => setExpandedItemIndex(null)}
          onNext={() => setExpandedItemIndex(prev => Math.min(prev + 1, filteredItems.length - 1))}
          onPrev={() => setExpandedItemIndex(prev => Math.max(prev - 1, 0))}
          hasNext={expandedItemIndex < filteredItems.length - 1}
          hasPrev={expandedItemIndex > 0}
        />
      )}
      
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-xs text-stone-500">
          <Sparkles className="w-3 h-3 text-rose-400" />
          <span>Powered by Vintage Wizard</span>
        </div>
      </footer>
    </div>
  );
};

// Simplified card for shared view (read-only)
// Shared Item Card with expanded view, image gallery, and item navigation
const SharedItemCard = ({ item, onExpand, isExpandedView, onClose, onNext, onPrev, hasNext, hasPrev }) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(null); // 'next' | 'prev'
  const [isFullscreen, setIsFullscreen] = useState(false); // Fullscreen image view
  const images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  const displayImage = images.length > 0 ? images[activeImageIdx] : null;

  // Handle item transition with fade effect
  const handleItemTransition = (direction) => {
    if (isTransitioning) return;
    setTransitionDirection(direction);
    setIsTransitioning(true);
    
    // Brief dip to black, then navigate
    setTimeout(() => {
      if (direction === 'next') {
        onNext?.();
      } else {
        onPrev?.();
      }
      // Keep black for a moment after navigation
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 150);
    }, 200);
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isExpandedView) return;
    const handleKeyDown = (e) => {
      // Handle Escape - close fullscreen first, then close modal
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose?.();
        }
        return;
      }
      
      if (isTransitioning) return; // Prevent spam during transition
      
      if (e.key === "ArrowRight") {
        if (activeImageIdx < images.length - 1) {
          setActiveImageIdx(prev => prev + 1);
        } else if (hasNext && !isFullscreen) {
          handleItemTransition('next');
        }
      } else if (e.key === "ArrowLeft") {
        if (activeImageIdx > 0) {
          setActiveImageIdx(prev => prev - 1);
        } else if (hasPrev && !isFullscreen) {
          handleItemTransition('prev');
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpandedView, activeImageIdx, images.length, hasNext, hasPrev, isTransitioning, isFullscreen]);

  // Reset image index when item changes
  useEffect(() => {
    setActiveImageIdx(0);
  }, [item.id]);

  // Simple card view (not expanded)
  if (!isExpandedView) {
    return (
      <div
        onClick={() => onExpand?.(item)}
        className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-stone-100 overflow-hidden cursor-pointer"
      >
        <div className="relative aspect-square bg-stone-100">
          {images[0] ? (
            <img src={images[0]} alt={item.title || "Item"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400">
              <Camera size={32} />
            </div>
          )}
          
          {/* Multi-image indicator */}
          {images.length > 1 && (
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <Layers size={10} /> {images.length}
            </div>
          )}
          
          {/* Status Badge with Icon */}
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
              item.status === "keep" ? "bg-blue-100 text-blue-700" :
              item.status === "sell" ? "bg-emerald-100 text-emerald-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {item.status === "keep" && <Lock size={10} />}
              {item.status === "sell" && <Tag size={10} />}
              {(item.status === "draft" || item.status === "unprocessed" || item.status === "TBD" || !item.status) && <HelpCircle size={10} />}
              {item.status === "draft" || item.status === "unprocessed" ? "TBD" : (item.status || "TBD")}
            </span>
          </div>
          
          {/* Value */}
          {item.valuation_high > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
              <p className="text-white font-bold text-lg drop-shadow-md">
                ${item.valuation_low} - ${item.valuation_high}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-3">
          <h3 className="font-semibold text-stone-800 text-sm line-clamp-1">
            {getDisplayTitle(item)}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
            {[item.maker, item.style].filter(v => v && v.toLowerCase() !== "unknown").join(" • ") || item.category || ""}
          </p>
        </div>
      </div>
    );
  }

  // Expanded view with full gallery
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* Transition Overlay - dip to black when changing items */}
      <div 
        className={`absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-200 flex items-center justify-center ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      >
        {transitionDirection && (
          <div className="text-white/50 text-sm font-medium flex items-center gap-2 animate-pulse">
            {transitionDirection === 'next' ? (
              <>Next item <ChevronRight size={16} /></>
            ) : (
              <><ChevronLeft size={16} /> Previous item</>
            )}
          </div>
        )}
      </div>
      
      {/* Prev Item Button */}
      {hasPrev && !isTransitioning && (
        <button 
          onClick={(e) => { e.stopPropagation(); handleItemTransition('prev'); }}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-sm z-10 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      
      {/* Next Item Button */}
      {hasNext && !isTransitioning && (
        <button 
          onClick={(e) => { e.stopPropagation(); handleItemTransition('next'); }}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-sm z-10 transition-all"
        >
          <ChevronRight size={24} />
        </button>
      )}
      
      <div 
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Fullscreen Image Modal */}
        {isFullscreen && displayImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center cursor-zoom-out"
            onClick={() => setIsFullscreen(false)}
          >
            <img 
              src={displayImage} 
              alt="" 
              className="max-w-full max-h-full object-contain select-none"
            />
            {/* Close hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white/70 text-xs px-3 py-1.5 rounded-full">
              Click anywhere or press Escape to close
            </div>
            {/* Close button */}
            <button 
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            {/* Image navigation in fullscreen */}
            {images.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveImageIdx(prev => prev > 0 ? prev - 1 : images.length - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveImageIdx(prev => prev < images.length - 1 ? prev + 1 : 0); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                  {activeImageIdx + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Image Gallery */}
        <div className="relative aspect-square bg-stone-900">
          {displayImage && (
            <img 
              src={displayImage} 
              alt="" 
              className="w-full h-full object-contain cursor-zoom-in"
              onDoubleClick={() => setIsFullscreen(true)}
              title="Double-click to view fullscreen"
            />
          )}
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
              {activeImageIdx + 1} / {images.length}
            </div>
          )}
          
          {/* Image navigation arrows */}
          {images.length > 1 && (
            <>
              <button 
                onClick={() => setActiveImageIdx(prev => prev > 0 ? prev - 1 : images.length - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setActiveImageIdx(prev => prev < images.length - 1 ? prev + 1 : 0)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 px-4">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === activeImageIdx ? "border-white scale-105" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-stone-900">{getDisplayTitle(item)}</h2>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 shrink-0 ${
              item.status === "keep" ? "bg-blue-100 text-blue-700" :
              item.status === "sell" ? "bg-emerald-100 text-emerald-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {item.status === "keep" && <Lock size={10} />}
              {item.status === "sell" && <Tag size={10} />}
              {(item.status === "draft" || item.status === "unprocessed" || item.status === "TBD" || !item.status) && <HelpCircle size={10} />}
              {item.status === "draft" || item.status === "unprocessed" ? "TBD" : (item.status || "TBD")}
            </span>
          </div>
          
          {item.valuation_high > 0 && (
            <div className="bg-emerald-50 p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-emerald-600 font-semibold">Estimated Value</p>
                {/* Confidence Badge */}
                {item.confidence && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    item.confidence === 'high' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : item.confidence === 'medium' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-red-100 text-red-700'
                  }`}>
                    <Gauge className="w-3 h-3" />
                    {item.confidence}
                  </div>
                )}
              </div>
              <p className="text-xl font-bold text-emerald-700">${item.valuation_low} - ${item.valuation_high}</p>
              {/* Confidence Reason */}
              {item.confidence_reason && (
                <p className="text-xs text-emerald-600/80 mt-1 italic">{item.confidence_reason}</p>
              )}
            </div>
          )}
          
          {item.sales_blurb && (
            <p className="text-sm text-stone-600">{item.sales_blurb}</p>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            {item.maker && item.maker.toLowerCase() !== "unknown" && (
              <div><span className="text-stone-400">Maker:</span> <span className="font-medium">{item.maker}</span></div>
            )}
            {item.era && item.era.toLowerCase() !== "unknown" && (
              <div><span className="text-stone-400">Era:</span> <span className="font-medium">{item.era}</span></div>
            )}
            {item.materials && (
              <div><span className="text-stone-400">Materials:</span> <span className="font-medium">{item.materials}</span></div>
            )}
            {item.condition && (
              <div className="col-span-2"><span className="text-stone-400">Condition:</span> <span className="font-medium">{item.condition}</span></div>
            )}
          </div>
          
          {/* Navigation hint */}
          <p className="text-xs text-stone-400 text-center pt-2 border-t border-stone-100">
            {images.length > 1 && "← → to browse photos • "}
            Use arrow keys to navigate items
          </p>
        </div>
      </div>
    </div>
  );
};

// --- SHARE MODAL ---
const ShareModal = ({ user, items, onClose }) => {
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadOrCreateShare = async () => {
      try {
        const shareDocRef = doc(db, "artifacts", appId, "shares", user.uid);
        const shareDoc = await getDoc(shareDocRef);
        
        if (shareDoc.exists()) {
          setShareData(shareDoc.data());
        } else {
          // Create new share token
          const newShareData = {
            userId: user.uid,
            ownerName: user.displayName || "A collector",
            token: Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16),
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          await setDoc(shareDocRef, newShareData);
          setShareData(newShareData);
        }
      } catch (err) {
        console.error("Error with share:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrCreateShare();
  }, [user]);

  const getShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      share: user.uid,
      token: shareData?.token || "",
      ...(selectedFilter !== "all" && { filter: selectedFilter })
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    playSuccessFeedback();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async () => {
    if (!shareData) return;
    const newIsActive = !shareData.isActive;
    const shareDocRef = doc(db, "artifacts", appId, "shares", user.uid);
    await updateDoc(shareDocRef, { isActive: newIsActive });
    setShareData({ ...shareData, isActive: newIsActive });
  };

  const handleRegenerateToken = async () => {
    if (!confirm("This will invalidate all existing share links. Continue?")) return;
    const newToken = Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
    const shareDocRef = doc(db, "artifacts", appId, "shares", user.uid);
    await updateDoc(shareDocRef, { token: newToken });
    setShareData({ ...shareData, token: newToken });
  };

  const filterCounts = {
    all: items.length,
    sell: items.filter(i => i.status === "sell").length,
    keep: items.filter(i => i.status === "keep").length,
    TBD: items.filter(i => i.status === "draft" || i.status === "TBD" || i.status === "unprocessed" || i.status === "maybe").length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Share2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900">Share Collection</h2>
              <p className="text-xs text-stone-500">Create a public link to your items</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2">
                {shareData?.isActive ? (
                  <Eye className="w-4 h-4 text-emerald-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-stone-400" />
                )}
                <span className="text-sm font-medium text-stone-700">
                  {shareData?.isActive ? "Sharing enabled" : "Sharing disabled"}
                </span>
              </div>
              <button
                onClick={handleToggleActive}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  shareData?.isActive ? "bg-emerald-500" : "bg-stone-300"
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  shareData?.isActive ? "left-7" : "left-1"
                }`} />
              </button>
            </div>
            
            {/* Filter Selection */}
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">
                What to share
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "all", label: "Everything", icon: Grid },
                  { value: "sell", label: "For Sale", icon: Tag },
                  { value: "keep", label: "Keepers", icon: Lock },
                  { value: "TBD", label: "Undecided", icon: HelpCircle },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedFilter(value)}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                      selectedFilter === value
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-stone-200 hover:border-stone-300 text-stone-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                    <span className="ml-auto text-xs opacity-60">{filterCounts[value]}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Share Link */}
            {shareData?.isActive && (
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl()}
                    className="flex-1 p-3 bg-stone-100 rounded-xl text-sm text-stone-600 font-mono truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      copied 
                        ? "bg-emerald-500 text-white" 
                        : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            
            {/* Security Note */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800">
                Anyone with this link can view the selected items. 
                <button onClick={handleRegenerateToken} className="underline ml-1 hover:text-amber-900">
                  Generate new link
                </button> to revoke access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [searchQuery, setSearchQuery] = useState(""); // NEW: Search state
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stagingFiles, setStagingFiles] = useState([]); // Files waiting for user decision
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState("dashboard"); // 'dashboard' | 'scanner'
  const [showShareModal, setShowShareModal] = useState(false);
  // Quick Action Menu state
  const [contextMenu, setContextMenu] = useState(null); // { item, position: { x, y } }
  // Mobile search expand state
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef(null);
  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Export/Share dropdown state (desktop)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const singleInputRef = useRef(null);
  const bulkInputRef = useRef(null);
  
  // Check for share link in URL
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const shareId = urlParams.get('share');
  const shareToken = urlParams.get('token');
  const shareFilter = urlParams.get('filter');
  
  // If viewing a shared collection, show the public view
  if (shareId && shareToken) {
    return <SharedCollectionView shareId={shareId} shareToken={shareToken} filterParam={shareFilter} />;
  }

  const handleQuickAnalyze = async (item) => {
      try {
        const analysis = await analyzeImagesWithGemini(
          item.images || [item.image],
          item.userNotes || "",
          item
        );
        await updateDoc(
          doc(db, "artifacts", appId, "users", user.uid, "inventory", item.id),
          { ...analysis, aiLastRun: new Date().toISOString() }
        );
      } catch (err) {
        console.error("Quick analysis failed", err);
        alert("Analysis failed. Please check your Gemini API Key.");
      }
  };

  const handleToggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Batch processing state
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, message: '' });
  
  // Fun messages for batch processing
  const batchMessages = [
    "Teaching AI about vintage treasures...",
    "Consulting the antique oracles...",
    "Dusting off the appraisal guides...",
    "Channeling grandma's estate wisdom...",
    "Decoding maker's marks...",
    "Cross-referencing auction archives...",
    "Summoning the ghost of Antiques Roadshow...",
    "Polishing up the valuations...",
    "Asking the vintage gods...",
    "Running through the time machine...",
  ];

  const handleBatchAnalyze = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    
    const itemsToProcess = items.filter(item => selectedIds.has(item.id));
    const eligibleItems = itemsToProcess.filter(item => 
      item.images && item.images.length > 0
    );
    
    if (eligibleItems.length === 0) {
      setIsBatchProcessing(false);
      alert("No items with images to analyze. Add photos first!");
      return;
    }
    
    setBatchProgress({ current: 0, total: eligibleItems.length, message: batchMessages[0] });
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < eligibleItems.length; i++) {
      const item = eligibleItems[i];
      // Rotate through fun messages
      setBatchProgress({ 
        current: i + 1, 
        total: eligibleItems.length, 
        message: batchMessages[i % batchMessages.length] 
      });
      
      try {
        const analysis = await analyzeImagesWithGemini(
          item.images,
          item.userNotes || "",
          item
        );
        await updateDoc(
          doc(db, "artifacts", appId, "users", user.uid, "inventory", item.id),
          { ...analysis, aiLastRun: new Date().toISOString() }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to analyze item ${item.id}`, err);
        failCount++;
      }
    }
    
    setIsBatchProcessing(false);
    setBatchProgress({ current: 0, total: 0, message: '' });
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    playSuccessFeedback();
    
    // Show result toast
    const resultMsg = failCount > 0 
      ? `✨ Analyzed ${successCount} items (${failCount} failed)`
      : `✨ Successfully analyzed ${successCount} items!`;
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-4 py-2 rounded-xl shadow-xl text-sm font-medium z-[100] animate-in fade-in slide-in-from-bottom-4';
    toast.textContent = resultMsg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} items? This cannot be undone.`)) return;
    
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "inventory", id));
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    playSuccessFeedback();
  };

  // Batch status change handler
  const handleBatchStatusChange = async (newStatus) => {
    if (selectedIds.size === 0) return;
    
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await updateDoc(
        doc(db, "artifacts", appId, "users", user.uid, "inventory", id),
        { status: newStatus }
      );
    }
    
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    playSuccessFeedback();
    
    // Show toast
    const statusLabels = { keep: 'Keep', sell: 'Sell', TBD: 'TBD' };
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-4 py-2 rounded-xl shadow-xl text-sm font-medium z-[100] animate-in fade-in slide-in-from-bottom-4';
    toast.textContent = `✓ ${ids.length} items marked as ${statusLabels[newStatus] || newStatus}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "inventory"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setDataLoading(false);
      },
      (error) => {
         console.error(error);
         setDataLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleFileSelect = (e, mode) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (mode === 'single' && files.length > 4) {
      alert("Select up to 4 photos to start. You can add more later on the item page!");
      e.target.value = ""; // Reset
      return;
    }

    setStagingFiles(files);
    
    if (mode === 'bulk') {
       setView('staging'); // Go to smart stacker
    }
  };

  // Handle single item upload (from Modal)
  const handleConfirmSingleUpload = async (actionType) => {
     // Re-use existing logic but specialized for single
     await handleConfirmUpload('single', actionType, [stagingFiles]);
  };

  // Handle bulk stack upload (from Staging Area)
  const handleConfirmBulkUpload = async (stacks) => {
     // stacks is Array<{ id, files: File[] }>
     // Transform to format handleConfirmUpload expects: Array<File[]>
     const fileGroups = stacks.map(s => s.files);
     await handleConfirmUpload('bulk', 'process_batch', fileGroups);
     setView('dashboard');
  };

  const handleConfirmUpload = async (uploadMode, actionType = "analyze_now", fileGroups = []) => {
    if (!user) return;
    // For single mode, fileGroups might be passed or use stagingFiles. 
    // To unify: always pass fileGroups.
    
    // Single Mode: fileGroups = [ [file1, file2] ] (One group)
    // Bulk Mode: fileGroups = [ [f1, f2], [f3], [f4, f5] ] (Multiple groups)

    const groupsToProcess = fileGroups.length > 0 ? fileGroups : [stagingFiles];
    if (groupsToProcess.length === 0 || groupsToProcess[0].length === 0) return;

    const shouldAutoAnalyze = uploadMode === "single" && actionType === "analyze_now";
    
    setIsUploading(true);
    if (shouldAutoAnalyze) setIsProcessing(true); 
    setStagingFiles([]); 

    try {
      // Process each group as an Item
      for (const groupFiles of groupsToProcess) {
        // Step 1: Create a placeholder document first to get the ID
        const docRef = await addDoc(
          collection(db, "artifacts", appId, "users", user.uid, "inventory"),
          {
            images: [],
            image: "",
            status: "TBD",
            title: "Uploading...",
            category: "",
            materials: "",
            maker: "",
            style: "",
            markings: "",
            condition: "",
            userNotes: "",
            timestamp: serverTimestamp(),
            valuation_low: 0,
            valuation_high: 0,
          }
        );

        // Step 2: Upload images to Firebase Storage and get URLs
        const imageUrls = [];
        for (let i = 0; i < groupFiles.length; i++) {
          const file = groupFiles[i];
          const url = await uploadImageToStorage(file, user.uid, docRef.id, i);
          imageUrls.push(url);
        }

        // Step 3: Generate base64 for AI analysis if needed (lower quality)
        let analysisResult = {};
        if (shouldAutoAnalyze) {
          try {
            // Create base64 versions for AI analysis only
            const base64Images = [];
            for (const file of groupFiles) {
              base64Images.push(await compressImage(file, false)); // false = return base64
            }
            analysisResult = await analyzeImagesWithGemini(base64Images, "");
          } catch (aiError) {
            console.error("Auto-analysis failed:", aiError);
            alert(`Item uploaded, but AI analysis failed: ${aiError.message}`);
          }
        }

        // Step 4: Update the document with Storage URLs and analysis
        await updateDoc(docRef, {
          images: imageUrls,
          image: imageUrls[0] || "",
          title: analysisResult.title || "",
          ...analysisResult,
          aiLastRun: shouldAutoAnalyze && analysisResult.title ? new Date().toISOString() : null
        });

        if (uploadMode === "single" && actionType === "edit_first") {
          setSelectedItem({
            id: docRef.id,
            images: imageUrls,
            image: imageUrls[0] || "",
            status: "TBD",
            title: "",
            category: "",
            materials: "",
            maker: "",
            style: "",
            markings: "",
            condition: "",
            userNotes: "",
            valuation_low: 0,
            valuation_high: 0,
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert(`Upload failed: ${error.message}`);
    }
    setIsUploading(false);
    setIsProcessing(false);
  };

  const handleUpdateItem = async (updatedItem) => {
    if (user)
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          user.uid,
          "inventory",
          updatedItem.id
        ),
        (({ id, ...data }) => data)(updatedItem)
      );
  };
  const handleDeleteItem = async (itemId) => {
    if (user)
      await deleteDoc(
        doc(db, "artifacts", appId, "users", user.uid, "inventory", itemId)
      );
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    
    // Helper: Generate optimized title (80 char limit for eBay, no "Unknown")
    const generateOptimizedTitle = (item) => {
      const parts = [
        item.maker && item.maker.toLowerCase() !== "unknown" ? item.maker : null,
        item.style && item.style.toLowerCase() !== "unknown" ? item.style : null,
        item.title ? item.title.replace(/^Unknown\s*/i, "").trim() : null,
        item.era && item.era.toLowerCase() !== "unknown" ? item.era : null,
        item.materials
      ].filter(Boolean);
      const uniqueParts = [...new Set(parts.join(" ").split(" "))];
      return uniqueParts.join(" ").substring(0, 80) || "Vintage Item";
    };
    
    // Helper: Generate listing description (uses sales_blurb as hook, no "RARE FIND")
    const generateDescription = (item) => {
      const hook = item.sales_blurb || "";
      
      // Helper to check if a value is meaningful
      const isReal = (val) => {
        if (!val) return false;
        const lower = val.toLowerCase().trim();
        return lower !== "unknown" && lower !== "vintage" && lower !== "see photos" && 
               lower !== "contemporary" && lower !== "modern" && lower !== "n/a" && lower.length > 0;
      };
      
      // Build details - only include fields we actually know
      const details = [];
      if (isReal(item.maker)) details.push(`- Maker/Brand: ${item.maker}`);
      if (isReal(item.style)) details.push(`- Style/Period: ${item.style}`);
      if (isReal(item.era)) details.push(`- Era: ${item.era}`);
      if (isReal(item.materials)) details.push(`- Material: ${item.materials}`);
      if (item.markings) details.push(`- Markings: ${item.markings}`);
      
      let desc = hook;
      if (details.length > 0) {
        desc += `\n\nDETAILS:\n${details.join("\n")}`;
      }
      if (isReal(item.condition)) {
        desc += `\n\nCONDITION:\n${item.condition}`;
      }
      if (item.userNotes) {
        desc += `\n\nNOTES:\n${item.userNotes}`;
      }
      desc += "\n\nMessage for measurements or more details!";
      
      return desc.trim();
    };
    
    // Helper: Generate SEO tags (filter out "unknown")
    const generateTags = (item) => {
      const baseTags = [item.category, item.style, item.era, "vintage", "retro", item.maker]
        .filter(t => t && t.toLowerCase() !== "unknown");
      if (item.search_terms_broad) {
        baseTags.push(...item.search_terms_broad.split(" ").filter(t => t.toLowerCase() !== "unknown"));
      }
      return [...new Set(baseTags)].map(t => `#${t.replace(/\s+/g, '')}`).join(" ");
    };
    
    // Helper: Generate SKU (consistent per item using ID)
    const generateSKU = (item) => {
      // Use item ID to generate a consistent SKU, or create a random one
      if (item.id) {
        return item.id.substring(0, 8).toUpperCase();
      }
      return Math.random().toString(36).substr(2, 8).toUpperCase();
    };
    
    const headers = [
      "Title",
      "Category",
      "Era",
      "Maker",
      "Style",
      "Materials",
      "Condition",
      "Markings",
      "Low Estimate",
      "High Estimate",
      "Notes",
      "Status",
      "SKU",
      "Optimized Title",
      "Listing Description",
      "SEO Tags",
    ];
    const rows = items.map((item) => [
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${(item.category || "").replace(/"/g, '""')}"`,
      `"${(item.era || "").replace(/"/g, '""')}"`,
      `"${(item.maker || "").replace(/"/g, '""')}"`,
      `"${(item.style || "").replace(/"/g, '""')}"`,
      `"${(item.materials || "").replace(/"/g, '""')}"`,
      `"${(item.condition || "").replace(/"/g, '""')}"`,
      `"${(item.markings || "").replace(/"/g, '""')}"`,
      item.valuation_low || 0,
      item.valuation_high || 0,
      `"${(item.userNotes || "").replace(/"/g, '""')}"`,
      item.status,
      generateSKU(item),
      `"${generateOptimizedTitle(item).replace(/"/g, '""')}"`,
      `"${generateDescription(item).replace(/"/g, '""')}"`,
      `"${generateTags(item).replace(/"/g, '""')}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const link = document.createElement("a");
    link.setAttribute(
      "href",
      URL.createObjectURL(
        new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      )
    );
    link.setAttribute(
      "download",
      `vintage_inventory_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick status change handler (for context menu)
  const handleQuickStatusChange = async (itemId, newStatus) => {
    if (!user) return;
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "users", user.uid, "inventory", itemId),
        { status: newStatus }
      );
      playSuccessFeedback();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Context menu handler
  const handleOpenContextMenu = (item, position) => {
    setContextMenu({ item, position });
  };

  // Helper: Load image as base64 for PDF (preserves aspect ratio)
  const loadImageForPDF = (url) => {
    return new Promise((resolve) => {
      if (!url) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxSize = 300;
          let width = img.width;
          let height = img.height;
          // Scale down while preserving aspect ratio
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
          // Return both data URL and dimensions for aspect ratio
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: img.width,
            height: img.height
          });
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Helper: Calculate image dimensions preserving aspect ratio
  const fitImageToBox = (imgWidth, imgHeight, boxWidth, boxHeight) => {
    const imgRatio = imgWidth / imgHeight;
    const boxRatio = boxWidth / boxHeight;
    
    let finalWidth, finalHeight;
    if (imgRatio > boxRatio) {
      // Image is wider - fit to width
      finalWidth = boxWidth;
      finalHeight = boxWidth / imgRatio;
    } else {
      // Image is taller - fit to height
      finalHeight = boxHeight;
      finalWidth = boxHeight * imgRatio;
    }
    return { width: finalWidth, height: finalHeight };
  };

  // Helper: Wrap text to fit width
  const wrapText = (pdf, text, maxWidth) => {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = pdf.getTextWidth(testLine);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // PDF Export for Insurance/Records - Professional Design with Images
  const handleExportPDF = async () => {
    if (items.length === 0) return;
    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      
      // === COVER PAGE ===
      // Light header bar (ink-friendly)
      pdf.setFillColor(245, 245, 244); // stone-100
      pdf.rect(0, 0, pageWidth, 55, 'F');
      pdf.setDrawColor(214, 211, 209); // stone-300
      pdf.line(0, 55, pageWidth, 55);
      
      // Title
      pdf.setFontSize(28);
      pdf.setTextColor(28, 25, 23); // stone-900
      pdf.text("Vintage Collection", margin, 28);
      pdf.setFontSize(14);
      pdf.setTextColor(120, 113, 108); // stone-500
      pdf.text("Inventory & Valuation Report", margin, 40);
      
      // Owner info
      pdf.setFontSize(10);
      pdf.setTextColor(87, 83, 78); // stone-600
      pdf.text(`Prepared for: ${user?.displayName || user?.email || 'Collection Owner'}`, margin, 50);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}`, pageWidth - margin, 50, { align: 'right' });
      
      // Summary stats
      const totalLow = items.reduce((sum, i) => sum + (Number(i.valuation_low) || 0), 0);
      const totalHigh = items.reduce((sum, i) => sum + (Number(i.valuation_high) || 0), 0);
      const sellItems = items.filter(i => i.status === 'sell');
      const keepItems = items.filter(i => i.status === 'keep');
      const tbdItems = items.filter(i => i.status !== 'sell' && i.status !== 'keep');
      
      let yPos = 65;
      
      // Stats cards
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(214, 211, 209);
      pdf.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'FD');
      
      pdf.setFontSize(9);
      pdf.setTextColor(120, 113, 108);
      pdf.text("TOTAL ITEMS", margin + 8, yPos + 10);
      pdf.setFontSize(20);
      pdf.setTextColor(28, 25, 23);
      pdf.text(`${items.length}`, margin + 8, yPos + 24);
      
      pdf.setFontSize(9);
      pdf.setTextColor(120, 113, 108);
      pdf.text("ESTIMATED VALUE RANGE", margin + 50, yPos + 10);
      pdf.setFontSize(16);
      pdf.setTextColor(180, 83, 9); // amber
      pdf.text(`$${totalLow.toLocaleString()} — $${totalHigh.toLocaleString()}`, margin + 50, yPos + 24);
      
      pdf.setFontSize(9);
      pdf.setTextColor(120, 113, 108);
      pdf.text("STATUS", pageWidth - margin - 50, yPos + 10);
      pdf.setFontSize(10);
      pdf.setTextColor(28, 25, 23);
      pdf.text(`Keep: ${keepItems.length}  •  Sell: ${sellItems.length}  •  TBD: ${tbdItems.length}`, pageWidth - margin - 50, yPos + 20);
      
      yPos += 45;
      
      // === SUMMARY TABLES BY STATUS ===
      const renderStatusTable = async (statusItems, statusName, statusColor, bgColor) => {
        if (statusItems.length === 0) return;
        
        // Check if we need new page
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = margin;
        }
        
        // Section header
        pdf.setFillColor(...bgColor);
        pdf.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(...statusColor);
        pdf.text(`${statusName.toUpperCase()} (${statusItems.length} items)`, margin + 4, yPos + 7);
        
        const statusLow = statusItems.reduce((sum, i) => sum + (Number(i.valuation_low) || 0), 0);
        const statusHigh = statusItems.reduce((sum, i) => sum + (Number(i.valuation_high) || 0), 0);
        pdf.text(`$${statusLow.toLocaleString()} - $${statusHigh.toLocaleString()}`, pageWidth - margin - 4, yPos + 7, { align: 'right' });
        
        yPos += 14;
        
        // Table header
        pdf.setFontSize(7);
        pdf.setTextColor(120, 113, 108);
        pdf.text("PHOTO", margin + 2, yPos);
        pdf.text("ITEM", margin + 22, yPos);
        pdf.text("VALUE", pageWidth - margin - 2, yPos, { align: 'right' });
        yPos += 3;
        
        // Table rows
        for (const item of statusItems) {
          if (yPos > pageHeight - 25) {
            pdf.addPage();
            yPos = margin;
          }
          
          const rowHeight = 18;
          
          // Row background (alternating)
          pdf.setFillColor(252, 252, 251);
          pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
          pdf.setDrawColor(240, 240, 240);
          pdf.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight);
          
          // Hero image thumbnail
          const heroUrl = item.images?.[0] || item.image;
          if (heroUrl) {
            try {
              const imgData = await loadImageForPDF(heroUrl);
              if (imgData) {
                const dims = fitImageToBox(imgData.width, imgData.height, 14, 14);
                const imgX = margin + 2 + (14 - dims.width) / 2;
                const imgY = yPos + 2 + (14 - dims.height) / 2;
                pdf.addImage(imgData.dataUrl, 'JPEG', imgX, imgY, dims.width, dims.height, undefined, 'FAST');
              }
            } catch (e) {}
          }
          
          // Title (truncated)
          pdf.setFontSize(9);
          pdf.setTextColor(28, 25, 23);
          const title = getDisplayTitle(item).substring(0, 50) + (getDisplayTitle(item).length > 50 ? '...' : '');
          pdf.text(title, margin + 22, yPos + 8);
          
          // Category
          pdf.setFontSize(7);
          pdf.setTextColor(120, 113, 108);
          pdf.text(item.category || 'Other', margin + 22, yPos + 14);
          
          // Value
          if (item.valuation_high > 0) {
            pdf.setFontSize(9);
            pdf.setTextColor(21, 128, 61);
            pdf.text(`$${item.valuation_low || 0} - $${item.valuation_high}`, pageWidth - margin - 2, yPos + 10, { align: 'right' });
          }
          
          yPos += rowHeight;
        }
        
        yPos += 8;
      };
      
      // Render status tables
      await renderStatusTable(sellItems, 'Sell', [180, 83, 9], [255, 251, 235]); // amber
      await renderStatusTable(keepItems, 'Keep', [22, 163, 74], [236, 253, 245]); // green
      await renderStatusTable(tbdItems, 'Undecided / TBD', [59, 130, 246], [239, 246, 255]); // blue
      
      // Footer on summary page
      pdf.setFontSize(8);
      pdf.setTextColor(168, 162, 158);
      pdf.text("This report is for insurance, estate planning, and record-keeping purposes.", pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // === ITEM DETAIL PAGES (2 items per page) ===
      const itemsPerPage = 2;
      const itemHeight = (pageHeight - margin * 2 - 10) / itemsPerPage; // Height for each item block
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
        
        // Load images for this item
        const loadedImages = await Promise.all(
          itemImages.slice(0, 4).map(url => loadImageForPDF(url))
        );
        const validImages = loadedImages.filter(Boolean);
        
        // Check if we need a new page (every 2 items or first item)
        const positionOnPage = i % itemsPerPage;
        if (positionOnPage === 0) {
          pdf.addPage();
        }
        
        // Calculate Y position for this item
        const itemStartY = margin + (positionOnPage * itemHeight);
        yPos = itemStartY;
        
        // Draw separator line between items (not for first item on page)
        if (positionOnPage > 0) {
          pdf.setDrawColor(229, 229, 229);
          pdf.line(margin, itemStartY - 5, pageWidth - margin, itemStartY - 5);
        }
        
        // === ITEM HEADER: Number + Status ===
        pdf.setFontSize(8);
        pdf.setTextColor(168, 162, 158);
        pdf.text(`#${i + 1}`, margin, yPos + 4);
        
        // Status badge
        const statusColors = {
          keep: { fill: [236, 253, 245], text: [22, 163, 74] },
          sell: { fill: [255, 251, 235], text: [180, 83, 9] },
          TBD: { fill: [239, 246, 255], text: [59, 130, 246] },
          draft: { fill: [250, 250, 249], text: [120, 113, 108] },
        };
        const statusStyle = statusColors[item.status] || statusColors.draft;
        pdf.setFillColor(...statusStyle.fill);
        pdf.roundedRect(margin + 12, yPos, 14, 6, 1, 1, 'F');
        pdf.setFontSize(6);
        pdf.setTextColor(...statusStyle.text);
        pdf.text((item.status || 'TBD').toUpperCase(), margin + 19, yPos + 4.5, { align: 'center' });
        
        yPos += 10;
        
        // === LEFT COLUMN: Photo (left-justified) ===
        const imgColWidth = 45;
        const imgHeight = 50;
        
        if (validImages.length > 0) {
          // Hero image - LEFT justified, preserve aspect ratio
          try {
            const heroImg = validImages[0];
            const dims = fitImageToBox(heroImg.width, heroImg.height, imgColWidth, imgHeight - (validImages.length > 1 ? 12 : 0));
            // Left-justified: imgX = margin (no centering)
            pdf.addImage(heroImg.dataUrl, 'JPEG', margin, yPos, dims.width, dims.height, undefined, 'MEDIUM');
          } catch (e) {}
          
          // Thumbnail strip below hero (up to 3 more)
          if (validImages.length > 1) {
            const thumbY = yPos + imgHeight - 10;
            const thumbSize = 10;
            const thumbGap = 2;
            for (let j = 1; j < Math.min(validImages.length, 4); j++) {
              const thumb = validImages[j];
              const thumbX = margin + (j - 1) * (thumbSize + thumbGap);
              try {
                const tDims = fitImageToBox(thumb.width, thumb.height, thumbSize, thumbSize);
                pdf.addImage(thumb.dataUrl, 'JPEG', thumbX, thumbY, tDims.width, tDims.height, undefined, 'FAST');
              } catch (e) {}
            }
          }
        }
        
        // === RIGHT COLUMN: Title + Value + Details ===
        const detailsX = margin + imgColWidth + 6;
        const detailsWidth = contentWidth - imgColWidth - 6;
        let detailY = yPos;
        
        // Title (bold, larger)
        pdf.setFontSize(11);
        pdf.setTextColor(28, 25, 23);
        const titleLines = wrapText(pdf, getDisplayTitle(item), detailsWidth);
        titleLines.slice(0, 2).forEach((line, idx) => {
          pdf.text(line, detailsX, detailY + 4 + idx * 4.5);
        });
        detailY += Math.min(titleLines.length, 2) * 4.5 + 6;
        
        // Category & Era (smaller, grey)
        pdf.setFontSize(8);
        pdf.setTextColor(120, 113, 108);
        const metaText = [item.category, item.era].filter(Boolean).join(' • ');
        pdf.text(metaText || 'Uncategorized', detailsX, detailY);
        detailY += 6;
        
        // === VALUATION LINE (inline, no box) ===
        if (item.valuation_high > 0) {
          pdf.setFontSize(11);
          pdf.setTextColor(21, 128, 61); // green
          pdf.text(`$${item.valuation_low || 0} — $${item.valuation_high}`, detailsX, detailY + 1);
          
          // Confidence inline
          if (item.confidence) {
            const confColors = { high: [22, 163, 74], medium: [217, 119, 6], low: [220, 38, 38] };
            const color = confColors[item.confidence] || confColors.medium;
            pdf.setFontSize(7);
            pdf.setTextColor(...color);
            const valWidth = pdf.getTextWidth(`$${item.valuation_low || 0} — $${item.valuation_high}`);
            pdf.text(`(${item.confidence})`, detailsX + valWidth + 3, detailY + 1);
          }
          detailY += 6;
          
          // Confidence reasoning (smaller, below value)
          if (item.confidence_reason) {
            pdf.setFontSize(7);
            pdf.setTextColor(120, 113, 108);
            const reasonLines = wrapText(pdf, item.confidence_reason, detailsWidth);
            pdf.text(reasonLines[0] || '', detailsX, detailY);
            detailY += 4;
          }
        }
        
        detailY += 2;
        
        // === DETAILS (no grey box, compact grid) ===
        const fields = [
          { label: 'Maker', value: item.maker },
          { label: 'Style', value: item.style },
          { label: 'Materials', value: item.materials },
          { label: 'Markings', value: item.markings },
        ].filter(f => f.value && f.value.toLowerCase() !== 'unknown');
        
        // Details inline (no grey box, compact)
        if (fields.length > 0) {
          pdf.setFontSize(7);
          pdf.setTextColor(120, 113, 108);
          // Show fields inline: "Maker: X • Materials: Y"
          const fieldStrings = fields.slice(0, 4).map(f => `${f.label}: ${f.value.substring(0, 25)}${f.value.length > 25 ? '...' : ''}`);
          const fieldLine = fieldStrings.join(' • ');
          const fieldLines = wrapText(pdf, fieldLine, detailsWidth);
          fieldLines.slice(0, 2).forEach((line, idx) => {
            pdf.text(line, detailsX, detailY + idx * 3.5);
          });
          detailY += Math.min(fieldLines.length, 2) * 3.5 + 2;
        }
        
        // Condition (compact, inline)
        if (item.condition) {
          pdf.setFontSize(7);
          pdf.setTextColor(168, 162, 158);
          const condText = `Cond: ${item.condition.substring(0, 70)}${item.condition.length > 70 ? '...' : ''}`;
          const condLines = wrapText(pdf, condText, detailsWidth);
          pdf.text(condLines[0] || '', detailsX, detailY);
          detailY += 4;
        }
        
        // Description (compact, 2 lines max)
        if (item.sales_blurb || item.reasoning) {
          const blurbText = item.sales_blurb || item.reasoning;
          pdf.setFontSize(7);
          pdf.setTextColor(87, 83, 78);
          const blurbLines = wrapText(pdf, blurbText, detailsWidth);
          blurbLines.slice(0, 2).forEach((line, idx) => {
            pdf.text(line, detailsX, detailY + idx * 3.5);
          });
        }
        
        // Page footer only on bottom of page (after last item on page)
        if (positionOnPage === itemsPerPage - 1 || i === items.length - 1) {
          pdf.setFontSize(7);
          pdf.setTextColor(168, 162, 158);
          pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        }
      }
      
      // Save
      pdf.save(`vintage_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
      playSuccessFeedback();
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filteredItems = useMemo(
    () => {
      let result = items;
      
      // Apply filter
      if (filter !== "all") {
        result = result.filter((i) => {
           if (filter === "TBD") return i.status === "draft" || i.status === "TBD" || i.status === "unprocessed" || i.status === "maybe";
           return i.status === filter;
        });
      }
      
      // Apply search (searches title, maker, category, style)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        result = result.filter((i) => {
          const searchFields = [
            i.title,
            i.maker,
            i.category,
            i.style,
            i.materials,
            i.search_terms,
            i.search_terms_broad
          ].filter(Boolean).join(" ").toLowerCase();
          return searchFields.includes(query);
        });
      }

      return result.sort((a, b) => {
        switch (sortBy) {
          case "date-desc":
            return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
          case "date-asc":
            return (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0);
          case "value-desc":
            return (Number(b.valuation_high) || 0) - (Number(a.valuation_high) || 0);
          case "value-asc":
            return (Number(a.valuation_high) || 0) - (Number(b.valuation_high) || 0);
          case "alpha-asc":
            return (a.title || "").localeCompare(b.title || "");
          case "category-asc":
            return (a.category || "").localeCompare(b.category || "");
          case "status-asc":
            // Order: keep (1), sell (2), TBD/draft/other (3)
            const statusOrder = { keep: 1, sell: 2, TBD: 3, draft: 3, unprocessed: 3, maybe: 3 };
            const aOrder = statusOrder[a.status] || 3;
            const bOrder = statusOrder[b.status] || 3;
            return aOrder - bOrder;
          default:
            return 0;
        }
      });
    },
    [items, filter, sortBy, searchQuery]
  );

  const totalLowEst = useMemo(
    () =>
      filteredItems.reduce(
        (acc, curr) => acc + (Number(curr.valuation_low) || 0),
        0
      ),
    [filteredItems]
  );
  const totalHighEst = useMemo(
    () =>
      filteredItems.reduce(
        (acc, curr) => acc + (Number(curr.valuation_high) || 0),
        0
      ),
    [filteredItems]
  );

  // Calculate stats for each filter category
  const filterStats = useMemo(() => {
    const getItemsForFilter = (f) => {
      if (f === "all") return items;
      if (f === "TBD") return items.filter(i => i.status === "draft" || i.status === "TBD" || i.status === "unprocessed" || i.status === "maybe");
      return items.filter(i => i.status === f);
    };
    
    return ["all", "keep", "sell", "TBD"].reduce((acc, f) => {
      const filtered = getItemsForFilter(f);
      acc[f] = {
        count: filtered.length,
        low: filtered.reduce((sum, i) => sum + (Number(i.valuation_low) || 0), 0),
        high: filtered.reduce((sum, i) => sum + (Number(i.valuation_high) || 0), 0),
      };
      return acc;
    }, {});
  }, [items]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-4">
        <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center animate-pulse">
          <Sparkles className="w-7 h-7 text-rose-400" />
        </div>
        <p className="text-stone-500 text-sm">Waking up the AI...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-900 pb-32">
      {/* --- Header --- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-30 overflow-visible">
        {/* Row 1: Logo + Search + Actions */}
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center shadow-sm">
               <Sparkles className="w-4 h-4 text-rose-400" fill="currentColor" />
            </div>
            <h1 className="text-base font-serif font-bold text-stone-900 tracking-tight hidden lg:block">
              {user.displayName?.split(' ')[0] || "My"}'s Vintage Wizard
            </h1>
          </div>
          
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={`md:hidden p-2 rounded-lg transition-all ${
              isMobileSearchOpen || searchQuery 
                ? 'bg-rose-100 text-rose-600' 
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            <Search className="w-5 h-5" />
            {searchQuery && !isMobileSearchOpen && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {/* Search Bar - Hidden on mobile unless expanded */}
          <div className={`${isMobileSearchOpen ? 'flex' : 'hidden'} md:flex flex-1 max-w-xs relative`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-stone-100 border border-transparent focus:border-stone-300 focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all placeholder:text-stone-400"
              autoFocus={isMobileSearchOpen}
            />
            {(searchQuery || isMobileSearchOpen) && (
              <button 
                onClick={() => { 
                  setSearchQuery(""); 
                  if (isMobileSearchOpen && !searchQuery) setIsMobileSearchOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
             {/* Add Item (Single) - with Premium Tooltip */}
             <div className="relative group/tooltip">
            <button
                    onClick={() => singleInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-stone-900 text-white hover:bg-stone-800 hover:shadow-md hover:scale-[1.02] shadow-sm active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                 >
                    <ImagePlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add</span>
            </button>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-stone-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 delay-300 pointer-events-none z-50">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45" />
                  Add single item (1-4 photos)
                </div>
              </div>

             {/* Bulk Upload - with Premium Tooltip */}
             <div className="relative group/tooltip">
              <button
                    onClick={() => bulkInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-white text-stone-700 hover:bg-stone-50 hover:shadow-md hover:scale-[1.02] border border-stone-200 shadow-sm active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                 >
                    <Images className="w-4 h-4" />
                    <span className="hidden sm:inline">Bulk</span>
                </button>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-stone-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 delay-300 pointer-events-none z-50">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45" />
                  Bulk upload & organize photos
                </div>
             </div>

             {/* Multi-Select Toggle - with Premium Tooltip */}
             <div className="relative group/tooltip">
                <button
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border hover:shadow-md hover:scale-[1.02] active:scale-95 ${
                      isSelectionMode 
                        ? "bg-violet-100 text-violet-700 border-violet-200 shadow-sm" 
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                 >
                    <ListChecks className={`w-4 h-4 ${isSelectionMode ? "stroke-[2.5]" : ""}`} />
                </button>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-stone-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 delay-300 pointer-events-none z-50">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45" />
                  {isSelectionMode ? "Exit multi-select" : "Select multiple items"}
                </div>
             </div>

             {/* Divider - desktop only */}
             <div className="hidden md:block w-px h-6 bg-stone-200 mx-1" />

             {/* Share & Export Dropdown - desktop only */}
             <div className="hidden md:block relative" ref={exportMenuRef}>
                <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    disabled={items.length === 0}
                    className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                      isExportMenuOpen 
                        ? 'bg-stone-100 text-stone-700' 
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                    } disabled:opacity-40`}
                >
                    <Upload className="w-4 h-4" />
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isExportMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Share & Export
                    </div>
                    
                    <button
                      onClick={() => { setShowShareModal(true); setIsExportMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 transition-all duration-150 group/item"
                    >
                      <div className="w-7 h-7 rounded-md bg-rose-50 group-hover/item:bg-rose-100 flex items-center justify-center transition-colors">
                        <Share2 className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <div>
                        <span className="block">Share Collection</span>
                        <span className="text-[10px] text-stone-400">Create a public link</span>
                      </div>
                    </button>
                    
                    <div className="h-px bg-stone-100 my-1" />
                    
                    <button
                      onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 transition-all duration-150 group/item"
                    >
                      <div className="w-7 h-7 rounded-md bg-emerald-50 group-hover/item:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <span className="block">Export CSV</span>
                        <span className="text-[10px] text-stone-400">Download spreadsheet</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }}
                      disabled={isGeneratingPDF}
                      className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 transition-all duration-150 group/item disabled:opacity-50"
                    >
                      <div className="w-7 h-7 rounded-md bg-blue-50 group-hover/item:bg-blue-100 flex items-center justify-center transition-colors">
                        {isGeneratingPDF ? (
                          <Loader className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <span className="block">Export PDF Report</span>
                        <span className="text-[10px] text-stone-400">For insurance & records</span>
                      </div>
                    </button>
                  </div>
                )}
             </div>

             {/* Profile Dropdown */}
             <div className="relative group cursor-pointer ml-1 z-50">
                <div className="transition-all duration-200 hover:scale-105 hover:shadow-md rounded-full">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                      className="w-8 h-8 rounded-full border-2 border-stone-200 shadow-sm transition-all duration-200 group-hover:border-stone-400"
                  />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center transition-all duration-200 group-hover:bg-stone-300">
                    <UserCircle className="w-5 h-5 text-stone-400" />
                  </div>
                )}
                </div>
               {/* Dropdown Menu */}
               <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-[100]">
                 <div className="w-52 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                   {/* User Info Header */}
                   <div className="px-3 py-2.5 bg-gradient-to-r from-stone-50 to-stone-100 rounded-lg mb-1.5">
                    <p className="text-sm font-bold text-stone-900 truncate">{user.displayName}</p>
                    <p className="text-[10px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                      <Cloud className="w-2.5 h-2.5 text-emerald-500" /> Synced • {user.email}
                    </p>
                   </div>
                   
                   {/* Menu Items */}
                   <button
                     onClick={() => setShowShareModal(true)}
                     disabled={items.length === 0}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 disabled:opacity-50 transition-all duration-150 group/item"
                   >
                     <div className="w-7 h-7 rounded-md bg-rose-50 group-hover/item:bg-rose-100 flex items-center justify-center transition-colors">
                       <Share2 className="w-3.5 h-3.5 text-rose-600" />
                     </div>
                     <div>
                       <span className="block">Share Collection</span>
                       <span className="text-[10px] text-stone-400">Create a public link</span>
                </div>
              </button>
                   
                   <button
                     onClick={handleExportCSV}
                     disabled={items.length === 0}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 disabled:opacity-50 transition-all duration-150 group/item"
                   >
                     <div className="w-7 h-7 rounded-md bg-emerald-50 group-hover/item:bg-emerald-100 flex items-center justify-center transition-colors">
                       <Download className="w-3.5 h-3.5 text-emerald-600" />
                     </div>
                     <div>
                       <span className="block">Export CSV</span>
                       <span className="text-[10px] text-stone-400">Download spreadsheet</span>
                     </div>
                   </button>
                   
                   <button
                     onClick={handleExportPDF}
                     disabled={items.length === 0 || isGeneratingPDF}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 disabled:opacity-50 transition-all duration-150 group/item"
                   >
                     <div className="w-7 h-7 rounded-md bg-blue-50 group-hover/item:bg-blue-100 flex items-center justify-center transition-colors">
                       {isGeneratingPDF ? (
                         <Loader className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                       ) : (
                         <FileText className="w-3.5 h-3.5 text-blue-600" />
                       )}
                     </div>
                     <div>
                       <span className="block">Export PDF Report</span>
                       <span className="text-[10px] text-stone-400">For insurance & records</span>
                     </div>
                   </button>
                   
                   <div className="h-px bg-stone-100 my-1" />
                   
                   <button
                     onClick={() => signOut(auth)}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2.5 transition-all duration-150 group/item"
                   >
                     <div className="w-7 h-7 rounded-md bg-red-50 group-hover/item:bg-red-100 flex items-center justify-center transition-colors">
                       <LogOut className="w-3.5 h-3.5" />
                     </div>
                     <span>Sign Out</span>
                   </button>
          </div>
        </div>
             </div>
          </div>
        </div>
        
        {/* Row 2: Filters with Value + Sort */}
        <div className="border-t border-stone-50 bg-stone-50/50 overflow-visible">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
           {[
              { value: "all", label: "All", icon: Grid },
              { value: "keep", label: "Keep", icon: Lock },
              { value: "sell", label: "Sell", icon: Tag },
              { value: "TBD", label: "TBD", icon: HelpCircle },
            ].map(({ value: f, label: displayName, icon: Icon }) => {
              const stats = filterStats[f];
              const isActive = filter === f;
              
              return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                  className={`flex-shrink-0 transition-all duration-200 ${
                    isActive
                      ? "bg-white rounded-xl shadow-md border border-stone-200 px-3 py-2 scale-[1.02]"
                      : "px-3 py-1.5 rounded-full text-xs font-bold bg-white/80 text-stone-500 border border-stone-200 hover:border-stone-400 hover:bg-white hover:shadow-sm hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {isActive ? (
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3 h-3 text-stone-600" />
                        <span className="text-xs font-bold text-stone-800">{displayName}</span>
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{stats.count}</span>
                      </div>
                      {stats.high > 0 && (
                        <span className="text-sm font-bold text-emerald-600 mt-0.5">
                          ${stats.low.toLocaleString()} <span className="text-stone-300 font-normal">-</span> ${stats.high.toLocaleString()}
                </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold whitespace-nowrap flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {displayName} <span className="opacity-60">{stats.count}</span>
                    </span>
                  )}
                </button>
              );
            })}
            
            {/* Sort Dropdown - with Premium Tooltip */}
            <div className="ml-auto flex-shrink-0 relative group/sort">
               <button 
                 onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                 disabled={dataLoading}
                 className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-700 bg-white/80 hover:bg-white hover:shadow-sm px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-stone-300 transition-all duration-200 hover:scale-[1.02] active:scale-95"
               >
                 <ArrowUpDown className="w-3.5 h-3.5" />
                 <span className="hidden sm:inline">
                    {{
                      "date-desc": "Newest",
                      "date-asc": "Oldest",
                      "value-desc": "High $",
                      "value-asc": "Low $",
                      "alpha-asc": "A-Z",
                      "category-asc": "Category",
                      "status-asc": "Status"
                    }[sortBy]}
                 </span>
               </button>
               {/* Tooltip for Sort */}
               {!isSortMenuOpen && (
                 <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-stone-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover/sort:opacity-100 group-hover/sort:visible transition-all duration-200 delay-300 pointer-events-none z-50">
                   <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45" />
                   Sort items
                 </div>
               )}
               
               {/* Sort Menu Dropdown */}
               {isSortMenuOpen && (
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsSortMenuOpen(false)} />
               )}
               {isSortMenuOpen && (
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-200">
                   <div className="p-1.5">
                     {[
                       { label: "Newest First", value: "date-desc" },
                       { label: "Oldest First", value: "date-asc" },
                       { label: "High → Low $", value: "value-desc" },
                       { label: "Low → High $", value: "value-asc" },
                       { label: "A → Z", value: "alpha-asc" },
                       { label: "By Category", value: "category-asc" },
                       { label: "By Status", value: "status-asc" },
                     ].map((opt) => (
                       <button
                         key={opt.value}
                         onClick={() => { setSortBy(opt.value); setIsSortMenuOpen(false); }}
                         className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all duration-150 ${sortBy === opt.value ? "bg-rose-50 text-rose-700" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"}`}
                       >
                         {opt.label}
                         {sortBy === opt.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
          </div>
               )}
        </div>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">

        {items.length === 0 && !isUploading && !dataLoading && (
          <div className="text-center py-20 opacity-80 animate-in fade-in zoom-in duration-500 max-w-sm mx-auto">
            <div className="w-32 h-32 bg-gradient-to-tr from-rose-100 to-stone-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-white">
               <Sparkles className="w-12 h-12 text-rose-400" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-stone-800 mb-3">
              Start Your Discovery
            </h3>
            <p className="text-stone-500 mb-8 leading-relaxed">
              Upload photos of your vintage items to reveal their history, value, and where to sell them.
            </p>
            <button
              onClick={() => singleInputRef.current?.click()}
               className="bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-stone-200 transition-all active:scale-95 flex items-center gap-3 mx-auto"
            >
               <Camera className="w-5 h-5" />
               Identify Your First Item
            </button>
          </div>
        )}

        {/* Empty State for Filters/Search */}
        {!dataLoading && items.length > 0 && filteredItems.length === 0 && (
          <div className="text-center py-16 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-700 mb-2">
              {searchQuery ? `No results for "${searchQuery}"` : `No items marked as "${filter}"`}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              {searchQuery 
                ? "Try a different search term or clear your search" 
                : `You haven't marked any items as "${filter}" yet`}
            </p>
            <button 
              onClick={() => { setSearchQuery(""); setFilter("all"); }}
              className="text-rose-600 text-sm font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {dataLoading ? (
             // Skeleton Loading Grid
             Array.from({ length: 10 }).map((_, i) => (
                <SkeletonCard key={i} />
             ))
          ) : (
             filteredItems.map((item) => (
               <ItemCard 
                  key={item.id} 
                  item={item} 
                  onClick={setSelectedItem}
                  isSelected={selectedIds.has(item.id)}
                  isSelectionMode={isSelectionMode}
                  onToggleSelect={handleToggleSelect}
                  onAnalyze={handleQuickAnalyze}
                  onQuickAction={handleOpenContextMenu}
               />
             ))
          )}
        </div>
      </main>

      {/* --- Batch Action Bar (Sticky Top - Below Header) --- */}
      {isSelectionMode && (
         <div className="sticky top-0 z-40 bg-gradient-to-b from-stone-100 to-transparent pb-4 pt-2 px-4 -mx-4 sm:-mx-6 lg:-mx-8 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-white rounded-xl shadow-lg shadow-stone-200/50 border border-stone-200 overflow-hidden">
               {/* Single row: All controls */}
               <div className="flex items-center justify-between p-2.5 sm:p-3 gap-3">
                  {/* Left: Selection count + Select All */}
                  <div className="flex items-center gap-2 sm:gap-3">
                     <div className="flex items-center gap-2 bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-100">
                        <ListChecks className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-xs font-bold text-violet-700">{selectedIds.size}</span>
                     </div>
                     <button 
                        onClick={() => {
                          if (selectedIds.size === filteredItems.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(filteredItems.map(i => i.id)));
                          }
                        }}
                        className="text-stone-500 hover:text-stone-800 text-xs font-medium transition-colors hidden sm:block"
                     >
                        {selectedIds.size === filteredItems.length ? "Deselect" : "All"}
                     </button>
                  </div>
                  
                  {/* Center: Mark as buttons with label */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                     <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wide hidden md:block">Mark:</span>
                     <button 
                        onClick={() => handleBatchStatusChange('keep')}
                        disabled={selectedIds.size === 0}
                        className="px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
                     >
                        Keep
                     </button>
                     <button 
                        onClick={() => handleBatchStatusChange('sell')}
                        disabled={selectedIds.size === 0}
                        className="px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                     >
                        Sell
                     </button>
                     <button 
                        onClick={() => handleBatchStatusChange('TBD')}
                        disabled={selectedIds.size === 0}
                        className="px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                     >
                        TBD
                     </button>
                  </div>
                  
                  {/* Right: Delete, AI, Cancel */}
                  <div className="flex items-center gap-1 sm:gap-2">
                     <button 
                        onClick={handleBatchDelete}
                        disabled={selectedIds.size === 0}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors border border-transparent hover:border-red-200 disabled:opacity-40"
                        title="Delete Selected"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={handleBatchAnalyze}
                        disabled={isBatchProcessing || selectedIds.size === 0}
                        className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
                     >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">AI</span>
                     </button>
                     
                     {/* Cancel/Done button */}
                     <button 
                        onClick={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} 
                        className="p-2 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                        title="Exit multi-select"
                     >
                        <X className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- Mobile FAB removed for cleaner mobile UI --- */}

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm mx-auto text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 mb-4 relative">
               <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
               <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-rose-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Analyzing Item...</h3>
            <p className="text-stone-500 text-sm">
               Our AI is identifying your item, estimating its value, and finding resale comps.
            </p>
          </div>
        </div>
      )}

      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        ref={singleInputRef}
        onChange={(e) => handleFileSelect(e, 'single')}
      />
      {/* Bulk upload - no camera option, file picker only */}
      <input
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
        className="hidden"
        ref={bulkInputRef}
        onChange={(e) => handleFileSelect(e, 'bulk')}
      />
      
      {stagingFiles.length > 0 && view !== 'staging' && (
         <UploadStagingModal 
            files={stagingFiles} 
            onConfirm={(mode, action) => handleConfirmSingleUpload(action)}
            onCancel={() => { setStagingFiles([]); if(singleInputRef.current) singleInputRef.current.value = ""; }}
         />
      )}

      {view === 'staging' && (
         <StagingArea 
            files={stagingFiles}
            onConfirm={handleConfirmBulkUpload}
            onCancel={() => { setStagingFiles([]); setView('dashboard'); if(bulkInputRef.current) bulkInputRef.current.value = ""; }}
            isProcessingBatch={isUploading}
         />
      )}

      {selectedItem && (
        <EditModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={handleUpdateItem}
          onDelete={handleDeleteItem}
          onNext={() => {
            const currentIdx = filteredItems.findIndex(i => i.id === selectedItem.id);
            if (currentIdx < filteredItems.length - 1) {
              setSelectedItem(filteredItems[currentIdx + 1]);
            }
          }}
          onPrev={() => {
            const currentIdx = filteredItems.findIndex(i => i.id === selectedItem.id);
            if (currentIdx > 0) {
              setSelectedItem(filteredItems[currentIdx - 1]);
            }
          }}
          hasNext={filteredItems.findIndex(i => i.id === selectedItem.id) < filteredItems.length - 1}
          hasPrev={filteredItems.findIndex(i => i.id === selectedItem.id) > 0}
        />
      )}
      
      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          user={user}
          items={items}
          onClose={() => setShowShareModal(false)}
        />
      )}
      
      {/* Global Loading Overlay - shows during single item uploads (not bulk staging) */}
      {isUploading && view !== 'staging' && (
        <LoadingOverlay 
          message="Adding item..." 
          subMessage="AI is analyzing your photo"
        />
      )}
      
      {/* Batch Processing Overlay with Progress */}
      {isBatchProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm mx-auto text-center shadow-2xl animate-in zoom-in-95">
            {/* Animated icon */}
            <div className="w-20 h-20 mb-5 relative">
              <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-rose-500 animate-pulse" />
            </div>
            
            {/* Progress */}
            <div className="w-full mb-4">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>Processing...</span>
                <span>{batchProgress.current} of {batchProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            {/* Fun message */}
            <h3 className="text-lg font-bold text-stone-800 mb-2">
              AI at Work ✨
            </h3>
            <p className="text-stone-500 text-sm min-h-[40px] flex items-center">
              {batchProgress.message || "Analyzing your vintage treasures..."}
            </p>
            
            {/* Don't close warning */}
            <p className="text-[10px] text-stone-400 mt-4">
              Please don't close this window
            </p>
          </div>
        </div>
      )}

      {/* Quick Action Context Menu */}
      {contextMenu && (
        <QuickActionMenu
          position={contextMenu.position}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onStatusChange={handleQuickStatusChange}
          onDelete={handleDeleteItem}
        />
      )}

      {/* PDF Generation Overlay */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm mx-auto text-center shadow-2xl">
            <div className="w-16 h-16 mb-4 relative">
              <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <FileText className="absolute inset-0 m-auto w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Generating PDF...</h3>
            <p className="text-stone-500 text-sm">
              Creating your inventory report for insurance records
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
