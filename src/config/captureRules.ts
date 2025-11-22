/**
 * Her fotoğraf pozisyonu için özel kurallar
 * Tüm kurallar sağlandığında otomatik geri sayım başlar ve fotoğraf çekilir
 */

export type StepRule = {
    id: string;
    name: string;
    description: string;
    deviceAngle: {
        roll: { min: number; max: number };
        pitch: { min: number; max: number };
        zAxis: { min: number; max: number };
    };
    hints: {
        rollLeft: string;
        rollRight: string;
        pitchDown: string;
        pitchUp: string;
        zAxisLow: string;
        zAxisHigh: string;
    };
};

export const CAPTURE_RULES: StepRule[] = [
    {
        id: 'front',
        name: 'Tam Yüz – Karşıdan',
        description: 'Yüzünü kameranın tam ortasına yerleştir ve doğrudan karşıya bak.',
        deviceAngle: {
            roll: { min: 70, max: 95 },
            pitch: { min: -5, max: 5 },
            zAxis: { min: -0.08, max: 0.15 },
        },
        hints: {
            rollLeft: 'Telefonu biraz öne eğin.',
            rollRight: 'Telefon biraz arkaya eğin.',
            pitchDown: 'Telefonu biraz sağa eğin.',
            pitchUp: 'Telefonu biraz sola eğin.',
            zAxisLow: 'Düz (Ekran Yukarı)',
            zAxisHigh: 'Ters Ekran Aşağı',
        },
    },
    {
        id: 'right45',
        name: '45° Sağa Bakış',
        description: 'Başını 45° sağa çevir ve yüzünü kılavuz çizgileri içine yerleştir.',
        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },
        hints: {
            rollLeft: 'Telefonu biraz sola yatırın',
            rollRight: 'Telefonu biraz sağa yatırın',
            pitchDown: 'Telefonu biraz öne eğin',
            pitchUp: 'Telefonu biraz arkaya eğin',
            zAxisLow: 'Telefonu biraz arkaya eğin',
            zAxisHigh: 'Telefonu biraz öne eğin',
        },
    },
    {
        id: 'left45',
        name: '45° Sola Bakış',
        description: 'Başını 45° sola çevir ve yüzünü kılavuz çizgileri içine yerleştir.',
        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },
        hints: {
            rollLeft: 'Telefonu biraz sola yatırın',
            rollRight: 'Telefonu biraz sağa yatırın',
            pitchDown: 'Telefonu biraz öne eğin',
            pitchUp: 'Telefonu biraz arkaya eğin',
            zAxisLow: 'Telefonu biraz arkaya eğin',
            zAxisHigh: 'Telefonu biraz öne eğin',
        },
    },
    {
        id: 'vertex',
        name: 'Tepe Kısmı (Vertex)',
        description: 'Telefonu başının üzerine kaldır ve tepe kısmını kameranın ortasına yerleştir.',
        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },
        hints: {
            rollLeft: 'Telefonu biraz sola yatırın',
            rollRight: 'Telefonu biraz sağa yatırın',
            pitchDown: 'Telefonu biraz öne eğin',
            pitchUp: 'Telefonu biraz arkaya eğin',
            zAxisLow: 'Telefonu biraz arkaya eğin',
            zAxisHigh: 'Telefonu biraz öne eğin',
        },
    },
    {
        id: 'donor',
        name: 'Arka Donör Bölgesi',
        description: 'Telefonu başının arkasına getir ve ense bölgesini kameranın ortasına yerleştir.',
        deviceAngle: {
            roll: { min: -999, max: 999 },
            pitch: { min: -999, max: 999 },
            zAxis: { min: -999, max: 999 },
        },
        hints: {
            rollLeft: 'Telefonu biraz sola yatırın',
            rollRight: 'Telefonu biraz sağa yatırın',
            pitchDown: 'Telefonu biraz öne eğin',
            pitchUp: 'Telefonu biraz arkaya eğin',
            zAxisLow: 'Telefonu biraz arkaya eğin',
            zAxisHigh: 'Telefonu biraz öne eğin',
        },
    },
];

export function getRuleById(id: string): StepRule | undefined {
    return CAPTURE_RULES.find(rule => rule.id === id);
}

export function checkDeviceAngle(
    rule: StepRule,
    deviceAngle: { roll: number; pitch: number; zAxis: number }
): { allRulesMet: boolean; failedRules: string[]; currentHint: string } {
    const failedRules: string[] = [];
    let deviceAngleOk = true;
    if (deviceAngle.roll < rule.deviceAngle.roll.min) {
        failedRules.push(rule.hints.rollLeft);
        deviceAngleOk = false;
    } else if (deviceAngle.roll > rule.deviceAngle.roll.max) {
        failedRules.push(rule.hints.rollRight);
        deviceAngleOk = false;
    }
    if (deviceAngle.pitch < rule.deviceAngle.pitch.min) {
        failedRules.push(rule.hints.pitchDown);
        deviceAngleOk = false;
    } else if (deviceAngle.pitch > rule.deviceAngle.pitch.max) {
        failedRules.push(rule.hints.pitchUp);
        deviceAngleOk = false;
    }
    if (deviceAngle.zAxis < rule.deviceAngle.zAxis.min) {
        failedRules.push(rule.hints.zAxisLow);
        deviceAngleOk = false;
    } else if (deviceAngle.zAxis > rule.deviceAngle.zAxis.max) {
        failedRules.push(rule.hints.zAxisHigh);
        deviceAngleOk = false;
    }
    return {
        allRulesMet: deviceAngleOk,
        failedRules,
        currentHint: failedRules[0] || 'Tüm kurallar sağlandı!',
    };
}
