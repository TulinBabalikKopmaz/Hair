import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

import { CAPTURE_STEPS, CaptureStep } from '../config/steps';
import { useAuth } from './AuthProvider';

type CaptureContextValue = {
  steps: CaptureStep[];
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
  const [photos, setPhotos] = useState<Record<string, string | null>>(() =>
    CAPTURE_STEPS.reduce<Record<string, string | null>>((acc, step) => {
      acc[step.id] = null;
      return acc;
    }, {}),
  );

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
    const stepIndex = CAPTURE_STEPS.findIndex((step) => step.id === stepId);
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

  const reset = () => {
    setCurrentIndex(0);
    setIsPaused(false);
    setPhotos(
      CAPTURE_STEPS.reduce<Record<string, string | null>>((acc, step) => {
        acc[step.id] = null;
        return acc;
      }, {}),
    );
  };

  const value = useMemo(
    () => ({
      steps: CAPTURE_STEPS,
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

