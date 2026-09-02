import { add, normalize, rotateY, scale, type Vec3 } from "@semantic-director/shared";
import type { EvaluatedEntity } from "@semantic-director/scene-core";

const SIDE_YAW: Record<string, number> = {
  front: Math.PI,
  back: 0,
  left: Math.PI / 2,
  right: -Math.PI / 2,
  back_left: Math.PI / 4,
  back_right: -Math.PI / 4,
};

export function followPosition(
  target: EvaluatedEntity,
  radius: number,
  height: number,
  side: keyof typeof SIDE_YAW,
): Vec3 {
  const local = rotateY([0, 0, radius], SIDE_YAW[side] ?? 0);
  const worldOffset = rotateY(local, target.yaw);
  const horizontal = normalize([worldOffset[0], 0, worldOffset[2]]);
  const offset = scale(horizontal, radius);
  return add([target.position[0], height, target.position[2]], offset);
}
