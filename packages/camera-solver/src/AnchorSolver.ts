import type { CameraIntent, HeightConstraint } from "@semantic-director/camera-dsl";
import { evaluateEntity, findEntity, resolveAnchor, type SceneGraph } from "@semantic-director/scene-core";
import type { Vec3 } from "@semantic-director/shared";

export function resolveHeight(scene: SceneGraph, intent: CameraIntent, time: number, fallback: number): number {
  const height = intent.height;
  if (!height) return fallback;
  return resolveHeightConstraint(scene, height, intent, time, fallback);
}

export function resolveHeightConstraint(
  scene: SceneGraph,
  height: HeightConstraint,
  intent: CameraIntent,
  time: number,
  fallback: number,
): number {
  try {
    if (height.type === "absolute") return height.value;
    if (height.type === "anchor") {
      return resolveAnchor(scene, height.entityId, height.anchor, time)[1];
    }
    return resolveAnchor(scene, intent.target.entityId, height.anchor, time)[1];
  } catch {
    return fallback;
  }
}

export function targetWorld(scene: SceneGraph, intent: CameraIntent, time: number): Vec3 {
  return resolveAnchor(scene, intent.target.entityId, intent.target.anchor, time);
}

export function targetEvaluated(scene: SceneGraph, intent: CameraIntent, time: number) {
  const entity = findEntity(scene, intent.target.entityId);
  if (!entity) throw new Error(`Unknown target entity: ${intent.target.entityId}`);
  return evaluateEntity(entity, time);
}
