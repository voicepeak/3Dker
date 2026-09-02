import { rotateY, sampleCatmullRom, type Vec3 } from "@semantic-director/shared";
import type { Aabb, EvaluatedEntity, SceneEntity } from "./Entity";
import { yawOf } from "./Transform";

export interface SceneGraph {
  entities: SceneEntity[];
}

export function localToWorld(local: Vec3, position: Vec3, yaw: number, scale: Vec3): Vec3 {
  const scaled: Vec3 = [local[0] * scale[0], local[1] * scale[1], local[2] * scale[2]];
  const rotated = rotateY(scaled, yaw);
  return [position[0] + rotated[0], position[1] + rotated[1], position[2] + rotated[2]];
}

export function facingFromYaw(yaw: number): Vec3 {
  return rotateY([0, 0, 1], yaw);
}

export function evaluateMotionPosition(entity: SceneEntity, time: number): { position: Vec3; yaw: number } {
  const path = entity.motionPath;
  const baseYaw = yawOf(entity.transform);
  if (!path || path.waypoints.length === 0) {
    return { position: [...entity.transform.position], yaw: baseYaw };
  }
  if (path.waypoints.length === 1) {
    return { position: [...path.waypoints[0]], yaw: baseYaw };
  }
  const duration = Math.max(path.duration, 1e-4);
  const t = Math.min(1, Math.max(0, time / duration));
  const position = sampleCatmullRom(path.waypoints, t);
  const ahead = sampleCatmullRom(path.waypoints, Math.min(1, t + 0.02));
  const dx = ahead[0] - position[0];
  const dz = ahead[2] - position[2];
  const yaw = Math.hypot(dx, dz) > 1e-4 ? Math.atan2(dx, dz) : baseYaw;
  return { position, yaw };
}

function worldAabb(position: Vec3, yaw: number, scale: Vec3, size: Vec3): Aabb {
  const hx = (size[0] * scale[0]) / 2;
  const hy = size[1] * scale[1];
  const hz = (size[2] * scale[2]) / 2;
  const corners: Vec3[] = [
    [-hx, 0, -hz],
    [hx, 0, -hz],
    [-hx, 0, hz],
    [hx, 0, hz],
    [-hx, hy, -hz],
    [hx, hy, -hz],
    [-hx, hy, hz],
    [hx, hy, hz],
  ];
  const world = corners.map((c) => localToWorld(c, position, yaw, [1, 1, 1]));
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of world) {
    min[0] = Math.min(min[0], p[0]);
    min[1] = Math.min(min[1], p[1]);
    min[2] = Math.min(min[2], p[2]);
    max[0] = Math.max(max[0], p[0]);
    max[1] = Math.max(max[1], p[1]);
    max[2] = Math.max(max[2], p[2]);
  }
  return { min, max };
}

export function evaluateEntity(entity: SceneEntity, time = 0): EvaluatedEntity {
  const { position, yaw } = evaluateMotionPosition(entity, time);
  const scale = entity.transform.scale;
  const size = entity.bounds.size;
  const anchorsWorld: Record<string, Vec3> = {};
  for (const [name, local] of Object.entries(entity.anchors)) {
    anchorsWorld[name] = localToWorld(local, position, yaw, scale);
  }
  return {
    entity,
    position,
    yaw,
    scale,
    size,
    anchorsWorld,
    aabb: worldAabb(position, yaw, scale, size),
    facing: facingFromYaw(yaw),
  };
}

export function findEntity(scene: SceneGraph, id: string): SceneEntity | undefined {
  return scene.entities.find((e) => e.id === id);
}

export function evaluateScene(scene: SceneGraph, time = 0): EvaluatedEntity[] {
  return scene.entities.map((e) => evaluateEntity(e, time));
}
