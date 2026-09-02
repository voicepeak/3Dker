import { PERSON_ANCHORS, type SemanticType, type Vec3 } from "@semantic-director/shared";
import type { SceneEntity } from "./Entity";
import { identityTransform } from "./Transform";
import { createId } from "./id";

interface FactoryOptions {
  name?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

const DEFAULT_SIZES: Record<SemanticType, Vec3> = {
  person: [0.5, 1.8, 0.4],
  box: [1, 1, 1],
  table: [1.2, 0.75, 0.8],
  vase: [0.22, 0.4, 0.22],
  wall: [4, 2.5, 0.16],
  door: [1, 2.1, 0.08],
};

const DEFAULT_NAMES: Record<SemanticType, string> = {
  person: "人物",
  box: "箱子",
  table: "桌子",
  vase: "花瓶",
  wall: "墙",
  door: "门",
};

export function generatePropAnchors(size: Vec3): Record<string, Vec3> {
  const [sx, sy, sz] = size;
  return {
    center: [0, sy / 2, 0],
    top: [0, sy, 0],
    bottom: [0, 0, 0],
    left: [-sx / 2, sy / 2, 0],
    right: [sx / 2, sy / 2, 0],
    front: [0, sy / 2, sz / 2],
    back: [0, sy / 2, -sz / 2],
  };
}

export function generatePersonAnchors(): Record<string, Vec3> {
  return {
    feet: [...PERSON_ANCHORS.feet],
    waist: [...PERSON_ANCHORS.waist],
    chest: [...PERSON_ANCHORS.chest],
    eyes: [...PERSON_ANCHORS.eyes],
    head: [...PERSON_ANCHORS.head],
    shoulder_left: [...PERSON_ANCHORS.shoulder_left],
    shoulder_right: [...PERSON_ANCHORS.shoulder_right],
    center: [...PERSON_ANCHORS.center],
  };
}

export function createEntity(type: SemanticType, options: FactoryOptions = {}): SceneEntity {
  const size = DEFAULT_SIZES[type];
  const transform = identityTransform();
  if (options.position) transform.position = options.position;
  if (options.rotation) transform.rotation = options.rotation;
  if (options.scale) transform.scale = options.scale;
  return {
    id: createId(type),
    name: options.name ?? DEFAULT_NAMES[type],
    semanticType: type,
    transform,
    bounds: { size: [...size] },
    anchors: type === "person" ? generatePersonAnchors() : generatePropAnchors(size),
  };
}

export function duplicateEntity(entity: SceneEntity): SceneEntity {
  return {
    ...entity,
    id: createId(entity.semanticType),
    name: `${entity.name} 副本`,
    transform: {
      position: [entity.transform.position[0] + 0.6, entity.transform.position[1], entity.transform.position[2]],
      rotation: [...entity.transform.rotation],
      scale: [...entity.transform.scale],
    },
    bounds: { size: [...entity.bounds.size] },
    anchors: Object.fromEntries(Object.entries(entity.anchors).map(([k, v]) => [k, [...v] as Vec3])),
    motionPath: entity.motionPath
      ? {
          duration: entity.motionPath.duration,
          waypoints: entity.motionPath.waypoints.map((p) => [...p] as Vec3),
        }
      : undefined,
  };
}
