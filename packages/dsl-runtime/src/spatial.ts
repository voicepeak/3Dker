import type { Region, SpatialReference, SpatialTarget, Vec3 } from "@semantic-director/dsl-core";
import { normalize, type Vec3 as SharedVec3 } from "@semantic-director/shared";
import { addVec, localAxes, scaleVec } from "./math";
import type { ResolvedEntity, ResolvedScene } from "./resolveScene";

export interface Frame {
  origin: Vec3;
  yaw: number;
}

function regionVector(region: Region | undefined, yaw: number): SharedVec3 {
  const { forward, right, up } = localAxes(yaw);
  switch (region) {
    case "front":
      return forward;
    case "back":
      return scaleVec(forward, -1);
    case "left":
      return scaleVec(right, -1);
    case "right":
      return right;
    case "front_left":
      return normalize(addVec(forward, scaleVec(right, -1)));
    case "front_right":
      return normalize(addVec(forward, right));
    case "back_left":
      return normalize(addVec(scaleVec(forward, -1), scaleVec(right, -1)));
    case "back_right":
      return normalize(addVec(scaleVec(forward, -1), right));
    case "above":
      return up;
    case "below":
      return scaleVec(up, -1);
    default:
      return [0, 0, 0];
  }
}

export function frameOfTarget(
  scene: ResolvedScene,
  target: SpatialTarget,
  entities: Record<string, ResolvedEntity> = scene.entities,
): Frame {
  if (target.type === "world") return { origin: target.position, yaw: 0 };
  if (target.type === "zone") {
    const zone = scene.zones[target.zoneId];
    return { origin: zone ? zone.center : [0, 0, 0], yaw: 0 };
  }
  if (target.type === "between") {
    const a = lookupOrigin(scene, target.a, entities);
    const b = lookupOrigin(scene, target.b, entities);
    const ratio = target.ratio ?? 0.5;
    return {
      origin: [
        a.origin[0] + (b.origin[0] - a.origin[0]) * ratio,
        a.origin[1] + (b.origin[1] - a.origin[1]) * ratio,
        a.origin[2] + (b.origin[2] - a.origin[2]) * ratio,
      ],
      yaw: a.yaw,
    };
  }
  const entity = entities[target.entityId];
  if (!entity) return { origin: [0, 0, 0], yaw: 0 };
  const anchor = target.anchor ? entity.worldAnchors[target.anchor] : entity.position;
  return { origin: anchor ?? entity.position, yaw: entity.yaw };
}

function lookupOrigin(
  scene: ResolvedScene,
  id: string,
  entities: Record<string, ResolvedEntity>,
): Frame {
  if (scene.zones[id]) return { origin: scene.zones[id].center, yaw: 0 };
  const entity = entities[id];
  if (entity) return { origin: entity.position, yaw: entity.yaw };
  return { origin: [0, 0, 0], yaw: 0 };
}

export function resolveSpatial(
  scene: ResolvedScene,
  ref: SpatialReference,
  entities: Record<string, ResolvedEntity> = scene.entities,
): Vec3 {
  const frame = frameOfTarget(scene, ref.relativeTo, entities);
  const distance = ref.distance ?? 0;
  const offsetRegion = scaleVec(regionVector(ref.region, frame.yaw), distance);
  const localOffset = ref.offset ?? [0, 0, 0];
  const { forward, right, up } = localAxes(frame.yaw);
  const offset = addVec(
    addVec(scaleVec(right, localOffset[0]), scaleVec(up, localOffset[1])),
    scaleVec(forward, localOffset[2]),
  );
  const pos = addVec(frame.origin, addVec(offsetRegion, offset));
  if (!ref.height) return pos;
  if (typeof ref.height.absolute === "number") return [pos[0], ref.height.absolute, pos[2]];
  if (ref.height.relativeTo) {
    const base = frameOfTarget(scene, ref.height.relativeTo, entities).origin[1];
    return [pos[0], base + (ref.height.offset ?? 0), pos[2]];
  }
  return [pos[0], pos[1] + (ref.height.offset ?? 0), pos[2]];
}


