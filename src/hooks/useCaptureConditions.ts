/**
 * useCaptureConditions
 *
 * Her adım için cihaz açısı, yüz pozisyonu, stabilite gibi kuralları kontrol eden merkezi hook.
 *
 * - Kural ve adım bazlı guidance/hint üretir.
 * - Tüm adım koşullarını tek bir yerde toplar ve sadeleştirir.
 * - Fazla tekrar eden veya karmaşık mantıklar sadeleştirilebilir.
 */
import { useMemo } from 'react';
import { CaptureRule } from '../config/captureRules';
import { DeviceAngle } from './useDeviceAngle';

export type FaceData = {
  detected: boolean;
  yaw: number;
  pitch: number;
  roll: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  inGuide: boolean;
};

export type CaptureConditions = {
  isReady: boolean;
  allConditionsMet: boolean;
  deviceAngleOk: boolean;
  faceDetected: boolean;
  faceInGuide: boolean;
  faceOrientationOk: boolean;
  stabilityOk: boolean;
  hints: string[];
  primaryHint: string;
};

type ConditionCheckResult = {
  passed: boolean;
  hint: string;
};

/**
 * Her pozisyon için koşul kontrol mekanizması
 */
export const useCaptureConditions = (
  step: CaptureRule,
  deviceAngle: DeviceAngle,
  faceData: FaceData
): CaptureConditions => {
  const conditions = useMemo(() => {
    const hints: string[] = [];
    let deviceAngleOk = false;
    let faceDetected = faceData.detected;
    let faceInGuide = faceData.inGuide;
    let faceOrientationOk = false;
    // Stabilite kontrolü sadece vertex ve donor için gerekli
    let stabilityOk = true;
    if (step.id === 'vertex' || step.id === 'donor') {
      stabilityOk = deviceAngle.isStable || deviceAngle.stabilityDuration >= 0.2;
    }

    // 1. TELEFON AÇISI KONTROLÜ
    const deviceCheck = checkDeviceAngle(step, deviceAngle);
    deviceAngleOk = deviceCheck.passed;
    if (!deviceCheck.passed) {
      hints.push(deviceCheck.hint);
    }

    // 2. YÜZ TESPİTİ KONTROLÜ (Sadece front, right45, left45 için)
    if (step.id === 'front' || step.id === 'right45' || step.id === 'left45') {
      if (!faceDetected) {
        hints.push('Yüz tespit ediliyor...');
      }
    } else {
      // Vertex ve donor için yüz tespiti gerekmez
      faceDetected = true; // Bu adımlar için yüz tespiti zorunlu değil
    }

    // 3. YÜZ POZİSYONU KONTROLÜ (Kılavuz içinde) - KALDIRILDI
    // Kılavuz kontrolü artık yapılmıyor, her zaman true kabul ediliyor
    faceInGuide = true;

    // 4. YÜZ YÖNÜ KONTROLÜ
    if (step.id === 'right45' || step.id === 'left45') {
      // Sağa/sola bakış için yaw kontrolü
      const faceOrientationCheck = checkFaceOrientation(step, faceData);
      faceOrientationOk = faceOrientationCheck.passed;
      if (!faceOrientationCheck.passed) {
        hints.push(faceOrientationCheck.hint);
      }
    } else if (step.id === 'front') {
      // Front için yukarı-aşağı bakma kontrolü (pitch) ve düz bakış kontrolü (yaw)
      const facePitchCheck = checkFacePitch(faceData);
      const faceYawCheck = checkFaceYawForFront(faceData);
      faceOrientationOk = facePitchCheck.passed && faceYawCheck.passed;
      if (!facePitchCheck.passed) {
        hints.push(facePitchCheck.hint);
      }
      if (!faceYawCheck.passed) {
        hints.push(faceYawCheck.hint);
      }
    } else {
      // Vertex ve donor için yüz yönü kontrolü gerekmez
      faceOrientationOk = true;
    }

    // 5. STABİLİTE KONTROLÜ (Sadece vertex ve donor için)
    if ((step.id === 'vertex' || step.id === 'donor') && !stabilityOk) {
      hints.push('Telefonu sabit tut.');
    }

    // Tüm koşullar sağlandı mı?
    // Front, right45, left45 için: Telefon dik + Yüz tespit + Yüz yönü doğru (Kılavuz kontrolü kaldırıldı)
    // Vertex ve donor için: Ek olarak stabilite kontrolü
    const allConditionsMet =
      deviceAngleOk &&
      faceDetected &&
      faceOrientationOk &&
      stabilityOk;

    // Ana ipucu (en önemli olan)
    const primaryHint = hints.length > 0 ? hints[0] : 'Tüm koşullar sağlandı!';

    return {
      isReady: allConditionsMet,
      allConditionsMet,
      deviceAngleOk,
      faceDetected,
      faceInGuide,
      faceOrientationOk,
      stabilityOk,
      hints,
      primaryHint,
    };
  }, [step, deviceAngle, faceData]);

  return conditions;
};

/**
 * Telefon açısı kontrolü - Her pozisyon için özel
 */
function checkDeviceAngle(step: CaptureRule, angle: DeviceAngle): ConditionCheckResult {
  const { pitch, roll, zAxis } = angle;

  switch (step.id) {
    case 'front': {
      // Tam Yüz – Karşıdan: esnek telefon açısı kontrolleri
      // Telefon yere paralel, yüz kameraya karşı - ancak katı kurallar yok

      // 1. Z ekseni kontrolü - Ekran çok yukarı/aşağı bakmamalı (çok esnek)
      if (zAxis > 0.25) {
        return { passed: false, hint: 'Telefonu biraz öne eğ.' };
      }
      if (zAxis < -0.08) {
        return { passed: false, hint: 'Telefonu biraz yukarı kaldır.' };
      }

      // 2. Pitch kontrolü - Sağa/sola yatık (çok esnek)
      if (pitch > 8) {
        return { passed: false, hint: 'Telefonu biraz sola doğru eğ.' };
      }
      if (pitch < -8) {
        return { passed: false, hint: 'Telefonu biraz sağa doğru eğ.' };
      }

      return { passed: true, hint: 'Telefon açısı tamam.' };
    }

    case 'right45':
    case 'left45': {
      // 45° Sağa/Sola Bakış: Basit telefon açısı kontrolleri

      // 1. Z ekseni kontrolü - Ekran yukarı/aşağı bakmamalı
      if (zAxis > 0.25) {
        return { passed: false, hint: 'Telefonu yatay tut (ekran yukarı bakmamalı).' };
      }
      if (zAxis < -0.13) {
        return { passed: false, hint: 'Telefonu yatay tut (ekran aşağı bakmamalı).' };
      }

      // 2. Pitch kontrolü - Sağa/sola yatık
      if (pitch > 5) {
        return { passed: false, hint: 'Telefonu biraz sola doğru eğ (sağa yatık).' };
      }
      if (pitch < -5) {
        return { passed: false, hint: 'Telefonu biraz sağa doğru eğ (sola yatık).' };
      }

      return {
        passed: true,
        hint: step.id === 'right45'
          ? 'Telefon açısı tamam. Başını 45° sağa çevir.'
          : 'Telefon açısı tamam. Başını 45° sola çevir.',
      };
    }

    case 'vertex': {
      // Tepe Kısmı: Telefon başın üzerine, eğim yaklaşık 90°
      const pitchOk = pitch <= -75 && pitch >= -105; // Yaklaşık -90°
      const phoneFacingDown = zAxis <= -0.45; // Telefon aşağı bakıyor

      if (!phoneFacingDown) {
        return {
          passed: false,
          hint: 'Telefonu başının üstüne kaldır, ekranı yere bakacak şekilde tut.',
        };
      }
      if (!pitchOk) {
        if (pitch > -75) {
          return {
            passed: false,
            hint: 'Telefonu daha dik tut (yaklaşık 90° eğim).',
          };
        } else {
          return {
            passed: false,
            hint: 'Telefonu biraz düzelt (yaklaşık 90° eğim).',
          };
        }
      }
      return {
        passed: true,
        hint: 'Telefon açısı tamam. Tepe kısmını kameranın ortasına yerleştir.',
      };
    }

    case 'donor': {
      // Arka Donör Bölgesi: Telefon başın arkasına, eğim yaklaşık -75°
      const pitchOk = pitch <= -60 && pitch >= -90; // Yaklaşık -75°
      const phoneFacingDown = zAxis <= -0.45; // Telefon aşağı bakıyor

      if (!phoneFacingDown) {
        return {
          passed: false,
          hint: 'Telefonu başının arkasına getir, ekranı yere bakacak şekilde tut.',
        };
      }
      if (!pitchOk) {
        if (pitch > -60) {
          return { passed: false, hint: 'Telefonu daha arkaya eğ.' };
        } else {
          return { passed: false, hint: 'Telefonu biraz düzelt.' };
        }
      }
      return {
        passed: true,
        hint: 'Telefon açısı tamam. Ense bölgesini kameranın ortasına yerleştir.',
      };
    }

    default:
      return { passed: false, hint: 'Bilinmeyen pozisyon.' };
  }
}

/**
 * Yüz yönü kontrolü - Front, right45, left45 için
 */
function checkFaceOrientation(step: CaptureRule, faceData: FaceData): ConditionCheckResult {
  if (!faceData.detected) {
    return { passed: false, hint: 'Yüz tespit ediliyor...' };
  }

  // Front-facing kamera görüntüsü yansıtılmış olduğu için yaw açısını tersine çevir
  const mirroredYaw = -(faceData.yaw || 0);

  switch (step.id) {
    case 'front': {
      // Tam karşıdan: Yüz genel olarak öne bakıyor (yaw açısı ±75° - çok esnek)
      // Front için yüz yönü kontrolü çok esnek - doğrudan tam karşıya bakmak zorunda değil
      if (mirroredYaw >= -75 && mirroredYaw <= 75) {
        return { passed: true, hint: 'Yüz yönü tamam.' };
      }
      if (mirroredYaw > 75) {
        return { passed: false, hint: 'Yüzünü biraz daha öne çevir.' };
      } else {
        return { passed: false, hint: 'Yüzünü biraz daha öne çevir.' };
      }
    }

    case 'right45': {
      // 45° Sağa: Yaw açısı 25° ile 65° arasında sağa olmalı (daha esnek)
      if (mirroredYaw >= 25 && mirroredYaw <= 65) {
        return { passed: true, hint: 'Yüz yönü tamam (45° sağa).' };
      }
      if (mirroredYaw < 25) {
        return { passed: false, hint: 'Başını daha fazla sağa çevir (45°).' };
      } else {
        return { passed: false, hint: 'Başını biraz sola çevir (45° sağa olmalı).' };
      }
    }

    case 'left45': {
      // 45° Sola: Yaw açısı -25° ile -65° arasında sola olmalı (daha esnek)
      if (mirroredYaw <= -25 && mirroredYaw >= -65) {
        return { passed: true, hint: 'Yüz yönü tamam (45° sola).' };
      }
      if (mirroredYaw > -25) {
        return { passed: false, hint: 'Başını daha fazla sola çevir (45°).' };
      } else {
        return { passed: false, hint: 'Başını biraz sağa çevir (45° sola olmalı).' };
      }
    }

    default:
      return { passed: true, hint: '' };
  }
}

/**
 * Yüz pitch kontrolü - Front için (yukarı-aşağı bakma)
 */
function checkFacePitch(faceData: FaceData): ConditionCheckResult {
  if (!faceData.detected) {
    return { passed: false, hint: 'Yüz tespit ediliyor...' };
  }

  // Front-facing kamera için pitch açısı
  // Yüz düz bakmalı: pitch -30° ile +30° arasında olmalı (çok esnek)
  const facePitch = faceData.pitch || 0;

  if (facePitch >= -30 && facePitch <= 30) {
    return { passed: true, hint: 'Yüz yönü tamam.' };
  }

  if (facePitch > 30) {
    return { passed: false, hint: 'Yüzünü biraz aşağı çevir.' };
  } else {
    return { passed: false, hint: 'Yüzünü biraz yukarı çevir.' };
  }
}

/**
 * Yüz yaw kontrolü - Front için (sağa-sola bakma, düz bakmalı)
 */
function checkFaceYawForFront(faceData: FaceData): ConditionCheckResult {
  if (!faceData.detected) {
    return { passed: false, hint: 'Yüz tespit ediliyor...' };
  }

  // Front-facing kamera görüntüsü yansıtılmış olduğu için yaw açısını tersine çevir
  const mirroredYaw = -(faceData.yaw || 0);
  const absYaw = Math.abs(mirroredYaw);

  // Tam karşıdan: Yüz dik bakıyor (yaw açısı -25° ile +25° arasında - daha esnek)
  if (absYaw <= 25) {
    return { passed: true, hint: 'Yüz yönü tamam.' };
  }

  if (mirroredYaw > 25) {
    return { passed: false, hint: 'Yüzünü biraz sola çevir (dik bak).' };
  } else {
    return { passed: false, hint: 'Yüzünü biraz sağa çevir (dik bak).' };
  }
}

