/**
 * CaptureFlowScreen
 *
 * Fotoğraf çekim adımlarının ana ekranı. Tüm kural, guidance, overlay ve kamera mantığı burada toplanır.
 *
 * - Adım bazlı kural kontrolü, sesli/yazılı yönlendirme, otomatik çekim, overlay ve rehber kutuları içerir.
 * - Dosya çok uzun ve karmaşık, mantıksal bloklar ayrı hook/component olarak bölünebilir.
 * - Fazla state, useEffect ve inline fonksiyonlar sadeleştirilmeli.
 */
// Sesli yönlendirme için custom hook
import { CAPTURE_RULES } from '../config/captureRules';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StepRuleBox from '../components/StepRuleBox';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useFaceDetector, Face } from 'react-native-vision-camera-face-detector';
import { Audio } from 'expo-av';

import { RootStackParamList } from '../../App';
import { useCapture } from '../providers/CaptureProvider';
import CameraOverlay from '../components/CameraOverlay';
// ...existing code...
import FaceLandmarks from '../components/FaceLandmarks';
import { useDeviceAngle } from '../hooks/useDeviceAngle';
import { useCaptureConditions, FaceData } from '../hooks/useCaptureConditions';
import { getRuleById, checkRules } from '../config/captureRules';

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



const CaptureFlowScreen: React.FC<Props> = ({ navigation }) => {
  const isFocused = useIsFocused();
  // Son oynatılan sesli uyarı
  const [lastSpokenHint, setLastSpokenHint] = useState<string | null>(null);
  // Capture context
  // Adım bilgileri doğrudan captureRules içinden alınacak
  // CAPTURE_RULES importu dosyanın en üstünde zaten var, tekrarını kaldırıyoruz
  const { currentIndex, setCurrentIndex, photos, savePhoto, isPaused, pause, resume } = useCapture();
  const steps = CAPTURE_RULES;
  const currentStep = steps[currentIndex];
  const deviceAngle = useDeviceAngle();
  const { pitch, roll, yaw, zAxis, isStable, stabilityDuration } = deviceAngle;
  const [isCameraReady, setIsCameraReady] = useState(false);
  // Face yaw map state
  const [faceYawMap, setFaceYawMap] = useState<Record<string, number | null>>(() =>
    CAPTURE_RULES.reduce<Record<string, number | null>>((acc, step) => {
      acc[step.id] = null;
      return acc;
    }, {}),
  );

  // Analysis status state
  const [analysisStatus, setAnalysisStatus] = useState<{ text: string; tone: StatusTone } | null>(null);
  // Camera devices
  const front = useCameraDevice("front");
  const back = useCameraDevice("back");

  // Camera ref
  const cameraRef = useRef<Camera | null>(null);

  // Countdown timer refs
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const photoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tick sound ref
  const tickSound = useRef<Audio.Sound | null>(null);

  // Permission state
  const [permission, setPermission] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  // Face landmarks state
  const [faceLandmarks, setFaceLandmarks] = useState<any>(null);

  // Frame dimensions state
  const [frameDimensions, setFrameDimensions] = useState({ width: 640, height: 480 });

  // Face detector hooks
  const { detectFaces, stopListeners } = useFaceDetector({
    performanceMode: "fast",
    landmarkMode: "all",
    contourMode: "none",
    classificationMode: "none",
  });
  // ... diğer değişkenler

  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ruleCheckResult tanımlandıktan SONRA sesli yönlendirme hook'u çağrılır
  // ...existing code...

  // Face detection state
  const [faceYaw, setFaceYaw] = useState(0);
  const [facePitch, setFacePitch] = useState(0);
  const [faceRoll, setFaceRoll] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceBounds, setFaceBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isFaceInGuide, setIsFaceInGuide] = useState(false);
  const [faceAreaPercent, setFaceAreaPercent] = useState(0);



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
  // Adım kuralı
  const currentRule = useMemo(() => getRuleById(currentStep.id), [currentStep.id]);
  // Artık step objesi CaptureRule tipinde, tip uyumsuzluğu yok
  const captureConditions = useCaptureConditions(currentStep, deviceAngle, faceData);

  // Yeni kural kontrol sistemi
  const ruleCheckResult = useMemo(() => {
    if (!currentRule) return null;
    return checkRules(
      currentRule,
      {
        roll: deviceAngle.roll,
        pitch: deviceAngle.pitch,
        zAxis: deviceAngle.zAxis,
        isStable: deviceAngle.isStable,
        stabilityDuration: deviceAngle.stabilityDuration,
      },
      {
        detected: faceDetected,
        yaw: faceYaw,
        pitch: facePitch,
        bounds: faceBounds,
      },
      faceAreaPercent,
    );
  }, [currentRule, deviceAngle, faceDetected, faceYaw, facePitch, faceBounds, faceAreaPercent]);
  const angleReady = ruleCheckResult?.allRulesMet || captureConditions.deviceAngleOk;
  const angleHint = ruleCheckResult?.currentHint || captureConditions.primaryHint;

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
  const handleFacesJS = Worklets.createRunOnJS((faces: Face[], frameWidth: number, frameHeight: number) => {
    if (faces.length === 0) {
      setFaceDetected(false);
      setFaceBounds(null);
      setFaceLandmarks(null);
      return;
    }

    const face = faces[0];
    setFrameDimensions((prev) => {
      if (prev.width === frameWidth && prev.height === frameHeight) {
        return prev;
      }
      return { width: frameWidth, height: frameHeight };
    });
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

    // Landmarkları kaydet
    if (face.landmarks) {
      setFaceLandmarks(face.landmarks);
      console.log('👁️ Landmarks detected:', Object.keys(face.landmarks));
    } else {
      console.log('❌ No landmarks in face data');
    }
  });

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const faces = detectFaces(frame);
    handleFacesJS(faces, frame.width, frame.height);
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
        // navigation to summary removed
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

  // Otomatik geri sayım - Tüm kurallar sağlandığında başlar
  useEffect(() => {
    // Zaten fotoğraf çekilmişse veya sayım başlamışsa atla
    if (photos[currentStep.id] || countdown !== null || isTakingPhoto) {
      return;
    }

    // Kural kontrolü sonucu yoksa atla
    if (!ruleCheckResult) {
      console.log('❌ No rule check result');
      return;
    }

    // Debug: Kural durumunu logla
    console.log(`🔍 Rule check for ${currentStep.id}:`, {
      allRulesMet: ruleCheckResult.allRulesMet,
      deviceAngleOk: ruleCheckResult.deviceAngleOk,
      faceDetectionOk: ruleCheckResult.faceDetectionOk,
      faceAreaOk: ruleCheckResult.faceAreaOk,
      faceOrientationOk: ruleCheckResult.faceOrientationOk,
      stabilityOk: ruleCheckResult.stabilityOk,
      isCameraReady,
      failedRules: ruleCheckResult.failedRules,
    });

    // Tüm kurallar sağlanıyorsa otomatik sayıcı başlat
    if (ruleCheckResult.allRulesMet && isCameraReady) {
      console.log(`✅ ${currentStep.id}: All rules met, starting auto countdown...`);
      startCountdown();
    }
  }, [
    currentStep.id,
    ruleCheckResult?.allRulesMet,
    photos,
    countdown,
    isTakingPhoto,
    isCameraReady,
    startCountdown,
  ]);

  useEffect(() => {
    cancelCountdown();
  }, [currentStep.id, cancelCountdown]);

  useEffect(() => {
    setAnalysisStatus(null);
  }, [currentStep.id]);

  // ...existing code...
  const goNext = () => {
    // Fotoğraf çekilmeden ileri gidilemez
    if (!photos[currentStep.id]) {
      return;
    }

    if (currentIndex === steps.length - 1) {
      // navigation to summary removed
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
        <Text style={styles.stepTitle}>{currentStep.name}</Text>
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
          countdown={countdown}
          hint={angleHint}
          angleReady={captureConditions.allConditionsMet}
          faceDetected={faceDetected}
          faceBounds={faceBounds}
          faceYaw={faceYaw}
          facePitch={facePitch}
          onFaceInGuideChange={setIsFaceInGuide}
          onFaceAreaChange={setFaceAreaPercent}
          deviceAngle={deviceAngle}
          frameSize={frameDimensions}
          mirrorHorizontal={facingMode === 'front'}
          landmarkOffsets={currentStep.landmarkOffsets}
        >
          <FaceLandmarks
            landmarks={faceLandmarks}
            overlaySize={frameDimensions}
            frameSize={frameDimensions}
            landmarkOffsets={currentStep.landmarkOffsets}
          />
        </CameraOverlay>
      </View>

      {/* KURAL KUTUSU KAMERANIN ALTINDA */}
      <View style={{ marginTop: -20 }}>
        <StepRuleBox rule={''} />
      </View>

      {/* BUTONLAR KURALIN ALTINDA */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, styles.secondary]}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Text style={[styles.controlText, styles.secondaryText]}>📷 Galeri</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={goNext}
          >
            <Text style={styles.controlText}>Sonra Çek</Text>
          </TouchableOpacity>
        </View>
      </View>

      // ...existing code...
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 3,
    backgroundColor: '#030712',
    padding: 16,
    gap: 16,
    paddingBottom: 24,
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
    maxHeight: 450,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: '#000',
    marginTop: -20, // Kamera kutucuğunu azıcık yukarı kaydır
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  controls: {
    flexDirection: 'column',
    gap: 12,
    marginTop: -10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  captureButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  captureButtonDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0,
    elevation: 0,
  },
  captureButtonText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  captureButtonTextDisabled: {
    color: '#94a3b8',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 120,
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
    padding: 1,
    marginTop: 1,
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

