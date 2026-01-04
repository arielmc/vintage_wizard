import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from '../../config/firebase';
import { APP_ID } from '../../config/constants';
import { playSuccessFeedback } from '../../utils';
import { 
  Share2, 
  X, 
  Loader, 
  Check, 
  Tag, 
  BookOpen, 
  ShieldCheck 
} from 'lucide-react';

/**
 * Modal for sharing individual item
 */
const ShareItemModal = ({ item, user, onClose }) => {
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const loadShare = async () => {
      try {
        const shareDocRef = doc(db, "artifacts", APP_ID, "item_shares", `${user.uid}_${item.id}`);
        const shareDoc = await getDoc(shareDocRef);
        if (shareDoc.exists()) {
          setShareData(shareDoc.data());
        }
      } catch (err) {
        console.error("Error loading item share:", err);
      } finally {
        setLoading(false);
      }
    };
    loadShare();
  }, [user.uid, item.id]);

  const handleShareAndCopy = async (viewType) => {
    try {
      let currentShareData = shareData;
      
      if (!currentShareData || currentShareData.viewType !== viewType) {
        const shareId = `${user.uid}_${item.id}`;
        const newShareData = {
          itemId: item.id,
          userId: user.uid,
          viewType: viewType,
          token: currentShareData?.token || (Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16)),
          isActive: true,
          createdAt: currentShareData?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerName: user.displayName || "A collector",
          ownerEmail: user.email,
          itemTitle: item.title || "Untitled Item",
          itemImage: item.images?.[0] || item.image || null,
        };
        
        const shareDocRef = doc(db, "artifacts", APP_ID, "item_shares", shareId);
        await setDoc(shareDocRef, newShareData);
        currentShareData = newShareData;
        setShareData(newShareData);
      }
      
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/share/${user.uid}/item/${item.id}?token=${currentShareData.token}&view=${viewType}`;
      await navigator.clipboard.writeText(url);
      
      setCopied(viewType);
      playSuccessFeedback();
      setTimeout(() => setCopied(null), 2500);
    } catch (err) {
      console.error("Error sharing item:", err);
      alert("Failed to create share link. Please try again.");
    }
  };

  const handleRegenerateLink = async () => {
    if (!window.confirm("This will invalidate the existing share link. Continue?")) return;
    const newToken = Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
    const shareId = `${user.uid}_${item.id}`;
    const shareDocRef = doc(db, "artifacts", APP_ID, "item_shares", shareId);
    await updateDoc(shareDocRef, { token: newToken });
    setShareData({ ...shareData, token: newToken });
    setCopied(null);
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Share2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900">Share Item</h2>
              <p className="text-xs text-stone-500 truncate max-w-[180px]">{item.title || "Untitled"}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-rose-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => handleShareAndCopy('listing')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                  copied === 'listing'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-stone-200 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  copied === 'listing' ? 'bg-emerald-100' : 'bg-emerald-100'
                }`}>
                  {copied === 'listing' ? (
                    <Check className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Tag className="w-6 h-6 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-stone-800">
                    {copied === 'listing' ? 'Link Copied!' : 'Share Sales Listing'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {copied === 'listing' ? 'Ready to paste' : 'Price, photos & contact info'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleShareAndCopy('details')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                  copied === 'details'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-stone-200 hover:border-violet-400 hover:bg-violet-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  copied === 'details' ? 'bg-emerald-100' : 'bg-violet-100'
                }`}>
                  {copied === 'details' ? (
                    <Check className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-violet-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-stone-800">
                    {copied === 'details' ? 'Link Copied!' : 'Share Full Details'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {copied === 'details' ? 'Ready to paste' : 'All metadata, history & valuations'}
                  </p>
                </div>
              </button>

              {shareData && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl mt-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Anyone with the link can view.
                    <button onClick={handleRegenerateLink} className="underline ml-1 hover:text-amber-900">
                      Regenerate
                    </button> to revoke access.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareItemModal;
