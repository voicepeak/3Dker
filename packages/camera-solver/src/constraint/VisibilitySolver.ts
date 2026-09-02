import { sub, type Vec3 } from "@semantic-director/shared";
import type { EvaluatedEntity } from "@semantic-director/scene-core";

export interface VisibilityHit {
  visible: boolean;
  occluderId?: string;
}

function rayAabb(origin: Vec3, dir: Vec3, min: Vec3, max: Vec3): number | null {
  let tmin = 0;
  let tmax = 1;
  for (let i = 0; i < 3; i++) {
    const d = dir[i];
    if (Math.abs(d) < 1e-8) {
      if (origin[i] < min[i] || origin[i] > max[i]) return null;
      continue;
    }
    const inv = 1 / d;
    let t1 = (min[i] - origin[i]) * inv;
    let t2 = (max[i] - origin[i]) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return null;
  }
  return tmin;
}

export function checkVisibility(
  camera: Vec3,
  target: Vec3,
  entities: EvaluatedEntity[],
  targetId: string,
): VisibilityHit {
  const dir = sub(target, camera);
  let bestT = 1;
  let occluderId: string | undefined;
  for (const entity of entities) {
    if (entity.entity.id === targetId) continue;
    const t = rayAabb(camera, dir, entity.aabb.min, entity.aabb.max);
    if (t !== null && t >= 0 && t < bestT && t < 0.98) {
      bestT = t;
      occluderId = entity.entity.id;
    }
  }
  if (occluderId) return { visible: false, occluderId };
  return { visible: true };
}
