import type { Quat, Vec3 } from "@semantic-director/shared";

export interface CameraSample {
  time: number;
  position: Vec3;
  quaternion: Quat;
  focalLength: number;
  collision: boolean;
  visible: boolean;
  collisionEntityId?: string;
  occluderId?: string;
}

export interface ConstraintWarning {
  time: number;
  kind: "collision" | "occlusion";
  message: string;
  position: Vec3;
  entityId?: string;
}

export interface SolveResult {
  samples: CameraSample[];
  warnings: ConstraintWarning[];
  duration: number;
  valid: boolean;
}
