import type {
  CameraRuntimeState,
  CameraSetup,
  Diagnostic,
  EntityRuntimeState,
  EulerRotation,
  Scene,
  SceneEntity,
  SceneZone,
  Vec3,
} from "@semantic-director/dsl-core";
import { eulerToQuat, headingOfQuat, headingQuat, lookRotation } from "./math";
import { frameOfTarget, resolveSpatial } from "./spatial";

export interface ResolvedZone {
  id: string;
  center: Vec3;
  size: Vec3;
}

export interface ResolvedEntity {
  id: string;
  type: SceneEntity["type"];
  semantic?: string;
  position: Vec3;
  yaw: number;
  scale: Vec3;
  size: Vec3;
  worldAnchors: Record<string, Vec3>;
  collision: boolean;
  occluder: boolean;
  walkable: boolean;
  pose?: string;
  semanticState?: Record<string, unknown>;
  visibility: boolean;
}

export interface ResolvedScene {
  id: string;
  entities: Record<string, ResolvedEntity>;
  zones: Record<string, ResolvedZone>;
  diagnostics: Diagnostic[];
}

const DEFAULT_SIZE: Record<string, Vec3> = {
  person: [0.5, 1.75, 0.35],
  vehicle: [1.8, 1.5, 4.2],
  prop: [0.4, 0.4, 0.4],
  furniture: [1.2, 0.75, 0.6],
  architecture: [2, 3, 2],
  terrain: [8, 0.2, 8],
  door: [1, 2.1, 0.08],
  window: [1.2, 1.4, 0.08],
  column: [0.4, 3.2, 0.4],
  wall: [6, 3, 0.2],
  platform: [8, 0.2, 24],
  train: [2.8, 3.2, 18],
  camera_marker: [0.2, 0.2, 0.2],
  empty: [0.2, 0.2, 0.2],
};

function defaultAnchors(size: Vec3): Record<string, Vec3> {
  const h = size[1];
  return {
    root: [0, 0, 0],
    bottom: [0, 0, 0],
    center: [0, h * 0.5, 0],
    top: [0, h, 0],
    waist: [0, h * 0.54, 0],
    chest: [0, h * 0.72, 0],
    head: [0, h * 0.94, 0],
    eyes: [0, h * 0.9, 0],
  };
}

function yawFromEuler(rotation?: EulerRotation): number {
  return ((rotation?.yaw ?? 0) * Math.PI) / 180;
}

function worldAnchor(local: Vec3, origin: Vec3, yaw: number, scale: Vec3): Vec3 {
  const x = local[0] * scale[0];
  const y = local[1] * scale[1];
  const z = local[2] * scale[2];
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [origin[0] + x * c + z * s, origin[1] + y, origin[2] - x * s + z * c];
}

function zoneFrom(zone: SceneZone): ResolvedZone {
  if (zone.shape.type === "box") {
    return { id: zone.id, center: zone.shape.center, size: zone.shape.size };
  }
  const pts = zone.shape.points;
  const acc = pts.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]] as Vec3, [0, 0, 0] as Vec3);
  const n = Math.max(pts.length, 1);
  return { id: zone.id, center: [acc[0] / n, acc[1] / n, acc[2] / n], size: [1, 1, 1] };
}

function seedEntity(entity: SceneEntity, _zones: Record<string, ResolvedZone>): ResolvedEntity {
  const size = entity.geometry?.size ?? DEFAULT_SIZE[entity.type] ?? [1, 1, 1];
  const scale = entity.transform.scale ?? [1, 1, 1];
  const position = entity.transform.position ?? [0, 0, 0];
  const yaw = yawFromEuler(entity.transform.rotation);
  const locals = { ...defaultAnchors(size) };
  for (const anchor of entity.anchors ?? []) {
    if (Array.isArray(anchor.position)) locals[anchor.id] = anchor.position;
  }
  const worldAnchors: Record<string, Vec3> = {};
  for (const [id, local] of Object.entries(locals)) {
    worldAnchors[id] = worldAnchor(local, position, yaw, scale);
  }
  return {
    id: entity.id,
    type: entity.type,
    semantic: entity.semantic,
    position,
    yaw,
    scale,
    size,
    worldAnchors,
    collision: entity.physical?.collision ?? true,
    occluder: entity.physical?.occluder ?? entity.type !== "person",
    walkable: entity.physical?.walkable ?? false,
    visibility: true,
  };
}

export function refreshAnchors(entity: ResolvedEntity): ResolvedEntity {
  const locals = defaultAnchors(entity.size);
  const worldAnchors: Record<string, Vec3> = { ...entity.worldAnchors };
  for (const [id, local] of Object.entries(locals)) {
    worldAnchors[id] = worldAnchor(local, entity.position, entity.yaw, entity.scale);
  }
  return { ...entity, worldAnchors };
}

export function resolveScene(scene: Scene): ResolvedScene {
  const diagnostics: Diagnostic[] = [];
  const zones: Record<string, ResolvedZone> = {};
  for (const zone of scene.zones ?? []) zones[zone.id] = zoneFrom(zone);
  const entities: Record<string, ResolvedEntity> = {};
  for (const entity of scene.entities) {
    if (entities[entity.id]) {
      diagnostics.push({
        severity: "error",
        code: "E_ID_DUPLICATE",
        path: `/scene/entities/${entity.id}`,
        message: `重复实体 ${entity.id}`,
        entityId: entity.id,
      });
    }
    entities[entity.id] = seedEntity(entity, zones);
  }
  const draft: ResolvedScene = { id: scene.id, entities, zones, diagnostics };
  for (const entity of scene.entities) {
    if (!entity.transform.placement) continue;
    const pos = resolveSpatial(draft, entity.transform.placement, entities);
    entities[entity.id] = refreshAnchors({ ...entities[entity.id], position: pos });
  }
  return draft;
}

export function runtimeFromResolved(entity: ResolvedEntity, time: number): EntityRuntimeState {
  return {
    entityId: entity.id,
    time,
    position: entity.position,
    rotation: headingQuat(entity.yaw),
    pose: entity.pose ? { preset: entity.pose } : undefined,
    semanticState: entity.semanticState,
    visibility: entity.visibility,
  };
}

export function applyRuntime(entity: ResolvedEntity, state: EntityRuntimeState): ResolvedEntity {
  return refreshAnchors({
    ...entity,
    position: state.position,
    yaw: headingOfQuat(state.rotation),
    pose: typeof state.pose?.preset === "string" ? state.pose.preset : entity.pose,
    semanticState: state.semanticState ?? entity.semanticState,
    visibility: state.visibility,
  });
}

export function cameraStateFromSetup(
  scene: ResolvedScene,
  setup: CameraSetup,
  time = 0,
  entities: Record<string, ResolvedEntity> = scene.entities,
): CameraRuntimeState {
  const position = resolveSpatial(scene, setup.placement, entities);
  let rotation = eulerToQuat(setup.orientation.rotation ?? {});
  if (setup.orientation.lookAt) {
    const target = frameOfTarget(scene, setup.orientation.lookAt.target, entities);
    const anchor =
      setup.orientation.lookAt.target.type === "entity" && setup.orientation.lookAt.anchor
        ? entities[setup.orientation.lookAt.target.entityId]?.worldAnchors[setup.orientation.lookAt.anchor]
        : undefined;
    rotation = lookRotation(position, anchor ?? target.origin);
  }
  return { time, position, rotation, focalLength: setup.lens.focalLength };
}
