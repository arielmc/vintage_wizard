import { useState, useCallback } from 'react';
import { analyzeImagesWithGemini, askGeminiChat } from '../services/gemini';
import type { InventoryItem, AIAnalysisResult } from '../types';

interface UseGeminiAnalysisReturn {
  analyzing: boolean;
  error: string | null;
  analyzeImages: (
    images: (string | Blob | File)[],
    userNotes?: string,
    currentData?: Partial<InventoryItem>
  ) => Promise<AIAnalysisResult>;
  askQuestion: (
    images: string[],
    itemContext: Partial<InventoryItem>,
    question: string
  ) => Promise<string>;
  clearError: () => void;
}

export const useGeminiAnalysis = (): UseGeminiAnalysisReturn => {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const analyzeImages = useCallback(
    async (
      images: (string | Blob | File)[],
      userNotes = '',
      currentData: Partial<InventoryItem> = {}
    ): Promise<AIAnalysisResult> => {
      setAnalyzing(true);
      setError(null);
      try {
        return await analyzeImagesWithGemini(images, userNotes, currentData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        setError(message);
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  const askQuestion = useCallback(
    async (
      images: string[],
      itemContext: Partial<InventoryItem>,
      question: string
    ): Promise<string> => {
      setError(null);
      try {
        return await askGeminiChat(images, itemContext, question);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat failed';
        setError(message);
        throw err;
      }
    },
    []
  );

  return {
    analyzing,
    error,
    analyzeImages,
    askQuestion,
    clearError,
  };
};

export default useGeminiAnalysis;
