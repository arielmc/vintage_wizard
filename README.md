# Vintage Wizard

AI-powered vintage item identification and valuation tool for collectors, estate sale hunters, and resellers.

## Features

- **AI Image Analysis**: Photograph items and get instant identification, valuation, and market comparables using Google Gemini
- **Multi-Platform Market Comps**: Links to eBay Sold, Ruby Lane, 1stDibs, Discogs, LiveAuctioneers, and more
- **Listing Generator**: AI-crafted sales descriptions with customizable tone (salesy, nerdy, formal)
- **Inventory Management**: Track items with Keep/Sell/TBD status
- **Sharing**: Generate public links to share collections or individual items
- **PDF Export**: Create insurance/inventory reports

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Lucide Icons
- **Backend**: Firebase (Auth, Firestore, Storage, Hosting)
- **AI**: Google Gemini 2.0 Flash
- **Build**: Create React App

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Auth, Firestore, and Storage enabled
- Google Gemini API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Development

```bash
npm start
```

### Production Build

```bash
npm run build
firebase deploy
```

## Project Structure

```
src/
├── config/
│   ├── firebase.js         # Firebase initialization & exports
│   ├── constants.js         # App constants, limits, API config
│   └── index.js             # Barrel export
│
├── services/
│   ├── gemini.js            # AI analysis & chat functions
│   └── index.js             # Barrel export
│
├── utils/
│   ├── imageUtils.js        # Image compression, base64, upload
│   ├── helpers.js           # formatTimeAgo, getDisplayTitle, feedback
│   ├── marketplaceLinks.js  # Category-aware marketplace URL generator
│   └── index.js             # Barrel export
│
├── components/
│   ├── common/
│   │   ├── LoadingOverlay.jsx
│   │   ├── AILoadingMessages.jsx
│   │   ├── ProcessingOverlay.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── SkeletonCard.jsx
│   │   ├── QuickActionMenu.jsx
│   │   ├── TruncatedMetadataField.jsx
│   │   ├── TipJar.jsx
│   │   └── index.js
│   ├── auth/
│   │   ├── LoginScreen.jsx
│   │   ├── ProfilePage.jsx
│   │   └── index.js
│   ├── inventory/
│   │   ├── ItemCard.jsx
│   │   └── index.js
│   ├── sharing/
│   │   ├── ShareModal.jsx
│   │   ├── ShareItemModal.jsx
│   │   ├── ContactSellerModal.jsx
│   │   └── index.js
│   ├── upload/
│   │   ├── UploadStagingModal.jsx
│   │   ├── ThumbnailItem.jsx
│   │   └── index.js
│   └── index.js             # Master barrel export
│
└── App.js                   # Main app with routing & state
```

## Imports

New code can import cleanly from barrel exports:

```javascript
// Config & Services
import { db, auth, logAnalyticsEvent } from './config';
import { analyzeImagesWithGemini } from './services';

// Utilities
import { compressImage, formatTimeAgo, getMarketplaceLinks } from './utils';

// Components
import { 
  LoadingOverlay, 
  StatusBadge, 
  ItemCard, 
  ShareModal,
  LoginScreen 
} from './components';
```

## Version History

- **0.2.0** - Complete modular architecture
  - 30+ files extracted from monolithic App.js
  - Full barrel exports for all modules
  - Auth: LoginScreen, ProfilePage
  - Common: 8 shared UI components
  - Inventory: ItemCard
  - Sharing: ShareModal, ShareItemModal, ContactSellerModal
  - Upload: UploadStagingModal, ThumbnailItem
  - App.js remains functional with main routing logic

- **0.1.1** - Expanded modular structure
  - Added inventory, sharing, upload components
  - Added QuickActionMenu to common components

- **0.1.0** - Initial modular refactor
  - Created config/, services/, utils/, components/ structure

## License

MIT
