// scaledFaceBounds null kontrolü
/**
 * CameraOverlay
 *
 * Kamera önizlemesinin üstüne yüz kılavuzunu, ipuçlarını ve yardımcı görselleri çizer.
 *
 * - Yüzün doğru pozisyonda olup olmadığını gösterir.
 * - Kullanıcıya adım kuralına göre yönlendirme ve countdown bilgisini sunar.
 * - Yüz landmarklarını ve rehber kutusunu overlay olarak ekrana çizer.
 *
 * Props ile: countdown, hint, angleReady, faceDetected, faceBounds, deviceAngle, frameSize, mirrorHorizontal gibi değerler alır.
 *
 * Diğer componentlerle (FaceLandmarks, AngleIndicator) birlikte çalışır.
 */
import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import FaceLandmarks from "./FaceLandmarks";

type Props = {
  countdown: number | null;
  hint: string;
  angleReady: boolean;
  faceDetected?: boolean;
  faceBounds?: { x: number; y: number; width: number; height: number } | null;
  faceYaw?: number;
  facePitch?: number;
  onFaceInGuideChange?: (inGuide: boolean) => void;
  onFaceAreaChange?: (areaPercent: number) => void;
  deviceAngle?: {
    pitch: number;
    roll: number;
    yaw: number;
    zAxis: number;
    orientationLabel?: string;
  };
  lightness?: number;
  frameSize?: { width: number; height: number };
  children?: React.ReactNode;
  mirrorHorizontal?: boolean;
  landmarkOffsets?: any;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FACE_GUIDE_WIDTH = 240;
const FACE_GUIDE_HEIGHT = 340;
const FACE_GUIDE_RADIUS = 170;
const FACE_GUIDE_GLOW_WIDTH = 270;
const FACE_GUIDE_GLOW_HEIGHT = 370;
const FACE_GUIDE_GLOW_RADIUS = 185;
const FACE_GUIDE_INNER_RADIUS = 140;
const BBOX_SCALE_X = 1.05;
const BBOX_SCALE_Y = 1.40;
const BBOX_VERTICAL_OFFSET = 5

  ;

const computeScaleAndOffset = (
  overlaySize: { width: number; height: number },
  frameSize: { width: number; height: number }
) => {
  if (overlaySize.width === 0 || overlaySize.height === 0) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  }

  const overlayRatio = overlaySize.width / overlaySize.height;
  const frameRatio = frameSize.width / frameSize.height;

  let effectiveWidth = overlaySize.width;
  let effectiveHeight = overlaySize.height;
  let offsetX = 0;
  let offsetY = 0;

  if (overlayRatio > frameRatio) {
    effectiveWidth = overlaySize.height * frameRatio;
    offsetX = (overlaySize.width - effectiveWidth) / 2;
  } else if (overlayRatio < frameRatio) {
    effectiveHeight = overlaySize.width / frameRatio;
    offsetY = (overlaySize.height - effectiveHeight) / 2;
  }

  return {
    scaleX: effectiveWidth / frameSize.width,
    scaleY: effectiveHeight / frameSize.height,
    offsetX,
    offsetY,
  };
};

// getRuleById ve getDeviceAngleHint kaldırıldı. Tüm guidance ve hintler artık üst componentten props ile gelmeli.

const CameraOverlay: React.FC<Props> = ({
  countdown,
  hint,
  angleReady,
  faceDetected = false,
  faceBounds = null,
  faceYaw = 0,
  facePitch = 0,
  onFaceInGuideChange,
  onFaceAreaChange,
  deviceAngle,
  lightness = 0,
  frameSize = { width: 640, height: 480 },
  children,
  mirrorHorizontal = false,
  landmarkOffsets,
}) => {
  const [overlaySize, setOverlaySize] = React.useState({
    width: 0,
    height: 0,
  });

  const { scaleX, scaleY, offsetX, offsetY } = React.useMemo(
    () => computeScaleAndOffset(overlaySize, frameSize),
    [overlaySize, frameSize]
  );

  const fineTune = React.useMemo(
    () => ({
      fineTuneX: -37,
      fineTuneY: -50,
    }),
    []
  );

  // 🔥 1) FACE BOUNDS → UI COORDINATES + OFFSET CORRECTION
  // Yüzdeki bbox (dikdörtgen) kutusunu, ekranda oval overlay'e dönüştürür ve hizalar.
  // Kamera tarafından tespit edilen yüz kutusunu, overlay'de oval ve doğru pozisyonda göstermek için kullanılır.
  const scaledFaceBounds = React.useMemo(() => {
    if (!faceBounds || overlaySize.width === 0 || overlaySize.height === 0)
      return null;

    const faceX = mirrorHorizontal
      ? frameSize.width - (faceBounds.x + faceBounds.width)
      : faceBounds.x;
    const rawWidth = faceBounds.width * scaleX;
    const rawHeight = faceBounds.height * scaleY;
    const rawX = faceX * scaleX + offsetX + fineTune.fineTuneX;
    const rawY = faceBounds.y * scaleY + offsetY + fineTune.fineTuneY;
    const scaledWidth = rawWidth * BBOX_SCALE_X;
    const scaledHeight = rawHeight * BBOX_SCALE_Y;

    const centerX = rawX + rawWidth / 2;
    const centerY = rawY + rawHeight / 2 + BBOX_VERTICAL_OFFSET;

    return {
      x: centerX - scaledWidth / 2,
      y: centerY - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    };
  }, [faceBounds, scaleX, scaleY, offsetX, offsetY, fineTune, mirrorHorizontal]);



  // 🔥 2) FACE DIRECTION (Yaw / Pitch)
  const faceDirectionInfo = React.useMemo(() => {
    if (!faceDetected) {
      return {
        horizontal: "Tespit ediliyor...",
        vertical: "",
        yawAngle: 0,
        pitchAngle: 0,
      };
    }

    const mirroredYaw = -(faceYaw || 0);
    const absYaw = Math.abs(mirroredYaw);

    let horizontal = absYaw <= 8 ? "Düz" : mirroredYaw > 0 ? "Sağa" : "Sola";

    let vertical = "Düz";
    let pitchAngle = 0;

    if (facePitch > 5) {
      vertical = "Yukarı";
      pitchAngle = facePitch;
    } else if (facePitch < -5) {
      vertical = "Aşağı";
      pitchAngle = Math.abs(facePitch);
    }

    return {
      horizontal,
      vertical,
      yawAngle: Math.round(absYaw),
      pitchAngle: Math.round(pitchAngle),
    };
  }, [faceDetected, faceYaw, facePitch]);

  // 🔥 3) FACE AREA / GUIDE CHECK + Landmarklar çemberin içinde mi?
  const {
    isFaceInGuide,
    faceCoveragePercent,
    isInGreenRange,
    allLandmarksInCircle,
    bboxInGuideCircle,
  } = React.useMemo(() => {
    if (!faceDetected || !faceBounds || !overlaySize.width || !overlaySize.height || !scaledFaceBounds) {
      return { isFaceInGuide: false, faceCoveragePercent: 0, isInGreenRange: false, allLandmarksInCircle: false, bboxInGuideCircle: false };
    }

    // Klavuz çemberi (guide oval) merkez ve yarıçapı
    const guideX = overlaySize.width / 2;
    const guideY = overlaySize.height / 2;
    const guideRadius = FACE_GUIDE_WIDTH / 2;

    // Bbox çemberi merkez ve yarıçapı
    const circleX = scaledFaceBounds.x + scaledFaceBounds.width / 2;
    const circleY = scaledFaceBounds.y + scaledFaceBounds.height / 2;
    const radius = scaledFaceBounds.width / 2;

    // Bbox çemberi klavuzun içinde mi?
    const bboxDist = Math.sqrt(Math.pow(circleX - guideX, 2) + Math.pow(circleY - guideY, 2));
    const bboxInGuideCircle = bboxDist + radius <= guideRadius;

    // Landmark noktalarını kontrol et
    let allIn = false;
    if (children) {
      const landmarkChild = React.Children.toArray(children).find(
        (child): child is React.ReactElement<any> => React.isValidElement(child) && child.type === FaceLandmarks
      );
      if (landmarkChild && landmarkChild.props.landmarks) {
        const landmarks = landmarkChild.props.landmarks as Record<string, { x: number; y: number }>;
        allIn = Object.values(landmarks).every((lm) => {
          if (!lm || typeof lm.x !== "number" || typeof lm.y !== "number") return false;
          const likelyNormalized = lm.x <= 1 && lm.y <= 1;
          const px = likelyNormalized ? lm.x * frameSize.width : lm.x;
          const py = likelyNormalized ? lm.y * frameSize.height : lm.y;
          // Mirror ve scale işlemleri
          const xCoord = mirrorHorizontal ? frameSize.width - px : px;
          const scaledX = xCoord * scaleX + offsetX + fineTune.fineTuneX;
          const scaledY = py * scaleY + offsetY + fineTune.fineTuneY;
          // Klavuz çemberine uzaklık
          const dist = Math.sqrt(
            Math.pow(scaledX - guideX, 2) + Math.pow(scaledY - guideY, 2)
          );
          return dist <= guideRadius;
        });
      }
    }

    // Alan oranı kontrolü
    const GUIDE_W = 240;
    const GUIDE_H = 340;
    const area = (faceBounds.width / GUIDE_W) * (faceBounds.height / GUIDE_H);
    const percent = area * 100;
    const ok = percent >= 100 && percent <= 160;

    // Sadece landmarklar ve bbox çemberi klavuzun içindeyse alan kontrolü yapılır
    const isFaceInGuide = allIn && bboxInGuideCircle && ok;

    return {
      isFaceInGuide,
      faceCoveragePercent: percent,
      isInGreenRange: ok,
      allLandmarksInCircle: allIn,
      bboxInGuideCircle,
    };
  }, [faceDetected, faceBounds, overlaySize, scaledFaceBounds, frameSize, mirrorHorizontal, children, fineTune, scaleX, scaleY, offsetX, offsetY]);

  // 🔥 4) SEND STATUS TO PARENT
  React.useEffect(() => {
    onFaceInGuideChange?.(isFaceInGuide);
    onFaceAreaChange?.(faceCoveragePercent);
  }, [isFaceInGuide, faceCoveragePercent]);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        setOverlaySize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        });
      }}
      pointerEvents="none"
    >
      {/* ================= OVALLER ================= */}
      <View style={styles.guideContainer}>
        {isInGreenRange && (
          <View style={[styles.faceGuideGlow, styles.faceGuideGlowActive]} />
        )}

        <View
          style={[styles.faceGuide, isInGreenRange && styles.faceGuideActive]}
        >
          {isInGreenRange && <View style={styles.faceGuideInner} />}
        </View>
      </View>

      {/* ================= YÜZÜ ÇEVRELEYEN KIRMIZI ÇEMBER ================= */}
      {faceDetected && scaledFaceBounds && (
        <View
          style={{
            position: "absolute",
            left: scaledFaceBounds.x,
            top: scaledFaceBounds.y,
            width: scaledFaceBounds.width,
            height: scaledFaceBounds.height,
            borderRadius: scaledFaceBounds.width / 2,
            borderWidth: 2,
            borderColor: "red",
            backgroundColor: "transparent",
          }}
        />
      )}

      {/* ================= MERKEZ NOKTA ================= */}
      {faceDetected && scaledFaceBounds && (
        <View
          style={[
            styles.faceCenterDot,
            {
              left: scaledFaceBounds.x + scaledFaceBounds.width / 2,
              top: scaledFaceBounds.y + scaledFaceBounds.height / 2,
            },
          ]}
        />
      )}

      {/* ================= YÜZ YÖNÜ ================= */}
      <View style={styles.faceDirectionBox}>
        <View style={styles.row}>
          <Text style={styles.label}>Yatay:</Text>
          <Text style={styles.value}>
            {faceDirectionInfo.horizontal}{" "}
            {faceDirectionInfo.yawAngle !== 0 &&
              `(${faceDirectionInfo.yawAngle}°)`}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Dikey:</Text>
          <Text style={styles.value}>
            {faceDirectionInfo.vertical}{" "}
            {faceDirectionInfo.pitchAngle !== 0 &&
              `(${faceDirectionInfo.pitchAngle}°)`}
          </Text>
        </View>
      </View>

      {/* ================= CİHAZ AÇILARI ================= */}
      {deviceAngle && (
        <View style={styles.deviceAngleBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Pitch:</Text>
            <Text style={styles.value}>
              {deviceAngle.pitch.toFixed(1)}°
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Roll:</Text>
            <Text style={styles.value}>
              {deviceAngle.roll.toFixed(1)}°
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Yaw:</Text>
            <Text style={styles.value}>{deviceAngle.yaw.toFixed(1)}°</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Z-axis:</Text>
            <Text style={styles.value}>
              {deviceAngle.zAxis.toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Durum:</Text>
            <Text style={styles.value}>{deviceAngle.orientationLabel}</Text>
          </View>
        </View>
      )}

      {/* ================= ALAN / YÜZ ETİKETİ ================= */}
      {faceDetected && (
        <View style={styles.faceCoverageBox}>
          <View style={styles.row}>
            <Text style={styles.label}>Alan:</Text>
            <Text
              style={[styles.value, isInGreenRange && styles.greenText]}
            >
              {faceCoveragePercent.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Yüz:</Text>
            <Text style={[styles.value, isFaceInGuide && styles.greenText]}>
              {isFaceInGuide ? "✓" : "✗"}
            </Text>
          </View>
        </View>
      )}

      {/* ================= IŞIK ================= */}
      <View style={styles.lightnessBox}>
        <View style={styles.row}>
          <Text style={styles.label}>Işık:</Text>
          <Text style={styles.value}>{lightness.toFixed(1)}%</Text>
        </View>
      </View>

      {/* ================= COUNTDOWN ================= */}
      {countdown !== null && isInGreenRange && (
        <View style={styles.countdownWrapper}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      {/* ================= LANDMARKS (CHILDREN) ================= */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === FaceLandmarks) {
          return React.cloneElement(child as React.ReactElement<any>, {
            overlaySize,
            transformProps: {
              scaleX,
              scaleY,
              offsetX,
              offsetY,
              ...fineTune,
            },
            mirrorHorizontal,
            landmarkOffsets,
          });
        }
        return child;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  guideContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  faceGuide: {
    width: FACE_GUIDE_WIDTH,
    height: FACE_GUIDE_HEIGHT,
    borderRadius: FACE_GUIDE_RADIUS,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },

  faceGuideActive: {
    borderColor: "rgba(74,222,128,1)",
    borderWidth: 6,
  },

  faceGuideGlow: {
    position: "absolute",
    width: FACE_GUIDE_GLOW_WIDTH,
    height: FACE_GUIDE_GLOW_HEIGHT,
    borderRadius: FACE_GUIDE_GLOW_RADIUS,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  faceGuideGlowActive: {
    borderColor: "rgba(74,222,128,0.3)",
  },

  faceGuideInner: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    borderRadius: FACE_GUIDE_INNER_RADIUS,
  },

  faceBBoxRect: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "red",
  },

  faceCenterDot: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#000",
  },

  faceDirectionBox: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 10,
    borderRadius: 8,
  },

  row: {
    flexDirection: "row",
    marginBottom: 4,
  },

  label: {
    fontSize: 11,
    color: "#ccc",
    marginRight: 6,
  },

  value: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  greenText: {
    color: "#4ade80",
    fontWeight: "900",
  },

  deviceAngleBox: {
    position: "absolute",
    left: 16,
    bottom: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 10,
    borderRadius: 8,
  },

  faceCoverageBox: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 10,
    borderRadius: 8,
  },

  lightnessBox: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 10,
    borderRadius: 8,
  },

  countdownWrapper: {
    position: "absolute",
    top: "40%",
    left: "46%",
  },

  countdownText: {
    fontSize: 90,
    fontWeight: "900",
    color: "#e5e5e5",
  },
});

export default CameraOverlay;
