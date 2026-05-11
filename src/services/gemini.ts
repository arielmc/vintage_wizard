import { httpsCallable } from 'firebase/functions';
import { functions } from '../contexts/FirebaseContext';
import { ensureBase64 } from '../utils/imageUtils';
import type { AIAnalysisResult, InventoryItem } from '../types';

const analyzeImagesCallable = httpsCallable<
  { images: string[]; userNotes: string; currentData: Partial<InventoryItem> },
  AIAnalysisResult
>(functions, 'analyzeImages');

const askAboutItemCallable = httpsCallable<
  { images: string[]; itemContext: Partial<InventoryItem>; question: string },
  string
>(functions, 'askAboutItem');

/**
 * Analyze images via the Cloud Function proxy. The Gemini key lives in
 * Firebase Secret Manager and never reaches the browser.
 */
export async function analyzeImagesWithGemini(
  images: (string | Blob | null | undefined)[],
  userNotes: string,
  currentData: Partial<InventoryItem> = {}
): Promise<AIAnalysisResult> {
  const rawImages = images.slice(0, 4);
  const base64 = await Promise.all(rawImages.map((img) => ensureBase64(img)));
  const validImages = base64.filter((img): img is string => !!img);

  if (validImages.length === 0) {
    throw new Error('No valid images to analyze. Please add photos first.');
  }

  try {
    const result = await analyzeImagesCallable({
      images: validImages,
      userNotes,
      currentData,
    });
    return result.data;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * Ask a follow-up question about an item via the Cloud Function proxy.
 */
export async function askGeminiChat(
  images: string[] | undefined,
  itemContext: Partial<InventoryItem>,
  userQuestion: string
): Promise<string> {
  try {
    const result = await askAboutItemCallable({
      images: (images || []).filter((img) => typeof img === 'string' && img.startsWith('data:image')),
      itemContext,
      question: userQuestion,
    });
    return result.data;
  } catch (error) {
    console.error('AI Chat failed:', error);
    throw error;
  }
}
