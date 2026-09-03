import type { Vec3 } from "@semantic-director/shared";
import type { SceneGraph } from "./SceneGraph";
import { evaluateEntity, findEntity } from "./SceneGraph";

export function defaultAnchor(entity: { semanticType: string; anchors: Record<string, Vec3> }): string {
  if (entity.semanticType === "person" && entity.anchors.chest) return "chest";
  if (entity.anchors.center) return "center";
  if (entity.anchors.top) return "top";
  return Object.keys(entity.anchors)[0] ?? "center";
}

export function resolveAnchor(scene: SceneGraph, entityId: string, anchorName: string, time = 0): Vec3 {
  const entity = findEntity(scene, entityId);
  if (!entity) {
    throw new Error(`Unknown entity: ${entityId}`);
  }
  const evaluated = evaluateEntity(entity, time);
  return (
    evaluated.anchorsWorld[anchorName] ??
    evaluated.anchorsWorld[defaultAnchor(entity)] ??
    evaluated.anchorsWorld.center ??
    evaluated.position
  );
}

export function targetHeight(evaluatedSizeY: number): number {
  return evaluatedSizeY;
}
