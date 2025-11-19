export type CaptureStep = {
  id: string;
  title: string;
  description: string;
  targetPitch: number;
  targetRoll?: number; // Sağ/sol için roll açısı (sağ: pozitif, sol: negatif)
  tolerance: number;
  rollTolerance?: number; // Roll için tolerans
};

export const CAPTURE_STEPS: CaptureStep[] = [
  {
    id: 'front',
    title: 'Tam Yüz – Karşıdan',
    description: 'Telefonu yere paralel tut (0° eğim). Yüzünü kameranın tam ortasına yerleştir ve doğrudan karşıya bak.',
    targetPitch: 0,
    tolerance: 8,
  },
  {
    id: 'right45',
    title: '45° Sağa Bakış',
    description: 'Telefonu yere paralel tut (0° eğim). Başını 45° sağa çevir ve yüzünü kılavuz çizgileri içine yerleştir.',
    targetPitch: 0,
    tolerance: 10,
  },
  {
    id: 'left45',
    title: '45° Sola Bakış',
    description: 'Telefonu yere paralel tut (0° eğim). Başını 45° sola çevir ve yüzünü kılavuz çizgileri içine yerleştir.',
    targetPitch: 0,
    tolerance: 10,
  },
  {
    id: 'vertex',
    title: 'Tepe Kısmı (Vertex)',
    description: 'Telefonu başının üzerine kaldır. Eğim yaklaşık 90° olmalı. Tepe kısmını kameranın tam ortasına yerleştir.',
    targetPitch: -90,
    tolerance: 15,
  },
  {
    id: 'donor',
    title: 'Arka Donör Bölgesi',
    description: 'Telefonu başının arkasına getir. Ense üstü ve arka yan bölgeleri kameranın tam ortasına yerleştir.',
    targetPitch: -75,
    tolerance: 15,
  },
];

