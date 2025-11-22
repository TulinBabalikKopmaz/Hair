// ...existing code...
import { useEffect, useRef, useState } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';

const ALPHA = 0.7;
const INTERVAL = 50;
const STABILITY_THRESHOLD = 1.2;

const smooth = (prev: number, next: number, weight = 0.3) =>
  prev * weight + next * (1 - weight);

export type DeviceAngle = {
  pitch: number;
  roll: number;
  yaw: number;
  zAxis: number;
  isStable: boolean;
  stabilityDuration: number;
  orientationLabel: string;
};

export const useDeviceAngle = () => {
  const [angle, setAngle] = useState<DeviceAngle>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    zAxis: 0,
    isStable: false,
    stabilityDuration: 0,
    orientationLabel: 'Unknown',
  });

  const fusedPitch = useRef(0);
  const fusedRoll = useRef(0);
  const fusedYaw = useRef(0);
  const gyroPitchRate = useRef(0);
  const gyroRollRate = useRef(0);
  const gyroYawRate = useRef(0);
  const lastTime = useRef(Date.now());
  const stableStart = useRef<number | null>(null);

  useEffect(() => {
    let accelSub: ReturnType<typeof Accelerometer.addListener> | null = null;
    let gyroSub: ReturnType<typeof Gyroscope.addListener> | null = null;

    const subscribe = async () => {
      await Promise.all([
        Accelerometer.requestPermissionsAsync(),
        Gyroscope.requestPermissionsAsync(),
      ]);

      Accelerometer.setUpdateInterval(INTERVAL);
      Gyroscope.setUpdateInterval(INTERVAL);

      gyroSub = Gyroscope.addListener(({ x = 0, y = 0, z = 0 }) => {
        gyroPitchRate.current = x * (180 / Math.PI);
        gyroRollRate.current = y * (180 / Math.PI);
        gyroYawRate.current = z * (180 / Math.PI);
        fusedYaw.current += gyroYawRate.current * (INTERVAL / 1000);
      });

      accelSub = Accelerometer.addListener(({ x = 0, y = 0, z = 0 }) => {
        const accelPitch =
          (Math.atan2(-x, Math.sqrt(y * y + z * z)) * 180) / Math.PI;
        const accelRoll = (Math.atan2(y, z) * 180) / Math.PI;

        const now = Date.now();
        const dt = (now - lastTime.current) / 1000;
        lastTime.current = now;

        const rawPitch =
          ALPHA * (fusedPitch.current + gyroPitchRate.current * dt) +
          (1 - ALPHA) * accelPitch;
        const rawRoll =
          ALPHA * (fusedRoll.current + gyroRollRate.current * dt) +
          (1 - ALPHA) * accelRoll;

        fusedPitch.current = smooth(fusedPitch.current, rawPitch);
        fusedRoll.current = smooth(fusedRoll.current, rawRoll);

        const currentPitch = Number(fusedPitch.current.toFixed(1));
        const currentRoll = Number(fusedRoll.current.toFixed(1));

        const pitchDiff = Math.abs(currentPitch - rawPitch);
        const rollDiff = Math.abs(currentRoll - rawRoll);
        const stableNow =
          pitchDiff < STABILITY_THRESHOLD && rollDiff < STABILITY_THRESHOLD;

        let stabilityDuration = 0;

        if (stableNow) {
          if (stableStart.current === null) {
            stableStart.current = now;
          }
          stabilityDuration = (now - stableStart.current) / 1000;
        } else {
          stableStart.current = null;
        }

        let dir = '';
        if (z > 0.25) {
          dir += 'Düz (Ekran Yukarı)';
        } else if (z < -0.15) {
          dir += 'Ters (Ekran Aşağı)';
        } else {
          dir += 'Yatay (Arada)';
        }

        if (currentRoll > 20) {
          dir += ' | Alt Tutuluyor';
        } else if (currentRoll < -20) {
          dir += ' | Üst Tutuluyor';
        }

        if (currentPitch > 5) {
          dir += ' | Sağa Yatırılıyor';
        } else if (currentPitch < -5) {
          dir += ' | Sola Yatırılıyor';
        }

        setAngle({
          pitch: currentPitch,
          roll: currentRoll,
          yaw: Number(fusedYaw.current.toFixed(1)),
          zAxis: Number(z.toFixed(2)),
          isStable: stableNow,
          stabilityDuration: Number(stabilityDuration.toFixed(2)),
          orientationLabel: dir,
        });
      });
    };

    subscribe();

    return () => {
      accelSub?.remove();
      gyroSub?.remove();
    };
  }, []);

  return angle;
};

