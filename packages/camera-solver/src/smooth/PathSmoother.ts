import { catmullRom, clamp, lerp, slerp, type Quat } from "@semantic-director/shared";
import type { CameraSample } from "../types";

export function smoothSamples(samples: CameraSample[], smoothness: number): CameraSample[] {
  if (samples.length < 3 || smoothness <= 0) return samples;
  const amount = clamp(smoothness, 0, 1);
  const positions = samples.map((s) => s.position);
  return samples.map((sample, i) => {
    if (i === 0 || i === samples.length - 1) return sample;
    const p0 = positions[Math.max(0, i - 1)];
    const p1 = positions[i];
    const p2 = positions[Math.min(positions.length - 1, i + 1)];
    const p3 = positions[Math.min(positions.length - 1, i + 2)];
    const smoothed = catmullRom(p0, p1, p2, p3, 0.5);
    const position = lerp(p1, smoothed, amount);
    const prevQ = samples[i - 1].quaternion;
    const nextQ = samples[Math.min(samples.length - 1, i + 1)].quaternion;
    const quaternion = slerp(prevQ, nextQ, 0.5);
    const mixedQ = slerp(sample.quaternion, quaternion, amount * 0.35);
    return { ...sample, position, quaternion: mixedQ as Quat };
  });
}
