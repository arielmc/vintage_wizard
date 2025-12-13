# Vintage Wizard Mobile

A React Native (Expo) mobile app for appraising vintage items using AI. This is the mobile version of the Vintage Wizard web app, sharing the same Firebase backend and Gemini AI integration.

## Features

- 📷 Take photos or import from gallery
- 🤖 AI-powered item analysis using Gemini
- 💰 Automatic valuation estimates
- 🏷️ Organize items by status (Keep/Sell/TBD)
- 🔍 Search and filter your collection
- 💬 Chat with AI about your items
- 🔗 Quick links to marketplace research
- 🔐 Google & Email authentication

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for development)
- Firebase project (same as web app)
- Gemini API key

### Installation

1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Fill in your environment variables in `.env`:
   - Firebase config (from Firebase Console)
   - Gemini API key (from Google AI Studio)
   - Google OAuth client IDs (from Google Cloud Console)

### Google OAuth Setup

For native Google Sign-In to work, you need to create OAuth 2.0 credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client IDs for:
   - iOS (use your bundle identifier)
   - Android (use your package name + SHA-1 fingerprint)
   - Web (for Expo development)
3. Add the client IDs to your `.env` file

### Running the App

```bash
# Start the development server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android

# Run in web browser
npm run web
```

## Project Structure

```
mobile/
├── App.tsx                 # Main app entry point
├── app.config.js           # Expo configuration
├── babel.config.js         # Babel config with NativeWind
├── metro.config.js         # Metro bundler config
├── tailwind.config.js      # Tailwind CSS config
├── global.css              # Global Tailwind imports
├── src/
│   ├── config/
│   │   └── firebase.ts     # Firebase initialization
│   ├── services/
│   │   ├── gemini.ts       # Gemini AI API calls
│   │   └── imageUtils.ts   # Image picking/compression
│   ├── hooks/
│   │   ├── useAuth.ts      # Authentication hook
│   │   └── useInventory.ts # Inventory management hook
│   ├── screens/
│   │   ├── LoginScreen.tsx     # Login/signup screen
│   │   ├── DashboardScreen.tsx # Main inventory grid
│   │   └── ItemDetailScreen.tsx # Item editing/viewing
│   ├── components/
│   │   └── ItemCard.tsx    # Inventory item card
│   └── types/
│       └── index.ts        # TypeScript interfaces
└── assets/                 # App icons and splash screens
```

## Tailwind (NativeWind) Usage

This project uses NativeWind v4 for styling. Use Tailwind classes directly in your components:

```tsx
<View className="flex-1 bg-white p-4">
  <Text className="text-lg font-bold text-stone-900">Hello</Text>
</View>
```

## Differences from Web Version

| Feature | Web | Mobile |
|---------|-----|--------|
| Camera access | `navigator.mediaDevices` | `expo-image-picker` |
| File uploads | `<input type="file">` | `expo-image-picker` |
| Google Sign-In | `signInWithPopup` | `expo-auth-session` |
| Styling | Tailwind CSS | NativeWind |
| Navigation | URL-based | Stack-based (state) |
| PDF Export | jsPDF | Not implemented yet |
| Bulk scanning | HTML5 Camera | Native camera |

## Building for Production

### iOS
```bash
npx expo build:ios
# or with EAS Build
npx eas build --platform ios
```

### Android
```bash
npx expo build:android
# or with EAS Build
npx eas build --platform android
```

## License

Private - All rights reserved

