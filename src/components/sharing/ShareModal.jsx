import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from '../../config/firebase';
import { APP_ID } from '../../config/constants';
import { playSuccessFeedback } from '../../utils';
import { 
  Share2, 
  X, 
  Loader, 
  Copy, 
  Check, 
  BookOpen, 
  Tag,
  ShieldCheck,
  Mail
} from 'lucide-react';

/**
 * Modal for sharing collection via link
 */
const ShareModal = ({ user, items, onClose, origin = 'bottom' }) => {
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);

  const sellItemsCount = items.filter(i => i.status === "sell").length;

  useEffect(() => {
    const loadOrCreateShare = async () => {
      try {
        const shareDocRef = doc(db, "artifacts", APP_ID, "shares", user.uid);
        const shareDoc = await getDoc(shareDocRef);
        
        if (shareDoc.exists()) {
          setShareData(shareDoc.data());
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
          setShareData(newShareData);
        }
        
        if (shareDoc.exists() && !shareDoc.data().ownerEmail && user.email) {
          await setDoc(shareDocRef, { ownerEmail: user.email }, { merge: true });
        }
      } catch (err) {
        console.error("Error with share:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrCreateShare();
  }, [user]);

  const getShareUrl = (mode) => {
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/share/${user.uid}?token=${shareData?.token || ""}&mode=${mode}`;
    if (mode === 'forsale') url += '&filter=sell';
    return url;
  };

  const handleCopy = (mode) => {
    navigator.clipboard.writeText(getShareUrl(mode));
    setCopied(mode);
    playSuccessFeedback();
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerateToken = async () => {
    if (!window.confirm("This will invalidate all existing share links. Continue?")) return;
    const newToken = Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
    const shareDocRef = doc(db, "artifacts", APP_ID, "shares", user.uid);
    await updateDoc(shareDocRef, { token: newToken });
    setShareData({ ...shareData, token: newToken });
  };

  const containerClass = origin === 'top' 
    ? "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 md:pt-24 p-4"
    : "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4";
  
  const modalClass = origin === 'top'
    ? "bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200"
    : "bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 fade-in duration-200";

  return (
    <div className={containerClass} onClick={onClose}>
      <div 
        className={modalClass}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Share2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900">Share & Export</h2>
              <p className="text-xs text-stone-500">Share links or download your collection</p>
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
            <div>
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 block">
                Share Link
              </label>
              
              {/* Library View Option */}
              <button
                onClick={() => setSelectedMode(selectedMode === 'library' ? null : 'library')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left mb-3 ${
                  selectedMode === 'library'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMode === 'library' ? 'bg-blue-100' : 'bg-stone-100'
                  }`}>
                    <BookOpen className={`w-5 h-5 ${selectedMode === 'library' ? 'text-blue-600' : 'text-stone-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-stone-900">Library View</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      All {items.length} items · Full details & valuations
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      For: appraisers, insurance, estate, family, friends
                    </p>
                  </div>
                </div>
                
                {selectedMode === 'library' && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getShareUrl('library')}
                        className="flex-1 p-2.5 bg-white border border-blue-200 rounded-lg text-xs text-stone-600 font-mono truncate"
                      />
                      <button
                        onClick={() => handleCopy('library')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-all ${
                          copied === 'library'
                            ? "bg-emerald-500 text-white" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {copied === 'library' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === 'library' ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </button>
              
              {/* For Sale View Option */}
              <button
                onClick={() => setSelectedMode(selectedMode === 'forsale' ? null : 'forsale')}
                disabled={sellItemsCount === 0}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedMode === 'forsale'
                    ? 'border-emerald-500 bg-emerald-50'
                    : sellItemsCount > 0
                      ? 'border-stone-200 hover:border-stone-300 bg-white'
                      : 'border-stone-100 bg-stone-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMode === 'forsale' ? 'bg-emerald-100' : 'bg-stone-100'
                  }`}>
                    <Tag className={`w-5 h-5 ${selectedMode === 'forsale' ? 'text-emerald-600' : 'text-stone-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-stone-900">For Sale View</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {sellItemsCount} items marked Sell · Listing info only
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      For: buyers, dealers, consignment shops
                    </p>
                  </div>
                </div>
                
                {selectedMode === 'forsale' && sellItemsCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getShareUrl('forsale')}
                        className="flex-1 p-2.5 bg-white border border-emerald-200 rounded-lg text-xs text-stone-600 font-mono truncate"
                      />
                      <button
                        onClick={() => handleCopy('forsale')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-all ${
                          copied === 'forsale'
                            ? "bg-emerald-500 text-white" 
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {copied === 'forsale' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied === 'forsale' ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-2 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Buyers can message you directly
                    </p>
                  </div>
                )}
              </button>
            </div>
            
            {/* Security Note */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Anyone with these links can view the specified items. 
                <button onClick={handleRegenerateToken} className="underline ml-1 hover:text-amber-900">
                  Generate new links
                </button> to revoke access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
