// @ts-nocheck
/**
 * EditModal - Main item editing modal
 * Handles item details, AI analysis, image management, and listing generation
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  X, Check, Loader, ExternalLink, Plus, RefreshCw, Sparkles, 
  HelpCircle, MessageCircle, Send, ChevronLeft, ChevronRight, Save, 
  XCircle, ImagePlus, Copy, Share2, Heart, DollarSign, Trash2, 
  ChevronDown, ChevronUp, TrendingUp, Settings, Calendar, StickyNote,
  Camera, Archive, Search, Tag, Gauge, Lock, Bot
} from "lucide-react";
import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";

// Contexts and hooks
import { useFirebase } from "../../contexts/FirebaseContext";
import { useGeminiAnalysis } from "../../hooks/useGeminiAnalysis";

// Utilities
import { 
  compressImageForBase64Storage, 
  uploadImageToStorage 
} from "../../utils/imageUtils";
import { getMarketplaceLinks } from "../../utils/marketplaceLinks";
import { playSuccessFeedback } from "../../utils/helpers";

// Components
import { ShareItemModal } from "../sharing/ShareItemModal";
import { AILoadingMessages, TruncatedMetadataField } from "../common";
import { ensureBase64 } from "../../utils/imageUtils";

interface EditModalProps {
  item: any;
  user: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  ListingGenerator?: React.ComponentType<{ formData: any; setFormData: (fn: any) => void; marketLinks?: any[] }>;
}

const EditModal: React.FC<EditModalProps> = ({ item, user, onClose, onSave, onDelete, onNext, onPrev, hasNext, hasPrev, ListingGenerator }) => {
  // Get Firebase instances from context
  const { db, appId } = useFirebase();
  
  // Get Gemini AI functions from hook
  const { analyzeImages, askQuestion } = useGeminiAnalysis();
  
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
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatInputRef = useRef(null);
  
  // Share item state
  const [showShareItemModal, setShowShareItemModal] = useState(false);
  
  // Search terms visibility state
  const [showSearchTerms, setShowSearchTerms] = useState(false);

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
        formData.search_terms_broad,
        formData.search_terms_discogs,
        formData.search_terms_auction
      ),
    [formData.category, formData.search_terms, formData.search_terms_broad, formData.search_terms_discogs, formData.search_terms_auction]
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
      let imagesToAnalyze = [];
      
      // Priority 1: Fetch from subcollection (new storage method - full quality)
      if (formData.id && user) {
        try {
          const aiImagesSnapshot = await getDocs(
            collection(db, "artifacts", appId, "users", user.uid, "inventory", formData.id, "images_ai")
          );
          if (!aiImagesSnapshot.empty) {
            const aiImages = aiImagesSnapshot.docs
              .map(doc => ({ ...doc.data(), docId: doc.id }))
              .sort((a, b) => (a.index || 0) - (b.index || 0))
              .map(d => d.base64)
              .filter(b64 => b64 && b64.startsWith('data:'));
            if (aiImages.length > 0) {
              imagesToAnalyze = aiImages;
            }
          }
        } catch (subErr) {
          console.warn("Could not fetch from subcollection:", subErr);
        }
      }
      
      // Priority 2: Use stored base64 images (legacy - in main doc)
      if (imagesToAnalyze.length === 0 && formData.images_base64?.length > 0 && formData.images_base64[0]?.startsWith?.('data:')) {
        imagesToAnalyze = formData.images_base64;
      } 
      
      // Priority 3: Check if images are already base64 or blobs (from recent adds)
      if (imagesToAnalyze.length === 0 && formData.images.length > 0) {
        const firstImg = formData.images[0];
        const isBase64 = typeof firstImg === 'string' && firstImg.startsWith('data:');
        const isBlob = firstImg instanceof Blob;
        const isBlobUrl = typeof firstImg === 'string' && firstImg.startsWith('blob:');
        
        if (isBase64 || isBlob || isBlobUrl) {
          imagesToAnalyze = formData.images;
        } else {
          // Images are Firebase URLs - CORS will block
          alert("This item needs photos re-added for AI analysis.\n\nPlease:\n1. Delete the photos using the X buttons\n2. Re-add them using the + button\n3. Then try AI analysis again");
          setIsAnalyzing(false);
          return;
        }
      }
      
      const analysis = await analyzeImages(
        imagesToAnalyze,
        formData.userNotes || "",
        formData
      );
      
      // Store base64 images in subcollection for future analysis
      if (formData.id && user) {
        const imagesToStore = imagesToAnalyze.slice(0, 4);
        for (let i = 0; i < imagesToStore.length; i++) {
          try {
            const b64 = await ensureBase64(imagesToStore[i]);
            if (b64) {
              // Compress for storage (1600px, 85%)
              const compressed = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  let width = img.width, height = img.height;
                  const maxDim = 1600;
                  if (width > maxDim || height > maxDim) {
                    if (width > height) { height *= maxDim / width; width = maxDim; }
                    else { width *= maxDim / height; height = maxDim; }
                  }
                  canvas.width = width; canvas.height = height;
                  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL("image/jpeg", 0.85));
                };
                img.onerror = () => resolve(b64); // Fallback to original
                img.src = b64;
              });
              await setDoc(
                doc(db, "artifacts", appId, "users", user.uid, "inventory", formData.id, "images_ai", `img_${i}`),
                { base64: compressed, index: i, createdAt: serverTimestamp() }
              );
            }
          } catch (storeErr) {
            console.error(`Failed to store base64 image ${i}:`, storeErr);
          }
        }
      }
      
      setFormData((prev) => ({
        ...prev,
        ...analysis,
        aiLastRun: new Date().toISOString(),
      }));
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Analysis failed: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddPhoto = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Show loading state
    setIsAnalyzing(true); // Reuse analyzing state for loading indicator
    
    try {
      const newImageUrls = [];
      const newBase64ForAI = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload to Firebase Storage to get URL (not base64 in document)
        const imageIndex = formData.images.length + i;
        const url = await uploadImageToStorage(file, user.uid, formData.id, imageIndex);
        newImageUrls.push(url);
        
        // Also store base64 for AI in subcollection
        try {
          const b64 = await compressImageForBase64Storage(file);
          await setDoc(
            doc(db, "artifacts", appId, "users", user.uid, "inventory", formData.id, "images_ai", `img_${imageIndex}`),
            { base64: b64, index: imageIndex, createdAt: serverTimestamp() }
          );
          newBase64ForAI.push(b64);
        } catch (err) {
          console.error("Failed to store base64 for AI:", err);
        }
      }
      
    setFormData((prev) => ({
      ...prev,
        images: [...prev.images, ...newImageUrls],
      }));
    } catch (err) {
      console.error("Failed to add photos:", err);
      alert("Failed to add photos: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
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
      
      const response = await askQuestion(formData.images, itemContext, userQuestion);
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
    <div className="fixed inset-0 z-50 bg-[#FDFBF7] overflow-y-auto mobile-web-modal-scroll">
      {/* Save Prompt Dialog */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 animate-in fade-in duration-150">
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
                className="btn-primary flex-1 px-4 py-2.5 text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl"
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
      
      {/* Full-page layout container */}
      <div 
        ref={modalContentRef}
        className="min-h-screen"
        style={{ background: "linear-gradient(135deg, #dcd8bf 0%, #d4dde6 100%)" }}
      >
        
        {/* STICKY HEADER - Folder Tab Design */}
        <div className="sticky top-0 z-10">
          {/* Transparent background - no container color */}
          <div className="bg-transparent pb-0">
            <div className="max-w-7xl mx-auto px-4 pt-2">
              {/* Single row: Back + Tabs + Actions (all on same line) */}
              <div className="flex items-end justify-between gap-3">
                {/* Back button */}
          <button
            onClick={() => hasUnsavedChanges ? setShowSavePrompt(true) : onClose()}
                  className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium text-sm transition-colors flex-shrink-0 mb-1"
          >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Back</span>
          </button>
          
                {/* Folder Tab Bar - Active tab connects to content below */}
                <div className="flex-1 flex justify-center items-end relative max-w-md mx-auto">
                  {/* Tab container - transparent background, no border/background */}
                  <div className="relative flex items-end gap-0 bg-transparent">
                    {/* Analysis Tab */}
              <button
                onClick={() => setActiveTab("details")}
                      className={`flex items-center gap-2 py-3 px-6 transition-all duration-300 font-bold text-sm relative ${
                  activeTab === "details" 
                          ? "z-20 bg-white text-rose-600 border-t border-l border-r border-stone-200/30" 
                          : "z-10 text-stone-500 bg-stone-200/60 hover:bg-stone-200/80"
                }`}
                      style={{
                        borderRadius: "12px 12px 0 0",
                        marginBottom: activeTab === "details" ? "-1px" : "0"
                      }}
              >
                      <Search className="w-4 h-4" />
                      <span>Analysis</span>
              </button>
                    
                    {/* Listing Tab */}
              <button
                onClick={() => setActiveTab("listing")}
                      className={`flex items-center gap-2 py-3 px-6 transition-all duration-300 font-bold text-sm relative ${
                  activeTab === "listing" 
                          ? "z-20 bg-[#f1f6ff] text-violet-600 border-t border-l border-r border-stone-200/30" 
                          : "z-10 text-stone-500 bg-stone-200/60 hover:bg-stone-200/80"
                }`}
                      style={{
                        borderRadius: "12px 12px 0 0",
                        marginBottom: activeTab === "listing" ? "-1px" : "0"
                      }}
              >
                      <Tag className="w-4 h-4" />
                      <span>Listing</span>
              </button>
            </div>
          </div>
          
                {/* Pill action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 mb-1">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || formData.images.length === 0}
                    className="btn-ai flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-50 to-violet-100/50 hover:from-violet-100 hover:to-violet-200 rounded-full text-xs font-semibold text-violet-700 hover:text-violet-800 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed border border-violet-200/50"
                    title={formData.title ? "Re-analyze with AI" : "Analyze with AI"}
                  >
                    {isAnalyzing ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{formData.title ? "Re-analyze" : "Analyze"}</span>
                  </button>
                  <button
                    onClick={() => setShowShareItemModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-50 to-rose-100/50 hover:from-rose-100 hover:to-rose-200 rounded-full text-xs font-semibold text-rose-600 hover:text-rose-700 shadow-sm transition-all border border-rose-200/50"
                    title="Share item"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Chevrons - Fixed outside content area */}
        {hasPrev && (
          <button
            onClick={() => handleItemTransition('prev')}
            className="btn-nav fixed left-2 md:left-4 lg:left-[calc(50%-700px)] top-1/2 -translate-y-1/2 z-50 p-3 bg-white hover:bg-stone-50 rounded-full shadow-lg border border-stone-200 text-stone-600 hover:text-stone-900"
            title="Previous item"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => handleItemTransition('next')}
            className="btn-nav fixed right-2 md:right-4 lg:right-[calc(50%-700px)] top-1/2 -translate-y-1/2 z-50 p-3 bg-white hover:bg-stone-50 rounded-full shadow-lg border border-stone-200 text-stone-600 hover:text-stone-900"
            title="Next item"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        
        {/* === MAIN CONTENT - Side by side on desktop, stacked on mobile === */}
        <div className="max-w-7xl mx-auto px-4 pt-0 pb-4 md:pb-6">
          {/* Unified panel - white for Analysis, blue tint for Listing */}
          <div 
            className={`rounded-2xl border border-stone-200/30 transition-colors duration-300 ${
              activeTab === "listing" ? "bg-[#f1f6ff]" : "bg-white"
            }`}
          >
          <div className={`flex lg:flex-row ${activeTab === "listing" ? "flex-col-reverse" : "flex-col"}`}>
            {/* LEFT COLUMN: Photos + Details - On mobile listing view, this comes AFTER the tuner */}
            <div className="lg:w-[380px] lg:shrink-0 relative z-20 lg:border-r lg:border-stone-100">
            <div className="overflow-visible p-5 lg:p-6">
              {/* Hero Image - cropped on mobile, square on desktop */}
              {formData.images.length > 0 ? (
                <div className="aspect-[4/3] lg:aspect-square bg-stone-100 rounded-xl overflow-hidden">
                  <img
                    src={formData.images[activeImageIdx]}
                    alt={formData.title || "Item"}
                    className="w-full h-full object-contain cursor-pointer bg-stone-50"
                    onClick={() => setIsLightboxOpen(true)}
                  />
                        </div>
              ) : (
                      <button
                  onClick={() => addPhotoInputRef.current?.click()}
                  className="aspect-[4/3] lg:aspect-square bg-stone-100 flex flex-col items-center justify-center text-stone-400 hover:bg-stone-200 hover:text-stone-500 transition-colors cursor-pointer w-full"
                >
                  <Camera size={40} />
                  <span className="text-sm font-medium mt-2">Add Photos</span>
                      </button>
              )}
              
              {/* Thumbnail Strip + Add Button - Draggable for reordering */}
              {formData.images.length > 0 && (
                <div className="flex gap-1.5 p-2 overflow-x-auto border-t border-stone-100">
                  {formData.images.map((img, idx) => (
                    <div
                      key={img}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative group flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                        idx === activeImageIdx 
                          ? 'border-rose-500 shadow-md scale-105' 
                          : draggedIdx === idx
                            ? 'border-violet-400 opacity-50'
                            : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newImages = formData.images.filter((_, i) => i !== idx);
                          setFormData(prev => ({ ...prev, images: newImages }));
                          if (activeImageIdx >= newImages.length) {
                            setActiveImageIdx(Math.max(0, newImages.length - 1));
                          }
                        }}
                        className="absolute top-0 right-0 w-5 h-5 bg-black/60 text-white rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                      {/* Drag hint on first image */}
                      {idx === 0 && formData.images.length > 1 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Drag to reorder
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Add Photo as thumbnail */}
                  <button
                    onClick={() => addPhotoInputRef.current?.click()}
                    className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors"
                    title="Add more photos"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={addPhotoInputRef}
                onChange={handleAddPhoto}
              />
              
              {/* Keep/Sell/TBD Status - directly below thumbnails */}
              <div className="flex items-center justify-center gap-1 mx-2 my-2 bg-stone-100 rounded-lg p-1">
                <button
                  onClick={() => setFormData((p) => ({ ...p, status: "keep" }))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    formData.status === "keep" 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-stone-500 hover:text-blue-600"
                  }`}
                >
                  <Lock size={11} />
                  Keep
                </button>
                <button
                  onClick={() => setFormData((p) => ({ ...p, status: "sell" }))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    formData.status === "sell" 
                      ? "bg-white text-emerald-600 shadow-sm" 
                      : "text-stone-500 hover:text-emerald-600"
                  }`}
                >
                  <Tag size={11} />
                  Sell
                </button>
                <button
                  onClick={() => setFormData((p) => ({ ...p, status: "TBD" }))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    formData.status === "TBD" || !formData.status || formData.status === "draft"
                      ? "bg-white text-amber-600 shadow-sm" 
                      : "text-stone-500 hover:text-amber-600"
                  }`}
                >
                  <HelpCircle size={11} />
                  TBD
                </button>
            </div>
              
              {/* Item Details - Inside the card */}
              <div className="p-2.5 space-y-1.5 border-t border-stone-100 overflow-visible">
                {/* Mobile-only: Title above details */}
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="lg:hidden w-full p-1.5 text-sm font-bold bg-stone-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white mb-1"
                  placeholder="Item title..."
                />
                
                {/* 2-column grid for fields - more compact */}
                <div className="grid grid-cols-2 gap-x-1.5 gap-y-1 overflow-visible">
                  <div className="overflow-visible">
                    <label className="block text-[8px] font-semibold text-stone-400 uppercase mb-0.5">Category</label>
                    <TruncatedMetadataField
                      label="Category"
                      value={formData.category || ""}
                      onChange={(val) => setFormData((p) => ({ ...p, category: val }))}
                      placeholder="Category"
                      fieldKey="category"
                    />
                  </div>
                  <div className="overflow-visible">
                    <label className="block text-[8px] font-semibold text-stone-400 uppercase mb-0.5">Era</label>
                    <TruncatedMetadataField
                      label="Era"
                      value={formData.era || ""}
                      onChange={(val) => setFormData((p) => ({ ...p, era: val }))}
                      placeholder="Era"
                      fieldKey="era"
                    />
                  </div>
                  <div className="overflow-visible">
                    <label className="block text-[8px] font-semibold text-stone-400 uppercase mb-0.5">Condition</label>
                    <TruncatedMetadataField
                      label="Condition"
                      value={formData.condition || ""}
                      onChange={(val) => setFormData((p) => ({ ...p, condition: val }))}
                      placeholder="Condition"
                      fieldKey="condition"
                    />
                  </div>
                  <div className="overflow-visible">
                    <label className="block text-[8px] font-semibold text-stone-400 uppercase mb-0.5">Materials</label>
                    <TruncatedMetadataField
                      label="Materials"
                      value={formData.materials || ""}
                      onChange={(val) => setFormData((p) => ({ ...p, materials: val }))}
                      placeholder="Materials"
                      fieldKey="materials"
                    />
                  </div>
                  <div className="overflow-visible">
                    <label className="block text-[8px] font-semibold text-stone-400 uppercase mb-0.5">Style</label>
                    <TruncatedMetadataField
                      label="Style"
                      value={formData.style || ""}
                      onChange={(val) => setFormData((p) => ({ ...p, style: val }))}
                      placeholder="Style"
                      fieldKey="style"
                    />
                  </div>
                  <div className="overflow-visible">
                    <label className="block text-[8px] font-semibold text-stone-400 uppercase mb-0.5">Maker, Markings</label>
                    <TruncatedMetadataField
                      label="Maker, Markings"
                      value={formData.maker ? (formData.markings ? `${formData.maker}, ${formData.markings}` : formData.maker) : (formData.markings || "")}
                      onChange={(val) => {
                        const commaIdx = val.indexOf(',');
                        if (commaIdx > -1) {
                          setFormData((p) => ({ 
                            ...p, 
                            maker: val.slice(0, commaIdx).trim(),
                            markings: val.slice(commaIdx + 1).trim()
                          }));
                        } else {
                          setFormData((p) => ({ ...p, maker: val, markings: "" }));
                        }
                      }}
                      placeholder="Maker, hallmarks..."
                      fieldKey="maker_markings"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* RIGHT COLUMN: Tab Content - Already inside unified white panel */}
            <div className="flex-1 min-w-0 relative z-10">
              {/* Content area - no additional background needed */}
              <div className="p-5 lg:p-6">
                {activeTab === "listing" ? (
                  <div>
                    {ListingGenerator ? (
                      <ListingGenerator formData={formData} setFormData={setFormData} marketLinks={marketLinks} />
                    ) : (
                      <div className="p-4 text-stone-500">Listing Generator not available</div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                  {/* Title - Desktop only (mobile has it in left column) */}
                  <input
                    type="text"
                    value={formData.title || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    className="hidden lg:block w-full p-2.5 text-base font-bold bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
                    placeholder="Item title..."
                  />
                  
                  {/* Valuation Card */}
                  {(formData.valuation_low || formData.valuation_high || formData.confidence) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-emerald-700">
                              ${formData.valuation_low || 0} – ${formData.valuation_high || 0}
                            </div>
                  {formData.confidence && (
                    <div 
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        formData.confidence === 'high' 
                          ? 'bg-emerald-200 text-emerald-800' 
                          : formData.confidence === 'medium' 
                            ? 'bg-amber-200 text-amber-800' 
                            : 'bg-red-200 text-red-800'
                      }`}
                    >
                      <Gauge className="w-3 h-3" />
                                {formData.confidence} confidence
                    </div>
                  )}
                </div>
                          {/* Editable value */}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-stone-400">Edit:</span>
                  <input
                    type="number"
                    value={formData.valuation_low || ""}
                              onChange={(e) => setFormData((p) => ({ ...p, valuation_low: e.target.value ? Number(e.target.value) : null }))}
                              className="w-16 p-1 text-xs bg-white/80 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              placeholder="Low"
                  />
                            <span className="text-stone-300">–</span>
                  <input
                    type="number"
                    value={formData.valuation_high || ""}
                              onChange={(e) => setFormData((p) => ({ ...p, valuation_high: e.target.value ? Number(e.target.value) : null }))}
                              className="w-16 p-1 text-xs bg-white/80 border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              placeholder="High"
                  />
                </div>
              </div>
              {formData.confidence_reason && (
                          <p className="text-[10px] text-emerald-600/80 italic mt-1">
                  {formData.confidence_reason}
                </p>
              )}
                      </div>
                      {formData.reasoning && (
                        <div className="px-3 py-2 border-t border-emerald-100">
                          <p className="text-xs text-stone-600 leading-relaxed">
                            <span className="font-semibold text-stone-700">Why this price:</span> {formData.reasoning}
                          </p>
            </div>
          )}
                    </div>
                  )}
              
                  {/* Details Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-3 space-y-3">
                    {/* Improve Analysis - collapsible questions */}
              {formData.questions && formData.questions.length > 0 && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl overflow-hidden">
                  <div 
                          className="bg-rose-100/50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors"
                    onClick={() => setShowQuestions(!showQuestions)}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-rose-600" />
                            <span className="text-sm font-bold text-rose-900">Improve Analysis</span>
                      <span className="text-[10px] uppercase font-bold text-rose-600 bg-white/50 px-2 py-0.5 rounded-full">
                              {formData.questions.length}
                    </span>
                          </div>
                      <ChevronRight className={`w-4 h-4 text-rose-400 transition-transform ${showQuestions ? 'rotate-90' : ''}`} />
                  </div>
                  
                  {showQuestions && (
                          <div className="p-3 space-y-2">
                      {formData.questions.map((q, idx) => (
                              <div key={idx}>
                                <label className="block text-xs font-semibold text-rose-800 mb-1">{q}</label>
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
                                  className="w-full p-2 text-sm bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                        </div>
                      ))}
                      <button
                        onClick={handleAnalyze}
                              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                              <RefreshCw className="w-3 h-3" /> Re-Appraise
                      </button>
                    </div>
                  )}
                </div>
              )}

                    {/* Description - auto-expand on desktop */}
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
                        Description
                      </label>
                      <textarea
                        ref={(el) => {
                          if (el && window.innerWidth >= 768) {
                            el.style.height = 'auto';
                            el.style.height = Math.max(el.scrollHeight, 150) + 'px';
                          }
                        }}
                        value={formData.details_description || formData.sales_blurb || ""}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, details_description: e.target.value }));
                          // Auto-expand on desktop/tablet
                          if (window.innerWidth >= 768) {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }
                        }}
                        placeholder="AI will generate a detailed description..."
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-sm leading-relaxed mobile-web-textarea-scroll"
                        style={{ minHeight: '150px', resize: 'none', overflow: 'hidden' }}
                      />
                    </div>

                    {/* Market Comps with Editable Search Terms */}
            {marketLinks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Market Comps
                          </h4>
                          <button
                            onClick={() => setShowSearchTerms(!showSearchTerms)}
                            className="text-[10px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                          >
                            <Settings className="w-3 h-3" />
                            {showSearchTerms ? 'Hide' : 'Edit'} Keywords
                          </button>
                        </div>
                        
                        {/* Editable Search Terms Panel */}
                        {showSearchTerms && (
                          <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-3 space-y-2">
                            <p className="text-[10px] text-violet-600 mb-2">
                              Edit search keywords to refine market comp results. Changes apply immediately.
                            </p>
                            
                            {/* Primary Search (eBay Sold) */}
                            <div>
                              <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                                eBay Search <span className="text-stone-400">(detailed)</span>
                              </label>
                              <input
                                type="text"
                                value={formData.search_terms || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, search_terms: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                                placeholder="e.g., Men's star sapphire ring 14k gold vintage"
                              />
                            </div>
                            
                            {/* Broad Search (other sites) */}
                            <div>
                              <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                                Broad Search <span className="text-stone-400">(Ruby Lane, 1stDibs, etc.)</span>
                              </label>
                              <input
                                type="text"
                                value={formData.search_terms_broad || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, search_terms_broad: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                                placeholder="e.g., star sapphire ring"
                              />
                            </div>
                            
                            {/* Auction Search */}
                            <div>
                              <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                                Auction Search <span className="text-stone-400">(LiveAuctioneers, etc.)</span>
                              </label>
                              <input
                                type="text"
                                value={formData.search_terms_auction || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, search_terms_auction: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                                placeholder="e.g., star sapphire cabochon ring"
                              />
                            </div>
                            
                            {/* Discogs Search (only for music) */}
                            {(formData.category || '').toLowerCase().includes('music') || 
                             (formData.category || '').toLowerCase().includes('record') || 
                             (formData.category || '').toLowerCase().includes('vinyl') ? (
                              <div>
                                <label className="text-[10px] font-medium text-stone-600 flex items-center gap-1 mb-0.5">
                                  Discogs Search <span className="text-stone-400">(Artist + Album)</span>
                                </label>
                                <input
                                  type="text"
                                  value={formData.search_terms_discogs || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, search_terms_discogs: e.target.value }))}
                                  className="w-full px-2 py-1.5 text-xs border border-violet-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                                  placeholder="e.g., Artist Album Name"
                                />
                              </div>
                            ) : null}
                          </div>
                        )}
                        
                        {/* Market Comp Links */}
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-1">
                  {marketLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                              className={`btn-comp flex items-center justify-center px-1.5 py-1.5 rounded border text-[10px] font-medium ${link.color}`}
                    >
                              {link.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

                    {/* Notes / Context - auto-expand on desktop */}
              <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> Notes / Context
                </label>
                <textarea
                       ref={(el) => {
                         if (el && window.innerWidth >= 1024) {
                           el.style.height = 'auto';
                           el.style.height = Math.max(el.scrollHeight, 60) + 'px';
                         }
                       }}
                       value={formData.provenance?.user_story || formData.userNotes || ""}
                       onChange={(e) => {
                          setFormData(prev => ({
                          ...prev,
                             userNotes: e.target.value,
                          provenance: { ...prev.provenance, user_story: e.target.value }
                          }));
                          // Auto-expand on desktop
                          if (window.innerWidth >= 1024) {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }
                       }}
                        placeholder="Add provenance, history, or notes... These details + any edits above are included when you Re-analyze with AI"
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:bg-white text-sm leading-relaxed placeholder:text-stone-400 resize-none lg:resize-none mobile-web-notes-scroll"
                        style={{ minHeight: '60px' }}
                />
              </div>
            </div>

              {/* --- Ask About This Item (AI Chat) --- */}
              <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className="w-full p-2 bg-gradient-to-r from-rose-50 to-amber-50 border-b border-stone-100 flex items-center justify-between hover:from-rose-100 hover:to-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Ask About This Item</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-stone-400">Chat with AI</span>
                    {showChat ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
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
          )}
            </div>
          </div>
          </div>
          </div>
        </div>
          
        {/* FOOTER with Delete and Save - Floating on mobile, integrated on desktop */}
        <div className="footer-bar sticky lg:relative bottom-0 left-0 right-0 bg-white/98 lg:bg-white backdrop-blur-md lg:backdrop-blur-none border-t border-stone-200/30 lg:border-stone-200 px-4 py-3 lg:py-4 z-10 lg:mt-6 lg:max-w-7xl lg:mx-auto lg:rounded-xl lg:border lg:shadow-sm">
          <style>{`
            .footer-bar {
              box-shadow: 0 -4px 16px rgba(0,0,0,0.12);
            }
            @media (min-width: 1024px) {
              .footer-bar {
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
              }
            }
          `}</style>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Trash Button */}
          <button
            onClick={() => {
              if (confirm("Delete this item permanently? This cannot be undone.")) {
                onDelete(item.id);
                onClose();
              }
            }}
              className="flex items-center gap-1.5 px-3 py-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium"
            title="Delete item"
          >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveAndClose}
            disabled={!hasUnsavedChanges}
              className={`btn-primary flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg ${
              hasUnsavedChanges
                  ? "bg-gradient-to-r from-stone-900 to-stone-800 hover:from-black hover:to-stone-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.2)]"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-sm"
            }`}
          >
            <Check className="w-4 h-4" />
              <span>Save</span>
          </button>
        </div>
      </div>
      </div>
      
      {/* Share Item Modal */}
      {showShareItemModal && (
        <ShareItemModal
          item={formData}
          user={user}
          onClose={() => setShowShareItemModal(false)}
        />
      )}
      
      {/* AI Analysis Loading Modal - Clean modal on semi-transparent backdrop */}
      {isAnalyzing && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            {/* Spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-violet-500 animate-pulse" />
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-stone-800 mb-2">
              ✨ AI Wizard at Work
            </h3>
            
            {/* Rotating fun messages */}
            <AILoadingMessages />
            
            {/* Progress hint */}
            <p className="text-stone-400 text-xs mt-4">
              This usually takes 5-10 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditModal;
export { EditModal };
