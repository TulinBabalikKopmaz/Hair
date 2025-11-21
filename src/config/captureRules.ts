/**
 * Her fotoğraf pozisyonu için özel kurallar
 * Tüm kurallar sağlandığında otomatik geri sayım başlar ve fotoğraf çekilir
 */

export type CaptureRule = {
    id: string;
    name: string;
    description: string;

    // Telefon açısı kuralları (sadece roll, pitch, z)
    deviceAngle: {
        roll: { min: number; max: number };
        pitch: { min: number; max: number };
        zAxis: { min: number; max: number };
    };

    // Yüz tespiti gerekli mi?
    requireFaceDetection: boolean;

    // Yüz alanı kuralları (sadece yüz tespiti gerekiyorsa)
    faceArea?: {
        min: number; // minimum %
        max: number; // maximum %
    };

    // Yüz yönü kuralları (sadece yüz tespiti gerekiyorsa)
    faceOrientation?: {
        yaw: { min: number; max: number }; // sağa-sola
        pitch: { min: number; max: number }; // yukarı-aşağı
    };

    // Stabilite gereksinimi (telefon sabit tutulmalı mı?)
    requireStability: boolean;

    // Geri sayım süresi (saniye)
    countdownDuration: number;

    // Kullanıcıya gösterilecek ipuçları
    hints: {
        deviceAngle: {
            rollLeft: string;
            rollRight: string;
            pitchDown: string;
            pitchUp: string;
            zAxisLow: string;
            zAxisHigh: string;
        };
        facePosition: string;
        faceOrientation: string;
    };

    // steps.ts'den gelen alanlar
    targetPitch?: number;
    tolerance?: number;
    rollTolerance?: number;
    landmarkOffsets?: Partial<Record<string, { dx?: number; dy?: number }>>;
};

export const CAPTURE_RULES: CaptureRule[] = [
    // 1. TAM YÜZ - KARŞIDAN
    {
        id: 'front',
        name: 'Tam Yüz – Karşıdan',
        description: 'Yüzünü kameranın tam ortasına yerleştir ve doğrudan karşıya bak.',

        deviceAngle: {
            roll: { min: 83, max: 85 },      // Yana yatıklık
            pitch: { min: -10, max: 10 },     // Öne/arkaya eğiklik
            zAxis: { min: -0.08, max: 0.15 },    // Z ekseni (dikeylik)
        },

        requireFaceDetection: false,
        requireStability: false,
        countdownDuration: 3,
        hints: {
            deviceAngle: {
                rollLeft: 'Telefonu biraz sola yatırın',
                rollRight: 'Telefonu biraz sağa yatırın',
                pitchDown: 'Telefonu biraz öne eğin',
                pitchUp: 'Telefonu biraz arkaya eğin',
                zAxisLow: 'Telefonu biraz arkaya eğin',
                zAxisHigh: 'Telefonu biraz öne eğin',
            },
            facePosition: '',
            faceOrientation: '',
        },
    },

    // 2. 45° SAĞA BAKIŞ
    {
        id: 'right45',
        name: '45° Sağa Bakış',
        description: 'Başını 45° sağa çevir ve yüzünü kılavuz çizgileri içine yerleştir.',

        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },

        requireFaceDetection: true,

        faceArea: {
            min: 65,
            max: 120,
        },

        faceOrientation: {
            yaw: { min: 25, max: 65 },
            pitch: { min: -30, max: 30 },
        },

        requireStability: false,
        countdownDuration: 3,

        hints: {
            deviceAngle: {
                rollLeft: 'Telefonu biraz sola yatırın',
                rollRight: 'Telefonu biraz sağa yatırın',
                pitchDown: 'Telefonu biraz öne eğin',
                pitchUp: 'Telefonu biraz arkaya eğin',
                zAxisLow: 'Telefonu biraz arkaya eğin',
                zAxisHigh: 'Telefonu biraz öne eğin',
            },
            facePosition: 'Yüzünü kılavuz içine yerleştir',
            faceOrientation: 'Başını 45° sağa çevir',
        },
    },

    // 3. 45° SOLA BAKIŞ
    {
        id: 'left45',
        name: '45° Sola Bakış',
        description: 'Başını 45° sola çevir ve yüzünü kılavuz çizgileri içine yerleştir.',

        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },

        requireFaceDetection: true,

        faceArea: {
            min: 65,
            max: 120,
        },

        faceOrientation: {
            yaw: { min: -65, max: -25 },
            pitch: { min: -30, max: 30 },
        },

        requireStability: false,
        countdownDuration: 3,

        hints: {
            deviceAngle: {
                rollLeft: 'Telefonu biraz sola yatırın',
                rollRight: 'Telefonu biraz sağa yatırın',
                pitchDown: 'Telefonu biraz öne eğin',
                pitchUp: 'Telefonu biraz arkaya eğin',
                zAxisLow: 'Telefonu biraz arkaya eğin',
                zAxisHigh: 'Telefonu biraz öne eğin',
            },
            facePosition: 'Yüzünü kılavuz içine yerleştir',
            faceOrientation: 'Başını 45° sola çevir',
        },
    },

    // 4. TEPE KISMI (VERTEX)
    {
        id: 'vertex',
        name: 'Tepe Kısmı (Vertex)',
        description: 'Telefonu başının üzerine kaldır ve tepe kısmını kameranın ortasına yerleştir.',

        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },

        requireFaceDetection: false,

        requireStability: false,
        countdownDuration: 3,

        hints: {
            deviceAngle: {
                rollLeft: 'Telefonu biraz sola yatırın',
                rollRight: 'Telefonu biraz sağa yatırın',
                pitchDown: 'Telefonu biraz öne eğin',
                pitchUp: 'Telefonu biraz arkaya eğin',
                zAxisLow: 'Telefonu biraz arkaya eğin',
                zAxisHigh: 'Telefonu biraz öne eğin',
            },
            facePosition: 'Tepe kısmını merkeze yerleştir',
            faceOrientation: 'Ekran yere bakmalı',
        },
    },

    // 5. ARKA DONÖR BÖLGESİ
    {
        id: 'donor',
        name: 'Arka Donör Bölgesi',
        description: 'Telefonu başının arkasına getir ve ense bölgesini kameranın ortasına yerleştir.',

        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },

        requireFaceDetection: false,

        requireStability: false,
        countdownDuration: 3,

        hints: {
            deviceAngle: {
                rollLeft: 'Telefonu biraz sola yatırın',
                rollRight: 'Telefonu biraz sağa yatırın',
                pitchDown: 'Telefonu biraz öne eğin',
                pitchUp: 'Telefonu biraz arkaya eğin',
                zAxisLow: 'Telefonu biraz arkaya eğin',
                zAxisHigh: 'Telefonu biraz öne eğin',
            },
            facePosition: 'Ense bölgesini merkeze yerleştir',
            faceOrientation: 'Ekran yere bakmalı',
        },
    },
];

/**
 * Pozisyon ID'sine göre kural getir
 */
export function getRuleById(id: string): CaptureRule | undefined {
    return CAPTURE_RULES.find(rule => rule.id === id);
}

/**
 * Kuralları kontrol et ve sonuç döndür
 */
export type RuleCheckResult = {
    allRulesMet: boolean;
    deviceAngleOk: boolean;
    faceDetectionOk: boolean;
    faceAreaOk: boolean;
    faceOrientationOk: boolean;
    stabilityOk: boolean;
    failedRules: string[];
    currentHint: string;
};

export function checkRules(
    rule: CaptureRule,
    deviceAngle: { roll: number; pitch: number; zAxis: number; isStable: boolean; stabilityDuration: number },
    faceData?: {
        detected: boolean;
        yaw: number;
        pitch: number;
        bounds: { width: number; height: number } | null;
    },
    faceAreaPercent?: number,
): RuleCheckResult {
    const failedRules: string[] = [];

    // 1. Telefon açısı kontrolü (roll, pitch, zAxis)
    let deviceAngleOk = true;
    if (deviceAngle.roll < rule.deviceAngle.roll.min) {
        failedRules.push(rule.hints.deviceAngle.rollLeft);
        deviceAngleOk = false;
    } else if (deviceAngle.roll > rule.deviceAngle.roll.max) {
        failedRules.push(rule.hints.deviceAngle.rollRight);
        deviceAngleOk = false;
    }
    if (deviceAngle.pitch < rule.deviceAngle.pitch.min) {
        failedRules.push(rule.hints.deviceAngle.pitchDown);
        deviceAngleOk = false;
    } else if (deviceAngle.pitch > rule.deviceAngle.pitch.max) {
        failedRules.push(rule.hints.deviceAngle.pitchUp);
        deviceAngleOk = false;
    }
    if (deviceAngle.zAxis < rule.deviceAngle.zAxis.min) {
        failedRules.push(rule.hints.deviceAngle.zAxisLow);
        deviceAngleOk = false;
    } else if (deviceAngle.zAxis > rule.deviceAngle.zAxis.max) {
        failedRules.push(rule.hints.deviceAngle.zAxisHigh);
        deviceAngleOk = false;
    }

    // 2. Yüz tespiti kontrolü
    let faceDetectionOk = true;
    if (rule.requireFaceDetection) {
        faceDetectionOk = faceData?.detected || false;
        if (!faceDetectionOk) {
            failedRules.push('Yüz tespit ediliyor...');
        }
    }

    // 3. Yüz alanı kontrolü
    let faceAreaOk = true;
    if (rule.requireFaceDetection && rule.faceArea && faceDetectionOk) {
        if (faceAreaPercent !== undefined) {
            faceAreaOk =
                faceAreaPercent >= rule.faceArea.min &&
                faceAreaPercent <= rule.faceArea.max;

            if (!faceAreaOk) {
                failedRules.push(rule.hints.facePosition);
            }
        }
    }

    // 4. Yüz yönü kontrolü
    let faceOrientationOk = true;
    if (rule.requireFaceDetection && rule.faceOrientation && faceDetectionOk && faceData) {
        // Front-facing kamera için yaw'ı tersine çevir
        const mirroredYaw = -faceData.yaw;

        faceOrientationOk =
            mirroredYaw >= rule.faceOrientation.yaw.min &&
            mirroredYaw <= rule.faceOrientation.yaw.max &&
            faceData.pitch >= rule.faceOrientation.pitch.min &&
            faceData.pitch <= rule.faceOrientation.pitch.max;

        if (!faceOrientationOk) {
            failedRules.push(rule.hints.faceOrientation);
        }
    }

    // 5. Stabilite kontrolü
    let stabilityOk = true;
    if (rule.requireStability) {
        stabilityOk = deviceAngle.isStable || deviceAngle.stabilityDuration >= 0.2;
        if (!stabilityOk) {
            failedRules.push('Telefonu sabit tut');
        }
    }

    const allRulesMet =
        deviceAngleOk &&
        faceDetectionOk &&
        faceAreaOk &&
        faceOrientationOk &&
        stabilityOk;

    return {
        allRulesMet,
        deviceAngleOk,
        faceDetectionOk,
        faceAreaOk,
        faceOrientationOk,
        stabilityOk,
        failedRules,
        currentHint: failedRules[0] || 'Tüm kurallar sağlandı!',
    };
}
