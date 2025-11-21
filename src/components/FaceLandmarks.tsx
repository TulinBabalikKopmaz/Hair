/**
 * FaceLandmarks
 *
 * Kameradan alınan yüz landmarklarını (göz, burun, kulak, ağız vb.) ekranda işaretler ve renklendirir.
 *
 * - Her landmark için farklı renk ve etiket gösterir.
 * - overlaySize ve frameSize ile doğru pozisyonda çizim yapar.
 * - landmarkOffsets ile her landmark için ince ayar (dx/dy) uygulanabilir.
 * - mirrorHorizontal ile yatayda ayna efekti uygulanabilir.
 *
 * Diğer overlay ve rehber componentlerle birlikte çalışır.
 */
import React from "react";
import { View, StyleSheet, Text } from "react-native";

type Landmark = {
    x: number;
    y: number;
};

type LandmarkType =
    | "LEFT_EYE"
    | "RIGHT_EYE"
    | "LEFT_EAR"
    | "RIGHT_EAR"
    | "NOSE_BASE"
    | "LEFT_CHEEK"
    | "RIGHT_CHEEK"
    | "MOUTH_LEFT"
    | "MOUTH_RIGHT"
    | "MOUTH_BOTTOM";

type Props = {
    landmarks: Record<LandmarkType, Landmark> | null;
    overlaySize: { width: number; height: number };
    frameSize?: { width: number; height: number };
    transformProps?: {
        scaleX: number;
        scaleY: number;
        offsetX: number;
        offsetY: number;
        fineTuneX?: number;
        fineTuneY?: number;
    };
    landmarkOffsets?: Partial<Record<LandmarkType, { dx?: number; dy?: number }>>;
    mirrorHorizontal?: boolean;
};

const LANDMARK_COLORS: Record<LandmarkType, string> = {
    LEFT_EYE: "#00ff00",
    RIGHT_EYE: "#00ff00",
    LEFT_EAR: "#ff00ff",
    RIGHT_EAR: "#ff00ff",
    NOSE_BASE: "#ffff00",
    LEFT_CHEEK: "#00ffff",
    RIGHT_CHEEK: "#00ffff",
    MOUTH_LEFT: "#ff0000",
    MOUTH_RIGHT: "#ff0000",
    MOUTH_BOTTOM: "#ff0000",
};

const LANDMARK_LABELS: Record<LandmarkType, string> = {
    LEFT_EYE: "Sol Göz",
    RIGHT_EYE: "Sağ Göz",
    LEFT_EAR: "Sol Kulak",
    RIGHT_EAR: "Sağ Kulak",
    NOSE_BASE: "Burun",
    LEFT_CHEEK: "Sol Yanak",
    RIGHT_CHEEK: "Sağ Yanak",
    MOUTH_LEFT: "Ağız Sol",
    MOUTH_RIGHT: "Ağız Sağ",
    MOUTH_BOTTOM: "Ağız Alt",
};

const MIRRORED_LABELS: Partial<Record<LandmarkType, string>> = {
    LEFT_EYE: "Sağ Göz",
    RIGHT_EYE: "Sol Göz",
    LEFT_EAR: "Sağ Kulak",
    RIGHT_EAR: "Sol Kulak",
    LEFT_CHEEK: "Sağ Yanak",
    RIGHT_CHEEK: "Sol Yanak",
    MOUTH_LEFT: "Ağız Sağ",
    MOUTH_RIGHT: "Ağız Sol",
};

const DEFAULT_LANDMARK_OFFSETS: Record<LandmarkType, { dx: number; dy: number }> = {
    LEFT_EYE: { dx: 0, dy: 0 },
    RIGHT_EYE: { dx: 0, dy: 0 },
    LEFT_EAR: { dx: 20, dy: 0 },
    RIGHT_EAR: { dx: -23, dy: 0 },
    NOSE_BASE: { dx: 0, dy: 20 },
    LEFT_CHEEK: { dx: 0, dy: 0 },
    RIGHT_CHEEK: { dx: 0, dy: 0 },
    MOUTH_LEFT: { dx: 0, dy: 20 },
    MOUTH_RIGHT: { dx: 0, dy: 20 },
    MOUTH_BOTTOM: { dx: 0, dy: 20 },
};

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

const FaceLandmarks: React.FC<Props> = ({
    landmarks,
    overlaySize,
    frameSize = { width: 640, height: 480 },
    transformProps,
    landmarkOffsets,
    mirrorHorizontal = false,
}) => {
    if (!landmarks || overlaySize.width === 0 || overlaySize.height === 0) {
        return null;
    }

    const { scaleX, scaleY, offsetX, offsetY } = transformProps || computeScaleAndOffset(overlaySize, frameSize);
    const fineTuneX = transformProps?.fineTuneX ?? 0;
    const fineTuneY = transformProps?.fineTuneY ?? 0;

    const toPixelSpace = (landmark: Landmark) => {
        const likelyNormalized = landmark.x <= 1 && landmark.y <= 1;
        if (!likelyNormalized) {
            return landmark;
        }
        return {
            x: landmark.x * frameSize.width,
            y: landmark.y * frameSize.height,
        };
    };

    const scaleLandmark = (landmark: Landmark) => {
        const pixelLandmark = toPixelSpace(landmark);
        const xCoord = mirrorHorizontal ? frameSize.width - pixelLandmark.x : pixelLandmark.x;
        return {
            x: xCoord * scaleX + offsetX + fineTuneX,
            y: pixelLandmark.y * scaleY + offsetY + fineTuneY,
        };
    };

    return (
        <>
            {(Object.keys(landmarks) as LandmarkType[]).map((key) => {
                const landmark = landmarks[key];
                if (!landmark) return null;

                const scaled = scaleLandmark(landmark);
                const color = LANDMARK_COLORS[key];
                const label = mirrorHorizontal && MIRRORED_LABELS[key] ? MIRRORED_LABELS[key] : LANDMARK_LABELS[key];
                const adjustment = {
                    dx:
                        landmarkOffsets?.[key]?.dx ??
                        DEFAULT_LANDMARK_OFFSETS[key].dx,
                    dy:
                        landmarkOffsets?.[key]?.dy ??
                        DEFAULT_LANDMARK_OFFSETS[key].dy,
                };

                return (
                    <View
                        key={key}
                        style={[
                            styles.landmarkDot,
                            {
                                left: scaled.x + adjustment.dx - 6,
                                top: scaled.y + adjustment.dy - 6,
                                backgroundColor: color,
                            },
                        ]}
                    >
                        <View style={styles.landmarkLabel}>
                            <Text style={styles.landmarkLabelText}>{label}</Text>
                        </View>
                    </View>
                );
            })}
        </>
    );
};

const styles = StyleSheet.create({
    landmarkDot: {
        position: "absolute",
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#000",
    },
    landmarkLabel: {
        position: "absolute",
        top: 15,
        left: -20,
        backgroundColor: "rgba(0,0,0,0.7)",
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        minWidth: 60,
    },
    landmarkLabelText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "600",
        textAlign: "center",
    },
});

export default FaceLandmarks;
