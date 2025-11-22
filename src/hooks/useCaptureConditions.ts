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
import { StepRule } from '../config/captureRules';
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
  phoneHint: string;
  faceHint: string;
  guideHint: string;
};


export type CaptureConditions = {
  isReady: boolean;
  allConditionsMet: boolean;
  deviceAngleOk: boolean;
  hints: string[];
  primaryHint: string;
};



/**
 * Her pozisyon için koşul kontrol mekanizması
 */

export function useCaptureConditions(
  step: StepRule,
  deviceAngle: DeviceAngle
): CaptureConditions {
  return useMemo(() => {
    const hints: string[] = [];
    const deviceCheck = checkDeviceAngle(step, deviceAngle);
    const deviceAngleOk = deviceCheck.allRulesMet;
    if (!deviceAngleOk) {
      hints.push(deviceCheck.currentHint);
    }
    const allConditionsMet = deviceAngleOk;
    const primaryHint = hints.length > 0 ? hints[0] : 'Tüm kurallar sağlandı!';
    return {
      isReady: allConditionsMet,
      allConditionsMet,
      deviceAngleOk,
      hints,
      primaryHint,
    };
  }, [step, deviceAngle]);

  /**
   * Telefon açısı kontrolü - Her pozisyon için özel
   */
  function checkDeviceAngle(step: StepRule, deviceAngle: DeviceAngle) {
    if (!step || !deviceAngle) {
      return { allRulesMet: false, currentHint: 'Kural veya açı eksik.' };
    }
    const hint = step.getPhoneHintForAngle(deviceAngle);
    return {
      allRulesMet: hint === 'Pozisyon uygun.',
      currentHint: hint,
    };
  }
}

/**
 * Yüz yönü kontrolü - Front, right45, left45 için
 */

