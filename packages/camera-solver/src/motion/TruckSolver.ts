import { add, cross, normalize, scale, sub, type Vec3 } from "@semantic-director/shared";

export function truckPosition(start: Vec3, target: Vec3, distance: number, progress: number, left: boolean): Vec3 {
  const forward = normalize(sub([target[0], start[1], target[2]], [start[0], start[1], start[2]]));
  const right = normalize(cross(forward, [0, 1, 0]));
  const dir = left ? scale(right, -1) : right;
  return add(start, scale(dir, distance * progress));
}
