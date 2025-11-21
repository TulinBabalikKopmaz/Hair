/**
 * useStepVoiceGuidance
 *
 * Adım kuralına göre sesli yönlendirme yapan custom hook.
 *
 * - Her adımda kuraldan gelen hint'i otomatik olarak sesli okur.
 * - Kamera hazır, ekran odaklı ve fotoğraf çekilmemişse çalışır.
 * - CaptureFlowScreen'de sade ve merkezi sesli yönlendirme sağlar.
 */
import { useEffect } from 'react';
import * as Speech from 'expo-speech';

/**
 * Adım kuralına göre sesli yönlendirme yapan custom hook
 * - ruleCheckResult: kural kontrol sonucu
 * - isFocused: ekran odaklı mı
 * - isCameraReady: kamera hazır mı
 * - photoTaken: o adımda fotoğraf çekildi mi
 */
export function useStepVoiceGuidance({
    ruleCheckResult,
    isFocused,
    isCameraReady,
    photoTaken,
}) {
    useEffect(() => {
        if (!isFocused) return;
        if (photoTaken) return;
        if (!isCameraReady) return;
        const hint = ruleCheckResult?.currentHint;
        if (hint && !ruleCheckResult?.allRulesMet) {
            Speech.speak(hint, { language: 'tr-TR' });
        }
    }, [isFocused, isCameraReady, photoTaken, ruleCheckResult]);
}
