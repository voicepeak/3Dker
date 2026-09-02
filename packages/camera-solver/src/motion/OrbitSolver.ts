import type { Vec3 } from "@semantic-director/shared";

export function orbitPosition(
  center: Vec3,
  radius: number,
  height: number,
  startAzimuth: number,
  angleRad: number,
  progress: number,
  clockwise: boolean,
): Vec3 {
  const signed = clockwise ? -1 : 1;
  const theta = startAzimuth + signed * angleRad * progress;
  return [center[0] + radius * Math.cos(theta), height, center[2] + radius * Math.sin(theta)];
}

export function orbitAzimuth(startAzimuth: number, angleRad: number, progress: number, clockwise: boolean): number {
  const signed = clockwise ? -1 : 1;
  return startAzimuth + signed * angleRad * progress;
}
