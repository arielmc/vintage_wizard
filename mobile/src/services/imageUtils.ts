import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

// Image size limits
export const MAX_IMAGES_SINGLE_UPLOAD = 6;
export const MAX_IMAGES_PER_STACK = 8;
export const MAX_BASE64_SIZE_BYTES = 900000; // ~900KB

// Request camera permissions
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  console.log("Camera permission status:", status);
  if (status !== "granted") {
    Alert.alert(
      "Camera Permission Required",
      "Please enable camera access in Settings to take photos.",
      [{ text: "OK" }]
    );
    return false;
  }
  return true;
}

// Request media library permissions
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  console.log("Media library permission status:", status);
  if (status !== "granted") {
    Alert.alert(
      "Photo Library Permission Required",
      "Please enable photo library access in Settings to select photos.",
      [{ text: "OK" }]
    );
    return false;
  }
  return true;
}

// Pick images from library - returns base64 strings
export async function pickImages(
  allowMultiple: boolean = true,
  maxCount: number = MAX_IMAGES_SINGLE_UPLOAD
): Promise<{ uri: string; base64: string }[]> {
  console.log("pickImages called, allowMultiple:", allowMultiple, "maxCount:", maxCount);
  
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    console.log("No media library permission");
    return [];
  }

  console.log("Launching image library...");
  
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowMultiple,
      selectionLimit: maxCount,
      quality: 0.7,
      base64: true,
    });

    console.log("Image picker result:", result.canceled ? "canceled" : `${result.assets?.length || 0} images`);

    if (result.canceled) {
      console.log("User canceled image picker");
      return [];
    }

    if (!result.assets || result.assets.length === 0) {
      console.log("No assets returned");
      return [];
    }

    const images = result.assets
      .filter((asset) => {
        if (!asset.base64) {
          console.log("Asset missing base64:", asset.uri);
          return false;
        }
        return true;
      })
      .map((asset) => ({
        uri: asset.uri,
        base64: `data:image/jpeg;base64,${asset.base64}`,
      }));

    console.log("Processed", images.length, "images with base64");
    return images;
  } catch (error) {
    console.error("Error in pickImages:", error);
    Alert.alert("Error", "Failed to load images. Please try again.");
    return [];
  }
}

// Take a photo with camera - returns base64 string
export async function takePhoto(): Promise<{ uri: string; base64: string } | null> {
  console.log("takePhoto called");
  
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    console.log("No camera permission");
    return null;
  }

  console.log("Launching camera...");

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    console.log("Camera result:", result.canceled ? "canceled" : "captured");

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log("User canceled or no assets");
      return null;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      console.error("Camera asset missing base64");
      Alert.alert("Error", "Failed to capture image. Please try again.");
      return null;
    }

    console.log("Photo captured with base64");
    return {
      uri: asset.uri,
      base64: `data:image/jpeg;base64,${asset.base64}`,
    };
  } catch (error) {
    console.error("Error in takePhoto:", error);
    Alert.alert("Error", "Failed to capture photo. Please try again.");
    return null;
  }
}

// Simple pass-through since we get compressed base64 from picker
export async function compressImageForBase64Storage(base64: string): Promise<string> {
  return base64;
}
