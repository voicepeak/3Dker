import type { Vec3 } from "@semantic-director/shared";
import type { SceneGraph } from "./SceneGraph";
import { evaluateEntity, findEntity } from "./SceneGraph";

export function resolveAnchor(scene: SceneGraph, entityId: string, anchorName: string, time = 0): Vec3 {
  const entity = findEntity(scene, entityId);
  if (!entity) {
    throw new Error(`Unknown entity: ${entityId}`);
  }
  const evaluated = evaluateEntity(entity, time);
  const world = evaluated.anchorsWorld[anchorName];
  if (!world) {
    throw new Error(`Unknown anchor "${anchorName}" on ${entity.name}`);
  }
  return world;
}

export function targetHeight(evaluatedSizeY: number): number {
  return evaluatedSizeY;
}
