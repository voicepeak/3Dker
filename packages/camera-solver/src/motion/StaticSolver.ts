import type { Vec3 } from "@semantic-director/shared";

export function staticPosition(center: Vec3, radius: number, height: number, azimuth: number): Vec3 {
  return [center[0] + radius * Math.cos(azimuth), height, center[2] + radius * Math.sin(azimuth)];
}
