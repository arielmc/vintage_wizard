import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp, } from "firebase/firestore";
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
  ShieldCheck,
  AlertTriangle,
  ImagePlus,
  Images,
  Copy,
  Undo2,
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
const appId = "vintage-validator-v1";

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
    - Details: Edition (1st?), Printing (1st?), Binding (Cloth/Leather/Boards), Dust Jacket presence.
    - Markings: ISBN, Library codes, Signatures.
    - Map "Maker" to Author (and Publisher).
    - Map "Style" to Genre/Subject.

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
    - markings: Transcription of text, ISBNs, catalog numbers, signatures, or hallmarks.
    - era: Specific year or estimated decade.
    - condition: Professional condition assessment.
    - valuation_low: Conservative estimate (USD number).
    - valuation_high: Optimistic estimate (USD number).
    - reasoning: Explanation of value (rarity, demand, comparables).
    - search_terms: Specific keywords to find EXACT comparables.
    - search_terms_broad: A simplified query (2-4 words MAX).
    - sales_blurb: A comprehensive sales description (3-4 sentences) tailored to the item type (e.g. mentioning binding for books, cut for gems).
    - questions: Array of strings (max 3) for critical missing info.
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

// --- Image Helper ---
const compressImage = (file) => {
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
        const maxDim = 800;
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
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
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
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [groupingFeedback, setGroupingFeedback] = useState(null);
  
  // Ref for adding more photos
  const addMoreInputRef = useRef(null);
  
  // Track total photos across all stacks
  const totalPhotos = stacks.reduce((sum, s) => sum + s.files.length, 0);

  useEffect(() => {
    // Initialize: Every file is a stack of 1
    setIsLoading(true);
    const initStacks = files.map((f) => ({
      id: Math.random().toString(36).substr(2, 9),
      files: [f],
    }));
    // Simulate a small delay for image processing visual feedback
    setTimeout(() => {
      setStacks(initStacks);
      setIsLoading(false);
    }, 300);
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
      // IMPROVED Heuristic: 3 Minute Threshold (180s) to catch "bursts"
      const sorted = [...files].sort((a, b) => a.lastModified - b.lastModified);
      const newStacks = [];
      let currentStack = [];

      for (let i = 0; i < sorted.length; i++) {
        const file = sorted[i];
        if (currentStack.length === 0) {
          currentStack.push(file);
        } else {
          const prevFile = currentStack[currentStack.length - 1];
          const timeDiff = (file.lastModified - prevFile.lastModified) / 1000; // seconds
          // Increased from 60s to 180s (3 mins)
          if (timeDiff < 180) {
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
     if (!stack) return null;
     
     // Reuse ThumbnailItem for reordering logic
     // We need local drag state for this modal
     const [localDragIdx, setLocalDragIdx] = useState(null);

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
                              src={URL.createObjectURL(file)} 
                              className="w-full h-full object-cover pointer-events-none" 
                              alt={`Photo ${i + 1}`} 
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
                 <p className="text-center text-xs text-stone-400 mt-4">
                   Click <Undo2 size={10} className="inline mx-1" /> to remove a photo from this stack (returns to grid)
                 </p>
              </div>
              
              <div className="p-4 border-t border-stone-100 flex justify-end">
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
  
  const StackCard = ({ stack, index, isSelected, onSelect, onRemove, draggedIdx }) => {
    const isMulti = stack.files.length > 1;
    const coverUrl = URL.createObjectURL(stack.files[0]);
    const isBeingDragged = draggedIdx === index;
    // Determine if this is a potential drop target
    const isDropTarget = draggedIdx !== null && draggedIdx !== index;
    const isActiveDropTarget = isDragOverTarget === index;

    const handleClick = () => {
        if (isSelectionMode) {
            onSelect(stack.id);
        } else if (isMulti) {
            setExpandedStackIdx(index);
        }
    };

    return (
      <div
        draggable={!isSelectionMode}
        onDragStart={(e) => {
            // Custom Ghost Image
            const img = new Image();
            img.src = coverUrl;
            e.dataTransfer.setDragImage(img, 50, 50); 
            handleDragStart(e, index);
        }}
        onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            // Set this as active drop target
            if (draggedIdx !== null && draggedIdx !== index) {
              setIsDragOverTarget(index);
            }
        }}
        onDragLeave={() => {
            if (isDragOverTarget === index) {
              setIsDragOverTarget(null);
            }
        }}
        onDrop={(e) => {
            handleDrop(e, index);
            setIsDragOverTarget(null);
        }}
        onDragEnd={() => {
            setDraggedStackIdx(null);
            setIsDragOverTarget(null);
        }}
        onClick={handleClick}
        className={`relative aspect-square group transition-all duration-200 touch-manipulation ${
            isSelectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        } ${isSelected ? "scale-90" : ""} ${
            isBeingDragged ? "opacity-30 scale-90 grayscale" : "opacity-100 hover:scale-105"
        }`}
      >
        {/* Active Drop Target Highlight */}
        {isActiveDropTarget && (
          <div className="absolute -inset-3 rounded-2xl border-4 border-emerald-500 bg-emerald-100/50 z-0 animate-pulse" />
        )}
        
        {/* Potential Drop Target Indicator */}
        {isDropTarget && !isActiveDropTarget && (
          <div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-stone-300 z-0" />
        )}

        {/* Stack Effect (Underneath layers) */}
        {isMulti && (
           <div className="absolute inset-0 bg-stone-200 rounded-xl rotate-6 scale-95 border border-stone-300 shadow-sm z-10" />
        )}
        {stack.files.length > 2 && (
           <div className="absolute inset-0 bg-stone-300 rounded-xl -rotate-3 scale-95 border border-stone-400 shadow-sm" />
        )}

        {/* Main Card */}
        <div className={`absolute inset-0 bg-white rounded-xl shadow-md border overflow-hidden z-10 transition-all ${
            isSelected ? "border-rose-500 ring-4 ring-rose-500/30" : 
            isActiveDropTarget ? "border-emerald-500 ring-4 ring-emerald-500/30 scale-105" : 
            "border-stone-200"
        }`}>
           <img src={coverUrl} className="w-full h-full object-cover pointer-events-none" alt="stack cover" />
           
           {/* Drop Indicator Overlay */}
           {isActiveDropTarget && (
             <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
               <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                 + Merge
               </div>
             </div>
           )}
           
           {/* Selection Checkmark Overlay */}
           {isSelectionMode && (
               <div className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                   isSelected ? "bg-rose-500 border-rose-500" : "bg-white/80 border-stone-300"
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
               className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-sm hover:bg-red-600 z-20"
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
             <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
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
           <div className="flex flex-col items-center justify-center h-full gap-4">
             <Loader className="w-8 h-8 text-stone-400 animate-spin" />
             <p className="text-stone-500 text-sm">Processing {files.length} photos...</p>
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

const SkeletonCard = () => (
  <div className="bg-white rounded-xl overflow-hidden border border-stone-100 shadow-sm flex flex-col h-full animate-pulse">
    <div className="aspect-square bg-stone-200/50" />
    <div className="p-3 flex-1 flex flex-col gap-2">
      <div className="h-4 bg-stone-200 rounded w-3/4" />
      <div className="h-3 bg-stone-100 rounded w-1/2" />
      <div className="mt-auto pt-2 flex justify-between items-center border-t border-stone-50">
        <div className="h-3 bg-stone-100 rounded w-1/3" />
        <div className="h-3 bg-stone-100 rounded w-1/4" />
      </div>
    </div>
  </div>
);

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

const ItemCard = ({ item, onClick, isSelected, isSelectionMode, onToggleSelect, onAnalyze }) => {
  // Ensure images array exists, fallback to single image or empty
  const images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  return (
    <div
      onClick={handleClick}
      className={`group bg-white rounded-xl shadow-sm transition-all duration-200 border overflow-hidden cursor-pointer flex flex-col h-full relative ${
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
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-stone-800 line-clamp-1 mb-1">
          {item.title || "Untitled Item"}
        </h3>
        <p className="text-xs text-stone-500 line-clamp-2 mb-2 flex-1">
          {[item.maker, item.style, item.materials].filter(Boolean).join(" • ") || item.userNotes || "No details yet"}
        </p>
        <div className="flex items-center justify-between text-xs text-stone-400 mt-auto pt-2 border-t border-stone-50">
          <span>{item.category || "Unsorted"}</span>
          {item.era && <span>{item.era}</span>}
        </div>
      </div>
    </div>
  );
};

const LoginScreen = () => {
  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect result failed", error);
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Try popup first (better for desktop)
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.log("Popup failed/closed, falling back to redirect...", error);
      // If popup is blocked or fails (common on mobile), use redirect
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
         try {
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(auth, provider);
         } catch (redirectError) {
            console.error("Redirect login failed", redirectError);
            alert("Login failed. Check console for details.");
         }
      } else {
         console.error("Login error:", error);
         alert(`Login failed: ${error.message || "Unknown error"}`);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#FDFBF7] p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-rose-100/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-stone-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-8 rotate-3 transform hover:rotate-6 transition-all duration-500">
          <Sparkles className="w-10 h-10 text-rose-600" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-3 tracking-tight">
          Resale Helper Bot
        </h1>
        <p className="text-stone-500 mb-10 text-lg font-light leading-relaxed">
          Curate, value, and manage your<br/>collection with AI.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-stone-200 active:scale-[0.98]"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            className="w-5 h-5"
            alt="G"
          />
          Sign in with Google
        </button>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400 uppercase tracking-widest">
          <div className="w-8 h-px bg-stone-200" />
          <span>Secure Access</span>
          <div className="w-8 h-px bg-stone-200" />
        </div>
      </div>
    </div>
  );
};

// --- LISTING GENERATOR COMPONENT ---
const ListingGenerator = ({ formData }) => {
  // Helper to copy text
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // Generate Optimized Title
  // Strategy: Maker + Style + Object + Era + Key Details
  const generateTitle = () => {
    const parts = [
      formData.maker,
      formData.style,
      formData.title, // Usually the object name from AI
      formData.era,
      formData.materials
    ].filter(Boolean);
    
    // Dedupe words and join
    const uniqueParts = [...new Set(parts.join(" ").split(" "))];
    return uniqueParts.join(" ").substring(0, 80); // eBay limit 80 chars
  };

  // Generate Description Template
  const generateDescription = () => {
    return `
✨ RARE FIND: ${formData.title} ✨

📝 DESCRIPTION:
${formData.sales_blurb || "No description available."}

🏷️ DETAILS:
• Maker/Brand: ${formData.maker || "Unsigned"}
• Style/Period: ${formData.style || "Vintage"}
• Era: ${formData.era || "Unknown"}
• Material: ${formData.materials || "See photos"}

💎 CONDITION:
${formData.condition || "Good vintage condition. Please see photos for details."}
${formData.markings ? `• Markings: ${formData.markings}` : ""}

📏 NOTES:
${formData.userNotes || "Message for measurements or more details!"}

sku: ${formData.id ? formData.id.substring(0, 8).toUpperCase() : Math.random().toString(36).substr(2, 8).toUpperCase()}
    `.trim();
  };

  // Generate Hashtags
  const generateTags = () => {
    const baseTags = [
      formData.category,
      formData.style,
      formData.era,
      "vintage",
      "retro",
      "preloved",
      formData.maker
    ].filter(Boolean);
    
    // Add AI search terms if available
    if (formData.search_terms_broad) {
        baseTags.push(...formData.search_terms_broad.split(" "));
    }

    return baseTags.map(t => `#${t.replace(/\s+/g, '')}`).join(" ");
  };

  const generatedTitle = generateTitle();
  const generatedDesc = generateDescription();
  const generatedTags = generateTags();

  return (
    <div className="space-y-6 p-1">
      {/* eBay / Poshmark Title */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Optimized Title ({generatedTitle.length}/80)
            </label>
            <button onClick={() => handleCopy(generatedTitle)} className="text-rose-600 text-xs font-bold hover:underline">
                Copy
            </button>
        </div>
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-800 break-words">
            {generatedTitle}
        </div>
      </div>

      {/* Description Block */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Professional Description
            </label>
            <button onClick={() => handleCopy(generatedDesc)} className="text-rose-600 text-xs font-bold hover:underline">
                Copy
            </button>
        </div>
        <textarea 
            readOnly
            value={generatedDesc}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono text-stone-600 h-64 focus:outline-none resize-none"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            SEO Tags
            </label>
            <button onClick={() => handleCopy(generatedTags)} className="text-rose-600 text-xs font-bold hover:underline">
                Copy
            </button>
        </div>
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-blue-600 break-words">
            {generatedTags}
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
        <h4 className="text-blue-800 font-bold text-sm mb-1">🚀 Pro Tip</h4>
        <p className="text-blue-700/80 text-xs">
            Copy these blocks directly into eBay, Poshmark, or Depop. The title is optimized for search keywords, and the description includes all the details buyers ask for.
        </p>
      </div>
    </div>
  );
};

const EditModal = ({ item, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    ...item,
    images: item.images || (item.image ? [item.image] : []),
    clarifications: item.clarifications || {},
    // Initialize Provenance (migrate userNotes if needed)
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
  const addPhotoInputRef = useRef(null);
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

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    // Store index in dataTransfer for broader compatibility
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
    
    // Make the drag image slightly transparent (optional, browser default is usually okay)
    e.target.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedIdx(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
    
    // Optional: You could implement "swapping" logic here for real-time preview,
    // but simple Drop is safer for native DnD.
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    
    if (isNaN(dragIdx) || dragIdx === dropIndex) return;

    const newImages = [...formData.images];
    const [movedItem] = newImages.splice(dragIdx, 1);
    newImages.splice(dropIndex, 0, movedItem);
    
    setFormData(prev => ({ ...prev, images: newImages }));
    
    // Update active index correctly
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Lightbox for full image view */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[70] bg-black flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
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
      
      {/* Main Modal - Vertical Layout (Content-First) */}
      <div className="bg-white sm:rounded-2xl w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Compact Header: Close + Title + Value + Status + Delete */}
        <div className="px-3 py-2 border-b border-stone-200 bg-white flex items-center gap-2 shrink-0">
          {/* Close Button (Left - where users expect it on mobile) */}
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:bg-stone-100 rounded-full shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Title (truncated) */}
          <h2 className="flex-1 text-sm font-bold text-stone-800 truncate min-w-0">
            {formData.title || "Untitled Item"}
          </h2>
          
          {/* Value Input (compact) */}
          <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shrink-0">
            <span className="text-emerald-600 text-xs font-bold">$</span>
            <input
              type="number"
              placeholder="Min"
              value={formData.valuation_low || ""}
              onChange={(e) => setFormData((p) => ({ ...p, valuation_low: e.target.value }))}
              className="w-12 bg-transparent text-center font-bold text-emerald-800 focus:outline-none text-xs"
            />
            <span className="text-emerald-300">-</span>
            <input
              type="number"
              placeholder="Max"
              value={formData.valuation_high || ""}
              onChange={(e) => setFormData((p) => ({ ...p, valuation_high: e.target.value }))}
              className="w-12 bg-transparent text-center font-bold text-emerald-800 focus:outline-none text-xs"
            />
          </div>
          
          {/* Status Dropdown */}
          <select
            value={formData.status || "TBD"}
            onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
            className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer shrink-0 ${
              formData.status === "keep" ? "bg-blue-50 text-blue-700 border-blue-200" :
              formData.status === "sell" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <option value="keep">KEEP</option>
            <option value="sell">SELL</option>
            <option value="TBD">TBD</option>
          </select>
          
          {/* Delete Item */}
          <button
            onClick={() => {
              if (confirm("Delete this item permanently?")) {
                onDelete(item.id);
                onClose();
              }
            }}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
            title="Delete Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Compact Thumbnail Strip (tap to expand, drag to reorder) */}
        <div className="px-3 py-2 bg-stone-100 border-b border-stone-200 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
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
                  className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    activeImageIdx === idx ? "border-rose-500 ring-2 ring-rose-200" : "border-transparent hover:border-stone-300"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5">
                      HERO
                    </div>
                  )}
                  {/* Remove button on hover */}
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
            className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-stone-300 bg-white hover:bg-stone-50 flex flex-col items-center justify-center text-stone-400 hover:text-stone-600 transition-colors"
          >
            <Plus size={16} />
            <span className="text-[8px] font-bold mt-0.5">ADD</span>
          </button>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={addPhotoInputRef}
            onChange={handleAddPhoto}
          />
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
            <ListingGenerator formData={formData} />
          ) : (
            <div className="flex flex-col gap-3">
              {/* AI Clarification Questions */}
              {formData.questions && formData.questions.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm mb-4">
                  <div 
                    className="bg-rose-100/50 p-4 flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors active:bg-rose-200"
                    onClick={() => setShowQuestions(!showQuestions)}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-rose-600" />
                      <span className="text-sm font-bold text-rose-900">
                        Refine Valuation
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-rose-600 bg-white/50 px-2 py-0.5 rounded-full">
                      {formData.questions.length} Questions
                    </span>
                  </div>
                  
                  {showQuestions && (
                    <div className="p-4 space-y-4">
                      <p className="text-xs text-rose-800/80 italic">
                        The AI needs a bit more detail to give you an accurate price.
                      </p>
                      {formData.questions.map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="block text-xs font-semibold text-rose-800">
                            {q}
                          </label>
                          <div className="flex gap-2">
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
                              className="flex-1 p-3 text-sm bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={handleAnalyze}
                        className="w-full mt-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md active:scale-95 transition-transform duration-100"
                      >
                        <RefreshCw className="w-4 h-4" /> Submit Answers & Re-Appraise
                      </button>
                    </div>
                  )}
                </div>
              )}
            {marketLinks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                    <ExternalLink className="w-3 h-3" /> Market Comps
                  </h4>
                  <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                    {formData.search_terms}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {marketLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm ${link.color}`}
                    >
                      <span className="font-semibold text-sm">{link.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
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
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium resize-none text-sm"
                />
              </div>
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
          </div>
            </div>
            )}
          </div>
          
        {/* Footer */}
        <div className="p-3 bg-white border-t border-stone-200 shrink-0 flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || formData.images.length === 0}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isAnalyzing 
                ? "bg-stone-100 text-stone-400 cursor-wait" 
                : "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100"
            }`}
          >
            {isAnalyzing ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {formData.aiLastRun ? "Re-Run AI" : "Run AI"}
          </button>

          <button
            onClick={() => {
              onSave({
                ...formData,
                image: formData.images.length > 0 ? formData.images[0] : null,
              });
              onClose();
            }}
            className="flex-[2] py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
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
  const singleInputRef = useRef(null);
  const bulkInputRef = useRef(null);

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

  const handleBatchAnalyze = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    
    const itemsToProcess = items.filter(item => selectedIds.has(item.id));
    
    for (const item of itemsToProcess) {
      if ((item.valuation_low > 0) || !item.images || item.images.length === 0) continue;
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
      } catch (err) {
        console.error(`Failed to analyze item ${item.id}`, err);
      }
    }
    
    setIsBatchProcessing(false);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    alert("Batch analysis complete!");
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} items? This cannot be undone.`)) return;
    
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "inventory", id));
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
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
      alert("Please select a maximum of 4 images for a single item.");
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
      const compressedImages = [];
          for (const file of groupFiles) {
        compressedImages.push(await compressImage(file));
      }
          
          let analysisResult = {};
          // Only run AI for single item immediate mode
          if (shouldAutoAnalyze) {
             try {
               // Wait for analysis to complete strictly before continuing
               analysisResult = await analyzeImagesWithGemini(compressedImages, "");
             } catch (aiError) {
               console.error("Auto-analysis failed:", aiError);
               alert(`Item uploaded, but AI analysis failed: ${aiError.message}`);
             }
          }

          const docRef = await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "inventory"),
        {
          images: compressedImages,
          image: compressedImages[0],
              status: "TBD",
          title: "",
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
              ...analysisResult,
              aiLastRun: shouldAutoAnalyze && analysisResult.title ? new Date().toISOString() : null
            }
          );

          if (uploadMode === "single" && actionType === "edit_first") {
             setSelectedItem({
                id: docRef.id,
                images: compressedImages,
                image: compressedImages[0],
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
    
    // Helper: Generate optimized title (80 char limit for eBay)
    const generateOptimizedTitle = (item) => {
      const parts = [item.maker, item.style, item.title, item.era, item.materials].filter(Boolean);
      const uniqueParts = [...new Set(parts.join(" ").split(" "))];
      return uniqueParts.join(" ").substring(0, 80);
    };
    
    // Helper: Generate listing description
    const generateDescription = (item) => {
      return `RARE FIND: ${item.title || "Vintage Item"}

DESCRIPTION:
${item.sales_blurb || "No description available."}

DETAILS:
- Maker/Brand: ${item.maker || "Unsigned"}
- Style/Period: ${item.style || "Vintage"}
- Era: ${item.era || "Unknown"}
- Material: ${item.materials || "See photos"}

CONDITION:
${item.condition || "Good vintage condition. Please see photos for details."}
${item.markings ? `- Markings: ${item.markings}` : ""}

NOTES:
${item.userNotes || "Message for measurements or more details!"}`;
    };
    
    // Helper: Generate SEO tags
    const generateTags = (item) => {
      const baseTags = [item.category, item.style, item.era, "vintage", "retro", item.maker].filter(Boolean);
      if (item.search_terms_broad) baseTags.push(...item.search_terms_broad.split(" "));
      return baseTags.map(t => `#${t.replace(/\s+/g, '')}`).join(" ");
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

  const filteredItems = useMemo(
    () => {
      let result = (filter === "all" ? items : items.filter((i) => {
         if (filter === "TBD") return i.status === "draft" || i.status === "TBD" || i.status === "unprocessed" || i.status === "maybe";
         return i.status === filter;
      }));

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
          default:
            return 0;
        }
      });
    },
    [items, filter, sortBy]
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-900 pb-32">
      {/* --- Header --- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-30 overflow-visible">
        {/* Row 1: Logo + Actions */}
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center shadow-sm">
               <Sparkles className="w-4 h-4 text-rose-400" fill="currentColor" />
            </div>
            <h1 className="text-base font-serif font-bold text-stone-900 tracking-tight hidden md:block">
              Resale Helper Bot
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
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

             {/* Batch AI Analysis Toggle - with Premium Tooltip */}
             <div className="relative group/tooltip">
                <button
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border hover:shadow-md hover:scale-[1.02] active:scale-95 ${
                      isSelectionMode 
                        ? "bg-rose-100 text-rose-700 border-rose-200 shadow-sm" 
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                 >
                    <Wand2 className={`w-4 h-4 ${isSelectionMode ? "fill-current" : ""}`} />
                </button>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-stone-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 delay-300 pointer-events-none z-50">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45" />
                  {isSelectionMode ? "Exit batch mode" : "Select items for batch analysis"}
                </div>
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
                     onClick={handleExportCSV}
                     disabled={items.length === 0}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 disabled:opacity-50 transition-all duration-150 group/item"
                   >
                     <div className="w-7 h-7 rounded-md bg-stone-100 group-hover/item:bg-stone-200 flex items-center justify-center transition-colors">
                       <Download className="w-3.5 h-3.5" />
                     </div>
                     <div>
                       <span className="block">Export CSV</span>
                       <span className="text-[10px] text-stone-400">Download your inventory</span>
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
        <div className="px-4 py-2 flex items-center gap-2 border-t border-stone-50 bg-stone-50/50 overflow-visible">
           {["all", "keep", "sell", "TBD"].map((f) => {
              const stats = filterStats[f];
              const isActive = filter === f;
              const displayName = f === "all" ? "All" : f === "TBD" ? "TBD" : f.charAt(0).toUpperCase() + f.slice(1);
              
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
                    <span className="text-xs font-bold whitespace-nowrap">
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
                      "category-asc": "Category"
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
              onClick={() => fileInputRef.current?.click()}
               className="bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-stone-200 transition-all active:scale-95 flex items-center gap-3 mx-auto"
            >
               <Camera className="w-5 h-5" />
               Identify Your First Item
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
               />
             ))
          )}
        </div>
      </main>

      {/* --- Batch Action Bar (Fixed Bottom) --- */}
      {isSelectionMode && (
         <div className="fixed bottom-6 md:bottom-12 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-xl z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-stone-900 text-white rounded-2xl shadow-2xl shadow-stone-900/50 p-4 border border-stone-700/50 flex items-center justify-between gap-4 backdrop-blur-md">
               <div className="flex items-center gap-3 pl-2">
                  <div className="bg-stone-700 px-3 py-1.5 rounded-lg text-sm font-bold shadow-inner">
                     {selectedIds.size} Selected
                  </div>
                  <button onClick={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} className="text-stone-400 hover:text-white text-sm font-medium transition-colors">
                     Cancel
                  </button>
               </div>
               <div className="flex items-center gap-3">
                  <button 
                     onClick={handleBatchDelete}
                     className="p-2.5 rounded-xl hover:bg-stone-800 text-red-400 hover:text-red-300 transition-colors border border-transparent hover:border-stone-700"
                     title="Delete Selected"
                  >
                     <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                     onClick={handleBatchAnalyze}
                     disabled={isBatchProcessing}
                     className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-rose-900/20 transition-all active:scale-95 border-t border-white/20"
                  >
                     {isBatchProcessing ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-white" />}
                     <span className="hidden sm:inline">Analyze Items</span>
                     <span className="sm:hidden">AI</span>
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- Mobile FAB (Floating Action Button) - Hidden during selection --- */}
      {!isSelectionMode && (
      <div className="fixed bottom-6 right-6 z-30 md:hidden flex flex-col gap-3">
         <button
            onClick={() => bulkInputRef.current?.click()}
            disabled={isUploading}
            className="h-12 w-12 rounded-full shadow-lg shadow-stone-900/10 flex items-center justify-center transition-all active:scale-90 bg-white text-stone-700 border border-stone-200"
         >
            <Layers className="w-5 h-5" />
         </button>
         <button
            onClick={() => singleInputRef.current?.click()}
            disabled={isUploading}
            className={`h-16 w-16 rounded-full shadow-xl shadow-rose-900/20 flex items-center justify-center transition-all active:scale-90 border-2 border-white ${
               isUploading ? "bg-stone-100 cursor-wait" : "bg-stone-900 text-white"
            }`}
         >
            {isUploading ? (
               <Loader className="w-8 h-8 animate-spin text-stone-400" />
            ) : (
               <Plus className="w-8 h-8" strokeWidth={2.5} />
            )}
         </button>
      </div>
      )}

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
      <input
        type="file"
        multiple
        accept="image/*"
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
        />
      )}
    </div>
  );
}
