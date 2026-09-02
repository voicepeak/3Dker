import { CAMERA_COLLISION_RADIUS, type Vec3 } from "@semantic-director/shared";
import type { EvaluatedEntity } from "@semantic-director/scene-core";

export interface CollisionHit {
  hit: boolean;
  entityId?: string;
}

export function sphereAabbCollision(center: Vec3, radius: number, min: Vec3, max: Vec3): boolean {
  const x = Math.max(min[0], Math.min(center[0], max[0]));
  const y = Math.max(min[1], Math.min(center[1], max[1]));
  const z = Math.max(min[2], Math.min(center[2], max[2]));
  const dx = center[0] - x;
  const dy = center[1] - y;
  const dz = center[2] - z;
  return dx * dx + dy * dy + dz * dz < radius * radius;
}

export function checkCameraCollision(
  position: Vec3,
  entities: EvaluatedEntity[],
  ignoreIds: Set<string>,
  radius = CAMERA_COLLISION_RADIUS,
): CollisionHit {
  for (const entity of entities) {
    if (ignoreIds.has(entity.entity.id)) continue;
    if (sphereAabbCollision(position, radius, entity.aabb.min, entity.aabb.max)) {
      return { hit: true, entityId: entity.entity.id };
    }
  }
  return { hit: false };
}
