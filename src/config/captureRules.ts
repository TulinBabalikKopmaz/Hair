import type { FaceData } from '../hooks/useCaptureConditions';
/**
 * Her fotoğraf pozisyonu için özel kurallar
 * Tüm kurallar sağlandığında otomatik geri sayım başlar ve fotoğraf çekilir
 */

export type StepRule = {
    id: string;
    name: string;
    description: string;
    getPhoneHintForAngle: (angle: { roll: number; pitch: number; zAxis: number }) => string;
    getFaceHintForAngle?: (face: FaceData) => string;
    getFaceGuideStatus?: (face: FaceData) => string | undefined;
    getGuideActiveStatus?: (face: FaceData) => boolean;
    faceAreaMinPercent?: number;
    faceAreaMaxPercent?: number;
};

export const CAPTURE_RULES: StepRule[] = [
    {
        id: 'front',
        name: 'Tam Yüz – Karşıdan',
        description: 'Yüzünü kameranın tam ortasına yerleştir ve doğrudan karşıya bak.',
        faceAreaMinPercent: 100,
        faceAreaMaxPercent: 160,
        getPhoneHintForAngle: (angle) => {
            if (angle.roll < 70) return 'Telefonu biraz öne eğin.';
            if (angle.roll > 95) return 'Telefonu biraz arkaya eğin.';
            if (angle.pitch < -5) return 'Telefonu biraz sağa eğin.';
            if (angle.pitch > 5) return 'Telefonu biraz sola eğin.';
            if (angle.zAxis < -0.08) return 'Düz (Ekran Yukarı)';
            if (angle.zAxis > 0.15) return 'Ters Ekran Aşağı';
            return 'Telefon Dik Konumda.';
        },
        getFaceHintForAngle: (face) => {
            if (face.yaw !== undefined) {
                if (face.yaw < -10) return 'Yüzünüzü biraz sola çevirin';
                if (face.yaw > 10) return 'Yüzünüzü biraz sağa çevirin';
            }
            if (face.pitch !== undefined) {
                if (face.pitch < -10) return 'Biraz yukarı bakın';
                if (face.pitch > 10) return 'Biraz aşağı bakın';
            }
            return 'Yüz tam karşıya bakıyor.';
        },
        getFaceGuideStatus: (face) => {
            if (face.inGuide === true) return 'Yüz ve Saç klavuz çizgilerinde';
            if (face.inGuide === false) return 'Yüz ve Saç klavuz çizgilerinde değil';
            return undefined;
        },
        getGuideActiveStatus: (face) => {
            // Yönlendirme kutusundaki metinlere göre kontrol
            const phoneIsUpright = face?.phoneHint === 'Telefon Dik Konumda.';
            const faceIsFront = face?.faceHint === 'Yüz tam karşıya bakıyor.';
            const inGuide = face?.guideHint === 'Yüz ve Saç klavuz çizgilerinde';
            return phoneIsUpright && faceIsFront && inGuide;
        },
    },
    {
        id: 'right45',
        name: '45° Sağa Bakış',
        description: 'Başını 45° sağa çevir ve yüzünü kılavuz çizgileri içine yerleştir.',
        faceAreaMinPercent: 105,
        faceAreaMaxPercent: 155,
        getPhoneHintForAngle: (angle) => {
            if (angle.roll < -10) return 'Telefonu biraz sola yatırın';
            if (angle.roll > 10) return 'Telefonu biraz sağa yatırın';
            if (angle.zAxis < -0.05 || angle.zAxis > 0.05) return 'Telefonu yere paralel tutun';
            return 'Pozisyon uygun.';
        },
    },
    {
        id: 'left45',
        name: '45° Sola Bakış',
        description: 'Başını 45° sola çevir ve yüzünü kılavuz çizgileri içine yerleştir.',
        faceAreaMinPercent: 105,
        faceAreaMaxPercent: 155,
        getPhoneHintForAngle: (angle) => {
            if (angle.roll < -10) return 'Telefonu biraz sola yatırın';
            if (angle.roll > 10) return 'Telefonu biraz sağa yatırın';
            return 'Pozisyon uygun.';
        },
    },
    {
        id: 'vertex',
        name: 'Tepe Kısmı (Vertex)',
        description: 'Telefonu başının üzerine kaldır ve tepe kısmını kameranın ortasına yerleştir.',
        faceAreaMinPercent: 110,
        faceAreaMaxPercent: 150,
        getPhoneHintForAngle: (angle) => {
            if (angle.roll < -10) return 'Telefonu biraz sola yatırın';
            if (angle.roll > 10) return 'Telefonu biraz sağa yatırın';
            return 'Pozisyon uygun.';
        },
    },
    {
        id: 'donor',
        name: 'Arka Donör Bölgesi',
        description: 'Telefonu başının arkasına getir ve ense bölgesini kameranın ortasına yerleştir.',
        faceAreaMinPercent: 115,
        faceAreaMaxPercent: 145,
        getPhoneHintForAngle: (angle) => {
            if (angle.roll < -10) return 'Telefonu biraz sola yatırın';
            if (angle.roll > 10) return 'Telefonu biraz sağa yatırın';
            return 'Pozisyon uygun.';
        },
    },
];

export function getRuleById(id: string): StepRule | undefined {
    return CAPTURE_RULES.find(rule => rule.id === id);
}

export function checkDeviceAngle(
    rule: StepRule,
    deviceAngle: { roll: number; pitch: number; zAxis: number }
): { allRulesMet: boolean; currentHint: string } {
    const hint = rule.getPhoneHintForAngle(deviceAngle);
    return {
        allRulesMet: hint === 'Pozisyon uygun.',
        currentHint: hint,
    };
}
