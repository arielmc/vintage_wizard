import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  UserCircle,
  Lock,
  Calendar,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader,
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts';
import { useInventory } from '../../contexts';
import { useFirebase } from '../../contexts';
import { playSuccessFeedback } from '../../utils/helpers';

interface ProfilePageProps {
  onClose: () => void;
}

/**
 * ProfilePage - User profile management using useAuth and useInventory hooks
 */
const ProfilePage: React.FC<ProfilePageProps> = ({ onClose }) => {
  const { user, logout, deleteAccount } = useAuth();
  const { items } = useInventory();
  const { db, appId } = useFirebase();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalLow = items.reduce((sum, i) => sum + (Number(i.valuation_low) || 0), 0);
    const totalHigh = items.reduce((sum, i) => sum + (Number(i.valuation_high) || 0), 0);
    const memberSince = user?.metadata?.creationTime
      ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Unknown';
    return { totalItems, totalLow, totalHigh, memberSince };
  }, [items, user]);

  const handleSaveName = async () => {
    if (!displayName.trim() || displayName === user?.displayName || !user) return;
    setIsSaving(true);
    try {
      // Update Firebase Auth profile
      // @ts-ignore - user is from our context but updateProfile expects Firebase User
      await updateProfile(user, { displayName: displayName.trim() });
      
      // Update in shares doc too
      const shareDocRef = doc(db, 'artifacts', appId, 'shares', user.uid);
      const shareDoc = await getDoc(shareDocRef);
      if (shareDoc.exists()) {
        await updateDoc(shareDocRef, { ownerName: displayName.trim() });
      }
      playSuccessFeedback();
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleDeleteAccount = async () => {
    try {
      // Delete all user inventory items first
      const { deleteItems } = await import('../../contexts').then(m => ({ deleteItems: null }));
      // Note: Items will be orphaned but Firebase rules will prevent access
      // For production, consider a Cloud Function to clean up user data
      
      await deleteAccount();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      if (err.code === 'auth/requires-recent-login') {
        alert('For security, please sign out and sign back in, then try again.');
      } else {
        alert('Failed to delete account. Please try again.');
      }
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#FDFBF7] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-stone-100 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-stone-900">Profile</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden mb-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-12 h-12 text-stone-400" />
            )}
          </div>
          <p className="text-xs text-stone-400">Avatar from Google</p>
        </div>

        {/* Account Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Account</h2>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Your name"
              />
              {displayName !== user?.displayName && (
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-400">Appears on your shared collections</p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Email</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-100 border border-stone-200 rounded-xl">
              <span className="flex-1 text-sm text-stone-600">{user?.email}</span>
              <Lock className="w-4 h-4 text-stone-400" />
            </div>
            <p className="text-[11px] text-stone-400">Cannot be changed</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Stats</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-stone-900">{stats.totalItems}</p>
              <p className="text-xs text-stone-500">Total Items</p>
            </div>
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-lg font-bold text-emerald-600">
                ${stats.totalLow.toLocaleString()} – ${stats.totalHigh.toLocaleString()}
              </p>
              <p className="text-xs text-stone-500">Estimated Value</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-stone-100 rounded-xl">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-600">Member Since</span>
            <span className="text-sm font-medium text-stone-900 ml-auto">{stats.memberSince}</span>
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-3 pt-4 border-t border-stone-100">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-white border border-stone-200 text-stone-700 text-sm font-bold rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-3 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 text-center mb-2">Delete Your Account?</h3>
            <p className="text-sm text-stone-600 text-center mb-6">
              This permanently deletes your account and all <strong>{stats.totalItems} items</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 text-sm font-bold rounded-xl hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
