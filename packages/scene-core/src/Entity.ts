import type { SemanticType, Vec3 } from "@semantic-director/shared";
import type { Transform } from "./Transform";

export interface Bounds {
  size: Vec3;
}

export interface MotionPath {
  waypoints: Vec3[];
  duration: number;
}

export interface SceneEntity {
  id: string;
  name: string;
  semanticType: SemanticType;
  transform: Transform;
  bounds: Bounds;
  anchors: Record<string, Vec3>;
  motionPath?: MotionPath;
}

export interface Aabb {
  min: Vec3;
  max: Vec3;
}

export interface EvaluatedEntity {
  entity: SceneEntity;
  position: Vec3;
  yaw: number;
  scale: Vec3;
  size: Vec3;
  anchorsWorld: Record<string, Vec3>;
  aabb: Aabb;
  facing: Vec3;
}
