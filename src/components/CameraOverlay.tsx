import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dimensions } from 'react-native';

type Props = {
  title: string;
  description: string;
  countdown: number | null;
  hint: string;
  angleReady: boolean;
  faceDetected?: boolean;
  faceBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  faceYaw?: number;
  facePitch?: number;
  onFaceInGuideChange?: (inGuide: boolean) => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CameraOverlay: React.FC<Props> = ({
  countdown,
  hint,
  angleReady,
  faceDetected = false,
  faceBounds = null,
  faceYaw = 0,
  facePitch = 0,
  onFaceInGuideChange,
}) => {
  const [overlaySize, setOverlaySize] = React.useState({ width: 0, height: 0 });

  // Yüz yönü bilgilerini hesapla (açılarla birlikte)
  const faceDirectionInfo = React.useMemo(() => {
    if (!faceDetected) {
      return {
        horizontal: 'Tespit ediliyor...',
        vertical: '',
        yawAngle: 0,
        pitchAngle: 0,
      };
    }
    
    // Yansıtılmış görüntü için yaw açısını tersine çevir
    const mirroredYaw = -(faceYaw || 0);
    const absYaw = Math.abs(mirroredYaw);
    const pitch = facePitch || 0;
    
    // Yatay yön (sağa/sola/düz)
    let horizontal = '';
    let yawAngle = mirroredYaw;
    if (absYaw <= 8) {
      horizontal = 'Düz';
      yawAngle = 0;
    } else if (absYaw <= 20) {
      horizontal = mirroredYaw > 0 ? 'Sağa' : 'Sola';
      yawAngle = mirroredYaw;
    } else if (absYaw <= 35) {
      horizontal = mirroredYaw > 0 ? 'Sağa' : 'Sola';
      yawAngle = mirroredYaw;
    } else if (absYaw <= 50) {
      horizontal = mirroredYaw > 0 ? 'Sağa' : 'Sola';
      yawAngle = mirroredYaw;
    } else {
      horizontal = mirroredYaw > 0 ? 'Sağa' : 'Sola';
      yawAngle = mirroredYaw;
    }
    
    // Dikey yön (yukarı/aşağı/düz)
    let vertical = '';
    let pitchAngle = pitch;
    if (pitch > 20) {
      if (pitch > 35) {
        vertical = 'Yukarı';
      } else {
        vertical = 'Yukarı';
      }
      pitchAngle = pitch;
    } else if (pitch < -20) {
      if (pitch < -35) {
        vertical = 'Aşağı';
      } else {
        vertical = 'Aşağı';
      }
      pitchAngle = pitch;
    } else {
      vertical = 'Düz';
      pitchAngle = 0;
    }
    
    return {
      horizontal,
      vertical,
      yawAngle: Math.round(yawAngle),
      pitchAngle: Math.round(pitchAngle),
    };
  }, [faceDetected, faceYaw, facePitch]);
  // Yüzün oval içinde olup olmadığını kontrol et (hem boyut hem konum)
  // Ayrıca yüz kaplama yüzdesini hesapla (60-90% arası yeşil olacak)
  const { isFaceInGuide, faceCoveragePercent, isInGreenRange } = React.useMemo(() => {
    if (!faceDetected || !faceBounds) {
      return { isFaceInGuide: false, faceCoveragePercent: 0, isInGreenRange: false };
    }

    // Oval kılavuz boyutları (ekran koordinatlarında)
    const guideWidth = 200;
    const guideHeight = 260;
    const overlayWidth = overlaySize.width || SCREEN_WIDTH;
    const overlayHeight = overlaySize.height || SCREEN_HEIGHT;

    const faceWidth = faceBounds.width;
    const faceHeight = faceBounds.height;
    const faceCenterX = faceBounds.x + faceWidth / 2;
    const faceCenterY = faceBounds.y + faceHeight / 2;

    const widthRatio = faceWidth / guideWidth;
    const heightRatio = faceHeight / guideHeight;

    // Yüz boyutu kontrolü - yüz kılavuz çizgisini (daireyi) %30 ile %250 arasında kaplamalı (daha esnek)
    // Alan bazlı kontrol: yüz alanı / kılavuz alanı
    // Basit yaklaşım: widthRatio * heightRatio (yüz kılavuzun alanının yüzdesi)
    const areaRatio = widthRatio * heightRatio;
    const areaOk = areaRatio >= 0.30 && areaRatio <= 2.50; // Yüz kılavuzun alanının %30-250 arasında olmalı (daha esnek)
    
    const sizeOk = areaOk;

    const guideCenterX = overlayWidth / 2;
    const guideCenterY = overlayHeight / 2;

    const dx = faceCenterX - guideCenterX;
    const dy = faceCenterY - guideCenterY;

    const a = guideWidth / 2;
    const b = guideHeight / 2;
    const positionScore = (dx * dx) / (a * a) + (dy * dy) / (b * b);
    // Pozisyon kontrolü - yüzün kılavuz çizgileri içinde olup olmadığını kontrol et
    // Yüzün merkezi kılavuz ovalinin içinde olmalı (elliptik kontrol)
    // Daha esnek kontrol: position score 15.0'e kadar izin ver (yüz biraz uzakta olsa bile)
    // Ayrıca X ve Y offset'lerini ayrı ayrı kontrol et - daha esnek tolerans
    const xOffsetOk = Math.abs(dx) <= a * 3.5; // X ekseninde %350 tolerans (daha esnek)
    const yOffsetOk = Math.abs(dy) <= b * 3.5; // Y ekseninde %350 tolerans (daha esnek)
    // Position score 15.0'e kadar VEYA X ve Y offset'leri kabul edilebilir aralıktaysa OK
    const positionOk = positionScore <= 15.0 || (xOffsetOk && yOffsetOk);

    // Yüz kaplama yüzdesini hesapla
    const faceCoveragePercent = areaRatio * 100;
    // 60-90% arası yeşil olacak
    const isInGreenRange = faceCoveragePercent >= 60 && faceCoveragePercent <= 90;

    if (__DEV__ && faceDetected) {
      const areaPercent = faceCoveragePercent.toFixed(1);
      console.log('🔍 Face Guide:', {
        overlay: `${overlayWidth.toFixed(0)}x${overlayHeight.toFixed(0)}`,
        face: `${faceWidth.toFixed(0)}x${faceHeight.toFixed(0)}`,
        ratios: `${widthRatio.toFixed(2)}, ${heightRatio.toFixed(2)}`,
        areaRatio: `${areaPercent}%`,
        centerOffset: `${dx.toFixed(0)}, ${dy.toFixed(0)}`,
        sizeOk: sizeOk ? '✅' : '❌',
        positionOk: positionOk ? '✅' : '❌',
        score: positionScore.toFixed(2),
        inGuide: (sizeOk && positionOk) ? '✅' : '❌',
        greenRange: isInGreenRange ? '🟢' : '⚪',
      });
    }

    const result = sizeOk && positionOk;
    
    // CaptureFlowScreen'e bildir
    if (onFaceInGuideChange) {
      onFaceInGuideChange(result);
    }
    
    return { isFaceInGuide: result, faceCoveragePercent, isInGreenRange };
  }, [faceDetected, faceBounds, overlaySize, onFaceInGuideChange]);

  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setOverlaySize({ width, height });
      }}
    >
      {/* Kılavuz çizgileri - Yüz oval - HER ZAMAN GÖRÜNÜR */}
      <View style={styles.guideContainer} pointerEvents="none">
        {/* Dış glow efekti - sadece yüz oturduğunda ve yeşil aralıkta */}
        {isFaceInGuide && isInGreenRange && (
          <View style={[styles.faceGuideGlow, styles.faceGuideGlowActive]} />
        )}
        
        {/* Ana oval çerçeve - HER ZAMAN GÖRÜNÜR */}
        {/* Yeşil: yüz kılavuzda VE %60-90 aralığında */}
        <View style={[styles.faceGuide, isFaceInGuide && isInGreenRange && styles.faceGuideActive]}>
          {/* İç gradient overlay - sadece yeşil aralıkta */}
          {isFaceInGuide && isInGreenRange && <View style={styles.faceGuideInner} />}
        </View>
        
        {/* Modern köşe işaretleri - HER ZAMAN GÖRÜNÜR */}
        <View style={[styles.guideCorner, styles.guideTopLeft, isFaceInGuide && isInGreenRange && styles.guideCornerActive]}>
          <View style={[styles.cornerDot, isFaceInGuide && isInGreenRange && styles.cornerDotActive]} />
        </View>
        <View style={[styles.guideCorner, styles.guideTopRight, isFaceInGuide && isInGreenRange && styles.guideCornerActive]}>
          <View style={[styles.cornerDot, isFaceInGuide && isInGreenRange && styles.cornerDotActive]} />
        </View>
        <View style={[styles.guideCorner, styles.guideBottomLeft, isFaceInGuide && isInGreenRange && styles.guideCornerActive]}>
          <View style={[styles.cornerDot, isFaceInGuide && isInGreenRange && styles.cornerDotActive]} />
        </View>
        <View style={[styles.guideCorner, styles.guideBottomRight, isFaceInGuide && isInGreenRange && styles.guideCornerActive]}>
          <View style={[styles.cornerDot, isFaceInGuide && isInGreenRange && styles.cornerDotActive]} />
        </View>
      </View>

      {/* Sol üstte yüz yönü bilgisi */}
      <View style={styles.faceDirectionBox}>
        <View style={styles.faceDirectionRow}>
          <Text style={styles.faceDirectionLabel}>Yatay:</Text>
          <Text style={styles.faceDirectionValue}>
            {faceDirectionInfo.horizontal}
            {faceDirectionInfo.yawAngle !== 0 && ` (${faceDirectionInfo.yawAngle}°)`}
          </Text>
        </View>
        <View style={[styles.faceDirectionRow, { marginBottom: 0 }]}>
          <Text style={styles.faceDirectionLabel}>Dikey:</Text>
          <Text style={styles.faceDirectionValue}>
            {faceDirectionInfo.vertical}
            {faceDirectionInfo.pitchAngle !== 0 && ` (${faceDirectionInfo.pitchAngle}°)`}
          </Text>
        </View>
      </View>

      {countdown !== null ? (
        <View style={styles.countdownWrapper}>
          <View style={styles.countdownBackground} />
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.countdownLabel}>Fotoğraf çekiliyor...</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  guideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: 200,
    height: 260,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'solid',
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  faceGuideActive: {
    borderColor: 'rgba(74,222,128,0.9)',
    borderWidth: 4,
    shadowColor: 'rgba(74,222,128,0.5)',
    shadowRadius: 12,
    elevation: 12,
  },
  faceGuideGlow: {
    position: 'absolute',
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  faceGuideGlowActive: {
    borderColor: 'rgba(74,222,128,0.3)',
    shadowColor: 'rgba(74,222,128,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  faceGuideInner: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 98,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
  },
  guideCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideTopLeft: {
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  guideTopRight: {
    top: -3,
    right: -3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  guideBottomLeft: {
    bottom: -3,
    left: -3,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  guideBottomRight: {
    bottom: -3,
    right: -3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  guideCornerActive: {
    borderColor: 'rgba(74,222,128,0.9)',
    borderWidth: 4,
    shadowColor: 'rgba(74,222,128,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  cornerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  cornerDotActive: {
    backgroundColor: 'rgba(74,222,128,0.8)',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: 'rgba(74,222,128,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  faceDirectionBox: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 140,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  faceDirectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  faceDirectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.7)',
    marginRight: 6,
    minWidth: 50,
  },
  faceDirectionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  countdownWrapper: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 20,
    minWidth: 100,
    minHeight: 100,
  },
  countdownBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    zIndex: 1,
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    zIndex: 1,
    textAlign: 'center',
  },
});

export default CameraOverlay;

