import { useMemo } from 'react';
import { CaptureStep } from '../config/steps';
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
  step: CaptureStep,
  deviceAngle: DeviceAngle,
  faceData: FaceData,
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
function checkDeviceAngle(
  step: CaptureStep,
  angle: DeviceAngle,
): ConditionCheckResult {
  const { pitch, roll, zAxis } = angle;

  switch (step.id) {
    case 'front': {
      // Tam Yüz – Karşıdan: Basit telefon açısı kontrolleri
      
      // 1. Z ekseni kontrolü - Ekran yukarı/aşağı bakmamalı (daha esnek)
      if (zAxis > 0.4) {
        return { passed: false, hint: 'Telefonu yatay tut (ekran yukarı bakmamalı).' };
      }
      if (zAxis < -0.2) {
        return { passed: false, hint: 'Telefonu yatay tut (ekran aşağı bakmamalı).' };
      }

      // 2. Pitch kontrolü - Sağa/sola yatık (daha esnek)
      if (pitch > 10) {
        return { passed: false, hint: 'Telefonu biraz sola doğru eğ (sağa yatık).' };
      }
      if (pitch < -10) {
        return { passed: false, hint: 'Telefonu biraz sağa doğru eğ (sola yatık).' };
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
function checkFaceOrientation(
  step: CaptureStep,
  faceData: FaceData,
): ConditionCheckResult {
  if (!faceData.detected) {
    return { passed: false, hint: 'Yüz tespit ediliyor...' };
  }

  // Front-facing kamera görüntüsü yansıtılmış olduğu için yaw açısını tersine çevir
  const mirroredYaw = -(faceData.yaw || 0);

  switch (step.id) {
    case 'front': {
      // Tam karşıdan: Yüz dik bakıyor (yaw açısı -60° ile +60° arasında - çok esnek)
      // Front için yüz yönü kontrolü çok esnek - kullanıcı rahatça pozisyon alabilsin
      if (mirroredYaw >= -60 && mirroredYaw <= 60) {
        return { passed: true, hint: 'Yüz yönü tamam.' };
      }
      if (mirroredYaw > 60) {
        return { passed: false, hint: 'Yüzünü biraz sola çevir (dik bak).' };
      } else {
        return { passed: false, hint: 'Yüzünü biraz sağa çevir (dik bak).' };
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
  // Yüz düz bakmalı: pitch -20° ile +20° arasında olmalı (esnek)
  const facePitch = faceData.pitch || 0;

  if (facePitch >= -20 && facePitch <= 20) {
    return { passed: true, hint: 'Yüz yönü tamam.' };
  }
  
  if (facePitch > 20) {
    if (facePitch > 35) {
      return { passed: false, hint: 'Yüzünü aşağı çevir (çok yukarı bakıyorsun).' };
    }
    return { passed: false, hint: 'Yüzünü biraz aşağı çevir (düz bak).' };
  } else {
    if (facePitch < -35) {
      return { passed: false, hint: 'Yüzünü yukarı çevir (çok aşağı bakıyorsun).' };
    }
    return { passed: false, hint: 'Yüzünü biraz yukarı çevir (düz bak).' };
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

