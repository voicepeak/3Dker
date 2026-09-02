import { lookAtQuat, type Quat, type Vec3 } from "@semantic-director/shared";

export function solveLookAt(position: Vec3, target: Vec3): Quat {
  return lookAtQuat(position, target);
}
