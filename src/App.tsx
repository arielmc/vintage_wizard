// @ts-nocheck
// Build: 2026-01-01-v3 - Component extraction in progress
// NOTE: This file is gradually being migrated to TypeScript
// Type checking is disabled until the refactoring is complete

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useParams, useLocation, useSearchParams, Navigate } from "react-router-dom";

// Extracted components
import { ScannerInterface } from './components/scanner';
import { LoginScreen, ProfilePage } from './components/auth';
import { ItemCard } from './components/inventory';
import { ContactSellerModal, ShareModal, ShareItemModal } from './components/sharing';
import { TipJar, PhotoUploadOverlay, AILoadingMessages, ProcessingOverlay, QuickActionMenu } from './components/common';
import { UploadStagingModal } from './components/upload';
import { EditModal } from './components/modals';
import { getDisplayTitle, formatTimeAgo, playSuccessFeedback } from './utils/helpers';
import { getMarketplaceLinks } from './utils/marketplaceLinks';
import { getFileUrl, uploadImageToStorage, imageToBase64FullRes, compressImageForBase64Storage } from './utils/imageUtils';
import { analyzeImagesWithGemini } from './services/gemini';
import { ListingGenerator } from './components/listing';
import { MAX_IMAGES_SINGLE_UPLOAD, MAX_IMAGES_PER_STACK, MAX_IMAGES_BULK_SESSION, MAX_BASE64_SIZE_BYTES, VALID_IMAGE_TYPES } from './config/constants';
import { useFirebase, useAuth } from './contexts';

// NOTE: Most components are still defined inline in this file
// Gradually migrating to separate files in ./components/
import {
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
  Home,
  User,
  Mail,
  Settings,
  ArrowLeft,
  Calendar,
  StickyNote,
  CheckSquare,
} from "lucide-react";

// Note: ScannerInterface is imported from ./components/scanner

// --- STACK CARD COMPONENT (Memoized - defined outside to prevent remounting) ---
const StackCard = React.memo(({ 
  stack, 
  index, 
  isSelected, 
  onSelect, 
  draggedIdx,
  isDragOverTarget,
  setIsDragOverTarget,
  setDraggedStackIdx,
  setExpandedStackIdx,
  isSelectionMode,
  onDrop
}) => {
  const isMulti = stack.files.length > 1;
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);
  const isBeingDragged = draggedIdx === index;
  const isDropTarget = draggedIdx !== null && draggedIdx !== index;
  const isActiveDropTarget = isDragOverTarget === index;
  const cardRef = useRef(null);

  // Get cached URL for File object (persists across unmounts/remounts)
  const coverFile = stack.files[0];
  const coverUrl = getFileUrl(coverFile);
  
  // Check if image is already loaded (from browser cache or previous render)
  useEffect(() => {
    if (coverUrl && imageRef.current) {
      const img = imageRef.current;
      if (img.complete && img.naturalHeight !== 0) {
        // Image already loaded (from cache)
        setImageLoaded(true);
      } else {
        // Image not loaded yet, wait for onLoad
        setImageLoaded(false);
      }
    }
  }, [coverUrl, stack.id]);

  const handleClick = () => {
    onSelect(stack.id);
  };
  
  const handleDoubleClick = () => {
    if (isMulti) {
      setExpandedStackIdx(index);
    }
  };

  const onDragStartHandler = (e) => {
    if (isSelectionMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.setData("application/json", JSON.stringify({ index, stackId: stack.id }));
    e.dataTransfer.effectAllowed = "move";
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(cardRef.current, rect.width / 2, rect.height / 2);
    }
    setTimeout(() => setDraggedStackIdx(index), 0);
  };

  const onDragOverHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedIdx !== null && draggedIdx !== index && isDragOverTarget !== index) {
      setIsDragOverTarget(index);
    }
  };

  const onDragLeaveHandler = (e) => {
    e.preventDefault();
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

  const onDropHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(sourceIdx) && sourceIdx !== index) {
      onDrop(e, index);
    }
    setIsDragOverTarget(null);
  };

  const onDragEndHandler = () => {
    setDraggedStackIdx(null);
    setIsDragOverTarget(null);
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`relative aspect-square group transition-all duration-200 select-none cursor-pointer ${
        isSelected ? "scale-95" : "hover:scale-[1.02]"
      }`}
    >
      {isMulti && (
        <div className="absolute inset-0 bg-stone-200 rounded-xl rotate-6 scale-95 border border-stone-300 shadow-sm z-[5] pointer-events-none" />
      )}
      {stack.files.length > 2 && (
        <div className="absolute inset-0 bg-stone-300 rounded-xl -rotate-3 scale-95 border border-stone-400 shadow-sm pointer-events-none" />
      )}

      <div className={`absolute inset-0 bg-white rounded-xl shadow-md border overflow-hidden z-10 transition-all duration-150 ${
        isSelected ? "border-rose-500 ring-4 ring-rose-500/30" : 
        isActiveDropTarget ? "border-emerald-400 ring-4 ring-emerald-400/40 scale-105" : 
        "border-stone-200"
      }`}>
        {!imageLoaded && (
          <div className="absolute inset-0 bg-stone-100 animate-pulse flex items-center justify-center">
            <Loader className="w-5 h-5 text-stone-300 animate-spin" />
          </div>
        )}
        
        {coverUrl && (
          <img 
            ref={imageRef}
            src={coverUrl} 
            className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            alt="stack cover"
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />
        )}
        
        <div className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center border-2 transition-colors shadow-sm ${
          isSelected ? "bg-rose-500 border-rose-500" : "bg-white/90 border-stone-300"
        }`}>
          {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
        </div>

        <div className={`absolute bottom-2 right-2 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-full pointer-events-none ${
          stack.files.length >= MAX_IMAGES_PER_STACK ? 'bg-red-600' : 
          stack.files.length >= MAX_IMAGES_PER_STACK - 2 ? 'bg-amber-600' : 
          'bg-black/70'
        }`}>
          {stack.files.length} {stack.files.length === 1 ? 'photo' : 'photos'}
          {stack.files.length >= MAX_IMAGES_PER_STACK && ' (MAX)'}
        </div>
        
        {isMulti && (
          <>
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 pointer-events-none shadow-sm">
              <Layers size={10} /> {stack.files.length}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedStackIdx(index); }}
              className="absolute bottom-2 left-2 bg-white/90 hover:bg-white text-stone-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
            >
              <Eye size={10} /> Open
            </button>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - compare by stack.id and File object reference (not stack object reference)
  // Function props (onSelect, onDrop, etc.) are stable via useCallback, so we don't need to compare them
  return (
    prevProps.stack.id === nextProps.stack.id &&
    prevProps.stack.files[0] === nextProps.stack.files[0] && // Compare File object reference (critical!)
    prevProps.index === nextProps.index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.draggedIdx === nextProps.draggedIdx &&
    prevProps.isDragOverTarget === nextProps.isDragOverTarget &&
    prevProps.isSelectionMode === nextProps.isSelectionMode
  );
});

// --- STAGING AREA COMPONENT (Smart Stacker) ---
const StagingArea = ({ files, onConfirm, onCancel, onAddMoreFiles, isProcessingBatch = false }) => {
  // Each stack is { id: string, files: File[] }
  const [stacks, setStacks] = useState([]);
  const [expandedStackIdx, setExpandedStackIdx] = useState(null); // For refining stacks
  
  // Selection Mode State - Default ON (no drag-drop, simpler UX)
  const [isSelectionMode, setIsSelectionMode] = useState(true);
  const [selectedStackIds, setSelectedStackIds] = useState(new Set());
  
  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading your photos...");
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [groupingFeedback, setGroupingFeedback] = useState(null);

  // Bulk default action: Upload + Analyze (recommended)
  const [bulkUploadAction, setBulkUploadAction] = useState("analyze"); // 'analyze' | 'upload'
  
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

  const handleConfirm = () => {
    // Pass the chosen action back to parent
    onConfirm?.(stacks, bulkUploadAction);
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

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    const sourceIdx = draggedStackIdxRef.current;
    if (sourceIdx === null || sourceIdx === dropIndex) return;

    setStacks(prevStacks => {
      const newStacks = [...prevStacks];
      const sourceStack = newStacks[sourceIdx];
    const targetStack = newStacks[dropIndex];

      // Check if merging would exceed limit
      const mergedCount = sourceStack.files.length + targetStack.files.length;
      if (mergedCount > MAX_IMAGES_PER_STACK) {
        setGroupingFeedback(`⚠️ Max ${MAX_IMAGES_PER_STACK} photos per item! This merge would create ${mergedCount}.`);
        setTimeout(() => setGroupingFeedback(null), 4000);
        draggedStackIdxRef.current = null;
        setDraggedStackIdx(null);
        return prevStacks;
      }

    // Merge source into target
    targetStack.files = [...targetStack.files, ...sourceStack.files];
    
    // Remove source
      newStacks.splice(sourceIdx, 1);
    
      return newStacks;
    });
    draggedStackIdxRef.current = null;
    setDraggedStackIdx(null);
  }, []); // Stable - uses ref instead of state

  // Toggle Selection - memoized to prevent prop changes
  const toggleSelect = useCallback((id) => {
      setSelectedStackIds(prev => {
        const newSet = new Set(prev);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
        return newSet;
      });
  }, []); // Empty deps - uses functional setState

  // Stack Selected Items
  const handleStackSelected = () => {
      if (selectedStackIds.size < 2) return;

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

      // Check if merging would exceed limit
      if (filesToStack.length > MAX_IMAGES_PER_STACK) {
        setGroupingFeedback(`⚠️ Max ${MAX_IMAGES_PER_STACK} photos per item! Selection has ${filesToStack.length} photos.`);
        setTimeout(() => setGroupingFeedback(null), 4000);
        return;
      }

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
                    <h3 className="font-bold text-stone-800">
                      Refine Stack ({stack.files.length}/{MAX_IMAGES_PER_STACK} photos)
                      {stack.files.length >= MAX_IMAGES_PER_STACK && <span className="ml-2 text-red-600 text-sm">MAX</span>}
                    </h3>
                    <p className="text-xs text-stone-500">
                      <span className="text-amber-600">⭐ First = Hero Image.</span> Drag to reorder.
                      {stack.files.length >= MAX_IMAGES_PER_STACK - 2 && stack.files.length < MAX_IMAGES_PER_STACK && (
                        <span className="ml-2 text-amber-600">({MAX_IMAGES_PER_STACK - stack.files.length} more allowed)</span>
                      )}
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

  // Drag/Drop state
  const [isDragOverTarget, setIsDragOverTarget] = useState(null);
  const draggedStackIdxRef = useRef(null); // Use ref to avoid closure issues in useCallback
  const [draggedStackIdx, setDraggedStackIdxState] = useState(null);
  
  // Helper to update both ref and state
  const setDraggedStackIdx = useCallback((value) => {
    draggedStackIdxRef.current = value;
    setDraggedStackIdxState(value);
  }, []);

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
      <div className="bg-white border-b border-stone-200 px-4 py-3 shadow-sm z-10">
         <div className="flex items-center justify-between">
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
                   {isLoading ? "Loading photos..." : "Tap photos to select, then combine or delete"}
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
         
         {/* Action Bar - shows when items selected */}
         {selectedStackIds.size > 0 && (
           <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
             <span className="text-xs text-stone-500 font-medium">{selectedStackIds.size} selected</span>
             <div className="flex-1" />
             {selectedStackIds.size >= 2 && (
               <button 
                 onClick={handleStackSelected}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors"
               >
                 <Layers className="w-3.5 h-3.5" /> Combine ({selectedStackIds.size})
               </button>
             )}
             <button 
               onClick={() => {
                 if (confirm(`Delete ${selectedStackIds.size} photo(s)?`)) {
                   const newStacks = stacks.filter(s => !selectedStackIds.has(s.id));
                   setStacks(newStacks);
                   setSelectedStackIds(new Set());
                   if (newStacks.length === 0) onCancel();
                 }
               }}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
             >
               <Trash2 className="w-3.5 h-3.5" /> Delete
             </button>
             <button 
               onClick={() => setSelectedStackIds(new Set())}
               className="px-2 py-1.5 text-stone-500 hover:text-stone-700 text-xs"
             >
               Clear
             </button>
           </div>
         )}
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
               <div className="w-20 h-20 border-4 border-stone-200 border-t-rose-500 rounded-full animate-spin" />
               <Camera className="w-8 h-8 text-stone-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
             </div>
             <div className="text-center max-w-xs">
               <p className="text-stone-700 font-medium mb-1 text-lg">{loadingMessage}</p>
               <p className="text-stone-500 text-sm mb-3">{files.length} photos to organize</p>
               {files.length > 5 && (
                 <p className="text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                   ⏳ AI is fast, but loading lots of images can be slow. Thanks for your patience!
                 </p>
               )}
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
                    draggedIdx={draggedStackIdx}
                    isDragOverTarget={isDragOverTarget}
                    setIsDragOverTarget={setIsDragOverTarget}
                    setDraggedStackIdx={setDraggedStackIdx}
                    setExpandedStackIdx={setExpandedStackIdx}
                    isSelectionMode={isSelectionMode}
                    onDrop={handleDrop}
                 />
              ))}
           </div>
         )}
      </div>

      {expandedStackIdx !== null && <ExpandedStackModal stackIndex={expandedStackIdx} />}

      {/* Processing Overlay */}
      {isProcessingBatch && (
        <ProcessingOverlay />
      )}

      {/* Premium Footer Action Bar */}
      <div className="bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* Stats Bar */}
        <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-500">
          <span className="font-medium">{totalPhotos} photos</span>
          <span className="text-stone-300">→</span>
          <span className="font-bold text-stone-700">{stacks.length} {stacks.length === 1 ? "item" : "items"}</span>
        </div>

        {/* Default Action Toggle */}
        <div className="px-4 py-2 border-b border-stone-100 bg-white flex items-center justify-between gap-3">
          <span className="text-[11px] text-stone-500 font-medium">After upload:</span>
          <div className="flex items-center bg-stone-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setBulkUploadAction("analyze")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                bulkUploadAction === "analyze"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-800"
              }`}
            >
              Upload + Analyze
            </button>
            <button
              type="button"
              onClick={() => setBulkUploadAction("upload")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                bulkUploadAction === "upload"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-800"
              }`}
            >
              Upload only
            </button>
          </div>
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
            onClick={() => {
              // Validate no stacks exceed limit
              const oversizedStacks = stacks.filter(s => s.files.length > MAX_IMAGES_PER_STACK);
              if (oversizedStacks.length > 0) {
                setGroupingFeedback(`⚠️ ${oversizedStacks.length} item(s) have more than ${MAX_IMAGES_PER_STACK} photos. Please ungroup or remove photos.`);
                setTimeout(() => setGroupingFeedback(null), 5000);
                return;
              }
              handleConfirm();
            }}
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

// Status Badge Component
const StatusBadge = ({ status }) => {
  const colors = {
    keep: "bg-blue-100 text-blue-800 border-blue-200",
    sell: "bg-green-100 text-green-800 border-green-200",
    TBD: "bg-amber-100 text-amber-800 border-amber-200",
    draft: "bg-amber-100 text-amber-800 border-amber-200",
    unprocessed: "bg-amber-100 text-amber-800 border-amber-200",
  };
  const displayStatus = (status === "unprocessed" || status === "draft" || status === "maybe") ? "TBD" : status;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[displayStatus] || colors.TBD} uppercase tracking-wide`}>
      {displayStatus}
    </span>
  );
};

// Skeleton Card with shimmer effect
const SkeletonCard = ({ showMessage = false, messageIndex = 0 }) => {
  const loadingHints = [
    "Loading treasures...",
    "Fetching your items...",
    "Almost there...",
    "Gathering inventory...",
    "Unpacking goodies...",
  ];
  
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-stone-100 shadow-sm flex flex-col h-full">
      <div className="aspect-square bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] relative">
        {showMessage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-rose-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[10px] text-stone-400 font-medium">{loadingHints[messageIndex % loadingHints.length]}</p>
            </div>
          </div>
        )}
      </div>
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
};

// Global Loading Overlay Component - Clean modal style
const LoadingOverlay = ({ message = "Processing...", subMessage = "" }) => {
  const [currentMsg, setCurrentMsg] = useState("");
  const funMessages = useMemo(() => [
    "Consulting the AI oracle...",
    "Teaching robots about antiques...",
    "Summoning appraisal spirits...",
    "Channeling grandma's attic wisdom...",
    "Asking the estate sale gods...",
    "Dusting off the price guides...",
    "Decoding maker's marks...",
    "Cross-referencing with eBay sold...",
    "Checking if it's MCM or just old...",
    "Determining: treasure or trash?",
    "Consulting the ghost of Antiques Roadshow...",
    "Running it through the time machine...",
    "Checking if this sparks joy AND profit...",
    "Googling with extra AI sauce...",
    "Asking 1000 vintage dealers at once...",
    "Scanning for hidden signatures...",
  ], []);
  
  const getRandomMessage = useCallback(() => {
    return funMessages[Math.floor(Math.random() * funMessages.length)];
  }, [funMessages]);
  
  useEffect(() => {
    setCurrentMsg(getRandomMessage());
    const interval = setInterval(() => {
      setCurrentMsg(getRandomMessage());
    }, 2200);
    return () => clearInterval(interval);
  }, [getRandomMessage]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-rose-500 animate-pulse" />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-stone-800 mb-2">{message}</h3>
        
        {/* Rotating fun messages */}
        <p className="text-stone-500 text-sm min-h-[20px] transition-all duration-300">
          {currentMsg}
        </p>
        
        {subMessage && (
          <p className="text-stone-400 text-xs mt-2">{subMessage}</p>
        )}
        
        {/* Progress hint */}
        <p className="text-stone-400 text-xs mt-4">
          This usually takes 5-10 seconds
        </p>
      </div>
    </div>
  );
};

// Note: ItemCard is imported from ./components/inventory
// Note: LoginScreen is imported from ./components/auth

// --- Truncated Metadata Field with Responsive Tooltip/Drawer ---
const TruncatedMetadataField = ({ label, value, onChange, placeholder, fieldKey, maxLength = 200 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fieldRef = useRef(null);
  const textareaRef = useRef(null);

  const displayValue = value || placeholder || "";

  // Detect mobile and check overflow
  useEffect(() => {
    const checkMobileAndOverflow = () => {
      setIsMobile(window.innerWidth <= 480);
      if (fieldRef.current) {
        // Only check overflow on mobile/tablet
        const shouldCheck = window.innerWidth <= 768;
        if (shouldCheck) {
          const hasOverflow = fieldRef.current.scrollWidth > fieldRef.current.clientWidth;
          setIsOverflowing(hasOverflow);
        } else {
          setIsOverflowing(false);
        }
      }
    };
    checkMobileAndOverflow();
    window.addEventListener('resize', checkMobileAndOverflow);
    return () => window.removeEventListener('resize', checkMobileAndOverflow);
  }, [value]);

  // Auto-expand textarea height
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 100), 200);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [editValue, isEditing]);

  const handleFieldClick = () => {
    setEditValue(value || "");
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const handleBackdropClick = () => handleSave();

  // Mobile: Bottom drawer
  if (isMobile && isEditing) {
    return (
      <>
        <div
          ref={fieldRef}
          onClick={handleFieldClick}
          className={`metadata-value ${isOverflowing ? 'has-overflow' : ''} ${!value ? 'text-stone-400' : 'text-stone-800'}`}
        >
          {displayValue}
        </div>
        {/* Backdrop */}
        <div
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 998,
            opacity: 1,
            visibility: 'visible',
            transition: 'all 0.3s',
          }}
        />
        {/* Bottom Drawer */}
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderRadius: '20px 20px 0 0',
            padding: '12px 20px 32px',
            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.15)',
            zIndex: 999,
            transform: 'translateY(0)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ width: '36px', height: '4px', background: '#D4CFC7', borderRadius: '2px', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF' }}>{label}</span>
            <button
              onClick={handleCancel}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F5F3F0', color: '#7A7267', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '14px 16px',
              border: '1.5px solid #E5E0D9',
              borderRadius: '12px',
              fontFamily: 'inherit',
              fontSize: '1rem',
              lineHeight: 1.6,
              resize: 'none',
              color: '#2D2A26',
              outline: 'none',
            }}
            placeholder={placeholder}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{editValue.length}/{maxLength}</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancel}
                style={{ padding: '12px 20px', background: '#F5F3F0', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 500, color: '#7A7267', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleSave}
                style={{ padding: '12px 24px', background: '#1a1816', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 500, color: 'white', cursor: 'pointer' }}
              >Done</button>
            </div>
          </div>
        </div>
        <style>{`
          .metadata-value {
            white-space: normal;
            overflow: visible;
            max-width: 100%;
            cursor: pointer;
            padding: 4px 8px;
            background: #FAFAF8;
            border-radius: 6px;
            border: 1.5px solid transparent;
            transition: all 0.2s;
            font-size: 10px;
            line-height: 1.4;
            min-height: 24px;
            display: block;
            word-wrap: break-word;
            word-break: break-word;
          }
          .metadata-value:hover {
            background: #F5F3F0;
            border-color: #E5E0D9;
          }
          @media (max-width: 768px) {
            .metadata-value {
              min-height: 40px;
              max-height: 120px;
              overflow-y: auto;
              padding: 10px 12px;
              font-size: 12px;
              line-height: 1.5;
            }
          }
          @media (max-width: 480px) {
            .metadata-value {
              min-height: 48px;
              max-height: 150px;
              padding: 12px 14px;
              font-size: 13px;
            }
          }
        `}</style>
      </>
    );
  }

  // Desktop/Tablet: Tooltip behavior
  return (
    <>
      <div
        className="metadata-value-wrapper"
        style={{ position: 'relative', overflow: 'visible', zIndex: isEditing ? 9999 : 'auto' }}
        onMouseEnter={() => !isEditing && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          ref={fieldRef}
          onClick={handleFieldClick}
          className={`metadata-value ${isOverflowing ? 'has-overflow' : ''} ${!value ? 'text-stone-400' : 'text-stone-800'}`}
          role="button"
          tabIndex={0}
          aria-label={`${label}: ${displayValue}. Click to edit.`}
          onKeyDown={(e) => e.key === 'Enter' && handleFieldClick()}
        >
          {displayValue}
        </div>

        {/* Hover tooltip (dark, read-only) */}
        {isHovering && !isEditing && isOverflowing && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1a1816',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              maxWidth: '300px',
              width: 'max-content',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            {displayValue}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                border: '8px solid transparent',
                borderTopColor: '#1a1816',
              }}
            />
          </div>
        )}

        {/* Edit tooltip (white, editable) */}
        {isEditing && (
          <>
            <div
              onClick={handleBackdropClick}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'transparent',
                zIndex: 9998,
              }}
            />
            <div
              className="tooltip editing"
              role="dialog"
              aria-label={`Edit ${label}`}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                color: '#2D2A26',
                border: '1.5px solid #D4A574',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                zIndex: 9999,
                minWidth: '320px',
                maxWidth: '400px',
                overflow: 'hidden',
              }}
            >
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={maxLength}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: 'none',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  resize: 'none',
                  minHeight: '100px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  color: '#2D2A26',
                  outline: 'none',
                }}
                placeholder={placeholder}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#FAFAF8',
                  borderTop: '1px solid #F0EDE9',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{editValue.length}/{maxLength}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCancel}
                    type="button"
                    style={{ padding: '8px 14px', background: 'transparent', border: 'none', color: '#7A7267', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', borderRadius: '6px' }}
                  >Cancel</button>
                  <button
                    onClick={handleSave}
                    type="button"
                    style={{ padding: '8px 16px', background: '#1a1816', color: 'white', border: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', borderRadius: '6px' }}
                  >Done</button>
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  border: '8px solid transparent',
                  borderTopColor: '#D4A574',
                }}
              />
            </div>
          </>
        )}
      </div>
      <style>{`
        .metadata-value {
          white-space: normal;
          overflow: visible;
          max-width: 100%;
          cursor: pointer;
          padding: 4px 8px;
          background: #FAFAF8;
          border-radius: 6px;
          border: 1.5px solid transparent;
          transition: all 0.2s;
          font-size: 10px;
          line-height: 1.4;
          min-height: 24px;
          display: block;
          word-wrap: break-word;
          word-break: break-word;
        }
        .metadata-value:hover {
          background: #F5F3F0;
          border-color: #E5E0D9;
        }
        @media (max-width: 768px) {
          .metadata-value {
            min-height: 40px;
            max-height: 120px;
            overflow-y: auto;
            padding: 10px 12px;
            font-size: 12px;
            line-height: 1.5;
          }
        }
        @media (max-width: 480px) {
          .metadata-value {
            min-height: 48px;
            max-height: 150px;
            padding: 12px 14px;
            font-size: 13px;
          }
        }
        @media (hover: none) and (pointer: coarse) {
          .tooltip:not(.editing) {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};


// Note: EditModal is imported from ./components/modals

// Note: AILoadingMessages is imported from ./components/common

// --- SHARED COLLECTION VIEW (Public) ---
// Note: formatTimeAgo, getDisplayTitle are imported from ./utils/helpers at top of file
const SharedCollectionView = ({ shareId, shareToken, filterParam, viewMode }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState(null);
  const [filter, setFilter] = useState(filterParam || "all");
  const [expandedItemIndex, setExpandedItemIndex] = useState(null); // Index in filteredItems
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, value_high, value_low, alpha
  const [contactModalItem, setContactModalItem] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Determine if this is a "for sale" view (hides prices, shows contact)
  const isForSaleMode = viewMode === 'forsale';

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
        setOwnerEmail(shareData.ownerEmail || null);
        
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
      {/* Header - Matching private mobile view style */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-20">
        {/* Row 1: Title + Search */}
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-stone-900 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-rose-400" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-serif font-bold text-stone-900 truncate">{ownerName}'s Collection</h1>
              <p className="text-[10px] text-stone-500 flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" /> Shared • {items.length} items
              </p>
            </div>
            {/* Search Icon */}
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isSearchOpen ? 'bg-rose-100 text-rose-600' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
            >
              {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
            {/* Get Your Own CTA */}
            <a 
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold rounded-full shadow-sm hover:shadow transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3" />
              Get Vintage Wizard
            </a>
          </div>
        </div>
        
        {/* Expandable Search Bar - Above categories when open */}
        {isSearchOpen && (
          <div className="border-t border-stone-100 bg-white px-4 py-3 animate-in slide-in-from-top duration-150">
            <div className="max-w-6xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-stone-100 border border-transparent focus:border-rose-300 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-stone-500 mt-2">{filteredItems.length} results for "{searchQuery}"</p>
              )}
            </div>
          </div>
        )}
        
        {/* Row 2: Filter Tabs + Value/Sort - Same style as private mobile */}
        {!filterParam && (
          <div className="border-t border-stone-50 bg-stone-50/50">
            <div className="max-w-6xl mx-auto px-4 py-2">
              {/* Filter Tabs - Tab style with underline */}
              <div className="flex items-center border-b border-stone-200 -mx-1">
                {[
                  { value: "all", label: "All" },
                  { value: "keep", label: "Keep" },
                  { value: "sell", label: "Sell" },
                  { value: "TBD", label: "TBD" },
                ].map(({ value: f, label: displayName }) => {
                  const stats = filterStats[f];
                  const isActive = filter === f;
                  
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-all ${
                        isActive
                          ? "border-stone-800 text-stone-900"
                          : "border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      {displayName}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-400'}`}>
                        {stats.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* Value + Sort Row */}
              <div className="flex items-center justify-between pt-2">
                {/* Value on left */}
                {filterStats[filter].high > 0 && (
                  <span className="text-sm font-bold text-emerald-600">
                    ${filterStats[filter].low.toLocaleString()} – ${filterStats[filter].high.toLocaleString()}
                  </span>
                )}
                {!filterStats[filter].high && <span />}
                
                {/* Sort on right */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs text-stone-500 bg-transparent border-none focus:outline-none cursor-pointer hover:text-stone-700"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="value_high">High $</option>
                  <option value="value_low">Low $</option>
                  <option value="alpha">A-Z</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
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
                isForSaleMode={isForSaleMode}
                ownerName={ownerName}
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
          isForSaleMode={isForSaleMode}
          ownerName={ownerName}
          onClose={() => setExpandedItemIndex(null)}
          onNext={() => setExpandedItemIndex(prev => Math.min(prev + 1, filteredItems.length - 1))}
          onPrev={() => setExpandedItemIndex(prev => Math.max(prev - 1, 0))}
          hasNext={expandedItemIndex < filteredItems.length - 1}
          hasPrev={expandedItemIndex > 0}
          onContactSeller={(item) => setContactModalItem(item)}
        />
      )}
      
      {/* Contact Seller Modal */}
      {contactModalItem && (
        <ContactSellerModal
          item={contactModalItem}
          ownerName={ownerName}
          onClose={() => setContactModalItem(null)}
          sourceUrl={window.location.href}
          onSend={async ({ message, email, itemTitle, itemId }) => {
            // Write to 'mail' collection - Firebase Trigger Email extension will send
            if (!ownerEmail) {
              throw new Error("Seller email not available. Please try again later.");
            }
            
            const itemPrice = contactModalItem.listing_price || 
              Math.round((Number(contactModalItem.valuation_low) + Number(contactModalItem.valuation_high)) * 0.6);
            
            try {
              const sourceLink = window.location.href;
              const skuLine = contactModalItem?.sku ? `SKU: ${contactModalItem.sku}` : "";
              await addDoc(collection(db, "mail"), {
                to: ownerEmail,
                replyTo: email,
                message: {
                  subject: `Inquiry about: ${itemTitle}`,
                  html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="background: linear-gradient(135deg, #f43f5e, #ec4899); padding: 20px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🧙 Vintage Wizard</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Someone is interested in your item!</p>
                      </div>
                      
                      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                        <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">
                          Inquiry about: ${itemTitle}
                        </h2>
                        <p style="margin: 0 0 8px 0; color: #10b981; font-weight: bold; font-size: 16px;">
                          Listed at: $${itemPrice}
                        </p>
                        ${skuLine ? `<p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;"><strong>${skuLine}</strong></p>` : ``}
                        <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">
                          <a href="${sourceLink}" style="color:#0f766e; text-decoration: underline;">View the public item page</a>
                        </p>
                        
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                          <p style="margin: 0; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                        </div>
                        
                        <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px;">
                          <strong>From:</strong> ${email}
                        </p>
                        
                        <a href="mailto:${email}?subject=Re: ${encodeURIComponent(itemTitle)}" 
                           style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                          Reply to Buyer
                        </a>
                      </div>
                      
                      <div style="padding: 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="margin: 0; color: #64748b; font-size: 12px;">
                          Reply directly to this email to respond to the buyer.
                        </p>
                        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">
                          Item ID: ${itemId?.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  `,
                  text: `Someone is interested in your item!\n\nInquiry about: ${itemTitle}\nListed at: $${itemPrice}\n${skuLine ? `${skuLine}\n` : ``}Public page: ${sourceLink}\n\nMessage:\n${message}\n\nFrom: ${email}\n\n---\nReply directly to this email to respond to the buyer.\nItem ID: ${itemId?.substring(0, 8).toUpperCase()}\n\nSent via Vintage Wizard`
                }
              });
              return true;
            } catch (err) {
              console.error("Failed to send contact email:", err);
              throw err;
            }
          }}
        />
      )}
      
      {/* Footer - Different for For Sale mode */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>Powered by Vintage Wizard</span>
          </div>
          <a 
            href="/"
            className="flex text-xs font-semibold text-rose-600 hover:text-rose-700 items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-full"
          >
            <span>Create yours</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </footer>
      
      {/* Contact Seller Modal (For Sale mode) */}
      {contactModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setContactModalItem(null)}>
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-stone-900">Contact {ownerName || "Seller"}</h2>
                <button onClick={() => setContactModalItem(null)} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-1">Re: {contactModalItem.title}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Your Message</label>
                <textarea
                  rows={4}
                  placeholder="Hi, I'm interested in this item..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Your Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <button
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Message
              </button>
              <p className="text-[10px] text-stone-400 text-center">
                Messages are sent directly to the seller's email
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Note: ContactSellerModal is imported from ./components/sharing

// Simplified card for shared view (read-only)
// Shared Item Card with expanded view, image gallery, and item navigation
const SharedItemCard = ({ item, onExpand, isExpandedView, isForSaleMode, ownerName, onClose, onNext, onPrev, hasNext, hasPrev, onContactSeller }) => {
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
    const midPrice = (() => {
      const low = Number(item.valuation_low) || 0;
      const high = Number(item.valuation_high) || 0;
      if (!low && !high) return null;
      // midpoint, rounded to a "normal" number
      const mid = Math.round((low + high) / 2);
      return mid;
    })();
    return (
      <div
        onClick={() => onExpand?.(item)}
        className="card-hover group bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden cursor-pointer"
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
          
          {/* Value - show listing price in For Sale mode, midpoint otherwise */}
          {(isForSaleMode ? (item.listing_price || midPrice) : (midPrice && midPrice > 0)) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
              <p className="text-white font-bold text-sm drop-shadow-md">
                {isForSaleMode 
                  ? `$${item.listing_price || midPrice || 'Contact'}` 
                  : `$${midPrice}`}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-2.5">
          {/* Status + confidence (match logged-in glanceability) */}
          {!isForSaleMode && (
            <div className="flex items-center justify-between gap-2 mb-1">
              <StatusBadge status={item.status || "TBD"} />
              {item.confidence && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    item.confidence === 'high' ? 'text-emerald-600' :
                    item.confidence === 'medium' ? 'text-amber-600' :
                    'text-stone-500'
                  }`}
                  title={item.confidence_reason || 'AI confidence'}
                >
                  {item.confidence}
                </span>
              )}
            </div>
          )}
          <h3 className="font-semibold text-stone-800 text-sm line-clamp-1">
            {isForSaleMode ? (item.listing_title || item.title || "Vintage Item") : getDisplayTitle(item)}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
            {isForSaleMode 
              ? (item.category || "Vintage")
              : ([item.maker, item.era, item.materials].filter(v => v && String(v).toLowerCase() !== "unknown").slice(0, 2).join(" • ") || item.category || "")}
          </p>
          {/* Compact chips row (full details shared library only) */}
          {!isForSaleMode && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.category && (
                <span className="px-1.5 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-[10px] text-stone-600">
                  {item.category}
                </span>
              )}
              {item.condition && (
                <span className="px-1.5 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-[10px] text-stone-600">
                  {item.condition}
                </span>
              )}
              {item.sku && (
                <span className="px-1.5 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-[10px] text-stone-600">
                  SKU: {item.sku}
                </span>
              )}
            </div>
          )}
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
        
        {/* Details - Different content for For Sale mode vs Library mode */}
        <div className="p-4 space-y-3">
          {isForSaleMode ? (
            // FOR SALE MODE: Show listing content
            <>
              <h2 className="text-lg font-bold text-stone-900">
                {item.listing_title || item.title || "Vintage Item"}
              </h2>
              
              {/* Listing Price */}
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-emerald-700">
                  ${item.listing_price || Math.round((Number(item.valuation_low) + Number(item.valuation_high)) * 0.6) || 'Contact for price'}
                </span>
              </div>
              
              {/* Listing Description */}
              {(item.listing_description || item.sales_blurb) && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
                    {item.listing_description || item.sales_blurb}
                  </p>
                </div>
              )}
              
              {/* Tags */}
              {item.listing_tags && (
                <p className="text-xs text-blue-600">{item.listing_tags}</p>
              )}
              
              {/* SKU */}
              <p className="text-[10px] text-stone-400 pb-16">SKU: {item.id?.substring(0, 8).toUpperCase()}</p>
            </>
          ) : (
            // LIBRARY MODE: Show full item details
            <>
              <h2 className="text-lg font-bold text-stone-900">{getDisplayTitle(item)}</h2>
              
              {/* Value range with confidence */}
              {item.valuation_high > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-emerald-700">
                      ${item.valuation_low?.toLocaleString()} - ${item.valuation_high?.toLocaleString()}
                    </span>
                    {item.confidence && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.confidence === 'high' ? 'bg-emerald-200 text-emerald-800' :
                        item.confidence === 'medium' ? 'bg-amber-200 text-amber-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {item.confidence}
                      </span>
                    )}
                  </div>
                  {item.confidence_reason && (
                    <p className="text-xs text-emerald-600 italic">{item.confidence_reason}</p>
                  )}
                </div>
              )}
              
              {/* Details grid */}
              <div className="bg-stone-50 rounded-xl p-3 space-y-2">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {item.maker && item.maker.toLowerCase() !== "unknown" && (
                    <div>
                      <span className="text-stone-400 text-xs block">Maker/Brand</span>
                      <span className="font-medium text-stone-800">{item.maker}</span>
                    </div>
                  )}
                  {item.style && item.style.toLowerCase() !== "unknown" && (
                    <div>
                      <span className="text-stone-400 text-xs block">Style/Period</span>
                      <span className="font-medium text-stone-800">{item.style}</span>
                    </div>
                  )}
                  {item.era && item.era.toLowerCase() !== "unknown" && (
                    <div>
                      <span className="text-stone-400 text-xs block">Era</span>
                      <span className="font-medium text-stone-800">{item.era}</span>
                    </div>
                  )}
                  {item.materials && (
                    <div>
                      <span className="text-stone-400 text-xs block">Materials</span>
                      <span className="font-medium text-stone-800">{item.materials}</span>
                    </div>
                  )}
                  {item.condition && (
                    <div className="col-span-2">
                      <span className="text-stone-400 text-xs block">Condition</span>
                      <span className="font-medium text-stone-800">{item.condition}</span>
                    </div>
                  )}
                  {item.markings && (
                    <div className="col-span-2">
                      <span className="text-stone-400 text-xs block">Markings/Signatures</span>
                      <span className="font-medium text-stone-800">{item.markings}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Description */}
              {item.sales_blurb && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Description</h4>
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{item.sales_blurb}</p>
                </div>
              )}
              
              {/* AI Reasoning */}
              {item.reasoning && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 space-y-1">
                  <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Reasoning
                  </h4>
                  <p className="text-xs text-rose-700 leading-relaxed">{item.reasoning}</p>
                </div>
              )}
              
              {/* User Notes */}
              {(item.userNotes || item.provenance?.user_story) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
                  <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> Owner Notes
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">{item.provenance?.user_story || item.userNotes}</p>
                </div>
              )}
              
              {/* Listing Content Section */}
              {(item.listing_title || item.listing_description || item.listing_tags) && (
                <div className="pt-3 mt-3 border-t-2 border-dashed border-stone-200 space-y-3">
                  <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Listing Details
                  </h4>
                  
                  {/* Listing Title */}
                  {item.listing_title && (
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] text-violet-500 font-medium uppercase">Listing Title</span>
                      <p className="text-sm font-semibold text-violet-900">{item.listing_title}</p>
                    </div>
                  )}
                  
                  {/* Listing Price */}
                  {(item.listing_price || item.valuation_high > 0) && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                      <span className="text-[10px] text-green-600 font-medium uppercase block mb-1">Listed Price</span>
                      <span className="text-lg font-bold text-green-700">
                        ${item.listing_price || Math.round((Number(item.valuation_low) + Number(item.valuation_high)) * 0.6)}
                      </span>
                    </div>
                  )}
                  
                  {/* Listing Description (the fun one with dad jokes!) */}
                  {item.listing_description && (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] text-stone-500 font-medium uppercase">Description</span>
                      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{item.listing_description}</p>
                    </div>
                  )}
                  
                  {/* Listing Tags */}
                  {item.listing_tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.listing_tags.split(/[,\s]+/).filter(t => t.startsWith('#') || t.length > 0).map((tag, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Category */}
              {item.category && (
                <div className="flex items-center gap-2 text-xs text-stone-500 pt-2 border-t border-stone-100">
                  <Tag className="w-3 h-3" />
                  <span>{item.category}</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Sticky Footer - Contact Seller (For Sale mode only) */}
        {isForSaleMode && onContactSeller && (
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <button
              onClick={() => onContactSeller(item)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-lg shadow-rose-200 active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Contact {ownerName || "Seller"}
            </button>
            <span className="text-xl font-bold text-emerald-700">
              ${item.listing_price || Math.round((Number(item.valuation_low) + Number(item.valuation_high)) * 0.6) || 'Contact'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Note: ShareModal is imported from ./components/sharing

// Note: ShareItemModal is imported from ./components/sharing

// --- SHARED INDIVIDUAL ITEM VIEW (Public) ---
const SharedItemView = ({ userId, itemId, shareToken, viewType }) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [contactModalItem, setContactModalItem] = useState(null);

  const isListingMode = viewType === 'listing';

  useEffect(() => {
    const loadSharedItem = async () => {
      try {
        // Verify share token
        const shareDocRef = doc(db, "artifacts", appId, "item_shares", `${userId}_${itemId}`);
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
        setOwnerEmail(shareData.ownerEmail || null);
        
        // Load item from user's inventory
        const itemDocRef = doc(db, "artifacts", appId, "users", userId, "inventory", itemId);
        const itemDoc = await getDoc(itemDocRef);
        
        if (!itemDoc.exists()) {
          setError("This item is no longer available.");
          setLoading(false);
          return;
        }
        
        setItem({ id: itemDoc.id, ...itemDoc.data() });
        setLoading(false);
      } catch (err) {
        console.error("Error loading shared item:", err);
        setError("Failed to load item. Please try again.");
        setLoading(false);
      }
    };
    
    loadSharedItem();
  }, [userId, itemId, shareToken]);

  const images = item?.images?.length > 0 ? item.images : (item?.image ? [item.image] : []);

  // Generate market links for the shared item
  const marketLinks = useMemo(() => {
    if (!item) return [];
    return getMarketplaceLinks(
      item.category,
      item.search_terms,
      item.search_terms_broad,
      item.search_terms_discogs,
      item.search_terms_auction
    );
  }, [item]);

  const midPrice = useMemo(() => {
    const low = Number(item?.valuation_low) || 0;
    const high = Number(item?.valuation_high) || 0;
    if (!low && !high) return null;
    return Math.round((low + high) / 2);
  }, [item?.valuation_low, item?.valuation_high]);

  const formatDescriptionWithDadJoke = (text) => {
    if (!text || typeof text !== "string") return { pre: "", joke: null };
    const idx = text.indexOf("🤓");
    if (idx === -1) return { pre: text, joke: null };
    const pre = text.slice(0, idx).trimEnd();
    const joke = text.slice(idx).trim();
    return { pre, joke };
  };

  const handleContactSeller = () => {
    // Use in-app ContactSellerModal like shared sales collection
    setContactModalItem(item);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-4">
        <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center animate-pulse">
          <Sparkles className="w-7 h-7 text-rose-400" />
        </div>
        <p className="text-stone-500 text-sm">Loading item...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-6">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-xl font-bold text-stone-900 mb-2">Oops!</h1>
        <p className="text-stone-600 text-center max-w-md">{error}</p>
        <a 
          href="/"
          className="mt-6 px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors"
        >
          Go to Vintage Wizard
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-rose-400" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-serif font-bold text-stone-900">
                {isListingMode ? 'For Sale' : 'Shared Item'}
              </span>
              <span className="text-[10px] text-stone-500">by {ownerName}</span>
            </div>
          </div>
          <a
            href="https://vintage.yescraft.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-stone-600 hover:text-rose-600 text-xs font-medium flex items-center gap-1.5 transition-colors group"
          >
            <span>Try Vintage Wizard</span>
            <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start">
          {/* Left: Images */}
          <div>
            {/* Image Gallery */}
            {images.length > 0 && (
              <div className="mb-6 md:mb-0">
                <div className="aspect-square bg-stone-100 rounded-2xl overflow-hidden mb-3">
                  <img
                    src={images[activeImageIdx]}
                    alt={item.title || "Item"}
                    className="w-full h-full object-contain"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                          idx === activeImageIdx 
                            ? 'border-rose-500 shadow-md' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="md:sticky md:top-20">
            {/* Item Info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          {/* Title & Price */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-stone-900 mb-2">
              {isListingMode ? (item.listing_title || item.title || "Untitled Item") : (item.title || "Untitled Item")}
            </h1>
            
            {/* Price / Estimated value + Confidence */}
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                {isListingMode ? (
                  <span className="text-2xl font-bold text-emerald-600">
                    ${item.listing_price || midPrice || ""}
                  </span>
                ) : (
                  midPrice ? (
                    <span className="text-lg font-bold text-emerald-600">
                      ${midPrice}
                    </span>
                  ) : null
                )}
                {!isListingMode && (item.listing_price || midPrice) && (
                  <span className="text-xs text-stone-500">estimated value</span>
                )}
              </div>
              {/* Hide confidence on public sales pages */}
              {!isListingMode && item.confidence && (
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                    item.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                    item.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-stone-100 text-stone-600'
                  }`}
                  title={item.confidence_reason || 'AI confidence level'}
                >
                  {item.confidence}
                </span>
              )}
            </div>

            {/* AI reasoning - small, right under value */}
            {!isListingMode && (item.reasoning || item.confidence_reason) && (
              <p className="mt-2 text-[11px] text-stone-500 leading-relaxed">
                {item.reasoning || item.confidence_reason}
              </p>
            )}

            {/* SKU (sales + details) */}
            {item.sku && (
              <p className="mt-2 text-[11px] text-stone-400">
                SKU: <span className="font-mono text-stone-500">{item.sku}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            {(() => {
              const raw = isListingMode
                ? (item.listing_description || item.sales_description || item.sales_blurb || "No description available.")
                : (item.details_description || item.sales_blurb || "No description available.");
              const { pre, joke } = formatDescriptionWithDadJoke(raw);
              return (
                <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {pre}
                  {joke && (
                    <>
                      {"\n\n"}
                      <span className="italic text-stone-500">{joke}</span>
                    </>
                  )}
                </p>
              );
            })()}
          </div>

          {/* Details Grid (minimized) */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {item.category && (
              <div className="bg-stone-50 rounded-lg p-2">
                <span className="text-xs text-stone-400 uppercase tracking-wider">Category</span>
                <p className="font-medium text-stone-800">{item.category}</p>
              </div>
            )}
            {item.era && (
              <div className="bg-stone-50 rounded-lg p-2">
                <span className="text-xs text-stone-400 uppercase tracking-wider">Era</span>
                <p className="font-medium text-stone-800">{item.era}</p>
              </div>
            )}
            {item.maker && (
              <div className="bg-stone-50 rounded-lg p-2">
                <span className="text-xs text-stone-400 uppercase tracking-wider">Maker</span>
                <p className="font-medium text-stone-800">{item.maker}</p>
              </div>
            )}
            {item.condition && (
              <div className="bg-stone-50 rounded-lg p-2">
                <span className="text-xs text-stone-400 uppercase tracking-wider">Condition</span>
                <p className="font-medium text-stone-800">{item.condition}</p>
              </div>
            )}
            
            {/* Additional details only in details mode */}
            {!isListingMode && (
              <>
                {item.style && (
                  <div className="bg-stone-50 rounded-lg p-3">
                    <span className="text-xs text-stone-400 uppercase tracking-wider">Style</span>
                    <p className="font-medium text-stone-800">{item.style}</p>
                  </div>
                )}
                {item.materials && (
                  <div className="bg-stone-50 rounded-lg p-3">
                    <span className="text-xs text-stone-400 uppercase tracking-wider">Materials</span>
                    <p className="font-medium text-stone-800">{item.materials}</p>
                  </div>
                )}
                {item.markings && (
                  <div className="bg-stone-50 rounded-lg p-3 col-span-2">
                    <span className="text-xs text-stone-400 uppercase tracking-wider">Markings</span>
                    <p className="font-medium text-stone-800">{item.markings}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Market Research Links - compact horizontal layout */}
          {marketLinks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-3 h-3 text-stone-400" />
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Research Links</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {marketLinks.slice(0, 6).map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium transition-all hover:shadow-sm ${link.color}`}
                  >
                    <span>{link.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* Desktop contact button (prominent, like product pages) */}
          {isListingMode && (
            <div className="hidden md:block mt-4">
              <button
                onClick={handleContactSeller}
                className="w-full py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Contact {ownerName}
              </button>
              <p className="mt-2 text-[11px] text-stone-500 text-center">
                The seller will reply by email.
              </p>
            </div>
          )}

        {/* Contact Seller Modal (same as shared sales collection) */}
        {contactModalItem && (
          <ContactSellerModal
            item={contactModalItem}
            ownerName={ownerName}
            onClose={() => setContactModalItem(null)}
            sourceUrl={window.location.href}
            onSend={async ({ message, email, itemTitle, itemId }) => {
              if (!ownerEmail) {
                throw new Error("Seller email not available. Please try again later.");
              }
              const itemPrice =
                contactModalItem.listing_price ||
                Math.round(((Number(contactModalItem.valuation_low) || 0) + (Number(contactModalItem.valuation_high) || 0)) * 0.6);
              const sourceLink = window.location.href;
              const skuLine = contactModalItem?.sku ? `SKU: ${contactModalItem.sku}` : "";
              await addDoc(collection(db, "mail"), {
                to: ownerEmail,
                replyTo: email,
                message: {
                  subject: `Inquiry about: ${itemTitle}`,
                  html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="background: linear-gradient(135deg, #f43f5e, #ec4899); padding: 20px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🧙 Vintage Wizard</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Someone is interested in your item!</p>
                      </div>
                      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                        <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">
                          Inquiry about: ${itemTitle}
                        </h2>
                        <p style="margin: 0 0 8px 0; color: #10b981; font-weight: bold; font-size: 16px;">
                          Listed at: $${itemPrice}
                        </p>
                        ${skuLine ? `<p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;"><strong>${skuLine}</strong></p>` : ``}
                        <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">
                          <a href="${sourceLink}" style="color:#0f766e; text-decoration: underline;">View the public item page</a>
                        </p>
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                          <p style="margin: 0; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                        </div>
                        <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px;">
                          <strong>From:</strong> ${email}
                        </p>
                        <a href="mailto:${email}?subject=Re: ${encodeURIComponent(itemTitle)}"
                           style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                          Reply to Buyer
                        </a>
                      </div>
                      <div style="padding: 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="margin: 0; color: #64748b; font-size: 12px;">
                          Reply directly to this email to respond to the buyer.
                        </p>
                        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">
                          Item ID: ${itemId?.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  `,
                  text: `Someone is interested in your item!\n\nInquiry about: ${itemTitle}\nListed at: $${itemPrice}\n${skuLine ? `${skuLine}\n` : ``}Public page: ${sourceLink}\n\nMessage:\n${message}\n\nFrom: ${email}\n\n---\nReply directly to this email to respond to the buyer.\nItem ID: ${itemId?.substring(0, 8).toUpperCase()}\n\nSent via Vintage Wizard`,
                },
              });
              return true;
            }}
          />
        )}
          </div>
        </div>

        {/* Footer CTA: same width as layout + centered */}
        <div className="mt-10 pb-6 flex justify-center">
          <p className="text-[11px] text-stone-400 text-center max-w-md">
            Cataloged with{" "}
            <a
              href="https://vintage.yescraft.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-rose-600 font-semibold"
            >
              Vintage Wizard
            </a>{" "}
            — for collectors, sellers & the curious.
          </p>
        </div>
      </main>

      {/* Mobile sticky contact footer (sales pages only) */}
      {isListingMode && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 p-3 safe-area-pb">
          <button
            onClick={handleContactSeller}
            className="w-full py-3 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Contact {ownerName}
          </button>
        </div>
      )}
    </div>
  );
};

// Note: TipJar is imported from ./components/common
// Note: ProfilePage is imported from ./components/auth

export default function App() {
  // --- Firebase & Auth context ---
  const { db, appId, logAnalyticsEvent } = useFirebase();
  const { user, loading: authLoading, logout } = useAuth();

  // --- React Router hooks ---
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // --- Core state ---
  const [items, setItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [searchQuery, setSearchQuery] = useState(""); // Search state
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false); // For photo selection loading overlay
  const [loadingPhotoCount, setLoadingPhotoCount] = useState(0); // Track how many photos are being loaded
  const [stagingFiles, setStagingFiles] = useState([]); // Files waiting for user decision
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isGlobalAIAnalyzing, setIsGlobalAIAnalyzing] = useState(false); // For quick-analyze loading overlay
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false); // For mobile batch status menu
  const [isProcessing, setIsProcessing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareOrigin, setShareOrigin] = useState('bottom'); // 'top' | 'bottom' - controls animation direction
  // Quick Action Menu state
  const [contextMenu, setContextMenu] = useState(null); // { item, position: { x, y } }
  // Mobile search expand state
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef(null);
  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Share dropdown state (desktop) - includes share links, PDF, CSV
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const singleInputRef = useRef(null);
  const bulkInputRef = useRef(null);
  
  // Add menu dropdown state
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false); // Top dropdown
  const [isBottomAddMenuOpen, setIsBottomAddMenuOpen] = useState(false); // Bottom slide-up
  const addMenuRef = useRef(null);
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  
  // Mobile bottom nav state
  const [mobileExportOpen, setMobileExportOpen] = useState(false);
  
  // Share link state for direct copy
  const [collectionShareData, setCollectionShareData] = useState(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(null); // 'sales' | 'library' | null
  
  // --- URL-based state derived from routes ---
  // Check if we're viewing an item (URL: /item/:itemId)
  const itemIdFromUrl = location.pathname.startsWith('/item/') 
    ? location.pathname.split('/item/')[1]?.split('/')[0] 
    : null;
  
  // Check if we're on profile page (URL: /profile)
  const isProfileRoute = location.pathname === '/profile';
  
  // Check if we're on bulk upload page (URL: /bulk-upload)
  const isBulkUploadRoute = location.pathname === '/bulk-upload';
  
  // Check for share routes (URL: /share/:userId or /share/:userId/item/:itemId)
  const isShareRoute = location.pathname.startsWith('/share/');
  const sharePathParts = isShareRoute ? location.pathname.split('/share/')[1]?.split('/') : [];
  const shareUserId = sharePathParts[0] || null;
  const isIndividualItemShare = sharePathParts[1] === 'item' && sharePathParts[2];
  const sharedItemId = isIndividualItemShare ? sharePathParts[2] : null;
  const shareToken = searchParams.get('token');
  const shareMode = searchParams.get('mode') || 'library';
  const shareFilter = searchParams.get('filter');
  const shareViewType = searchParams.get('view') || 'details';
  
  // Derive selectedItem from URL
  const selectedItem = useMemo(() => {
    if (!itemIdFromUrl || items.length === 0) return null;
    return items.find(item => item.id === itemIdFromUrl) || null;
  }, [itemIdFromUrl, items]);
  
  // Navigation helpers
  const openItem = (item) => {
    navigate(`/item/${item.id}`);
  };
  
  const closeItem = () => {
    navigate('/');
  };
  
  const openProfile = () => {
    navigate('/profile');
  };
  
  const closeProfile = () => {
    navigate('/');
  };
  
  const openBulkUpload = () => {
    navigate('/bulk-upload');
  };
  
  const closeBulkUpload = () => {
    navigate('/');
  };
  
  // --- Handle legacy share query params (redirect to new route format) ---
  useEffect(() => {
    const legacyShareId = searchParams.get('share');
    const legacyToken = searchParams.get('token');
    if (legacyShareId && legacyToken && !isShareRoute) {
      const legacyMode = searchParams.get('mode') || 'library';
      const legacyFilter = searchParams.get('filter');
      let newUrl = `/share/${legacyShareId}?token=${legacyToken}&mode=${legacyMode}`;
      if (legacyFilter) newUrl += `&filter=${legacyFilter}`;
      navigate(newUrl, { replace: true });
    }
  }, [searchParams, isShareRoute, navigate]);
  
  // --- If viewing a shared individual item, show the item view ---
  if (isShareRoute && shareUserId && sharedItemId && shareToken) {
    return <SharedItemView userId={shareUserId} itemId={sharedItemId} shareToken={shareToken} viewType={shareViewType} />;
  }
  
  // --- If viewing a shared collection, show the public view ---
  if (isShareRoute && shareUserId && shareToken && !sharedItemId) {
    return <SharedCollectionView shareId={shareUserId} shareToken={shareToken} filterParam={shareFilter} viewMode={shareMode} />;
  }

  const handleQuickAnalyze = async (item) => {
      setIsGlobalAIAnalyzing(true);
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
      } finally {
        setIsGlobalAIAnalyzing(false);
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
    "Checking: heirloom or yard sale fodder?",
    "Determining the cool kid collector status...",
    "Scanning for hidden maker signatures...",
    "Googling with maximum AI energy...",
    "Asking 1000 vintage dealers simultaneously...",
    "Checking if these spark profit...",
    "Consulting with the estate sale spirits...",
    "Crunching decades of auction data...",
    "Separating the treasures from the trinkets...",
    "MCM? Art Deco? Just old? Let's find out...",
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
        let imagesToAnalyze = [];
        
        // Priority 1: Fetch from subcollection (new storage - full quality)
        try {
          const aiImagesSnapshot = await getDocs(
            collection(db, "artifacts", appId, "users", user.uid, "inventory", item.id, "images_ai")
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
          console.warn(`Could not fetch subcollection for item ${item.id}:`, subErr);
        }
        
        // Priority 2: Use stored base64 images (legacy - in main doc)
        if (imagesToAnalyze.length === 0 && item.images_base64?.length > 0) {
          imagesToAnalyze = item.images_base64;
        } 
        
        // Priority 3: Check if images are local (not Firebase URLs)
        if (imagesToAnalyze.length === 0 && item.images?.length > 0) {
          const firstImg = item.images[0];
          const isFirebaseUrl = typeof firstImg === 'string' && firstImg.includes('firebasestorage.googleapis.com');
          
          if (isFirebaseUrl) {
            console.error(`Item ${item.id} has Firebase URLs without stored base64 - skipping`);
            failCount++;
            continue; // Skip this item
          }
          imagesToAnalyze = item.images;
        }
        
        if (imagesToAnalyze.length === 0) {
          console.error(`Item ${item.id} has no analyzable images`);
          failCount++;
          continue;
        }
        
        console.log(`Analyzing item ${item.id} with ${imagesToAnalyze.length} images`);
        const analysis = await analyzeImagesWithGemini(
          imagesToAnalyze,
          item.userNotes || "",
          item
        );
        console.log(`Analysis successful for item ${item.id}:`, analysis?.title);
        await updateDoc(
          doc(db, "artifacts", appId, "users", user.uid, "inventory", item.id),
          { ...analysis, aiLastRun: new Date().toISOString() }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to analyze item ${item.id}:`, err);
        failCount++;
      }
    }
    
    setIsBatchProcessing(false);
    setBatchProgress({ current: 0, total: 0, message: '' });
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setIsStatusDropdownOpen(false);
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
    setIsStatusDropdownOpen(false);
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
    setIsStatusDropdownOpen(false);
    playSuccessFeedback();
    
    // Show toast
    const statusLabels = { keep: 'Keep', sell: 'Sell', TBD: 'TBD' };
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-4 py-2 rounded-xl shadow-xl text-sm font-medium z-[100] animate-in fade-in slide-in-from-bottom-4';
    toast.textContent = `✓ ${ids.length} items marked as ${statusLabels[newStatus] || newStatus}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

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

  // Load or create collection share data for direct link copying
  useEffect(() => {
    if (!user) return;
    const loadOrCreateCollectionShare = async () => {
      try {
        const shareDocRef = doc(db, "artifacts", appId, "shares", user.uid);
        const shareDoc = await getDoc(shareDocRef);
        
        if (shareDoc.exists()) {
          setCollectionShareData(shareDoc.data());
        } else {
          const newShareData = {
            userId: user.uid,
            ownerName: user.displayName || "A collector",
            ownerEmail: user.email,
            token: Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16),
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          await setDoc(shareDocRef, newShareData);
          setCollectionShareData(newShareData);
        }
      } catch (err) {
        console.error("Error loading collection share:", err);
      }
    };
    loadOrCreateCollectionShare();
  }, [user]);

  // Helper to copy collection share link
  const copyCollectionShareLink = (mode) => {
    if (!collectionShareData || !user) return;
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/share/${user.uid}?token=${collectionShareData.token}&mode=${mode}`;
    if (mode === 'forsale') url += '&filter=sell';
    navigator.clipboard.writeText(url);
    setShareLinkCopied(mode);
    playSuccessFeedback();
    setTimeout(() => setShareLinkCopied(null), 2000);
  };

  const handleFileSelect = async (e, mode) => {
    let files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Show loading overlay immediately for better mobile UX
    setIsLoadingPhotos(true);
    setLoadingPhotoCount(files.length);
    
    // Small delay to allow the overlay to render before processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      // Filter to valid image types only
      const validFiles = files.filter(f => 
        f.type.startsWith('image/') || VALID_IMAGE_TYPES.includes(f.type.toLowerCase())
      );
      
      const invalidCount = files.length - validFiles.length;
      if (invalidCount > 0) {
        console.warn(`Filtered out ${invalidCount} non-image files`);
      }
      
      files = validFiles;
      if (files.length === 0) {
        alert("No valid image files selected. Please select JPG, PNG, GIF, or WEBP files.");
        e.target.value = "";
        setIsLoadingPhotos(false);
        return;
      }
      
      // Update count after filtering
      setLoadingPhotoCount(files.length);
      
      // Single upload: Accept first N, show friendly message if extras dropped
      if (mode === 'single' && files.length > MAX_IMAGES_SINGLE_UPLOAD) {
        const droppedCount = files.length - MAX_IMAGES_SINGLE_UPLOAD;
        files = files.slice(0, MAX_IMAGES_SINGLE_UPLOAD);
        // Show toast notification instead of blocking alert
        setTimeout(() => {
          const toast = document.createElement('div');
          toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-xl shadow-lg z-[100] animate-in fade-in slide-in-from-top duration-200 text-sm font-medium';
          toast.innerHTML = `📷 Using first ${MAX_IMAGES_SINGLE_UPLOAD} photos (${droppedCount} extra not included)`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
        }, 100);
      }
      
      // Bulk upload: Accept first N with message
      if (mode === 'bulk' && files.length > MAX_IMAGES_BULK_SESSION) {
        const droppedCount = files.length - MAX_IMAGES_BULK_SESSION;
        files = files.slice(0, MAX_IMAGES_BULK_SESSION);
        setTimeout(() => {
          const toast = document.createElement('div');
          toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-xl shadow-lg z-[100] animate-in fade-in slide-in-from-top duration-200 text-sm font-medium';
          toast.innerHTML = `📷 Using first ${MAX_IMAGES_BULK_SESSION} photos (${droppedCount} extra not included)`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
        }, 100);
      }

      setStagingFiles(files);
      
      if (mode === 'bulk') {
         navigate('/bulk-upload'); // Go to smart stacker
      }
    } finally {
      // Hide loading after a short delay to ensure UI updates smoothly
      setTimeout(() => {
        setIsLoadingPhotos(false);
        setLoadingPhotoCount(0);
      }, 300);
    }
  };

  // Handle single item upload (from Modal)
  const handleConfirmSingleUpload = async (actionType) => {
     // Re-use existing logic but specialized for single
     await handleConfirmUpload('single', actionType, [stagingFiles]);
  };

  // Handle bulk stack upload (from Staging Area)
  const handleConfirmBulkUpload = async (stacks, bulkAction = "analyze") => {
     // stacks is Array<{ id, files: File[] }>
     const fileGroups = stacks.map(s => s.files);
     const actionType = bulkAction === "analyze" ? "process_batch_analyze" : "process_batch";
     await handleConfirmUpload('bulk', actionType, fileGroups);
     navigate('/'); // Return to dashboard
  };

  const handleConfirmUpload = async (uploadMode, actionType = "analyze_now", fileGroups = []) => {
    if (!user) return;
    // For single mode, fileGroups might be passed or use stagingFiles. 
    // To unify: always pass fileGroups.
    
    // Single Mode: fileGroups = [ [file1, file2] ] (One group)
    // Bulk Mode: fileGroups = [ [f1, f2], [f3], [f4, f5] ] (Multiple groups)

    const groupsToProcess = fileGroups.length > 0 ? fileGroups : [stagingFiles];
    if (groupsToProcess.length === 0 || groupsToProcess[0].length === 0) return;

    const shouldAutoAnalyze =
      (uploadMode === "single" && actionType === "analyze_now") ||
      (uploadMode === "bulk" && actionType === "process_batch_analyze");
    
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

        // Step 3: For IMMEDIATE AI analysis, use FULL RESOLUTION (details matter!)
        let analysisBase64 = [];
        if (shouldAutoAnalyze) {
          const imagesToAnalyze = groupFiles.slice(0, 4); // Max 4 for API payload
          for (const file of imagesToAnalyze) {
            try {
              const b64 = await imageToBase64FullRes(file); // Full resolution for AI
            if (b64 && typeof b64 === 'string' && b64.startsWith('data:')) {
                analysisBase64.push(b64);
            }
          } catch (err) {
            console.error("Failed to convert file to base64:", err);
            }
          }
        }

        // Step 4: Run AI analysis if this is single upload with analyze_now
        let analysisResult = {};
        if (shouldAutoAnalyze && analysisBase64.length > 0) {
          try {
            analysisResult = await analyzeImagesWithGemini(analysisBase64, "");
          } catch (aiError) {
            console.error("Auto-analysis failed:", aiError);
            alert(`Item uploaded, but AI analysis failed: ${aiError.message}`);
          }
        }

        // Step 5: Update the main document (NO base64 stored here - keeps doc small)
        await updateDoc(docRef, {
          images: imageUrls,
          image: imageUrls[0] || "",
          title: analysisResult.title || "",
          ...analysisResult,
          aiLastRun: shouldAutoAnalyze && analysisResult.title ? new Date().toISOString() : null
        });

        // Step 6: Store base64 images in SUBCOLLECTION for later AI analysis
        // Each image in its own doc, with progressive compression to stay under 1MB
        const imagesToStore = groupFiles.slice(0, 4); // Store up to 4 for later analysis
        let storedCount = 0;
        for (let i = 0; i < imagesToStore.length; i++) {
          try {
            const file = imagesToStore[i];
            // Skip non-image files
            if (!file.type.startsWith('image/')) {
              console.warn(`Skipping non-image file: ${file.name} (${file.type})`);
              continue;
            }
            const b64 = await compressImageForBase64Storage(file);
            await setDoc(
              doc(db, "artifacts", appId, "users", user.uid, "inventory", docRef.id, "images_ai", `img_${storedCount}`),
              { base64: b64, index: storedCount, createdAt: serverTimestamp() }
            );
            storedCount++;
          } catch (err) {
            console.error(`Failed to store base64 image ${i} (${imagesToStore[i]?.name}):`, err);
            // Continue with other images - don't fail the whole upload
          }
        }

        if (uploadMode === "single" && actionType === "edit_first") {
          // Navigate to the newly created item
          navigate(`/item/${docRef.id}`);
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
    if (user) {
      // Exclude large fields that should NOT be in main document (stored in subcollection instead)
      const { id, images_base64, ...safeData } = updatedItem;
      
      // Also ensure images array doesn't contain base64 strings (only URLs)
      if (safeData.images && Array.isArray(safeData.images)) {
        safeData.images = safeData.images.filter(img => 
          typeof img === 'string' && !img.startsWith('data:')
        );
      }
      
      await updateDoc(
        doc(db, "artifacts", appId, "users", user.uid, "inventory", updatedItem.id),
        safeData
      );
    }
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

  // Helper: Load base64 images from Firestore subcollection for an item
  const loadBase64ImagesForItem = async (itemId) => {
    if (!user?.uid || !itemId) return [];
    try {
      const imageDataRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory', itemId, 'images_ai');
      const snapshot = await getDocs(imageDataRef);
      return snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .sort((a, b) => (a.index || 0) - (b.index || 0))
        .map(d => d.base64)
        .filter(Boolean);
    } catch (e) {
      console.warn('Failed to load images from subcollection:', e?.message);
      return [];
    }
  };

  // Helper: Convert base64 data URL to image object for PDF
  const base64ToImageForPDF = (base64) => {
    if (!base64) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxSize = 300;
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
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: img.width,
            height: img.height
          });
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = base64;
    });
  };

  // Helper: Load image as base64 for PDF (preserves aspect ratio)
  // Primarily uses pre-loaded base64 data, falls back to URL fetch only if needed
  const loadImageForPDF = async (urlOrBase64) => {
    if (!urlOrBase64) return null;
    
    // If already base64, use directly
    if (urlOrBase64.startsWith('data:')) {
      return base64ToImageForPDF(urlOrBase64);
    }
    
    // For URLs, try fetch (usually fails due to CORS with Firebase Storage)
    try {
      const response = await fetch(urlOrBase64, { mode: 'cors' });
      if (!response.ok) throw new Error('Fetch failed');
      
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const maxSize = 300;
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
              resolve({
                dataUrl: canvas.toDataURL('image/jpeg', 0.8),
                width: img.width,
                height: img.height
              });
            } catch (e) {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = reader.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (fetchErr) {
      return null;
    }
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

  // Helper: sanitize text for jsPDF built-in fonts (avoid emoji / unsupported chars that render as Ø=...)
  function sanitizePdfText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      // Convert newlines to spaces for proper text wrapping
      .replace(/\r\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/\u00A0/g, " ")
      // remove emojis + non-latin symbols that break built-in font encoding
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      // remove any remaining non-printable/control chars
      .replace(/[^\x20-\x7E]/g, "")
      // collapse multiple spaces
      .replace(/\s+/g, " ")
      .trim();
  }

  // Helper: Wrap text to fit width
  const wrapText = (pdf, text, maxWidth) => {
    if (!text) return [];
    const sanitized = sanitizePdfText(text);
    const words = sanitized.split(' ');
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

  // PDF Export for Insurance/Records - Clean Catalog Layout
  const handleExportPDF = async () => {
    if (items.length === 0) return;
    setIsGeneratingPDF(true);
    
    try {
      // Pre-load all base64 images from Firestore subcollections (avoids CORS issues)
      const imageCache = {};
      await Promise.all(items.map(async (item) => {
        const base64Images = await loadBase64ImagesForItem(item.id);
        if (base64Images.length > 0) {
          imageCache[item.id] = base64Images;
        }
      }));
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Force plain built-in font to avoid wonky encoding/layout
      pdf.setFont('helvetica', 'normal');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      
      // Layout constants
      const imgColWidth = contentWidth * 0.25; // 25% for images
      const textColX = margin + imgColWidth + 8; // Text column starts after gap
      const textColWidth = contentWidth * 0.75 - 8; // 75% for text minus gap
      
      // Typography constants
      const titleSize = 12;
      const bodySize = 9;
      const labelSize = 8;
      const smallSize = 7;
      const lineHeight = 4;
      
      // Colors
      const black = [28, 25, 23];
      const grey = [120, 113, 108];
      const lightGrey = [200, 200, 200];
      const green = [22, 128, 61];
      
      // Status colors (minimal)
      const statusColors = {
        keep: { text: [22, 163, 74] },
        sell: { text: [180, 83, 9] },
        TBD: { text: [100, 100, 100] },
        draft: { text: [100, 100, 100] },
      };
      
      // Category order
      const categoryOrder = ['Jewelry & Watches', 'Books', 'Coins', 'Decor', 'Furniture', 'Vinyl & Music', 'Other'];
      
      // Group items by category
      const groupByCategory = (itemsList) => {
        const groups = {};
        itemsList.forEach(item => {
          let cat = item.category || 'Other';
          // Normalize category names
          if (cat.toLowerCase().includes('jewelry') || cat.toLowerCase().includes('watch')) cat = 'Jewelry & Watches';
          else if (cat.toLowerCase().includes('book')) cat = 'Books';
          else if (cat.toLowerCase().includes('coin')) cat = 'Coins';
          else if (cat.toLowerCase().includes('decor')) cat = 'Decor';
          else if (cat.toLowerCase().includes('furniture')) cat = 'Furniture';
          else if (cat.toLowerCase().includes('vinyl') || cat.toLowerCase().includes('music')) cat = 'Vinyl & Music';
          else if (!categoryOrder.includes(cat)) cat = 'Other';
          
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
        });
        return groups;
      };
      
      // === COVER PAGE ===
      pdf.setFontSize(24);
      pdf.setTextColor(...black);
      pdf.text(sanitizePdfText("Collection Inventory"), margin, 35);
      
      pdf.setFontSize(10);
      pdf.setTextColor(...grey);
      pdf.text(sanitizePdfText(`Prepared for: ${user?.displayName || user?.email || 'Collection Owner'}`), margin, 50);
      pdf.text(sanitizePdfText(`Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      })}`), margin, 68);
      
      // Summary stats
      const totalLow = items.reduce((sum, i) => sum + (Number(i.valuation_low) || 0), 0);
      const totalHigh = items.reduce((sum, i) => sum + (Number(i.valuation_high) || 0), 0);
      const sellItems = items.filter(i => i.status === 'sell');
      const keepItems = items.filter(i => i.status === 'keep');
      const tbdItems = items.filter(i => i.status !== 'sell' && i.status !== 'keep');
      
      let yPos = 85;
      
      // Stats section
      pdf.setDrawColor(...lightGrey);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      pdf.text(sanitizePdfText(`Total Items: ${items.length}`), margin, yPos);
      
      pdf.setFontSize(12);
      pdf.setTextColor(...green);
      pdf.text(sanitizePdfText(`Estimated Value: $${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}`), margin, yPos + 8);
      
      pdf.setFontSize(9);
      pdf.setTextColor(...grey);
      pdf.text(sanitizePdfText(`Keep: ${keepItems.length}   |   Sell: ${sellItems.length}   |   TBD: ${tbdItems.length}`), margin, yPos + 18);
      
      yPos += 30;
      pdf.setDrawColor(...lightGrey);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // === SUMMARY TABLE ===
      pdf.setFontSize(11);
      pdf.setTextColor(...black);
      pdf.text(sanitizePdfText("Summary"), margin, yPos);
      yPos += 8;
      
      // Table header
      pdf.setFontSize(8);
      pdf.setTextColor(...grey);
      pdf.text(sanitizePdfText("ITEM"), margin + 18, yPos);
      pdf.text(sanitizePdfText("CATEGORY"), margin + 90, yPos);
      pdf.text(sanitizePdfText("VALUE"), pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;
      
      // Table rows
      for (const item of items) {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          yPos = margin;
        }
        
        // Hero thumbnail - use cached base64 if available
        const cachedImages = imageCache[item.id] || [];
        const heroSrc = cachedImages[0] || item.images?.[0] || item.image;
        if (heroSrc) {
          try {
            const imgData = await loadImageForPDF(heroSrc);
            if (imgData) {
              const dims = fitImageToBox(imgData.width, imgData.height, 12, 12);
              pdf.addImage(imgData.dataUrl, 'JPEG', margin, yPos - 1, dims.width, dims.height, undefined, 'FAST');
            }
          } catch (e) {}
        }
        
        // Title
        pdf.setFontSize(9);
        pdf.setTextColor(...black);
        const rawTitle = getDisplayTitle(item);
        const title = sanitizePdfText(rawTitle.substring(0, 40) + (rawTitle.length > 40 ? '...' : ''));
        pdf.text(title, margin + 18, yPos + 4);
        
        // Category
        pdf.setFontSize(8);
        pdf.setTextColor(...grey);
        pdf.text(sanitizePdfText((item.category || 'Other').substring(0, 20)), margin + 90, yPos + 4);
        
        // Value
        if (item.valuation_high > 0) {
          pdf.setFontSize(9);
          pdf.setTextColor(...green);
          pdf.text(sanitizePdfText(`$${item.valuation_low || 0} - $${item.valuation_high}`), pageWidth - margin, yPos + 4, { align: 'right' });
        }
        
        yPos += 14;
        
        // Light divider
        pdf.setDrawColor(240, 240, 240);
        pdf.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(...grey);
      pdf.text(sanitizePdfText("For insurance, estate planning, and record-keeping purposes."), pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // === ITEM DETAIL PAGES BY CATEGORY ===
      const categoryGroups = groupByCategory(items);
      let itemIndex = 0;
      
      for (const cat of categoryOrder) {
        const catItems = categoryGroups[cat];
        if (!catItems || catItems.length === 0) continue;
        
        // New page for each category
        pdf.addPage();
        yPos = margin;
        
        // Category header - simple format: "category, # items"
        pdf.setFontSize(11);
        pdf.setTextColor(...black);
        pdf.text(sanitizePdfText(`${cat.toLowerCase()}, ${catItems.length} item${catItems.length > 1 ? 's' : ''}`), margin, yPos + 5);
        yPos += 14;
        
        // Items in this category
        for (let i = 0; i < catItems.length; i++) {
          const item = catItems[i];
          itemIndex++;
          
          // Estimate height needed for this item
          const itemImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
          const estimatedHeight = 70; // Base estimate
          
          // Check if we need new page
          if (yPos + estimatedHeight > pageHeight - 20) {
            pdf.addPage();
            yPos = margin;
            
            // Repeat category header on new page
            pdf.setFontSize(11);
            pdf.setTextColor(...grey);
            pdf.text(sanitizePdfText(`${cat} (continued)`), margin, yPos + 3);
            yPos += 10;
          }
          
          // Divider between items (not first)
          if (i > 0 || yPos > margin + 15) {
            pdf.setDrawColor(...lightGrey);
            pdf.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 6;
          }
          
          const itemStartY = yPos;
          let textY = yPos;
          
          // === LEFT COLUMN: Images (25%) ===
          // Use pre-loaded base64 images from Firestore subcollection (CORS-safe)
          const cachedBase64 = imageCache[item.id] || [];
          const imageSources = cachedBase64.length > 0 ? cachedBase64 : itemImages;
          const loadedImages = await Promise.all(
            imageSources.slice(0, 4).map(src => loadImageForPDF(src))
          );
          const validImages = loadedImages.filter(Boolean);
          
          let imgEndY = yPos;
          if (validImages.length > 0) {
            // Hero image
            const heroImg = validImages[0];
            const heroMaxHeight = 45;
            const dims = fitImageToBox(heroImg.width, heroImg.height, imgColWidth, heroMaxHeight);
            try {
              pdf.addImage(heroImg.dataUrl, 'JPEG', margin, yPos, dims.width, dims.height, undefined, 'MEDIUM');
              imgEndY = yPos + dims.height + 3;
            } catch (e) {
              // Image add failed, continue without it
            }
            
            // Secondary images stacked below
            if (validImages.length > 1) {
              let secondaryY = imgEndY;
              const secondarySize = 12;
              for (let j = 1; j < Math.min(validImages.length, 4); j++) {
                const img = validImages[j];
                try {
                  const sDims = fitImageToBox(img.width, img.height, secondarySize, secondarySize);
                  pdf.addImage(img.dataUrl, 'JPEG', margin + (j - 1) * (secondarySize + 2), secondaryY, sDims.width, sDims.height, undefined, 'FAST');
                } catch (e) {}
              }
              imgEndY = secondaryY + secondarySize + 3;
            }
          }
          
          // === RIGHT COLUMN: Text (75%) ===
          // Title (larger, heavier)
          pdf.setFontSize(titleSize);
          pdf.setTextColor(...black);
          const titleText = sanitizePdfText(getDisplayTitle(item));
          const titleLines = wrapText(pdf, titleText, textColWidth);
          titleLines.slice(0, 2).forEach((line, idx) => {
            pdf.text(line, textColX, textY + 4 + idx * 5);
          });
          textY += Math.min(titleLines.length, 2) * 5 + 4;
          
          // Status + Value line: "Keep: $50-$75, medium confidence"
          if (item.valuation_high > 0) {
            const statusText = (item.status || 'TBD').charAt(0).toUpperCase() + (item.status || 'tbd').slice(1).toLowerCase();
            const statusStyle = statusColors[item.status] || statusColors.draft;
            const valueText = sanitizePdfText(`$${item.valuation_low || 0} - $${item.valuation_high}`);
            
            pdf.setFontSize(labelSize);
            pdf.setTextColor(...statusStyle.text);
            pdf.text(sanitizePdfText(`${statusText}: `), textColX, textY);
            const statusWidth = pdf.getTextWidth(`${statusText}: `);
            
            pdf.setTextColor(...green);
            pdf.text(valueText, textColX + statusWidth, textY);
            
            if (item.confidence) {
              const valWidth = pdf.getTextWidth(valueText);
              pdf.setFontSize(smallSize);
              pdf.setTextColor(...grey);
              pdf.text(sanitizePdfText(`, ${item.confidence} confidence`), textColX + statusWidth + valWidth, textY);
            }
            textY += lineHeight + 2;
          }
          
          // Define field order (consistent for all items)
          const fieldDefs = [
            { label: 'Maker/Brand', value: item.maker },
            { label: 'Style/Period', value: item.style },
            { label: 'Era', value: item.era },
            { label: 'Materials', value: item.materials },
            { label: 'Markings', value: item.markings },
            { label: 'Condition', value: item.condition },
          ];
          
          // Render fields
          for (const field of fieldDefs) {
            if (!field.value || field.value.toLowerCase() === 'unknown') continue;
            
            pdf.setFontSize(labelSize);
            pdf.setTextColor(...grey);
            pdf.text(sanitizePdfText(`${field.label}: `), textColX, textY);
            const labelWidth = pdf.getTextWidth(`${field.label}: `);
            pdf.setTextColor(...black);
            const valueText = sanitizePdfText(field.value.length > 60 ? field.value.substring(0, 60) + '...' : field.value);
            pdf.text(valueText, textColX + labelWidth, textY);
            textY += lineHeight + 1;
          }
          
          // Helper to render a text block with proper line spacing
          const renderTextBlock = (label, text, maxLines = 6) => {
            if (!text) return;
            const textYBefore = textY;
            textY += 4;
            
            // Label
            pdf.setFontSize(smallSize);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...grey);
            pdf.text(sanitizePdfText(`${label}:`), textColX, textY);
            textY += lineHeight + 1;
            
            // Content - reset to normal font
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(smallSize);
            pdf.setTextColor(50, 50, 50);
            const lines = wrapText(pdf, text, textColWidth);
            const lineSpacing = 4;
            lines.slice(0, maxLines).forEach((line, idx) => {
              pdf.text(line, textColX, textY);
              textY += lineSpacing;
            });
            // Add small gap after block
            textY += 1;
          };
          
          // AI Description / Sales Blurb
          renderTextBlock('Description', item.details_description || item.sales_blurb, 4);
          
          // AI Reasoning
          renderTextBlock('AI Reasoning', item.reasoning, 4);
          
          // Confidence Reason
          if (item.confidence_reason) {
            renderTextBlock('Valuation Notes', item.confidence_reason, 2);
          }
          
          // User Notes
          const userNotes = item.userNotes || item.provenance?.user_story;
          renderTextBlock('Owner Notes', userNotes, 3);
          
          // === LISTING SECTION ===
          if (item.listing_title || item.listing_description || item.sales_description || item.listing_tags) {
            textY += 4;
            pdf.setDrawColor(...lightGrey);
            pdf.line(textColX, textY, textColX + textColWidth, textY);
            textY += 5;
            
            pdf.setFontSize(labelSize);
            pdf.setTextColor(...grey);
            pdf.text(sanitizePdfText('LISTING DETAILS'), textColX, textY);
            textY += lineHeight + 2;
            
            // Listing Price
            const listingPrice = item.listing_price || (item.valuation_high > 0 ? Math.round((Number(item.valuation_low) + Number(item.valuation_high)) * 0.6) : null);
            if (listingPrice) {
              pdf.setFontSize(labelSize);
              pdf.setTextColor(...grey);
              pdf.text(sanitizePdfText('Listed Price: '), textColX, textY);
              pdf.setTextColor(...green);
              pdf.text(`$${listingPrice}`, textColX + pdf.getTextWidth('Listed Price: '), textY);
              textY += lineHeight + 1;
            }
            
            // Listing Title
            if (item.listing_title) {
              pdf.setFontSize(labelSize);
              pdf.setTextColor(...grey);
              pdf.text(sanitizePdfText('Title: '), textColX, textY);
              pdf.setTextColor(...black);
              const ltText = sanitizePdfText(item.listing_title.length > 70 ? item.listing_title.substring(0, 70) + '...' : item.listing_title);
              pdf.text(ltText, textColX + pdf.getTextWidth('Title: '), textY);
              textY += lineHeight + 1;
            }
            
            // Listing Description (the one with dad jokes!)
            renderTextBlock('Listing Copy', item.sales_description || item.listing_description, 8);
            
            // Listing Tags
            if (item.listing_tags) {
              pdf.setFontSize(smallSize);
              pdf.setTextColor(...grey);
              pdf.text(sanitizePdfText('Tags: '), textColX, textY + 3);
              pdf.setTextColor(59, 130, 246); // blue
              const tagsText = sanitizePdfText(item.listing_tags.length > 100 ? item.listing_tags.substring(0, 100) + '...' : item.listing_tags);
              pdf.text(tagsText, textColX + pdf.getTextWidth('Tags: '), textY + 3);
              textY += lineHeight + 2;
            }
          }
          
          // Calculate final Y position (max of image column and text column)
          yPos = Math.max(imgEndY, textY) + 10;
        }
      }
      
      // Page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(...grey);
        pdf.text(sanitizePdfText(`Page ${p} of ${totalPages}`), pageWidth - margin, pageHeight - 8, { align: 'right' });
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
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-900 pb-32 md:pb-8">
      {/* Premium Global Button Hover Styles */}
      <style>{`
        /* Primary dark buttons - elegant lift with glow */
        .btn-primary {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(28, 25, 23, 0.35), 0 0 0 1px rgba(28, 25, 23, 0.05);
        }
        .btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px -2px rgba(28, 25, 23, 0.3);
        }

        /* Rose/Pink gradient buttons - warm glow */
        .btn-rose {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-rose:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 30px -5px rgba(225, 29, 72, 0.4), 0 4px 15px -3px rgba(225, 29, 72, 0.3);
        }
        .btn-rose:active {
          transform: translateY(0) scale(0.98);
        }

        /* Violet/Purple buttons - magical glow */
        .btn-violet {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-violet:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px -5px rgba(139, 92, 246, 0.45), 0 0 20px -5px rgba(167, 139, 250, 0.3);
        }

        /* Ghost/outline buttons - subtle lift */
        .btn-ghost {
          position: relative;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-ghost:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
        }

        /* Icon buttons - soft pulse */
        .btn-icon {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-icon:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.15);
        }
        .btn-icon:active {
          transform: scale(0.95);
        }

        /* Tab buttons - smooth underline glow */
        .btn-tab {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-tab:hover:not(.active) {
          background: rgba(0, 0, 0, 0.06);
          box-shadow: inset 0 -2px 0 0 rgba(0, 0, 0, 0.1);
        }

        /* Market comp links - color pop */
        .btn-comp {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-comp:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 6px 20px -3px currentColor;
          filter: brightness(1.1);
        }

        /* Copy buttons - satisfying press */
        .btn-copy {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-copy:hover {
          color: #e11d48;
          transform: scale(1.05);
        }
        .btn-copy:active {
          transform: scale(0.9);
        }

        /* Navigation chevrons - smooth glide */
        .btn-nav {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-nav:hover {
          transform: translateY(-50%) scale(1.15);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 4px rgba(255, 255, 255, 0.8);
        }

        /* Status pill buttons */
        .btn-status {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-status:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.1);
        }

        /* Regenerate/AI buttons - shimmer effect */
        .btn-ai {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-ai::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s ease;
        }
        .btn-ai:hover::before {
          left: 100%;
        }
        .btn-ai:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px rgba(139, 92, 246, 0.4);
        }

        /* Card hover for grid items */
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03);
        }
      `}</style>
      {/* --- Header --- */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-30 overflow-visible">
        {/* Row 1: Logo + Search + Actions */}
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo + Name - visible on all sizes */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center shadow-sm">
               <Sparkles className="w-4 h-4 text-rose-400" fill="currentColor" />
            </div>
            <h1 className="text-sm md:text-base font-serif font-bold text-stone-900 tracking-tight">
              <span className="md:hidden">{user.displayName?.split(' ')[0] || "My"}'s Vintage Wizard</span>
              <span className="hidden md:inline">{user.displayName?.split(' ')[0] || "My"}'s Collection</span>
            </h1>
          </div>
          
          {/* Spacer on mobile - clean header with just logo and title */}
          <div className="flex-1 md:hidden" />
          
          {/* Search Bar - Desktop only (mobile uses bottom nav) */}
          <div className="hidden md:flex flex-1 max-w-xs relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-stone-100 border border-transparent focus:border-stone-300 focus:bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all placeholder:text-stone-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
             {/* Add Dropdown */}
             <div className="relative" ref={addMenuRef}>
               <button
                 onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                 disabled={isUploading}
                 className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 shadow-sm disabled:opacity-50"
               >
                 <Plus className="w-4 h-4" />
                 <span>Add</span>
                 <ChevronDown className={`w-3 h-3 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
               </button>
               
               {isAddMenuOpen && (
                 <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                   <button
                     onClick={() => { singleInputRef.current?.click(); setIsAddMenuOpen(false); }}
                     className="w-full text-left px-3 py-3 text-xs hover:bg-stone-50 rounded-lg flex items-start gap-3 transition-all duration-150 group/item"
                   >
                     <div className="w-9 h-9 rounded-lg bg-rose-100 group-hover/item:bg-rose-200 flex items-center justify-center transition-colors shrink-0">
                       <Camera className="w-4 h-4 text-rose-600" />
                     </div>
                     <div>
                       <span className="block font-bold text-stone-800">One Item</span>
                       <span className="text-[11px] text-stone-500">Multiple angles, up to 6 photos</span>
                     </div>
                   </button>
                   <button
                     onClick={() => { bulkInputRef.current?.click(); setIsAddMenuOpen(false); }}
                     className="w-full text-left px-3 py-3 text-xs hover:bg-stone-50 rounded-lg flex items-start gap-3 transition-all duration-150 group/item"
                   >
                     <div className="w-9 h-9 rounded-lg bg-violet-100 group-hover/item:bg-violet-200 flex items-center justify-center transition-colors shrink-0">
                       <Images className="w-4 h-4 text-violet-600" />
                     </div>
                     <div>
                       <span className="block font-bold text-stone-800">Multiple Items</span>
                       <span className="text-[11px] text-stone-500">Up to 10 items, 4 photos each</span>
                     </div>
                   </button>
                 </div>
               )}
             </div>


             {/* Export Dropdown */}
             <div className="relative" ref={exportMenuRef}>
               <button
                 onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                 disabled={items.length === 0}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                   isExportMenuOpen 
                     ? 'bg-stone-100 text-stone-700 border-stone-300' 
                     : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                 } disabled:opacity-40`}
               >
                 <Share2 className="w-4 h-4" />
                 <span>Share</span>
                 <ChevronDown className={`w-3 h-3 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
               </button>
                
               {isExportMenuOpen && (
                 <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                   <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                     Share Collection
                   </div>
                    
                   <button
                     onClick={() => { copyCollectionShareLink('forsale'); }}
                     disabled={items.filter(i => i.status === 'sell').length === 0}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 transition-all duration-150 group/item disabled:opacity-40 disabled:cursor-not-allowed"
                   >
                     <div className="w-7 h-7 rounded-md bg-emerald-50 group-hover/item:bg-emerald-100 flex items-center justify-center transition-colors">
                       {shareLinkCopied === 'forsale' ? (
                         <Check className="w-3.5 h-3.5 text-emerald-600" />
                       ) : (
                         <Tag className="w-3.5 h-3.5 text-emerald-600" />
                       )}
                     </div>
                     <div className="flex-1">
                       <span className="block">{shareLinkCopied === 'forsale' ? 'Link Copied!' : 'Share Sales Items'}</span>
                       <span className="text-[10px] text-stone-400">
                         {items.filter(i => i.status === 'sell').length} items marked for sale
                       </span>
                     </div>
                   </button>
                   
                   <button
                     onClick={() => { copyCollectionShareLink('library'); }}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 transition-all duration-150 group/item"
                   >
                     <div className="w-7 h-7 rounded-md bg-violet-50 group-hover/item:bg-violet-100 flex items-center justify-center transition-colors">
                       {shareLinkCopied === 'library' ? (
                         <Check className="w-3.5 h-3.5 text-violet-600" />
                       ) : (
                         <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                       )}
                     </div>
                     <div className="flex-1">
                       <span className="block">{shareLinkCopied === 'library' ? 'Link Copied!' : 'Share Full Library'}</span>
                       <span className="text-[10px] text-stone-400">All {items.length} items</span>
                     </div>
                   </button>
                    
                   <div className="h-px bg-stone-100 my-1" />
                   
                   <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                     Export
                   </div>
                    
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

             {/* Profile Avatar - Desktop */}
             <div className="relative group cursor-pointer ml-1 z-50">
               <div 
                 onClick={openProfile}
                 className="transition-all duration-200 hover:scale-105 hover:shadow-md rounded-full"
               >
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
                   <div className="px-3 py-2.5 bg-gradient-to-r from-stone-50 to-stone-100 rounded-lg mb-1.5">
                     <p className="text-sm font-bold text-stone-900 truncate">{user.displayName}</p>
                     <p className="text-[10px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                       <Cloud className="w-2.5 h-2.5 text-emerald-500" /> Synced • {user.email}
                     </p>
                   </div>
                   
                   <button
                     onClick={openProfile}
                     className="w-full text-left px-3 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg flex items-center gap-2.5 transition-all duration-150 group/item"
                   >
                     <div className="w-7 h-7 rounded-md bg-stone-100 group-hover/item:bg-stone-200 flex items-center justify-center transition-colors">
                       <User className="w-3.5 h-3.5 text-stone-600" />
                     </div>
                     <span>Profile & Settings</span>
                   </button>
                   
                   <div className="h-px bg-stone-100 my-1" />
                   
                   <button
                     onClick={() => logout()}
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
        
        {/* Row 2: Filter Tabs + Value/Sort Row */}
        <div className="border-t border-stone-50 bg-stone-50/50 overflow-visible">
          <div className="max-w-7xl mx-auto px-4 py-2">
            {/* Filter Tabs - Tab style */}
            <div className="flex items-center border-b border-stone-200 -mx-1">
              {[
                { value: "all", label: "All" },
                { value: "keep", label: "Keep" },
                { value: "sell", label: "Sell" },
                { value: "TBD", label: "TBD" },
              ].map(({ value: f, label: displayName }) => {
                const stats = filterStats[f];
                const isActive = filter === f;
                
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-all ${
                      isActive
                        ? "border-stone-800 text-stone-900"
                        : "border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {displayName}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-400'}`}>
                      {stats.count}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Value + Sort Row OR Selection Actions Row */}
            {isSelectionMode ? (
              /* Selection Mode: Inline Action Bar (Mobile Web) */
              <div className="md:hidden flex items-center gap-2 pt-2 animate-in fade-in duration-150">
                {/* Count & Select All */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-violet-600">{selectedIds.size}</span>
                  <span className="text-xs text-stone-500">selected</span>
                  <button 
                    onClick={() => {
                      if (selectedIds.size === filteredItems.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(filteredItems.map(i => i.id)));
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all bg-stone-100 hover:bg-stone-200 text-stone-600"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      selectedIds.size === filteredItems.length && filteredItems.length > 0
                        ? 'bg-violet-500 border-violet-500' 
                        : 'border-stone-300 bg-white'
                    }`}>
                      {selectedIds.size === filteredItems.length && filteredItems.length > 0 && (
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      )}
                    </div>
                    All
                  </button>
                </div>
                
                <div className="flex-1" />
                
                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                  {/* Status dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      disabled={selectedIds.size === 0}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-30"
                    >
                      <span>Mark</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isStatusDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-50 min-w-[100px]">
                        <button 
                          onClick={() => { handleBatchStatusChange('keep'); setIsStatusDropdownOpen(false); }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Keep
                        </button>
                        <button 
                          onClick={() => { handleBatchStatusChange('sell'); setIsStatusDropdownOpen(false); }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-green-600 hover:bg-green-50 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Sell
                        </button>
                        <button 
                          onClick={() => { handleBatchStatusChange('TBD'); setIsStatusDropdownOpen(false); }}
                          className="w-full px-3 py-2 text-left text-xs font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          TBD
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* AI Analyze */}
                  <button 
                    onClick={handleBatchAnalyze}
                    disabled={isBatchProcessing || selectedIds.size === 0}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-rose-500 to-pink-500 text-white disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI</span>
                  </button>
                  
                  {/* Delete */}
                  <button 
                    onClick={handleBatchDelete}
                    disabled={selectedIds.size === 0}
                    className="p-1.5 rounded-lg transition-all text-red-500 hover:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  {/* Cancel */}
                  <button 
                    onClick={() => { setSelectedIds(new Set()); setIsSelectionMode(false); setIsStatusDropdownOpen(false); }} 
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Normal Mode: Value + Sort Row */
            <div className="flex items-center justify-between pt-2">
              {/* Value on left */}
              {filterStats[filter].high > 0 && (
                <span className="text-sm font-bold text-emerald-600">
                  ${filterStats[filter].low.toLocaleString()} – ${filterStats[filter].high.toLocaleString()}
                </span>
              )}
              {!filterStats[filter].high && <span />}
              
              {/* Multi-select + Sort on right */}
              <div className="flex items-center gap-3">
                  {/* Multi-select Button - Both mobile and desktop now */}
                <button
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className={`flex items-center gap-1.5 text-xs transition-all ${
                    isSelectionMode 
                      ? "text-violet-700" 
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                    <span className="hidden md:inline">Select</span>
                </button>
                  
                  {/* Divider - desktop only */}
                  <div className="hidden md:block w-px h-4 bg-stone-200" />
                
                {/* Sort */}
              <div className="relative group/sort">
                <button 
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  disabled={dataLoading}
                  className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-all"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                    {/* Hide text on mobile, show on desktop */}
                    <span className="hidden md:inline">
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
                
                {/* Sort Menu Dropdown */}
                {isSortMenuOpen && (
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsSortMenuOpen(false)} />
                )}
                {isSortMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
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
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${sortBy === opt.value ? "bg-rose-50 text-rose-700" : "text-stone-600 hover:bg-stone-50"}`}
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
             // Skeleton Loading Grid with message on first card
             Array.from({ length: 10 }).map((_, i) => (
                <SkeletonCard key={i} showMessage={i === 0} messageIndex={i} />
             ))
          ) : (
             filteredItems.map((item) => (
               <ItemCard 
                  key={item.id} 
                  item={item} 
                  onClick={openItem}
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

      {/* --- Batch Action Bar (Desktop Only - mobile uses inline bar in header) --- */}
      {isSelectionMode && (
         <>
            {/* Desktop: Slim bar below header */}
            <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-200 shadow-md animate-in slide-in-from-top duration-200">
              <div className="max-w-7xl mx-auto px-3 py-2">
                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} 
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
                   >
                      <X className="w-5 h-5" />
                   </button>
                   
                   <button 
                      onClick={() => {
                        if (selectedIds.size === filteredItems.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(filteredItems.map(i => i.id)));
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-stone-100 hover:bg-stone-200 text-stone-700"
                   >
                      {selectedIds.size === filteredItems.length ? "None" : "All"}
                   </button>
                   
                   <div className="w-px h-5 bg-stone-200" />
                   
                   <div className="flex items-center gap-0.5">
                      <button 
                         onClick={() => handleBatchStatusChange('keep')}
                         disabled={selectedIds.size === 0}
                         className="px-2 py-1.5 rounded-md text-xs font-bold transition-all hover:bg-blue-50 text-blue-600 disabled:opacity-30"
                      >
                         Keep
                      </button>
                      <button 
                         onClick={() => handleBatchStatusChange('sell')}
                         disabled={selectedIds.size === 0}
                         className="px-2 py-1.5 rounded-md text-xs font-bold transition-all hover:bg-green-50 text-green-600 disabled:opacity-30"
                      >
                         Sell
                      </button>
                      <button 
                         onClick={() => handleBatchStatusChange('TBD')}
                         disabled={selectedIds.size === 0}
                         className="px-2 py-1.5 rounded-md text-xs font-bold transition-all hover:bg-amber-50 text-amber-600 disabled:opacity-30"
                      >
                         TBD
                      </button>
                   </div>
                   
                   <div className="flex-1" />
                   
                   <span className="text-xs text-violet-600 font-bold">{selectedIds.size} selected</span>
                   
                   <button 
                      onClick={handleBatchAnalyze}
                      disabled={isBatchProcessing || selectedIds.size === 0}
                      className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 disabled:opacity-40"
                   >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI</span>
                   </button>
                   
                   <button 
                      onClick={handleBatchDelete}
                      disabled={selectedIds.size === 0}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30"
                   >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs font-bold">Delete</span>
                   </button>
                </div>
              </div>
            </div>
         </>
      )}

      {/* --- Mobile FAB removed for cleaner mobile UI --- */}

      {/* Processing Spinner Overlay - Clean modal style */}
      {isProcessing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            {/* Spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-violet-500 animate-pulse" />
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-stone-800 mb-2">✨ AI Wizard at Work</h3>
            
            {/* Description */}
            <p className="text-stone-500 text-sm mb-2">
              Identifying your item and finding its value
            </p>
            
            {/* Progress hint */}
            <p className="text-stone-400 text-xs mt-4">
              This usually takes 5-10 seconds
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
      
      {stagingFiles.length > 0 && !isBulkUploadRoute && (
         <UploadStagingModal 
            files={stagingFiles} 
            onConfirm={(mode, action) => handleConfirmSingleUpload(action)}
            onCancel={() => { setStagingFiles([]); if(singleInputRef.current) singleInputRef.current.value = ""; }}
         />
      )}

      {isBulkUploadRoute && stagingFiles.length > 0 && (
         <StagingArea 
            files={stagingFiles}
            onConfirm={handleConfirmBulkUpload}
            onCancel={() => { setStagingFiles([]); navigate('/'); if(bulkInputRef.current) bulkInputRef.current.value = ""; }}
            isProcessingBatch={isUploading}
         />
      )}

      {selectedItem && (
        <EditModal
          item={selectedItem}
          user={user}
          onClose={closeItem}
          onSave={handleUpdateItem}
          onDelete={handleDeleteItem}
          onNext={() => {
            const currentIdx = filteredItems.findIndex(i => i.id === selectedItem.id);
            if (currentIdx < filteredItems.length - 1) {
              navigate(`/item/${filteredItems[currentIdx + 1].id}`);
            }
          }}
          onPrev={() => {
            const currentIdx = filteredItems.findIndex(i => i.id === selectedItem.id);
            if (currentIdx > 0) {
              navigate(`/item/${filteredItems[currentIdx - 1].id}`);
            }
          }}
          hasNext={filteredItems.findIndex(i => i.id === selectedItem.id) < filteredItems.length - 1}
          hasPrev={filteredItems.findIndex(i => i.id === selectedItem.id) > 0}
          ListingGenerator={ListingGenerator}
        />
      )}
      
      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          user={user}
          items={items}
          onClose={() => setShowShareModal(false)}
          origin={shareOrigin}
        />
      )}
      
      {/* Photo Upload Loading Overlay - shows while photos are being selected/processed */}
      {isLoadingPhotos && (
        <PhotoUploadOverlay photoCount={loadingPhotoCount} />
      )}
      
      {/* Global Loading Overlay - shows during single item uploads (not bulk staging) */}
      {isUploading && !isBulkUploadRoute && (
        <LoadingOverlay 
          message="✨ Adding item..."
          accentColor="rose"
        />
      )}
      
      {/* Batch Processing Overlay with Progress - Clean modal style */}
      {isBatchProcessing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            {/* Spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-stone-800 mb-3">✨ Batch AI Processing</h3>
            
            {/* Progress bar */}
            <div className="w-full mb-4">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>{batchProgress.current} of {batchProgress.total}</span>
                <span className="font-bold">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            {/* Rotating witty messages */}
            <AILoadingMessages />
            
            {/* Progress hint */}
            <p className="text-stone-400 text-xs mt-4">
              Processing {batchProgress.total} items
            </p>
          </div>
        </div>
      )}

      {/* Global AI Analysis Loading Modal - For quick-analyze from item cards */}
      {isGlobalAIAnalyzing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            {/* Spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-violet-500 animate-pulse" />
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-stone-800 mb-2">✨ AI Wizard at Work</h3>
            
            {/* Rotating fun messages */}
            <AILoadingMessages />
            
            {/* Progress hint */}
            <p className="text-stone-400 text-xs mt-4">
              This usually takes 5-10 seconds
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
      
      {/* === MOBILE BOTTOM NAVIGATION === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-50/95 backdrop-blur-sm border-t border-stone-200 z-40 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Search */}
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className={`p-2.5 rounded-xl transition-all ${
              isMobileSearchOpen ? 'text-rose-600 bg-rose-100' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Search className="w-6 h-6" />
          </button>
          
          {/* Multi-select */}
          <button
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`p-2.5 rounded-xl transition-all ${
              isSelectionMode ? 'text-violet-600 bg-violet-100' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <CheckSquare className="w-6 h-6" />
          </button>
          
          {/* Add Button - Bigger, prominent */}
          <button
            onClick={() => setIsBottomAddMenuOpen(true)}
            className="w-14 h-14 -mt-4 bg-stone-900 rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors active:scale-95"
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
          
          {/* Share/Export */}
          <button
            onClick={() => setMobileExportOpen(true)}
            className={`p-2.5 rounded-xl transition-all ${
              mobileExportOpen ? 'text-rose-600 bg-rose-100' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Share2 className="w-6 h-6" />
          </button>
          
          {/* Profile/Avatar */}
          <button
            onClick={openProfile}
            className="p-1.5 rounded-xl hover:bg-stone-100 transition-all"
          >
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover ring-2 ring-stone-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center">
                <User className="w-5 h-5 text-stone-600" />
              </div>
            )}
          </button>
        </div>
      </nav>
      
      {/* Mobile Search Overlay - Semi-transparent, can see items behind */}
      {isMobileSearchOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <div 
            className="mx-4 mt-20 mb-20 bg-white rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  ref={mobileSearchRef}
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-10 py-3 text-sm bg-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {searchQuery && (
              <div className="space-y-2">
                <p className="text-xs text-stone-500">{filteredItems.length} results</p>
                {filteredItems.slice(0, 10).map(item => (
                  <button
                    key={item.id}
                    onClick={() => { navigate(`/item/${item.id}`); setIsMobileSearchOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 bg-stone-50 rounded-xl text-left hover:bg-stone-100 transition-colors"
                  >
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-stone-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">{item.title || 'Untitled'}</p>
                      <p className="text-xs text-stone-500">{item.category}</p>
                    </div>
                    {item.valuation_high > 0 && (
                      <span className="text-sm font-bold text-emerald-600">${item.valuation_low}-${item.valuation_high}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile Add Modal - Drops from top */}
      {isAddMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddMenuOpen(false)}>
          <div 
            className="absolute top-0 left-0 right-0 bg-white rounded-b-3xl p-6 pt-16 shadow-2xl animate-in slide-in-from-top duration-200"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-stone-900 mb-4">Add Items</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => { singleInputRef.current?.click(); setIsAddMenuOpen(false); }}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-rose-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-900">One Item</p>
                  <p className="text-xs text-stone-500">Multiple angles, up to 6 photos</p>
                </div>
              </button>
              
              <button
                onClick={() => { bulkInputRef.current?.click(); setIsAddMenuOpen(false); }}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Images className="w-6 h-6 text-violet-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-900">Multiple Items</p>
                  <p className="text-xs text-stone-500">Up to 10 items, 4 photos each</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setIsAddMenuOpen(false)}
              className="w-full mt-4 py-3 text-stone-500 font-medium"
            >
              Cancel
            </button>
            
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mt-2" />
          </div>
        </div>
      )}
      
      {/* Mobile Add Modal - Bottom (slides up from bottom nav) */}
      {isBottomAddMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setIsBottomAddMenuOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200 safe-area-pb"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-bold text-stone-900 mb-4">Add Items</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => { singleInputRef.current?.click(); setIsBottomAddMenuOpen(false); }}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-rose-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-900">One Item</p>
                  <p className="text-xs text-stone-500">Multiple angles, up to 6 photos</p>
                </div>
              </button>
              
              <button
                onClick={() => { bulkInputRef.current?.click(); setIsBottomAddMenuOpen(false); }}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Images className="w-6 h-6 text-violet-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-900">Multiple Items</p>
                  <p className="text-xs text-stone-500">Up to 10 items, 4 photos each</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setIsBottomAddMenuOpen(false)}
              className="w-full mt-4 py-3 text-stone-500 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Mobile Export Modal */}
      {mobileExportOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileExportOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200 safe-area-pb"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-bold text-stone-900 mb-4">Share & Export</h3>
            
            <div className="space-y-2">
              {/* Share Sales Items */}
              <button
                onClick={() => { copyCollectionShareLink('forsale'); }}
                disabled={items.filter(i => i.status === 'sell').length === 0}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  {shareLinkCopied === 'forsale' ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Tag className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-stone-900">{shareLinkCopied === 'forsale' ? 'Link Copied!' : 'Share Sales Items'}</p>
                  <p className="text-xs text-stone-500">{items.filter(i => i.status === 'sell').length} items for sale</p>
                </div>
              </button>
              
              {/* Share Full Library */}
              <button
                onClick={() => { copyCollectionShareLink('library'); }}
                disabled={items.length === 0}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  {shareLinkCopied === 'library' ? (
                    <Check className="w-5 h-5 text-violet-600" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-violet-600" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-stone-900">{shareLinkCopied === 'library' ? 'Link Copied!' : 'Share Full Library'}</p>
                  <p className="text-xs text-stone-500">All {items.length} items</p>
                </div>
              </button>
              
              <button
                onClick={() => { handleExportCSV(); setMobileExportOpen(false); }}
                disabled={items.length === 0}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Download className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-900">Export CSV</p>
                  <p className="text-xs text-stone-500">Download spreadsheet</p>
                </div>
              </button>
              
              <button
                onClick={() => { handleExportPDF(); setMobileExportOpen(false); }}
                disabled={items.length === 0 || isGeneratingPDF}
                className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  {isGeneratingPDF ? (
                    <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-stone-900">Export PDF Report</p>
                  <p className="text-xs text-stone-500">For insurance & records</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setMobileExportOpen(false)}
              className="w-full mt-4 py-3 text-stone-500 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Profile Page - uses useAuth() and useInventory() hooks internally */}
      {isProfileRoute && (
        <ProfilePage onClose={closeProfile} />
      )}
      
      {/* Tip Jar */}
      <TipJar />
    </div>
  );
}
