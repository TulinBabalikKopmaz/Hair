import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useFaceDetector, Face } from 'react-native-vision-camera-face-detector';
import { Audio } from 'expo-av';

import { RootStackParamList } from '../../App';
import { useCapture } from '../providers/CaptureProvider';
import CameraOverlay from '../components/CameraOverlay';
import AngleIndicator from '../components/AngleIndicator';
import { useDeviceAngle } from '../hooks/useDeviceAngle';
import { useCaptureConditions, FaceData } from '../hooks/useCaptureConditions';

type Props = NativeStackScreenProps<RootStackParamList, 'CaptureFlow'>;

type StatusTone = 'info' | 'success' | 'warning' | 'error';
type PoseType = 'selfie' | 'selfie-right' | 'selfie-left' | 'vertex' | 'donor';

const STEP_POSE_REQUIREMENTS: Record<string, PoseType> = {
  front: 'selfie',
  right45: 'selfie-right',
  left45: 'selfie-left',
  vertex: 'vertex',
  donor: 'donor',
};

const FACE_ANALYSIS_CONFIG: Record<
  string,
  { expected: Orientation[]; failureHint: string }
> = {
  front: {
    expected: ['front'],
    failureHint: 'Yüzünü kameraya tam çevir ve telefonu dik konumda tut.',
  },
  right45: {
    expected: ['right'],
    failureHint: 'Başını biraz daha sağa çevir.',
  },
  left45: {
    expected: ['left'],
    failureHint: 'Başını biraz daha sola çevir.',
  },
};

const FACE_YAW_REQUIREMENTS: Record<
  string,
  { min?: number; max?: number; description: string }
> = {
  front: { min: -8, max: 8, description: 'Yüzünü tam karşıya çevir.' },
  right45: { min: 20, description: 'Başını yeterince sağa çevir.' },
  left45: { max: -20, description: 'Başını yeterince sola çevir.' },
};

const CaptureFlowScreen: React.FC<Props> = ({ navigation }) => {
  const { steps, currentIndex, setCurrentIndex, photos, savePhoto, isPaused, pause, resume } = useCapture();
  const currentStep = steps[currentIndex];
  const deviceAngle = useDeviceAngle();
  const { pitch, roll, yaw, zAxis, isStable, stabilityDuration } = deviceAngle;

  // VisionCamera setup
  const front = useCameraDevice("front");
  const back = useCameraDevice("back");

  const [permission, setPermission] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Face detection state
  const [faceYaw, setFaceYaw] = useState(0);
  const [facePitch, setFacePitch] = useState(0);
  const [faceRoll, setFaceRoll] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceBounds, setFaceBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [faceYawMap, setFaceYawMap] = useState<Record<string, number | null>>(() =>
    steps.reduce<Record<string, number | null>>((acc, step) => {
      acc[step.id] = null;
      return acc;
    }, {}),
  );

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const cameraRef = useRef<Camera | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const photoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tickSound = useRef<Audio.Sound | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<{
    text: string;
    tone: StatusTone;
  } | null>(null);

  // Face detector
  const { detectFaces, stopListeners } = useFaceDetector({
    performanceMode: "fast",
    landmarkMode: "none",
    contourMode: "none",
    classificationMode: "none",
  });

  const YAW_THRESHOLD = 15;

  // Yüzün kılavuz oval içinde olup olmadığını kontrol et
  // CameraOverlay'deki detaylı kontrol kullanılacak
  const [isFaceInGuide, setIsFaceInGuide] = useState(false);

  // Yüz verilerini hazırla
  const faceData: FaceData = useMemo(
    () => ({
      detected: faceDetected,
      yaw: faceYaw,
      pitch: facePitch,
      roll: faceRoll,
      bounds: faceBounds,
      inGuide: isFaceInGuide,
    }),
    [faceDetected, faceYaw, facePitch, faceRoll, faceBounds, isFaceInGuide],
  );

  // Koşul kontrol mekanizması - yeni hook kullanılıyor
  const captureConditions = useCaptureConditions(currentStep, deviceAngle, faceData);

  // Koşul kontrol mekanizmasından gelen değerleri kullan
  const angleReady = captureConditions.deviceAngleOk;
  const angleHint = captureConditions.primaryHint;

  const facingMode =
    currentStep.id === 'front' ||
      currentStep.id === 'right45' ||
      currentStep.id === 'left45'
      ? 'front'
      : 'back';

  const device = facingMode === 'front' ? front : back;

  useEffect(() => {
    (async () => {
      let status = await Camera.getCameraPermissionStatus();
      if (status !== "granted") {
        status = await Camera.requestCameraPermission();
      }
      setPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    return () => {
      countdownTimer.current && clearInterval(countdownTimer.current);
      tickSound.current?.unloadAsync();
      stopListeners();
    };
  }, [stopListeners]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
  }, []);

  // Frame processor for real-time face detection
  const handleFacesJS = Worklets.createRunOnJS((faces: Face[]) => {
    if (faces.length === 0) {
      setFaceDetected(false);
      setFaceBounds(null);
      return;
    }

    const face = faces[0];
    setFaceDetected(true);
    setFaceYaw(face.yawAngle);
    setFacePitch(face.pitchAngle);
    setFaceRoll(face.rollAngle);
    setFaceBounds({
      x: face.bounds.x,
      y: face.bounds.y,
      width: face.bounds.width,
      height: face.bounds.height,
    });
  });

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const faces = detectFaces(frame);
    handleFacesJS(faces);
  }, []);

  const playTick = useCallback(async () => {
    try {
      if (!tickSound.current) {
        const { sound } = await Audio.Sound.createAsync({
          uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
        });
        tickSound.current = sound;
      }
      await tickSound.current.replayAsync();
    } catch {
      // sessiz devam
    }
  }, []);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) {
      console.log('📸 Photo blocked: No camera ref');
      return;
    }
    
    if (isTakingPhoto) {
      console.log('📸 Photo blocked: Already taking photo');
      return;
    }
    
    console.log('📸 Taking photo now...');
    setIsTakingPhoto(true);
    
    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'balanced',
        flash: 'off',
      });

      console.log('✅ Photo captured:', photo.path);
      const photoUri = `file://${photo.path}`;

      // Yüz analizi sadece front, right45, left45 için yapılır
      if (currentStep.id === 'front' || currentStep.id === 'right45' || currentStep.id === 'left45') {
        const faceYawValue = faceYaw;
        setFaceYawMap((prev) => ({
          ...prev,
          [currentStep.id]: faceYawValue,
        }));
        setAnalysisStatus({
          text: `Fotoğraf çekildi: ${faceYawValue.toFixed(1)}°`,
          tone: 'success',
        });
      }

      await savePhoto(currentStep.id, photoUri);
      console.log('✅ Photo saved, moving to next step');
      
      // Fotoğraf kaydedildikten sonra kısa bir gecikme ekle
      await new Promise(resolve => setTimeout(resolve, 300));

      if (currentIndex === steps.length - 1) {
        navigation.navigate('Summary');
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      console.error('❌ Fotoğraf çekilemedi:', error);
    } finally {
      // State'leri temizle
      setIsTakingPhoto(false);
      setCountdown(null);
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
    }
  }, [
    cameraRef,
    currentIndex,
    currentStep.id,
    faceYaw,
    isTakingPhoto,
    navigation,
    savePhoto,
    setCurrentIndex,
    steps.length,
  ]);

  const startCountdown = useCallback(() => {
    // countdown state kontrolünü kaldırdık çünkü useEffect'te zaten kontrol ediliyor
    if (countdownTimer.current) {
      console.log('⏸️ Countdown blocked: Timer already exists');
      return;
    }
    if (isTakingPhoto) {
      console.log('⏸️ Countdown blocked: Already taking photo');
      return;
    }
    if (!isCameraReady) {
      console.log('⏸️ Countdown blocked: Camera not ready');
      return;
    }
    // Otomatik sayıcı başlat - 3 saniye geri sayım
    console.log('⏱️ Starting countdown...');
    setCountdown(3);
    playTick();
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev && prev > 1) {
          playTick();
          return prev - 1;
        }
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
        // Sayıcı bittiğinde fotoğraf çek
        console.log('📸 Countdown finished, taking photo...');
        takePhoto();
        return null;
      });
    }, 1000);
  }, [playTick, takePhoto, isTakingPhoto, isCameraReady]);

  useEffect(() => {
    // Pause durumunda otomatik çekim yapma
    if (isPaused) {
      if (photoTimerRef.current) {
        clearTimeout(photoTimerRef.current);
        photoTimerRef.current = null;
      }
      return;
    }

    // Debug: Koşulları logla (her zaman)
    console.log('🔍 Capture Conditions:', {
      allConditionsMet: captureConditions.allConditionsMet,
      deviceAngleOk: captureConditions.deviceAngleOk,
      faceDetected: captureConditions.faceDetected,
      faceInGuide: captureConditions.faceInGuide,
      faceOrientationOk: captureConditions.faceOrientationOk,
      stabilityOk: captureConditions.stabilityOk,
      isTakingPhoto,
      permission,
      isCameraReady,
      hasPhoto: !!photos[currentStep.id],
      stepId: currentStep.id,
      hints: captureConditions.hints,
    });

    // Koşullar sağlandığında direkt fotoğraf çek
    // Tüm koşulları kontrol et
    const canTakePhoto = 
      captureConditions.allConditionsMet &&
      !isTakingPhoto &&
      permission &&
      isCameraReady &&
      !photos[currentStep.id] && // Fotoğraf henüz çekilmemişse
      !photoTimerRef.current; // Timer zaten başlamamışsa
    
    if (canTakePhoto) {
      console.log('✅ All conditions met - taking photo in 500ms!', {
        allConditionsMet: captureConditions.allConditionsMet,
        deviceAngleOk: captureConditions.deviceAngleOk,
        faceDetected: captureConditions.faceDetected,
        faceInGuide: captureConditions.faceInGuide,
        faceOrientationOk: captureConditions.faceOrientationOk,
        stabilityOk: captureConditions.stabilityOk,
        stepId: currentStep.id,
      });
      // Kısa bir gecikme ile direkt fotoğraf çek (kullanıcı hazır olsun)
      photoTimerRef.current = setTimeout(() => {
        photoTimerRef.current = null;
        takePhoto();
      }, 500);
      return;
    } else {
      // Koşullar sağlanmadı - timer'ı iptal et
      if (photoTimerRef.current) {
        clearTimeout(photoTimerRef.current);
        photoTimerRef.current = null;
      }
    }
  }, [
    captureConditions.allConditionsMet,
    captureConditions.deviceAngleOk,
    captureConditions.faceDetected,
    captureConditions.faceInGuide,
    captureConditions.faceOrientationOk,
    captureConditions.stabilityOk,
    takePhoto,
    isTakingPhoto,
    permission,
    isCameraReady,
    photos,
    currentStep.id,
    isPaused,
  ]);

  useEffect(() => {
    cancelCountdown();
  }, [currentStep.id, cancelCountdown]);

  useEffect(() => {
    setAnalysisStatus(null);
  }, [currentStep.id]);

  const shouldAnalyzeFace = useMemo(
    () => Boolean(FACE_ANALYSIS_CONFIG[currentStep.id]),
    [currentStep.id],
  );

  const expectedOrientationMatch = useCallback((stepId: string, orientation: string) => {
    const cfg = FACE_ANALYSIS_CONFIG[stepId];
    if (!cfg) {
      return true;
    }
    return cfg.expected.includes(orientation);
  }, []);

  const goNext = () => {
    // Fotoğraf çekilmeden ileri gidilemez
    if (!photos[currentStep.id]) {
      return;
    }

    if (currentIndex === steps.length - 1) {
      navigation.navigate('Summary');
      return;
    }
    setCurrentIndex(currentIndex + 1);
  };

  const goBack = () => {
    if (currentIndex === 0) {
      navigation.goBack();
      return;
    }
    setCurrentIndex(currentIndex - 1);
  };

  const renderPermissionState = () => (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionTitle}>Kamera izni gerekli</Text>
      <Text style={styles.permissionText}>
        Fotoğrafları çekebilmemiz için kamera erişimine ihtiyacımız var.
      </Text>
      <TouchableOpacity style={styles.permissionButton} onPress={async () => {
        const status = await Camera.requestCameraPermission();
        setPermission(status === 'granted');
      }}>
        <Text style={styles.permissionButtonText}>İzin ver</Text>
      </TouchableOpacity>
    </View>
  );

  if (!device) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.permissionTitle}>Kamera hazırlanıyor...</Text>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <SafeAreaView style={styles.container}>{renderPermissionState()}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          Adım {currentIndex + 1} / {steps.length}
        </Text>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
      </View>

      <View style={styles.cameraShell}>
        {device && permission && (
          <Camera
            style={styles.camera}
            ref={cameraRef}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            pixelFormat="yuv"
            photo={true}
            videoStabilizationMode="off"
            outputOrientation="device"
            preview={true}
            enableZoomGesture={false}
            onInitialized={() => {
              console.log('Camera ready');
              setIsCameraReady(true);
            }}
          />
        )}
        <CameraOverlay
          title={currentStep.title}
          description={currentStep.description}
          countdown={countdown}
          hint={angleHint}
          angleReady={captureConditions.allConditionsMet}
          faceDetected={faceDetected}
          faceBounds={faceBounds}
          faceYaw={faceYaw}
          facePitch={facePitch}
          onFaceInGuideChange={setIsFaceInGuide}
        />
      </View>

      <AngleIndicator
        angleReady={captureConditions.deviceAngleOk}
        isStable={captureConditions.stabilityOk}
        hint={angleHint}
      />

      {/* Koşul durumları - AngleIndicator'ın altında */}
      <View style={styles.conditionsPanel}>
        <View style={styles.conditionsRow}>
          <View style={styles.conditionItem}>
            <Text style={[styles.conditionLabel, captureConditions.deviceAngleOk && styles.conditionOk]}>
              📱 Telefon: {captureConditions.deviceAngleOk ? '✅' : '❌'}
            </Text>
          </View>
          {(currentStep.id === 'front' || currentStep.id === 'right45' || currentStep.id === 'left45') && (
            <>
              <View style={styles.conditionItem}>
                <Text style={[styles.conditionLabel, captureConditions.faceDetected && styles.conditionOk]}>
                  👤 Yüz: {captureConditions.faceDetected ? '✅' : '❌'}
                </Text>
              </View>
              <View style={styles.conditionItem}>
                <Text style={[styles.conditionLabel, captureConditions.faceInGuide && styles.conditionOk]}>
                  🎯 Kılavuz: {captureConditions.faceInGuide ? '✅' : '❌'}
                </Text>
              </View>
              <View style={styles.conditionItem}>
                <Text style={[styles.conditionLabel, captureConditions.faceOrientationOk && styles.conditionOk]}>
                  🔄 Yön: {captureConditions.faceOrientationOk ? '✅' : '❌'}
                </Text>
              </View>
            </>
          )}
          {(currentStep.id === 'vertex' || currentStep.id === 'donor') && (
            <View style={styles.conditionItem}>
              <Text style={[styles.conditionLabel, captureConditions.stabilityOk && styles.conditionOk]}>
                🔒 Sabit: {captureConditions.stabilityOk ? '✅' : '❌'}
              </Text>
            </View>
          )}
        </View>
        {captureConditions.hints.length > 0 && (
          <View style={styles.conditionsHints}>
            <Text style={styles.conditionsHintText}>
              {captureConditions.hints[0]}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.previewRow}>
        {photos[currentStep.id] ? (
          <Image source={{ uri: photos[currentStep.id] || undefined }} style={styles.previewImage} />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.previewPlaceholderText}>Fotoğraf bekleniyor</Text>
          </View>
        )}
        <View style={styles.previewInfo}>
          <Text style={styles.previewLabel}>Son durum</Text>
          <Text style={styles.previewStatus}>
            {photos[currentStep.id] ? 'Kaydedildi' : 'Hazır değil'}
          </Text>
          {FACE_YAW_REQUIREMENTS[currentStep.id] ? (
            <>
              <Text style={[styles.previewLabel, styles.previewLabelSpacer]}>Yüz yaw</Text>
              <Text style={styles.previewStatus}>
                {faceYawMap[currentStep.id] !== null && faceYawMap[currentStep.id] !== undefined
                  ? `${faceYawMap[currentStep.id]?.toFixed(1)}°`
                  : 'Bekleniyor'}
              </Text>
            </>
          ) : null}
          <Text style={[styles.previewLabel, styles.previewLabelSpacer]}>Yüz analizi</Text>
          <Text
            style={[
              styles.previewStatus,
              analysisStatus?.tone === 'success' && styles.previewStatusSuccess,
              analysisStatus?.tone === 'warning' && styles.previewStatusWarning,
              analysisStatus?.tone === 'error' && styles.previewStatusError,
            ]}
          >
            {analysisStatus
              ? analysisStatus.text
              : shouldAnalyzeFace
                ? 'Analiz bekleniyor'
                : 'Bu adımda yüz analizi gerekmiyor'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.secondary]}
          onPress={() => navigation.navigate('Gallery')}
        >
          <Text style={[styles.controlText, styles.secondaryText]}>📷 Galeri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, styles.secondary]}
          onPress={isPaused ? resume : pause}
        >
          <Text style={[styles.controlText, styles.secondaryText]}>
            {isPaused ? '▶️ Devam' : '⏸️ Duraklat'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, !photos[currentStep.id] && styles.controlButtonDisabled]}
          onPress={goNext}
          disabled={!photos[currentStep.id]}
        >
          <Text style={[styles.controlText, !photos[currentStep.id] && styles.controlTextDisabled]}>
            {currentIndex === steps.length - 1 ? 'Özete git' : 'İleri'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    padding: 16,
    gap: 16,
    paddingBottom: 16,
  },
  progress: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  stepTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  cameraShell: {
    flex: 1,
    minHeight: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#38bdf8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 80,
  },
  controlButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  controlText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  controlTextDisabled: {
    color: '#94a3b8',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#475569',
  },
  secondaryText: {
    color: '#cbd5f5',
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  previewPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  previewStatus: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  previewLabelSpacer: {
    marginTop: 8,
  },
  previewStatusSuccess: {
    color: '#4ade80',
  },
  previewStatusWarning: {
    color: '#fbbf24',
  },
  previewStatusError: {
    color: '#f87171',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  permissionText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 12,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  permissionButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#030712',
  },
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugText: {
    color: '#22d3ee',
    fontSize: 11,
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  debugPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  debugTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  debugRow: {
    marginVertical: 4,
  },
  debugLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  debugOk: {
    color: '#4ade80',
  },
  debugHints: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  debugHintTitle: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  debugHint: {
    color: '#cbd5e1',
    fontSize: 11,
    marginVertical: 2,
  },
  conditionsPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  conditionItem: {
    marginVertical: 4,
    marginHorizontal: 4,
  },
  conditionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  conditionOk: {
    color: '#4ade80',
  },
  conditionsHints: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  conditionsHintText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CaptureFlowScreen;

