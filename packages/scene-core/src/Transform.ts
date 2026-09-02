import type { Vec3 } from "@semantic-director/shared";

export interface Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export function identityTransform(): Transform {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };
}

export function yawOf(transform: Transform): number {
  return transform.rotation[1];
}
