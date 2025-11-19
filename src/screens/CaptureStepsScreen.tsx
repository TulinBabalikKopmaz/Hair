import React, { useState, useCallback } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import AngleIndicator from '../components/AngleIndicator';
import CameraOverlay from '../components/CameraOverlay';
import { analyzeFaceOrientation } from '../services/faceAnalysis';

type FaceResult = {
    orientation?: string;
    landmarks?: {
        nose?: { x: number; y: number; w: number; h: number } | null;
        // Diğer landmarklar eklenebilir
    };
};
type AngleResult = { pitch: number; roll: number; yaw: number; zAxis: number };

const steps: {
    key: string;
    label: string;
    description: string;
    check: (face: FaceResult, angle: AngleResult) => boolean | string;
}[] = [
        {
            key: 'front',
            label: 'Tam Yüz Karşıdan',
            description: 'Yüzünüzü tam karşıya ve telefonu yere paralel tutun.',
            check: (face: FaceResult, angle: AngleResult) => face.orientation === 'front' && Math.abs(angle.pitch) < 10,
        },
        {
            key: 'right',
            label: '45° Sağa Bakış',
            description: 'Yüzünüzü 45 derece sağa çevirin, telefonu sabit tutun.',
            check: (face: FaceResult, angle: AngleResult) => face.orientation === 'right',
        },
        {
            key: 'left',
            label: '45° Sola Bakış',
            description: 'Yüzünüzü 45 derece sola çevirin, telefonu sabit tutun.',
            check: (face: FaceResult, angle: AngleResult) => face.orientation === 'left',
        },
        {
            key: 'vertex',
            label: 'Tepe Bölgesi',
            description: 'Telefonu başınızın üstüne alın, tepe derisi kadrajda olsun. Burun görünüyorsa pozisyonu düzeltin.',
            check: (face: FaceResult, angle: AngleResult) => {
                // Burun tespiti varsa uyarı
                if (face.landmarks && face.landmarks.nose) {
                    return 'Burun görünüyor, pozisyonu düzeltin.';
                }
                return Math.abs(angle.pitch - 90) < 15;
            },
        },
    ];

const CaptureStepsScreen = () => {
    const [step, setStep] = useState(0);
    const [lastResult, setLastResult] = useState(null);
    const [angle, setAngle] = useState({ pitch: 0, roll: 0, yaw: 0, zAxis: 0 });
    const [loading, setLoading] = useState(false);

    // Dummy camera capture and analysis simulation
    const handleAnalyze = useCallback(async (uri: string) => {
        setLoading(true);
        try {
            const result = await analyzeFaceOrientation(uri);
            setLastResult(result.results?.[0] || null);
            const checkResult = steps[step].check(result.results?.[0] || {}, angle);
            if (checkResult === true) {
                Alert.alert('Otomatik çekim', `${steps[step].label} için fotoğraf çekildi!`);
                setStep((s) => Math.min(s + 1, steps.length - 1));
            } else if (typeof checkResult === 'string') {
                Alert.alert('Kural Uyarısı', checkResult);
            } else {
                Alert.alert('Kural Uyarısı', `Lütfen ${steps[step].label} için doğru pozisyonu alın. Fotoğraf çekilmedi.`);
            }
        } catch (e) {
            if (e instanceof Error) {
                Alert.alert('Hata', e.message);
            } else {
                Alert.alert('Hata', 'Bilinmeyen hata');
            }
        }
        setLoading(false);
    }, [step, angle]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>{steps[step].label}</Text>
            <Text style={{ fontSize: 16, marginBottom: 24 }}>{steps[step].description}</Text>
            <AngleIndicator {...angle} angleReady={true} hint={steps[step].description} />
            <CameraOverlay
                title={steps[step].label}
                description={steps[step].description}
                countdown={null}
                hint={steps[step].description}
                angleReady={true}
            />
            <Button title={loading ? 'Analiz ediliyor...' : 'Analiz Et'} onPress={() => handleAnalyze('dummy-uri.jpg')} disabled={loading} />
            <Text style={{ marginTop: 24 }}>Adım: {step + 1} / {steps.length}</Text>
        </View>
    );
};

export default CaptureStepsScreen;
