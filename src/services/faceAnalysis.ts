import * as FaceDetector from 'expo-face-detector';
import * as FileSystem from 'expo-file-system/legacy';

export type Orientation = 'left' | 'right' | 'front' | 'unknown';

export type FaceOrientationResult = {
  orientation: Orientation;
  confidence: number;
  faceYaw: number;
  pose: {
    yaw: number;
    pitch: number;
    roll: number;
  };
    face: { x: number; y: number; w: number; h: number };
  metrics: Record<string, number>;
  landmarks: { x: number; y: number }[];
};

const orientationLabels: Record<Orientation, string> = {
  front: 'Tam karşı',
  left: 'Sola dönük',
  right: 'Sağa dönük',
  unknown: 'Belirsiz',
};

export const getOrientationLabel = (orientation: Orientation) =>
  orientationLabels[orientation] ?? orientation;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const classifyOrientation = (yaw: number): Orientation => {
  if (yaw >= 18) return 'right';
  if (yaw <= -18) return 'left';
  if (Math.abs(yaw) <= 10) return 'front';
  return 'unknown';
};

const confidenceFromYaw = (yaw: number) =>
  clamp(1 - Math.min(Math.abs(yaw) / 60, 1), 0.15, 1);

const buildResult = (face: FaceDetector.FaceFeature): FaceOrientationResult => {
  const yaw = face.yawAngle ?? 0;
  const roll = face.rollAngle ?? 0;
  const pitch = 0;
  const orientation = classifyOrientation(yaw);
  const bounds = face.bounds;
  const faceBox = {
    x: Math.round(bounds.origin.x),
    y: Math.round(bounds.origin.y),
    w: Math.round(bounds.size.width),
    h: Math.round(bounds.size.height),
  };

  return {
    orientation,
    confidence: confidenceFromYaw(yaw),
    faceYaw: yaw,
    pose: {
      yaw,
      pitch,
      roll,
    },
    face: faceBox,
    metrics: {
      yawAngle: yaw,
      rollAngle: roll,
    },
    landmarks: [],
  };
};

export const analyzeFaceOrientation = async (
  uri: string,
): Promise<{
  success: boolean;
  message?: string;
  orientation?: Orientation;
  confidence?: number;
  faceYaw?: number;
  results?: FaceOrientationResult[];
}> => {
  // Ensure file exists (especially on Android when capture fails)
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    return {
      success: false,
      message: 'Fotoğraf dosyası bulunamadı',
    };
  }

  const detection = await FaceDetector.detectFacesAsync(uri, {
    mode: FaceDetector.FaceDetectorMode.fast,
    detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
    runClassifications: FaceDetector.FaceDetectorClassifications.none,
  });

  if (!detection.faces?.length) {
    return {
      success: false,
      message: 'Yüz tespit edilemedi',
    };
  }

  const result = buildResult(detection.faces[0]);
  return {
    success: true,
    orientation: result.orientation,
    confidence: result.confidence,
    faceYaw: result.faceYaw,
    results: [result],
  };
};

