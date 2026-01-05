// Contexts barrel export
export { FirebaseProvider, useFirebase, APP_ID, app, auth, db, storage, analytics } from './FirebaseContext';
export { AuthProvider, useAuth } from './AuthContext';
export type { AppUser } from './AuthContext';
export { InventoryProvider, useInventory } from './InventoryContext';
