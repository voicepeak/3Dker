import type { Vec3 } from "@semantic-director/shared";

export function cranePosition(start: Vec3, distance: number, progress: number, up: boolean): Vec3 {
  const dy = (up ? 1 : -1) * distance * progress;
  return [start[0], start[1] + dy, start[2]];
}
