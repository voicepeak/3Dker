import { add, normalize, scale, sub, type Vec3 } from "@semantic-director/shared";

export function dollyPosition(center: Vec3, start: Vec3, endDistance: number, progress: number): Vec3 {
  const dir = normalize(sub(start, [center[0], start[1], center[2]]));
  const startDist = Math.hypot(start[0] - center[0], start[2] - center[2]);
  const dist = startDist + (endDistance - startDist) * progress;
  const offset = scale(dir, dist);
  return add([center[0], start[1], center[2]], offset);
}
