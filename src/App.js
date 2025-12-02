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
  serverTimestamp, } from "firebase/firestore"; import {
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
} from "lucide-react";

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
  const knownDetails = [];
  if (currentData.title) knownDetails.push(`Title/Type: ${currentData.title}`);
  if (currentData.materials)
    knownDetails.push(`Materials: ${currentData.materials}`);
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
    You are an expert antique and vintage appraiser.
    
    ${contextPrompt}
    ${userAnswersContext}
    
    Analyze the attached images and the user's notes: "${userNotes}".
    
    Task:
    1. Identify the item precise counts and details.
    2. Look for hallmarks/signatures.
    3. Estimate value based on your internal knowledge of market trends and sold listings.

    Provide a JSON response with:
    - title: Short, descriptive title.
    - materials: Visible materials.
    - era: Estimated era.
    - valuation_low: Conservative estimate (USD number).
    - valuation_high: Optimistic estimate (USD number).
    - reasoning: Brief explanation (max 2 sentences).
    - search_terms: Specific keywords to find EXACT comparables on robust search engines.
    - search_terms_broad: A simplified query (2-4 words MAX) for strict search engines like Ruby Lane/1stDibs.
    - category: The most specific accurate category.
    - sales_blurb: An engaging, professional sales description (2-3 sentences) suitable for the body of an eBay/Etsy listing. Highlight unique features, style, and condition. Do not repeat the title verbatim.
    - questions: Array of strings (max 3). Ask specific, critical questions to clarify value (e.g., "Is the clasp marked?", "Is it heavy?"). If confident, return empty array.
  `;

  const imageParts = images.map((img) => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(",")[1],
    },
  }));

  const payload = {
    contents: [{ parts: [{ text: prompt }, ...imageParts] }],
    generationConfig: { responseMimeType: "application/json" },
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
    if (!resultText) throw new Error("No analysis generated");
    return JSON.parse(resultText);
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
    // Changed "Google Lens" to "Google Images" to be more accurate for text-based queries and avoid confusion
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
    cat.includes("necklace");
  const isDecor =
    cat.includes("furniture") ||
    cat.includes("lighting") ||
    cat.includes("decor") ||
    cat.includes("glass") ||
    cat.includes("pottery");
  const isArt =
    cat.includes("art") ||
    cat.includes("painting") ||
    cat.includes("print") ||
    cat.includes("sculpture");

  if (isJewelry) {
    links.push({
      name: "Ruby Lane",
      url: `https://www.rubylane.com/search?q=${broadQuery}`,
      color: "text-rose-700 bg-rose-50 border-rose-200",
    });
    links.push({
      name: "1stDibs",
      url: `https://www.1stdibs.com/search/?q=${broadQuery}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
    links.push({
      name: "Etsy",
      url: `https://www.etsy.com/search?q=${query}`,
      color: "text-orange-700 bg-orange-50 border-orange-200",
    });
  } else if (isDecor || isArt) {
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
    if (isArt)
      links.push({
        name: "LiveAuctioneers",
        url: `https://www.liveauctioneers.com/search/?keyword=${broadQuery}&sort=relevance&status=archive`,
        color: "text-stone-800 bg-stone-100 border-stone-300",
      });
  } else {
    links.push({
      name: "Etsy",
      url: `https://www.etsy.com/search?q=${query}`,
      color: "text-orange-700 bg-orange-50 border-orange-200",
    });
  }
  return links;
};

// --- Components ---
const StatusBadge = ({ status }) => {
  const colors = {
    keep: "bg-green-100 text-green-800 border-green-200",
    sell: "bg-blue-100 text-blue-800 border-blue-200",
    maybe: "bg-amber-100 text-amber-800 border-amber-200",
    unprocessed: "bg-stone-100 text-stone-800 border-stone-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
        colors[status] || colors.unprocessed
      } uppercase tracking-wide`}
    >
      {status}
    </span>
  );
};

const ItemCard = ({ item, onClick }) => {
  const displayImage =
    item.images && item.images.length > 0 ? item.images[0] : item.image;
  const imageCount = item.images ? item.images.length : item.image ? 1 : 0;

  return (
    <div
      onClick={() => onClick(item)}
      className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-stone-100 overflow-hidden cursor-pointer flex flex-col h-full"
    >
      <div className="relative aspect-square bg-stone-100 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.title || "Item"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <Camera size={48} />
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <StatusBadge status={item.status} />
          {imageCount > 1 && (
            <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> +{imageCount - 1}
            </span>
          )}
        </div>

        {item.valuation_high > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            <p className="text-white font-bold text-sm">
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
          {item.materials || item.userNotes || "No details yet"}
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
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Check Authorized Domains in Firebase Console.");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#FDFBF7] p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-amber-100/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-stone-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-8 rotate-3 transform hover:rotate-6 transition-all duration-500">
          <Sparkles className="w-10 h-10 text-amber-600" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-3 tracking-tight">
          Vintage Validator
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

const EditModal = ({ item, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    ...item,
    images: item.images || (item.image ? [item.image] : []),
    clarifications: item.clarifications || {},
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
      <div className="bg-white sm:rounded-2xl w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Left: Image Gallery (Fixed height on mobile, full on desktop) */}
        <div className="w-full md:w-1/2 h-56 md:h-auto bg-stone-900 flex flex-col relative group shrink-0">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/20 p-4">
            {formData.images.length > 0 ? (
              <img
                src={formData.images[activeImageIdx]}
                alt="Preview"
                className="max-w-full max-h-full object-contain shadow-2xl"
              />
            ) : (
              <div className="text-white/50 flex flex-col items-center">
                <Camera size={48} />
                <span className="mt-2 text-sm">No images</span>
              </div>
            )}
            {formData.images.length > 1 && (
              <button
                onClick={() => {
                  const ni = formData.images.filter(
                    (_, i) => i !== activeImageIdx
                  );
                  setFormData((p) => ({ ...p, images: ni }));
                  setActiveImageIdx(0);
                }}
                className="absolute top-4 right-4 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="h-16 md:h-24 bg-stone-900 border-t border-white/10 p-2 md:p-3 flex gap-2 overflow-x-auto items-center">
            {formData.images.map((img, idx) => (
              <div key={idx} className="relative group flex-shrink-0 pt-2 pr-2">
                <button
                  onClick={() => setActiveImageIdx(idx)}
                  className={`h-12 w-12 md:h-16 md:w-16 rounded-lg overflow-hidden border-2 transition-all ${
                    activeImageIdx === idx
                      ? "border-amber-500 opacity-100"
                      : "border-transparent opacity-50 group-hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    className="w-full h-full object-cover"
                    alt="thumbnail"
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newImages = formData.images.filter(
                      (_, i) => i !== idx
                    );
                    setFormData((prev) => ({ ...prev, images: newImages }));
                    if (idx === activeImageIdx) setActiveImageIdx(0);
                    else if (idx < activeImageIdx)
                      setActiveImageIdx(activeImageIdx - 1);
                  }}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10 hover:bg-red-600"
                  title="Remove image"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addPhotoInputRef.current?.click()}
              className="flex-shrink-0 h-12 w-12 md:h-16 md:w-16 rounded-lg border-2 border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center text-white/50 hover:text-white transition-colors gap-1"
            >
              <Plus size={20} />
              <span className="text-[9px] uppercase font-bold">Add</span>
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
        </div>

        {/* Right: Data Entry (Scrollable) */}
        <div className="w-full md:w-1/2 flex flex-col flex-1 overflow-hidden bg-stone-50 border-l border-stone-200">
          <div className="p-4 md:p-6 border-b border-stone-200 bg-white flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-stone-800">Item Details</h2>
              <p className="text-xs text-stone-500">
                {formData.images.length} photos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm("Delete?")) {
                    onDelete(item.id);
                    onClose();
                  }
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:bg-stone-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex flex-col gap-4">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || formData.images.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader className="animate-spin w-4 h-4" /> Analyzing...
                  </>
                ) : (
                  <>
                    {formData.aiLastRun ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {formData.aiLastRun
                      ? "Re-Run AI Analysis"
                      : "AI Appraise Item"}
                  </>
                )}
              </button>
              
              {/* AI Clarification Questions */}
              {formData.questions && formData.questions.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm mb-4">
                  <div 
                    className="bg-amber-100/50 p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors active:bg-amber-200"
                    onClick={() => setShowQuestions(!showQuestions)}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-bold text-amber-900">
                        Refine Valuation
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-white/50 px-2 py-0.5 rounded-full">
                      {formData.questions.length} Questions
                    </span>
                  </div>
                  
                  {showQuestions && (
                    <div className="p-4 space-y-4">
                      <p className="text-xs text-amber-800/80 italic">
                        The AI needs a bit more detail to give you an accurate price.
                      </p>
                      {formData.questions.map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="block text-xs font-semibold text-amber-800">
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
                              className="flex-1 p-3 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={handleAnalyze}
                        className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md active:scale-95 transition-transform duration-100"
                      >
                        <RefreshCw className="w-4 h-4" /> Submit Answers & Re-Appraise
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex bg-white p-1 rounded-lg border border-stone-200 shadow-sm">
                {["keep", "sell", "maybe"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFormData((prev) => ({ ...prev, status }))}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                      formData.status === status
                        ? "bg-stone-800 text-white shadow-sm"
                        : "text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
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
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium resize-none text-sm"
                />
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
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                  <datalist id="category-options">
                    <option value="Jewelry" />
                    <option value="Art" />
                    <option value="Furniture" />
                    <option value="Lighting" />
                    <option value="Home Decor" />
                    <option value="Glassware" />
                    <option value="Pottery" />
                    <option value="Clothing" />
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
                    className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-y"
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
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-y"
                />
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 relative">
                {formData.aiLastRun && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/80 backdrop-blur text-[10px] text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 shadow-sm">
                    <AlertCircle className="w-3 h-3" /> Draft
                  </div>
                )}
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 text-center">
                  Estimated Value ($)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.valuation_low || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        valuation_low: e.target.value,
                      }))
                    }
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold text-emerald-900"
                  />
                  <span className="text-emerald-300 font-bold">-</span>
                  <input
                    type="number"
                    value={formData.valuation_high || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        valuation_high: e.target.value,
                      }))
                    }
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold text-emerald-900"
                  />
                </div>
              </div>
              {formData.reasoning && (
                <div className="p-4 bg-stone-100 rounded-xl border border-stone-200 text-sm text-stone-600">
                  <span className="font-bold text-stone-700 block mb-1">
                    AI Reasoning:
                  </span>
                  {formData.reasoning}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Notes / History
                </label>
                <textarea
                  value={formData.userNotes || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, userNotes: e.target.value }))
                  }
                  rows={4}
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm placeholder:text-stone-400"
                />
              </div>
            </div>
          </div>
          <div className="p-3 md:p-4 bg-white border-t border-stone-200 shrink-0">
            <button
              onClick={() => {
                onSave({
                  ...formData,
                  image: formData.images.length > 0 ? formData.images[0] : null,
                });
                onClose();
              }}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl shadow-lg shadow-stone-200 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState("single"); // 'single' or 'bulk'
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Simply listen for auth state changes.
    // Firebase handles the redirect result internally and updates this stream.
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
      },
      (error) => console.error(error)
    );
    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !user) return;
    setIsUploading(true);
    try {
      if (uploadMode === "single") {
        // Single Item Mode: All photos -> 1 Item
        const compressedImages = [];
        for (const file of files) {
          compressedImages.push(await compressImage(file));
        }
        await addDoc(
          collection(db, "artifacts", appId, "users", user.uid, "inventory"),
          {
            images: compressedImages,
            image: compressedImages[0],
            status: "unprocessed",
            title: "",
            category: "",
            materials: "",
            userNotes: "",
            timestamp: serverTimestamp(),
            valuation_low: 0,
            valuation_high: 0,
          }
        );
      } else {
        // Bulk Mode: 1 Photo -> 1 Item (repeated for each file)
        for (const file of files) {
          const compressedImage = await compressImage(file);
          await addDoc(
            collection(db, "artifacts", appId, "users", user.uid, "inventory"),
            {
              images: [compressedImage],
              image: compressedImage,
              status: "unprocessed",
              title: "",
              category: "",
              materials: "",
              userNotes: "",
              timestamp: serverTimestamp(),
              valuation_low: 0,
              valuation_high: 0,
            }
          );
        }
      }
    } catch (error) {
      console.error(error);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    const headers = [
      "Title",
      "Category",
      "Era",
      "Materials",
      "Low Estimate",
      "High Estimate",
      "Notes",
      "Status",
    ];
    const rows = items.map((item) => [
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${(item.category || "").replace(/"/g, '""')}"`,
      `"${(item.era || "").replace(/"/g, '""')}"`,
      `"${(item.materials || "").replace(/"/g, '""')}"`,
      item.valuation_low || 0,
      item.valuation_high || 0,
      `"${(item.userNotes || "").replace(/"/g, '""')}"`,
      item.status,
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
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-900 pb-24">
      {/* --- Header --- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center shadow-sm">
               <Sparkles className="w-4 h-4 text-amber-400" fill="currentColor" />
            </div>
            <h1 className="text-lg font-serif font-bold text-stone-900 tracking-tight">
              Vintage Validator
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Sync Status (Hidden on small mobile) */}
            <div className="hidden sm:flex flex-col items-end">
               <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                 <Cloud className="w-3 h-3" /> Synced
               </span>
            </div>

             {/* Profile Dropdown Trigger (Simplified) */}
             <div className="relative group cursor-pointer">
               {user.photoURL ? (
                 <img
                   src={user.photoURL}
                   alt="Profile"
                   className="w-8 h-8 rounded-full border border-stone-200 shadow-sm"
                 />
               ) : (
                 <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                   <UserCircle className="w-5 h-5 text-stone-400" />
                 </div>
               )}
               {/* Minimal Dropdown */}
               <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden hidden group-hover:block p-1">
                 <div className="px-4 py-2 border-b border-stone-50 mb-1">
                    <p className="text-xs font-bold text-stone-900 truncate">{user.displayName}</p>
                    <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                 </div>
                 <button
                   onClick={handleExportCSV}
                   disabled={items.length === 0}
                   className="w-full text-left px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 rounded-lg flex items-center gap-2"
                 >
                   <Download className="w-3 h-3" /> Export CSV
                 </button>
                 <button
                    onClick={() => signOut(auth)}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                 >
                    <LogOut className="w-3 h-3" /> Sign Out
                 </button>
               </div>
             </div>
          </div>
        </div>
        
        {/* --- Filter Bar (Sticky Sub-header) --- */}
        <div className="px-4 py-2 overflow-x-auto no-scrollbar flex items-center gap-2 border-t border-stone-50">
           {["all", "keep", "sell", "maybe", "unprocessed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all border ${
                  filter === f
                    ? "bg-stone-900 text-white border-stone-900 shadow-md"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                {f}
                <span className="ml-1.5 opacity-60 text-[10px]">
                   {items.filter((i) => f === "all" || i.status === f).length}
                </span>
              </button>
            ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Total Value Banner (Mobile Friendly) */}
        {(totalLowEst > 0) && (
           <div className="mb-6 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">Collection Value</p>
                 <h2 className="text-xl font-serif font-bold text-emerald-700">
                    ${totalLowEst.toLocaleString()} <span className="text-stone-300 text-lg font-light">-</span> ${totalHighEst.toLocaleString()}
                 </h2>
              </div>
              <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center">
                 <span className="text-xl">💎</span>
              </div>
           </div>
        )}

        {items.length === 0 && !isUploading && (
          <div className="text-center py-20 opacity-60">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-stone-100">
               <Camera className="w-10 h-10 text-stone-300" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-700 mb-2">
              Your archive is empty
            </h3>
            <p className="text-stone-400 text-sm">
              Tap the + button to catalog your first treasure.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onClick={setSelectedItem} />
          ))}
        </div>
      </main>

      {/* --- FAB (Floating Action Button) --- */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
         {/* Upload Mode Menu */}
         {isAddMenuOpen && (
            <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 mb-2 w-48">
               <div className="p-2 space-y-1">
                  <button 
                     onClick={() => { setUploadMode("single"); setIsAddMenuOpen(false); fileInputRef.current?.click(); }}
                     className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${uploadMode === 'single' ? 'bg-amber-50 text-amber-900' : 'hover:bg-stone-50 text-stone-600'}`}
                  >
                     Single Item 
                     {uploadMode === 'single' && <Check className="w-3 h-3 text-amber-600"/>}
                  </button>
                  <button 
                     onClick={() => { setUploadMode("bulk"); setIsAddMenuOpen(false); fileInputRef.current?.click(); }}
                     className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${uploadMode === 'bulk' ? 'bg-amber-50 text-amber-900' : 'hover:bg-stone-50 text-stone-600'}`}
                  >
                     Bulk Upload
                     {uploadMode === 'bulk' && <Check className="w-3 h-3 text-amber-600"/>}
                  </button>
               </div>
               <div className="px-3 py-2 bg-stone-50 border-t border-stone-100">
                  <p className="text-[10px] text-stone-400 leading-tight">
                     {uploadMode === 'single' ? 'Create 1 item from multiple photos.' : 'Create multiple items, 1 photo each.'}
                  </p>
               </div>
            </div>
         )}

         <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            disabled={isUploading}
            className={`h-14 w-14 rounded-full shadow-lg shadow-amber-900/20 flex items-center justify-center transition-all active:scale-90 ${
               isUploading ? "bg-stone-100 cursor-wait" : "bg-stone-900 hover:bg-stone-800 text-white"
            }`}
         >
            {isUploading ? (
               <Loader className="w-6 h-6 animate-spin text-stone-400" />
            ) : (
               <Plus className={`w-7 h-7 transition-transform duration-300 ${isAddMenuOpen ? "rotate-45" : ""}`} />
            )}
         </button>
      </div>

      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

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
