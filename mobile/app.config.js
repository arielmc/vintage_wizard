export default {
  expo: {
    name: "Vintage Wizard",
    slug: "vintage-wizard",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.vintagewizard",
      infoPlist: {
        NSCameraUsageDescription:
          "Vintage Wizard needs camera access to photograph your vintage items for appraisal.",
        NSPhotoLibraryUsageDescription:
          "Vintage Wizard needs photo library access to import photos of your vintage items.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.yourcompany.vintagewizard",
      permissions: ["android.permission.CAMERA", "android.permission.READ_EXTERNAL_STORAGE"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission:
            "Vintage Wizard needs access to your photos to import images of vintage items.",
          cameraPermission:
            "Vintage Wizard needs camera access to photograph items for appraisal.",
        },
      ],
    ],
    extra: {
      // Firebase Configuration
      // Set these environment variables or replace with your actual values
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      
      // Gemini API
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      
      // Google OAuth Client IDs (for native Google Sign-In)
      // Get these from Google Cloud Console: https://console.cloud.google.com/apis/credentials
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    },
  },
};

