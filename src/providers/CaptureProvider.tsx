import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CAPTURE_RULES, CaptureRule } from '../config/captureRules';
import { useAuth } from './AuthProvider';

type CaptureContextValue = {
  steps: CaptureRule[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  photos: Record<string, string | null>;
  savePhoto: (stepId: string, uri: string) => Promise<void>;
  deletePhoto: (stepId: string) => void;
  reset: () => void;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
};

const CaptureContext = createContext<CaptureContextValue | undefined>(
  undefined,
);

export const CaptureProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const steps = CAPTURE_RULES;
  const [photos, setPhotos] = useState<Record<string, string | null>>(() =>
    steps.reduce<Record<string, string | null>>((acc, step) => {
      acc[step.id] = null;
      return acc;
    }, {}),
  );

  // İlk açılışta kaydedilmiş ilerlemeyi yükle
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const savedIndex = await AsyncStorage.getItem('captureProgress');
        if (savedIndex !== null) {
          const index = parseInt(savedIndex, 10);
          // Sadece geçerli bir index ise yükle (0-4 arası)
          if (index >= 0 && index < steps.length) {
            setCurrentIndex(index);
          }
        }
      } catch (error) {
        console.error('Progress yükleme hatası:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadProgress();
  }, []);

  // İlerleme değiştiğinde kaydet (en az 1 fotoğraf çekildiyse)
  useEffect(() => {
    if (isLoaded) {
      const hasAnyPhoto = Object.values(photos).some(photo => photo !== null);
      if (hasAnyPhoto) {
        AsyncStorage.setItem('captureProgress', currentIndex.toString());
      } else {
        // Hiç fotoğraf yoksa progress'i temizle
        AsyncStorage.removeItem('captureProgress');
      }
    }
  }, [currentIndex, isLoaded, photos]);

  const savePhoto = async (stepId: string, uri: string) => {
    // Local state update
    setPhotos((prev) => ({ ...prev, [stepId]: uri }));

    // Save to MongoDB if authenticated
    if (token) {
      try {
        // Mobil cihazdan erişim için localhost yerine IP adresi kullan
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.15:3000/api';
        const response = await fetch(`${API_URL}/photos/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stepId,
            uri,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Photo save error:', error);
        }
      } catch (error) {
        console.error('Photo save network error:', error);
        // Continue anyway - photo is saved locally
      }
    }
  };

  const deletePhoto = (stepId: string) => {
    setPhotos((prev) => ({ ...prev, [stepId]: null }));
    // Silinen fotoğrafın index'ini bul ve o adıma geri dön
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    if (stepIndex !== -1) {
      setCurrentIndex(stepIndex);
    }
  };

  const pause = () => {
    setIsPaused(true);
  };

  const resume = () => {
    setIsPaused(false);
  };

  const reset = async () => {
    setCurrentIndex(0);
    setIsPaused(false);
    setPhotos(
      steps.reduce<Record<string, string | null>>((acc, step) => {
        acc[step.id] = null;
        return acc;
      }, {}),
    );
    await AsyncStorage.removeItem('captureProgress');
  };

  const value = useMemo(
    () => ({
      steps,
      currentIndex,
      setCurrentIndex,
      photos,
      savePhoto,
      deletePhoto,
      reset,
      isPaused,
      pause,
      resume,
    }),
    [currentIndex, photos, isPaused],
  );

  return (
    <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>
  );
};

export const useCapture = () => {
  const ctx = useContext(CaptureContext);
  if (!ctx) {
    throw new Error('useCapture must be used within CaptureProvider');
  }
  return ctx;
};

