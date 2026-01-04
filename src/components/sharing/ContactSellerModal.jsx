import React, { useState } from 'react';
import { X, Check, Loader, MessageCircle } from 'lucide-react';

/**
 * Modal for contacting seller about an item
 */
const ContactSellerModal = ({ item, ownerName, onClose, onSend, sourceUrl = "" }) => {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const itemTitle = item.listing_title || item.title || "Vintage Item";
  const itemPrice = item.listing_price || Math.round((Number(item.valuation_low) + Number(item.valuation_high)) * 0.6);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address");
      return;
    }
    
    setSending(true);
    try {
      await onSend({ message, email, itemTitle, itemId: item.id });
      setSent(true);
    } catch (err) {
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };
  
  if (sent) {
    return (
      <div 
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-stone-900">Message Sent!</h3>
          <p className="text-stone-600 text-sm">
            {ownerName} will receive your message and can reply directly to your email.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-900">Contact {ownerName || "Seller"}</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-3">
          {item.images?.[0] && (
            <img src={item.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-800 text-sm line-clamp-1">{itemTitle}</p>
            <p className="text-emerald-700 font-bold text-sm">${itemPrice}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Your Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi, I'm interested in "${itemTitle}"...`}
              className="w-full p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none h-24"
              required
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              required
            />
            <p className="text-[10px] text-stone-400">The seller will reply directly to this email</p>
          </div>
          
          <button
            type="submit"
            disabled={sending || !message.trim() || !email.trim()}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactSellerModal;
